import {
  BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit,
} from '@nestjs/common';
import { Integration, Prisma, SaleSource, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { SalesService } from '../../modules/sales/sales/sales.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../common/shop-scope';
import { startOfDayTz, startOfMonthTz } from '../../common/helpers/business-time.helper';
import { IntegrationService } from '../core/integration.service';
import { NormalizedOrder, isCashOnDelivery, mapPaymentMethod } from './order-normalizer';
import { readWebsiteConfig } from './website-config';
import { StatusWebhookService } from './status-webhook.service';
import { COURIERS, courierHoldsCash, courierName } from './couriers';
import { mappingKey } from './mapping-key';

/**
 * Online order ka poora safar:
 *
 *   PENDING (naya) ──accept──▶ CONFIRMED ─▶ PREPARING ─▶ READY ─▶ OUT_FOR_DELIVERY ─▶ DELIVERED
 *        │                        │
 *        └──────── cancel ────────┴──▶ CANCELLED  (bill void → stock wapas)
 *
 * Accept par bill POS wale `SalesService.create` se banta hai — is liye
 * stock, cost, khata, loyalty aur sale number bilkul counter jaise chalte hain.
 */

export const ORDER_STATUSES = [
  'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED', 'RETURNED',
] as const;

/** Band orders — in par aage kuch nahi hota */
const CLOSED: string[] = ['CANCELLED', 'REJECTED', 'RETURNED'];
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Accept ke doran order ko "lock" karne wala andar ka status */
const ACCEPTING = 'ACCEPTING';
const LOCK_TTL_MS = 2 * 60_000;
const FLOW: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

const SOURCE_BY_TYPE: Record<string, SaleSource> = {
  CUSTOM_WEBSITE: 'WEBSITE',
  WOOCOMMERCE: 'WEBSITE',
  SHOPIFY: 'SHOPIFY',
  DARAZ: 'DARAZ',
  FOODPANDA: 'FOODPANDA',
};

export interface ItemMatch {
  productId: string;
  variantId?: string | null;
}

interface StoredItem {
  name: string;
  sku?: string;
  externalProductId?: string;
  externalVariantId?: string;
  variant?: string;
  quantity: number;
  price: number;
  image?: string;
  productId?: string;
  variantId?: string | null;
}

@Injectable()
export class OnlineOrdersService implements OnModuleInit {
  private readonly logger = new Logger(OnlineOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationService,
    private readonly sales: SalesService,
    private readonly notifications: NotificationsService,
    private readonly statusHook: StatusWebhookService,
  ) {}

  /**
   * Daraz/Foodpanda connectors bhi `IntegrationService.receiveChannelOrder`
   * se order dalte hain — un sab par bhi naye order ki ghanti aur
   * auto-accept chale, is liye yahan listener lagate hain.
   */
  onModuleInit() {
    this.integrations.onOrderReceived((order, integration) => this.afterNewOrder(order, integration));
  }

  // ═══════════════════════════════════════════════════════════
  // RECEIVE (website → Nafaa)
  // ═══════════════════════════════════════════════════════════

  async receive(integration: Integration, order: NormalizedOrder, meta: { signed: boolean; test?: boolean }) {
    return this.integrations.receiveChannelOrder(integration.id, {
      externalOrderId: order.externalOrderId,
      externalOrderNumber: order.externalOrderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      customerAddress: order.customerAddress,
      customerCity: order.customerCity,
      customerLat: order.customerLat,
      customerLng: order.customerLng,
      items: order.items,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.cancelled ? 'CANCELLED' : 'PENDING',
      notes: order.notes,
      metadata: {
        platform: order.platform,
        shippingMethod: order.shippingMethod,
        paymentTitle: order.paymentTitle,
        cod: isCashOnDelivery(order.paymentMethod) && order.paymentStatus !== 'PAID',
        signed: meta.signed,
        ...(meta.test && { test: true }),
      },
    });
  }

  /** Naya order aaya: ghanti + (agar on ho) khud bill */
  private async afterNewOrder(order: any, integration: Integration) {
    const num = order.externalOrderNumber ?? order.externalOrderId;
    const itemCount = Array.isArray(order.items) ? order.items.length : 0;

    await this.notifications.create({
      tenantId: order.tenantId,
      type: 'INFO' as any,
      title: `🛍️ Naya online order #${num}`,
      message: `${order.customerName} · Rs ${Math.round(Number(order.total)).toLocaleString('en-PK')} · ${itemCount} item`,
      link: `/online-orders?order=${order.id}`,
      metadata: { kind: 'ONLINE_ORDER', channelOrderId: order.id, source: integration.type },
    } as any).catch(() => null);

    const config = readWebsiteConfig(integration.config);
    if (!config.autoAccept || order.orderStatus !== 'PENDING') return;

    try {
      const actor = await this.systemActor(order.tenantId);
      await this.accept(actor, new ShopScope(null, true), order.id, {});
      this.logger.log(`⚡ Auto-accept: #${num}`);
    } catch (e: any) {
      // Order PENDING hi rehta hai — malik khud dekh kar accept kar lega
      const reason = e?.response?.message ?? e?.message ?? 'Auto-accept nahi hua';
      await this.mergeMetadata(order.id, { autoAcceptError: String(reason) });
      this.logger.warn(`Auto-accept fail #${num}: ${reason}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // LIST / LIVE / DETAIL
  // ═══════════════════════════════════════════════════════════

  private scopeWhere(user: AuthenticatedUser, scope: ShopScope): Prisma.ChannelOrderWhereInput {
    // Branch wala staff sirf apni branch ke (aur bina branch wale) orders dekhe
    return { tenantId: user.tenantId, ...(scope.whereLoose as any) };
  }

  async list(user: AuthenticatedUser, scope: ShopScope, q: {
    status?: string; integrationId?: string; search?: string; limit?: number; offset?: number;
    payment?: 'COD_DUE';
  }) {
    // Channel chuna ho to ginti (tabs, aaj, COD) bhi usi channel ki
    const base: Prisma.ChannelOrderWhereInput = {
      ...this.scopeWhere(user, scope),
      ...(q.integrationId && { integrationId: q.integrationId }),
    };
    const where: Prisma.ChannelOrderWhereInput = { ...base };
    if (q.status === 'ACTIVE') where.orderStatus = { in: ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] };
    else if (q.status === 'CLOSED') where.orderStatus = { in: CLOSED };
    else if (q.status) where.orderStatus = q.status;
    if (q.payment === 'COD_DUE') {
      where.paymentStatus = { not: 'PAID' };
      where.nafaaSaleId = { not: null };
      where.orderStatus = { notIn: CLOSED };
    }
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.AND = [{
        OR: [
          { externalOrderNumber: { contains: s, mode: 'insensitive' } },
          { externalOrderId: { contains: s, mode: 'insensitive' } },
          { customerName: { contains: s, mode: 'insensitive' } },
          { customerPhone: { contains: s } },
          { trackingNumber: { contains: s, mode: 'insensitive' } },
        ],
      }];
    }

    const today = startOfDayTz();
    const [items, total, counts, todayAgg, codDue] = await Promise.all([
      this.prisma.channelOrder.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: Math.min(q.limit ?? 50, 200),
        skip: q.offset ?? 0,
        include: { integration: { select: { id: true, type: true, displayName: true } } },
      }),
      this.prisma.channelOrder.count({ where }),
      this.prisma.channelOrder.groupBy({ by: ['orderStatus'], where: base, _count: { _all: true } }),
      this.prisma.channelOrder.aggregate({
        where: { ...base, receivedAt: { gte: today }, orderStatus: { notIn: CLOSED } },
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.channelOrder.aggregate({
        where: { ...base, paymentStatus: { not: 'PAID' }, nafaaSaleId: { not: null }, orderStatus: { notIn: CLOSED } },
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    counts.forEach((c) => { statusCounts[c.orderStatus] = c._count._all; });

    return {
      items: items.map((o) => this.present(o)),
      total,
      counts: statusCounts,
      stats: {
        todayOrders: todayAgg._count._all,
        todayValue: Number(todayAgg._sum.total ?? 0),
        codDueCount: codDue._count._all,
        codDueValue: Number(codDue._sum.total ?? 0),
      },
    };
  }

  /** Har page par chalne wali halki query — sidebar badge aur naye order ka popup */
  async live(user: AuthenticatedUser, scope: ShopScope) {
    const where: Prisma.ChannelOrderWhereInput = { ...this.scopeWhere(user, scope), orderStatus: 'PENDING' };
    const [pendingCount, latest] = await Promise.all([
      this.prisma.channelOrder.count({ where }),
      this.prisma.channelOrder.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: 5,
        select: {
          id: true, externalOrderId: true, externalOrderNumber: true, customerName: true, customerCity: true,
          total: true, items: true, paymentMethod: true, receivedAt: true, metadata: true,
          integration: { select: { type: true, displayName: true } },
        },
      }),
    ]);
    return {
      pendingCount,
      latest: latest.map((o) => ({
        ...o,
        externalOrderNumber: o.externalOrderNumber ? String(o.externalOrderNumber).replace(/^#+/, '') : o.externalOrderNumber,
        total: Number(o.total),
        itemCount: Array.isArray(o.items) ? (o.items as any[]).length : 0,
        items: undefined,
      })),
    };
  }

  async detail(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const order = await this.prisma.channelOrder.findFirst({
      where: { id, ...this.scopeWhere(user, scope) },
      include: { integration: true },
    });
    if (!order) throw new NotFoundException('Order nahi mila');

    // Customer ki shakhsi details kis ne dekhin — access log (Shopify/GDPR shart)
    this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'ONLINE_ORDER_VIEWED',
        entityType: 'ChannelOrder',
        entityId: order.id,
        description: `Online order #${String(order.externalOrderNumber ?? order.externalOrderId).replace(/^#+/, '')} ki customer details dekhi`,
        metadata: { channel: order.integration.type },
      },
    }).catch(() => null);

    const config = readWebsiteConfig(order.integration.config);
    const shopId = order.shopId ?? config.shopId ?? order.integration.shopId ?? scope.shopId ?? null;
    const items = (order.items as unknown as StoredItem[]) ?? [];

    // Har item ka Nafaa product + branch stock — accept se pehle dikh jaye
    const resolved = await Promise.all(items.map((it) => this.resolveItem(order.tenantId, order.integrationId, it)));
    const productIds = resolved.filter(Boolean).map((r) => r!.productId);
    const [products, stocks] = await Promise.all([
      productIds.length
        ? this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, sku: true, price: true, images: { take: 1, select: { url: true } } },
          })
        : [],
      productIds.length && shopId
        ? this.prisma.shopStock.findMany({ where: { shopId, productId: { in: productIds } }, select: { productId: true, variantId: true, stock: true } })
        : [],
    ]);

    const sale = order.nafaaSaleId
      ? await this.prisma.sale.findFirst({
          where: { id: order.nafaaSaleId, tenantId: user.tenantId },
          select: { id: true, saleNumber: true, total: true, status: true, soldAt: true, shop: { select: { id: true, name: true } } },
        })
      : null;

    return {
      ...this.present(order),
      integration: { id: order.integration.id, type: order.integration.type, displayName: order.integration.displayName },
      autoPrint: config.autoPrint,
      fulfilShopId: shopId,
      sale,
      lines: items.map((it, i) => {
        const r = resolved[i];
        const p = r ? products.find((x) => x.id === r.productId) : undefined;
        const st = r ? stocks.find((s) => s.productId === r.productId && (s.variantId ?? null) === (r.variantId ?? null)) : undefined;
        return {
          index: i,
          ...it,
          lineTotal: it.price * it.quantity,
          match: r && p
            ? {
                productId: p.id, variantId: r.variantId ?? null, name: p.name, sku: p.sku,
                nafaaPrice: Number(p.price), image: p.images[0]?.url ?? null,
                stock: st ? Number(st.stock) : 0,
                enough: st ? Number(st.stock) >= it.quantity : false,
                via: r.via,
              }
            : null,
        };
      }),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // ACCEPT → BILL + STOCK
  // ═══════════════════════════════════════════════════════════

  async accept(
    user: AuthenticatedUser,
    scope: ShopScope,
    id: string,
    body: { matches?: Record<string, ItemMatch>; shopId?: string },
  ) {
    const order = await this.prisma.channelOrder.findFirst({
      where: { id, ...this.scopeWhere(user, scope) },
      include: { integration: true },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (order.nafaaSaleId) throw new BadRequestException('Is order ka bill pehle ban chuka hai');
    if (['CANCELLED', 'REJECTED'].includes(order.orderStatus)) {
      throw new BadRequestException('Cancel hua order accept nahi ho sakta');
    }
    const staleLock = order.orderStatus === ACCEPTING && this.isStaleLock(order.processedAt);
    if (order.orderStatus === ACCEPTING && !staleLock) {
      throw new ConflictException('Is order ka bill abhi ban raha hai — thori der me dekhein');
    }

    const config = readWebsiteConfig(order.integration.config);
    const items = (order.items as unknown as StoredItem[]) ?? [];

    // ─── Har item ka product dhoondo ─────────────────────────
    const matched: (ItemMatch & { via: string })[] = [];
    const unmatched: { index: number; name: string; sku?: string; variant?: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const manual = body.matches?.[String(i)];
      if (manual?.productId) {
        const ok = await this.prisma.product.findFirst({
          where: { id: manual.productId, tenantId: user.tenantId, isActive: true },
          select: { id: true },
        });
        if (!ok) throw new BadRequestException(`${items[i].name}: chuna hua product nahi mila`);
        if (manual.variantId) {
          const v = await this.prisma.productVariant.findFirst({
            where: { id: manual.variantId, productId: manual.productId, isActive: true },
            select: { id: true },
          });
          if (!v) throw new BadRequestException(`${items[i].name}: chuna hua variant is product ka nahi`);
        }
        matched[i] = { productId: manual.productId, variantId: manual.variantId ?? null, via: 'manual' };
        continue;
      }
      const r = await this.resolveItem(user.tenantId, order.integrationId, items[i]);
      if (r) matched[i] = r;
      else unmatched.push({ index: i, name: items[i].name, sku: items[i].sku, variant: items[i].variant });
    }
    if (unmatched.length) {
      throw new ConflictException({
        code: 'UNMATCHED_ITEMS',
        message: `${unmatched.length} item ka Nafaa product nahi mila — pehle jodein`,
        unmatched,
      });
    }

    // ─── Order lock — do log ek saath accept na kar sakein ───
    // Sirf "Naya" order lock hota hai (ya purana CONFIRMED jiska bill kabhi
    // bana hi nahi, ya ACCEPTING jo crash me atak gaya). processedAt yahan
    // lock ka waqt hai — atka hua lock 2 minute baad chhoot jata hai.
    const lockedAt = new Date();
    const fromStatus = staleLock ? 'PENDING' : order.orderStatus;
    const locked = await this.prisma.channelOrder.updateMany({
      where: {
        id: order.id,
        nafaaSaleId: null,
        OR: [
          { orderStatus: { in: ['PENDING', 'CONFIRMED'] } },
          { orderStatus: ACCEPTING, processedAt: { lt: new Date(Date.now() - LOCK_TTL_MS) } },
          { orderStatus: ACCEPTING, processedAt: null },
        ],
      },
      data: { orderStatus: ACCEPTING, processedAt: lockedAt },
    });
    if (locked.count === 0) throw new ConflictException('Ye order abhi koi aur accept kar raha hai');

    let saleId: string | null = null;
    try {
      const shopId = await resolveWriteShopId(
        this.prisma,
        user.tenantId,
        scope,
        body.shopId ?? order.shopId ?? config.shopId ?? order.integration.shopId,
      );
      const customerId = await this.findOrCreateCustomer(user.tenantId, shopId, order);
      const meta = (order.metadata ?? {}) as any;
      const paymentMethod = mapPaymentMethod(order.paymentMethod ?? undefined);
      const deliveryFee = Number(order.deliveryFee);
      const discount = Number(order.discount) || 0;
      const billTotal = await this.expectedBillTotal(items, matched, config.priceSource, discount, deliveryFee);
      const source = SOURCE_BY_TYPE[order.integration.type] ?? 'WEBSITE';
      const sourceRef = order.externalOrderNumber ?? order.externalOrderId;

      // Pichli koshish me bill ban gaya tha lekin order se jura nahi (crash) —
      // dobara bill banane ke bajaye wahi jor do, warna stock do dafa kat-ta.
      const orphan = await this.prisma.sale.findFirst({
        where: {
          tenantId: user.tenantId, source, sourceRef, status: { not: 'VOIDED' },
          createdAt: { gte: order.receivedAt },
        },
        select: { id: true, saleNumber: true, total: true },
      });

      const sale = orphan ?? await this.sales.create(
        user,
        new ShopScope(shopId, false),
        {
          shopId,
          customerId,
          paymentMethod,
          // Online sale poori wasool maani jati hai — COD ka paisa order par
          // "Paisa mil gaya" se track hota hai, customer ke khate me udhaar nahi.
          // Bill ka apna total dete hain (website ka nahi) taake tax/rounding
          // ka farq udhaar ya "change" na ban jaye.
          paidAmount: billTotal,
          discount,
          items: items.map((it, i) => ({
            productId: matched[i].productId,
            variantId: matched[i].variantId ?? undefined,
            quantity: it.quantity,
            ...(config.priceSource === 'WEBSITE' && { priceOverride: it.price }),
          })),
          serviceCharges: deliveryFee > 0
            ? [{ type: 'DELIVERY', label: meta.shippingMethod ? `Delivery (${meta.shippingMethod})` : 'Delivery', amount: deliveryFee }]
            : undefined,
        } as any,
        { source, sourceRef },
      );
      saleId = sale.id;

      // Sirf tab CONFIRMED jab order ab bhi hamare lock me ho
      const now = new Date();
      const done = await this.prisma.channelOrder.updateMany({
        where: { id: order.id, orderStatus: ACCEPTING, processedAt: lockedAt },
        data: {
          orderStatus: 'CONFIRMED',
          nafaaSaleId: sale.id,
          shopId,
          acceptedAt: now,
          processedAt: now,
          items: items.map((it, i) => ({ ...it, productId: matched[i].productId, variantId: matched[i].variantId ?? null })) as any,
          metadata: { ...meta, autoAcceptError: undefined },
        },
      });
      if (done.count === 0) {
        // Beech me kisi ne order badal diya — bill wapas lo taake stock sahi rahe
        await this.sales.voidSale(user, new ShopScope(null, true), sale.id, 'Online order accept beech me ruk gaya');
        saleId = null;
        throw new ConflictException('Order beech me badal gaya — dobara dekhein');
      }
      saleId = null; // ab order se jur gaya, catch me kuch wapas nahi karna
      const updated = await this.prisma.channelOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: { integration: true },
      });

      await this.rememberMatches(order.integrationId, items, matched);
      this.statusHook.send(updated.integration, updated, 'order.confirmed');

      return {
        order: this.present(updated),
        sale: { id: sale.id, saleNumber: sale.saleNumber, total: sale.total },
        autoPrint: config.autoPrint,
      };
    } catch (e) {
      // Bill ban chuka tha magar order se nahi jura → order ko bill se jor do
      // (dobara accept par naya bill na bane)
      if (saleId) {
        await this.prisma.channelOrder.updateMany({
          where: { id: order.id, orderStatus: ACCEPTING, processedAt: lockedAt },
          data: { orderStatus: 'CONFIRMED', nafaaSaleId: saleId, acceptedAt: new Date() },
        }).catch(() => null);
      } else {
        await this.prisma.channelOrder.updateMany({
          where: { id: order.id, orderStatus: ACCEPTING, processedAt: lockedAt },
          data: { orderStatus: fromStatus, processedAt: null },
        });
      }
      throw e;
    }
  }

  private isStaleLock(at: Date | null) {
    return !at || Date.now() - at.getTime() > LOCK_TTL_MS;
  }

  // ═══════════════════════════════════════════════════════════
  // STATUS / CANCEL / PAYMENT
  // ═══════════════════════════════════════════════════════════

  async updateStatus(
    user: AuthenticatedUser,
    scope: ShopScope,
    id: string,
    body: { status: string; reason?: string; trackingNumber?: string; courierName?: string; courierCode?: string },
  ) {
    const status = body.status as OrderStatus;
    if (!ORDER_STATUSES.includes(status)) throw new BadRequestException('Ghalat status');
    if (status === 'CANCELLED' || status === 'REJECTED') return this.cancel(user, scope, id, body.reason, status);
    if (status === 'RETURNED') return this.markReturned(user, scope, id, body.reason);

    const order = await this.prisma.channelOrder.findFirst({
      where: { id, ...this.scopeWhere(user, scope) },
      include: { integration: true },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (status === 'PENDING') throw new BadRequestException('Order wapas "Naya" nahi ho sakta');
    if (!order.nafaaSaleId) {
      throw new BadRequestException('Pehle order accept karein — accept se hi bill banta hai aur stock kam hota hai');
    }
    if (CLOSED.includes(order.orderStatus)) {
      throw new BadRequestException('Band (cancel / wapas) order ka status nahi badal sakta');
    }
    await this.assertBillAlive(order);

    const now = new Date();
    const meta = (order.metadata ?? {}) as any;
    const data: Prisma.ChannelOrderUpdateInput = { orderStatus: status };
    if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber.trim() || null;
    if (body.courierCode !== undefined) {
      const code = body.courierCode ? String(body.courierCode).toUpperCase() : null;
      if (code && !COURIERS.some((c) => c.code === code)) throw new BadRequestException('Courier sahi nahi');
      data.courierCode = code;
      if (body.courierName === undefined) data.courierName = courierName(code);
    }
    if (body.courierName !== undefined) data.courierName = body.courierName.trim() || null;
    if (status === 'OUT_FOR_DELIVERY' && !order.dispatchedAt) data.dispatchedAt = now;
    if (status === 'DELIVERED') {
      data.deliveredAt = now;
      if (!order.dispatchedAt) data.dispatchedAt = now;
      // COD: apna rider → paisa haath me. Courier → paisa courier ke paas
      // (COLLECTED) jab tak settlement na aaye — warna "paid" jhoot hota.
      if (order.paymentStatus !== 'PAID' && meta.cod) {
        const code = (data.courierCode as string | null | undefined) ?? order.courierCode;
        if (courierHoldsCash(code)) {
          data.paymentStatus = 'COLLECTED';
        } else {
          data.paymentStatus = 'PAID';
          data.paymentReceivedAt = now;
        }
      }
    }

    const updated = await this.prisma.channelOrder.update({ where: { id }, data, include: { integration: true } });
    this.statusHook.send(updated.integration, updated, 'order.status_changed');
    return this.present(updated);
  }

  async cancel(user: AuthenticatedUser, scope: ShopScope, id: string, reason?: string, status: 'CANCELLED' | 'REJECTED' = 'CANCELLED') {
    const order = await this.prisma.channelOrder.findFirst({
      where: { id, ...this.scopeWhere(user, scope) },
      include: { integration: true },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (CLOSED.includes(order.orderStatus)) return this.present(order);
    if (order.orderStatus === 'DELIVERED') {
      throw new BadRequestException('Deliver ho chuka order cancel nahi hota — Returns se wapsi karein');
    }
    if (order.orderStatus === ACCEPTING && !this.isStaleLock(order.processedAt)) {
      throw new ConflictException('Bill abhi ban raha hai — 2 second baad cancel karein');
    }

    // Bill ban chuka tha → void karo, stock khud wapas aa jata hai
    if (order.nafaaSaleId) {
      const sale = await this.prisma.sale.findFirst({
        where: { id: order.nafaaSaleId, tenantId: user.tenantId },
        select: { id: true, status: true },
      });
      if (sale && sale.status !== 'VOIDED') {
        await this.sales.voidSale(user, new ShopScope(null, true), sale.id, `Online order cancel: ${reason ?? '-'}`);
      }
    }

    const updated = await this.prisma.channelOrder.update({
      where: { id },
      data: { orderStatus: status, cancelledAt: new Date(), cancelReason: reason?.trim() || null },
      include: { integration: true },
    });
    this.statusHook.send(updated.integration, updated, 'order.cancelled');
    return this.present(updated);
  }

  async markPaid(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const order = await this.prisma.channelOrder.findFirst({ where: { id, ...this.scopeWhere(user, scope) } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (CLOSED.includes(order.orderStatus)) {
      throw new BadRequestException('Band (cancel / wapas) order par paisa mark nahi hota');
    }
    await this.assertBillAlive(order);
    const updated = await this.prisma.channelOrder.update({
      where: { id },
      data: { paymentStatus: 'PAID', paymentReceivedAt: new Date() },
      include: { integration: true },
    });
    this.statusHook.send(updated.integration, updated, 'order.paid');
    return this.present(updated);
  }

  /**
   * RTO — customer ne parcel nahi liya, courier wapas le aaya. Bill void
   * (stock khud wapas), order "Wapas aaya". COD ka paisa kabhi aana hi nahi.
   */
  async markReturned(user: AuthenticatedUser, scope: ShopScope, id: string, reason?: string) {
    const order = await this.prisma.channelOrder.findFirst({
      where: { id, ...this.scopeWhere(user, scope) },
      include: { integration: true },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (order.orderStatus === 'RETURNED') return this.present(order);
    if (!order.nafaaSaleId || !order.dispatchedAt) {
      throw new BadRequestException('Wapas sirf bheja hua (raste me / deliver) order aata hai — warna Cancel karein');
    }
    if (order.paymentStatus === 'PAID' && order.codSettledAt) {
      throw new BadRequestException('Is order ka paisa settle ho chuka — Returns se wapsi karein');
    }
    const sale = await this.prisma.sale.findFirst({
      where: { id: order.nafaaSaleId, tenantId: user.tenantId },
      select: { id: true, status: true },
    });
    if (sale && sale.status !== 'VOIDED') {
      await this.sales.voidSale(user, new ShopScope(null, true), sale.id, `RTO — parcel wapas: ${reason ?? '-'}`);
    }
    const updated = await this.prisma.channelOrder.update({
      where: { id },
      data: {
        orderStatus: 'RETURNED',
        returnedAt: new Date(),
        returnReason: reason?.trim() || null,
        paymentStatus: order.paymentStatus === 'PAID' ? 'PAID' : 'NOT_COLLECTED',
      },
      include: { integration: true },
    });
    this.statusHook.send(updated.integration, updated, 'order.returned');
    return this.present(updated);
  }

  /** Courier ne COD ka paisa jama karwaya — ek saath kai orders (settlement sheet se) */
  async settleCod(user: AuthenticatedUser, scope: ShopScope, body: { orderIds: string[]; reference?: string }) {
    const ids = [...new Set(body?.orderIds ?? [])].slice(0, 500);
    if (!ids.length) throw new BadRequestException('Koi order nahi chuna');
    const now = new Date();
    const res = await this.prisma.channelOrder.updateMany({
      where: {
        id: { in: ids },
        ...this.scopeWhere(user, scope),
        nafaaSaleId: { not: null },
        orderStatus: { notIn: CLOSED },
        paymentStatus: { not: 'PAID' },
      },
      data: {
        paymentStatus: 'PAID',
        paymentReceivedAt: now,
        codSettledAt: now,
        codSettlementRef: body.reference?.trim().slice(0, 120) || null,
      },
    });
    return { settled: res.count };
  }

  /**
   * COD ka hisaab — courier-wise: raste me kitna, courier ke paas kitna
   * (deliver ho chuka, paisa nahi aaya), is mahine kitna mila, RTO kitne %.
   */
  async codSummary(user: AuthenticatedUser, scope: ShopScope) {
    const base: Prisma.ChannelOrderWhereInput = { ...this.scopeWhere(user, scope), nafaaSaleId: { not: null } };
    const since = new Date(Date.now() - 30 * 86_400_000);
    const month = startOfMonthTz();
    const rows = await this.prisma.channelOrder.findMany({
      where: {
        ...base,
        OR: [
          { paymentStatus: { not: 'PAID' }, orderStatus: { notIn: ['CANCELLED', 'REJECTED'] } },
          { codSettledAt: { gte: month } },
          { dispatchedAt: { gte: since } },
        ],
      },
      select: {
        id: true, externalOrderNumber: true, externalOrderId: true, customerName: true, customerCity: true, total: true,
        orderStatus: true, paymentStatus: true, courierCode: true, courierName: true, trackingNumber: true,
        dispatchedAt: true, deliveredAt: true, returnedAt: true, codSettledAt: true, metadata: true,
        integration: { select: { type: true, displayName: true } },
      },
      orderBy: { dispatchedAt: 'desc' },
      take: 2000,
    });

    type Bucket = { code: string; name: string; inTransit: number; inTransitValue: number; withCourier: number; withCourierValue: number; settledMonth: number; settledMonthValue: number; dispatched30: number; returned30: number };
    const buckets = new Map<string, Bucket>();
    const bucket = (code: string | null, name: string | null) => {
      const k = code ?? 'NONE';
      if (!buckets.has(k)) {
        buckets.set(k, { code: k, name: courierName(code) ?? name ?? 'Courier nahi likha', inTransit: 0, inTransitValue: 0, withCourier: 0, withCourierValue: 0, settledMonth: 0, settledMonthValue: 0, dispatched30: 0, returned30: 0 });
      }
      return buckets.get(k)!;
    };

    const withCourier: any[] = [];
    for (const o of rows) {
      const b = bucket(o.courierCode, o.courierName);
      const total = Number(o.total);
      const cod = !!(o.metadata as any)?.cod;
      if (o.dispatchedAt && o.dispatchedAt >= since) {
        b.dispatched30++;
        if (o.orderStatus === 'RETURNED') b.returned30++;
      }
      if (!cod) continue;
      if (o.codSettledAt && o.codSettledAt >= month) { b.settledMonth++; b.settledMonthValue += total; }
      if (o.paymentStatus === 'PAID' || CLOSED.includes(o.orderStatus)) continue;
      if (o.orderStatus === 'OUT_FOR_DELIVERY') { b.inTransit++; b.inTransitValue += total; }
      if (o.orderStatus === 'DELIVERED') {
        b.withCourier++; b.withCourierValue += total;
        withCourier.push({
          ...o,
          externalOrderNumber: o.externalOrderNumber ? String(o.externalOrderNumber).replace(/^#+/, '') : o.externalOrderNumber,
          total, metadata: undefined, courier: courierName(o.courierCode) ?? o.courierName,
          daysWaiting: o.deliveredAt ? Math.floor((Date.now() - o.deliveredAt.getTime()) / 86_400_000) : null,
        });
      }
    }

    const couriers = [...buckets.values()]
      .map((b) => ({ ...b, rtoRate: b.dispatched30 ? Math.round((b.returned30 / b.dispatched30) * 100) : 0 }))
      .sort((a, b) => b.withCourierValue + b.inTransitValue - (a.withCourierValue + a.inTransitValue));
    const sum = (k: keyof Bucket) => couriers.reduce((s, c) => s + Number(c[k] ?? 0), 0);
    const dispatched30 = sum('dispatched30');

    return {
      totals: {
        inTransit: sum('inTransit'), inTransitValue: sum('inTransitValue'),
        withCourier: sum('withCourier'), withCourierValue: sum('withCourierValue'),
        settledMonth: sum('settledMonth'), settledMonthValue: sum('settledMonthValue'),
        rtoRate: dispatched30 ? Math.round((sum('returned30') / dispatched30) * 100) : 0,
        returned30: sum('returned30'), dispatched30,
      },
      couriers,
      withCourier,
      courierList: COURIERS,
    };
  }

  /** Website ne khud order cancel/paid kiya (customer ne cancel kiya, refund hua) */
  async applyWebsiteUpdate(integration: Integration, externalOrderId: string, update: { cancelled?: boolean; paid?: boolean; reason?: string }) {
    const order = await this.prisma.channelOrder.findUnique({
      where: { integrationId_externalOrderId: { integrationId: integration.id, externalOrderId } },
    });
    if (!order) throw new NotFoundException('Order nahi mila');

    if (update.paid && order.paymentStatus !== 'PAID') {
      await this.prisma.channelOrder.update({ where: { id: order.id }, data: { paymentStatus: 'PAID', paymentReceivedAt: new Date() } });
    }
    if (update.cancelled && !['CANCELLED', 'REJECTED', 'DELIVERED'].includes(order.orderStatus)) {
      if (order.nafaaSaleId || order.orderStatus === ACCEPTING) {
        // Bill ban chuka hai (ya ban raha hai) — khud void nahi karte, malik ko batate hain
        await this.mergeMetadata(order.id, { cancelRequested: true, cancelRequestReason: update.reason ?? null });
        await this.notifications.create({
          tenantId: order.tenantId,
          type: 'WARNING' as any,
          title: `⚠️ Customer ne order #${order.externalOrderNumber ?? externalOrderId} cancel kiya`,
          message: 'Bill ban chuka hai — Online Orders me ja kar cancel karein taake stock wapas aaye',
          link: `/online-orders?order=${order.id}`,
          metadata: { channelOrderId: order.id },
        } as any).catch(() => null);
      } else {
        await this.prisma.channelOrder.update({
          where: { id: order.id },
          data: { orderStatus: 'CANCELLED', cancelledAt: new Date(), cancelReason: update.reason ?? 'Website par cancel hua' },
        });
      }
    }
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // TEST ORDER
  // ═══════════════════════════════════════════════════════════

  async createTestOrder(tenantId: string, integration: Integration) {
    const config = readWebsiteConfig(integration.config);
    const shopId = config.shopId ?? integration.shopId;

    // Asli products lo jin ka stock ho — taake test me accept → bill → stock sab chal ke dikhe
    const stocked = await this.prisma.shopStock.findMany({
      where: { tenantId, ...(shopId && { shopId }), variantId: null, stock: { gte: 2 }, product: { isActive: true } },
      take: 2,
      orderBy: { stock: 'desc' },
      select: { product: { select: { id: true, name: true, sku: true, price: true } } },
    });

    // Test order ke items seedha Nafaa product se jure aate hain (productId) —
    // is ke liye koi channel link nahi banta, warna Products tab me "TEST-…"
    // ka jhoota link dikhta tha.
    const items = stocked.length
      ? stocked.map((s, i) => ({
          name: s.product.name,
          sku: s.product.sku ?? undefined,
          productId: s.product.id,
          quantity: i === 0 ? 1 : 2,
          price: Number(s.product.price),
        }))
      : [{ name: 'Test Product', sku: 'TEST-001', quantity: 1, price: 500 }];

    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const n = Date.now().toString().slice(-5);
    const order = await this.receive(integration, {
      platform: 'custom',
      externalOrderId: `TEST-${Date.now()}`,
      externalOrderNumber: `TEST-${n}`,
      customerName: 'Test Customer',
      customerPhone: '03000000000',
      customerAddress: 'House 1, Street 1, Model Town',
      customerCity: 'Lahore',
      items,
      subtotal,
      deliveryFee: 150,
      discount: 0,
      total: subtotal + 150,
      paymentMethod: 'cod',
      paymentStatus: 'PENDING',
      cancelled: false,
      notes: 'Ye test order hai — accept karke dekhein, phir cancel kar dein (stock wapas aa jayega)',
      shippingMethod: 'Standard',
      paymentTitle: 'Cash on Delivery',
    }, { signed: true, test: true });

    return { success: true, message: 'Test order aa gaya — Online Orders me dekhein', channelOrderId: order.id };
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  /**
   * Item → Nafaa product. Sirf pakki pehchan: pehle ka link, SKU, barcode,
   * variant SKU, ya bilkul same naam (aur wo bhi sirf ek product ho).
   * "Milta julta naam" nahi — warna "Chai" ka order "Chai Patti 1kg" se jud jata tha.
   */
  private async resolveItem(tenantId: string, integrationId: string, it: StoredItem): Promise<(ItemMatch & { via: string }) | null> {
    if (it.productId) return { productId: it.productId, variantId: it.variantId ?? null, via: 'saved' };

    // 1. SKU/barcode sab se pakki pehchan — variant ka SKU pehle, taake
    //    "Shirt (M)" ka stock "Shirt" ke base stock se na kate
    if (it.sku) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { OR: [{ sku: it.sku }, { barcode: it.sku }], isActive: true, product: { tenantId, isActive: true } },
        select: { id: true, productId: true },
      });
      if (variant) return { productId: variant.productId, variantId: variant.id, via: 'sku' };

      const p = await this.prisma.product.findFirst({
        where: { tenantId, isActive: true, OR: [{ sku: it.sku }, { barcode: it.sku }] },
        select: { id: true, hasVariants: true },
      });
      if (p) return this.withVariant(p, it, 'sku');
    }

    // 2. Pehle ka link (import ya haath se jora hua)
    const extIds = [it.externalVariantId, it.externalProductId].filter(Boolean) as string[];
    if (extIds.length || it.sku) {
      // Variant ka link sab se pakka (Small/Red alag), phir product ka, phir SKU
      const byVariant = it.externalVariantId
        ? await this.prisma.productChannelMapping.findFirst({
            where: { integrationId, externalVariantId: it.externalVariantId },
            select: { productId: true, variantId: true },
          })
        : null;
      const mapping = byVariant ?? await this.prisma.productChannelMapping.findFirst({
        where: {
          integrationId,
          OR: [
            ...(it.externalProductId ? [{ externalProductId: it.externalProductId, externalVariantId: null }] : []),
            ...(extIds.length ? [{ externalProductId: { in: extIds } }] : []),
            ...(it.sku ? [{ externalSku: it.sku }] : []),
          ],
        },
        select: { productId: true, variantId: true },
      });
      if (mapping) {
        const p = await this.prisma.product.findFirst({
          where: { id: mapping.productId, tenantId, isActive: true },
          select: { id: true, hasVariants: true },
        });
        if (p && mapping.variantId) return { productId: p.id, variantId: mapping.variantId, via: 'link' };
        if (p) return this.withVariant(p, it, 'link');
      }
    }

    // 3. Bilkul same naam — aur sirf ek hi product ho
    if (it.name) {
      const same = await this.prisma.product.findMany({
        where: { tenantId, isActive: true, name: { equals: it.name.trim(), mode: 'insensitive' } },
        select: { id: true, hasVariants: true },
        take: 2,
      });
      if (same.length === 1) return this.withVariant(same[0], it, 'name');
    }
    return null;
  }

  /**
   * Variants wala product mila to sahi variant chahiye (naam se: "M", "Black / L").
   * Na mile to null — malik khud chune, base stock se galat na kate.
   */
  private async withVariant(p: { id: string; hasVariants: boolean }, it: StoredItem, via: string) {
    if (!p.hasVariants) return { productId: p.id, variantId: null, via };
    const want = (it.variant ?? '').trim().toLowerCase();
    if (!want) return null;
    const variants = await this.prisma.productVariant.findMany({
      where: { productId: p.id, isActive: true },
      select: { id: true, name: true, size: true, color: true },
    });
    const hit = variants.find((v) =>
      [v.name, v.size, v.color, [v.color, v.size].filter(Boolean).join(' / '), [v.size, v.color].filter(Boolean).join(' / ')]
        .some((x) => x && x.trim().toLowerCase() === want),
    );
    return hit ? { productId: p.id, variantId: hit.id, via } : null;
  }

  /**
   * Bill Sales History se void ho chuka ho to order aage nahi badhta —
   * warna order "Deliver" aur "COD baqi" me ginta rehta jabke bill hai hi nahi.
   */
  private async assertBillAlive(order: { id: string; nafaaSaleId: string | null; tenantId: string }) {
    if (!order.nafaaSaleId) return;
    const sale = await this.prisma.sale.findFirst({
      where: { id: order.nafaaSaleId, tenantId: order.tenantId },
      select: { status: true },
    });
    if (sale && sale.status !== 'VOIDED') return;
    await this.prisma.channelOrder.update({
      where: { id: order.id },
      data: { orderStatus: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Bill void ho gaya tha' },
    });
    throw new BadRequestException('Is order ka bill void ho chuka hai — order cancel kar diya gaya');
  }

  /** SalesService jo total banayega wahi — lines − discount + delivery */
  private async expectedBillTotal(
    items: StoredItem[],
    matched: ItemMatch[],
    priceSource: 'WEBSITE' | 'NAFAA',
    discount: number,
    deliveryFee: number,
  ) {
    let lines = 0;
    if (priceSource === 'WEBSITE') {
      lines = items.reduce((s, it) => s + it.price * it.quantity, 0);
    } else {
      const productIds = [...new Set(matched.map((m) => m.productId))];
      const variantIds = matched.map((m) => m.variantId).filter(Boolean) as string[];
      const [products, variants] = await Promise.all([
        this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, price: true } }),
        variantIds.length
          ? this.prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, price: true } })
          : [],
      ]);
      items.forEach((it, i) => {
        const m = matched[i];
        const v = m.variantId ? variants.find((x) => x.id === m.variantId) : undefined;
        const p = products.find((x) => x.id === m.productId);
        lines += Number(v?.price ?? p?.price ?? 0) * it.quantity;
      });
    }
    return Math.max(lines - discount + deliveryFee, 0);
  }

  /** Haath se jora gaya product agli dafa khud mil jaye */
  private async rememberMatches(integrationId: string, items: StoredItem[], matched: (ItemMatch & { via: string })[]) {
    for (let i = 0; i < items.length; i++) {
      const m = matched[i];
      const it = items[i];
      if (!m || m.via !== 'manual') continue;
      const ext = it.externalProductId ?? it.sku;
      if (!ext) continue;
      await this.prisma.productChannelMapping.upsert({
        where: { integrationId_linkKey: { integrationId: integrationId, linkKey: mappingKey(m.productId, m.variantId) } },
        create: { linkKey: mappingKey(m.productId, m.variantId), integrationId, productId: m.productId, variantId: m.variantId ?? null, externalProductId: ext, externalVariantId: it.externalVariantId ?? null, externalTitle: it.variant ? `${it.name} — ${it.variant}` : it.name, externalSku: it.sku, syncStatus: 'SUCCESS', lastSyncedAt: new Date() },
        update: { externalProductId: ext, externalVariantId: it.externalVariantId ?? null, externalSku: it.sku, syncStatus: 'SUCCESS', lastSyncedAt: new Date() },
      }).catch(() => null);
    }
  }

  private async findOrCreateCustomer(tenantId: string, shopId: string, order: any): Promise<string | undefined> {
    const phone = String(order.customerPhone ?? '').replace(/[^\d+]/g, '');
    if (phone.length < 7) return undefined;
    const existing = await this.prisma.customer.findFirst({ where: { tenantId, phone }, select: { id: true } });
    if (existing) return existing.id;
    const created = await this.prisma.customer.create({
      data: {
        tenantId,
        shopId,
        name: order.customerName || 'Online Customer',
        phone,
        email: order.customerEmail ?? null,
        address: order.customerAddress ?? null,
        city: order.customerCity ?? null,
        notes: 'Website order se aaya customer',
      },
      select: { id: true },
    });
    return created.id;
  }

  /** Auto-accept ke liye: dukaan ka malik (sale uske naam se banti hai) */
  private async systemActor(tenantId: string): Promise<AuthenticatedUser> {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId, isActive: true, role: UserRole.OWNER },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, role: true },
    });
    if (!owner) throw new BadRequestException('Dukaan ka koi active malik nahi mila');
    return {
      id: owner.id, sub: owner.id, tenantId, email: owner.email, role: owner.role,
      shopId: null, permissions: [],
    };
  }

  private async mergeMetadata(id: string, patch: Record<string, any>) {
    const row = await this.prisma.channelOrder.findUnique({ where: { id }, select: { metadata: true } });
    await this.prisma.channelOrder.update({
      where: { id },
      data: { metadata: { ...((row?.metadata as any) ?? {}), ...patch } },
    }).catch(() => null);
  }

  private present(o: any) {
    const meta = (o.metadata ?? {}) as any;
    const { raw, ...safeMeta } = meta;
    return {
      ...o,
      // Shopify "#1002" bhejta hai — UI khud "#" lagata hai
      externalOrderNumber: o.externalOrderNumber ? String(o.externalOrderNumber).replace(/^#+/, '') : o.externalOrderNumber,
      integration: o.integration
        ? { id: o.integration.id, type: o.integration.type, displayName: o.integration.displayName }
        : undefined,
      metadata: safeMeta,
      subtotal: Number(o.subtotal),
      deliveryFee: Number(o.deliveryFee),
      discount: Number(o.discount),
      total: Number(o.total),
      isCod: !!meta.cod,
      isTest: !!meta.test,
      platform: meta.platform ?? 'custom',
      nextStatus: FLOW.includes(o.orderStatus) ? FLOW[FLOW.indexOf(o.orderStatus) + 1] ?? null : null,
      courierLabel: courierName(o.courierCode) ?? o.courierName ?? null,
      courierSite: COURIERS.find((c) => c.code === o.courierCode)?.site ?? null,
    };
  }
}
