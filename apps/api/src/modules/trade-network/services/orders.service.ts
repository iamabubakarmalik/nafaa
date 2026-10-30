/**
 * Network orders, buyer side. Placing an order books a normal distribution
 * SalesOrder in the seller's books (through the distribution OrdersService,
 * priced by the seller's list and schemes, marked source NETWORK) and keeps
 * the buyer's TradeOrder beside it. From there the seller works it in the
 * usual Orders desk; sync.service carries each step back to the buyer.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import type { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { OrdersService } from '../../distribution/services/orders.service';
import { ListTradeOrdersDto, PlaceOrderDto, ReceiveDto } from '../dto/trade.dto';
import { DONE_STATUSES, TRADE_STATUSES, deliveredLines, r2, type TradeStatus } from '../helpers/trade-rules';
import { actorFor, businessCards, linkFor, notify, requirePerm } from '../trade-network.support';
import { TradeCatalogService } from './catalog.service';
import { TradeSyncService } from './sync.service';

@Injectable()
export class TradeOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly distOrders: OrdersService,
    private readonly catalog: TradeCatalogService,
    private readonly sync: TradeSyncService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ───────────── place ───────────── */

  async place(user: AuthenticatedUser, dto: PlaceOrderDto) {
    const clientRef = dto.clientRef?.trim() || null;
    if (clientRef) {
      const seen = await this.prisma.tradeOrder.findUnique({ where: { buyerTenantId_clientRef: { buyerTenantId: user.tenantId, clientRef } }, select: { id: true } });
      if (seen) return { order: await this.detail(user, seen.id), duplicate: true, warnings: [] as string[] };
    }
    const link = await this.catalog.buyingLink(user, dto.linkId);
    const customer = await this.prisma.customer.findFirst({ where: { id: link.customerId!, tenantId: link.sellerTenantId }, select: { id: true, isActive: true } });
    if (!customer?.isActive) throw new ForbiddenException('Supplier ke paas aap ka account band hai — supplier se baat karein');

    // Price first so a too-small order is refused before anything is saved.
    const cart = await this.catalog.priceCart(link.sellerTenantId, customer.id, dto);
    if (!cart.lines.length) throw new BadRequestException(cart.warnings[0] ?? 'Order me koi item nahi');
    const profile = await this.prisma.tradeProfile.findUnique({ where: { tenantId: link.sellerTenantId }, select: { minOrderValue: true } });
    if (profile?.minOrderValue && cart.total + 0.005 < profile.minOrderValue) {
      throw new BadRequestException(`Kam se kam Order Rs ${Math.round(profile.minOrderValue).toLocaleString('en-PK')} ka hona chahiye`);
    }

    const id = randomUUID();
    const buyer = (await businessCards(this.prisma, [user.tenantId])).get(user.tenantId);
    const seller = await actorFor(this.prisma, link.sellerTenantId, [link.bookedById, link.decidedById]);
    const booked = await this.distOrders.create(seller, {
      clientRef: `tn-${id}`, customerId: customer.id,
      items: dto.items.map((i) => ({ productId: i.productId, variantId: i.variantId || null, unitId: i.unitId || null, qty: i.qty })),
      note: `Nafaa order: ${buyer?.name ?? ''}${dto.note?.trim() ? ` — ${dto.note.trim()}` : ''}`.slice(0, 500),
      ...(dto.deliveryDate && { deliveryDate: dto.deliveryDate.slice(0, 10) }),
    } as never);
    const so = booked.order;
    await this.prisma.salesOrder.updateMany({ where: { id: so.id, tenantId: link.sellerTenantId }, data: { source: 'NETWORK' } });

    try {
      await this.prisma.tradeOrder.create({
        data: {
          id, linkId: link.id, buyerTenantId: user.tenantId, sellerTenantId: link.sellerTenantId, clientRef, salesOrderId: so.id,
          orderNumber: so.orderNumber, placedById: user.id, status: 'BOOKED', total: r2(so.total), note: dto.note?.trim() || null,
          lines: cart.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, unitId: l.unitId, unitName: l.unitName, qty: l.qty, name: l.name })) as Prisma.InputJsonValue,
          syncedAt: new Date(),
        },
      });
    } catch (e) {
      // A retry with the same clientRef raced this one; the seller kept one order (same tn- ref).
      if (clientRef && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const seen = await this.prisma.tradeOrder.findUnique({ where: { buyerTenantId_clientRef: { buyerTenantId: user.tenantId, clientRef } }, select: { id: true } });
        if (seen) return { order: await this.detail(user, seen.id), duplicate: true, warnings: [] as string[] };
      }
      throw e;
    }

    void notify(this.notifications, {
      tenantId: link.sellerTenantId, kind: 'ORDER_NEW', refId: so.id, type: 'NEW_SALE',
      title: 'Nafaa par naya Order', message: `${buyer?.name ?? 'Customer'} ne Order ${so.orderNumber} bheja — Rs ${r2(so.total).toLocaleString('en-PK')}`,
      link: '/distribution/orders?status=BOOKED',
    });
    return { order: await this.detail(user, id), duplicate: booked.duplicate, warnings: booked.warnings };
  }

  /* ───────────── read ───────────── */

  async list(user: AuthenticatedUser, q: ListTradeOrdersDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const statuses = (q.status ?? '').split(',').map((s) => s.trim().toUpperCase()).filter((s) => (TRADE_STATUSES as readonly string[]).includes(s));
    const where: Prisma.TradeOrderWhereInput = {
      buyerTenantId: user.tenantId,
      ...(q.linkId && { linkId: q.linkId }),
      ...(statuses.length && { status: { in: statuses } }),
    };
    await this.sync.syncOrders({ buyerTenantId: user.tenantId, ...(q.linkId && { linkId: q.linkId }) }, 60).catch(() => undefined);
    const [total, rows, sums] = await Promise.all([
      this.prisma.tradeOrder.count({ where }),
      this.prisma.tradeOrder.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.tradeOrder.groupBy({ by: ['status'], where: { buyerTenantId: user.tenantId, ...(q.linkId && { linkId: q.linkId }) }, _count: { _all: true } }),
    ]);
    const cards = await businessCards(this.prisma, rows.map((r) => r.sellerTenantId));
    return {
      total, page, limit,
      counts: Object.fromEntries(sums.map((s) => [s.status, s._count._all])),
      orders: rows.map((r) => ({ ...this.row(r), seller: cards.get(r.sellerTenantId) ?? null })),
    };
  }

  private row(r: Prisma.TradeOrderGetPayload<object>) {
    const lines = Array.isArray(r.lines) ? (r.lines as unknown[]) : [];
    return {
      id: r.id, linkId: r.linkId, orderNumber: r.orderNumber, status: r.status, total: r.total, invoiceNumber: r.invoiceNumber, invoiceTotal: r.invoiceTotal,
      returnsValue: r.returnsValue, deliveredValue: r.deliveredValue, cashAtDelivery: r.cashAtDelivery, receiveState: r.receiveState, purchaseId: r.purchaseId,
      note: r.note, itemCount: lines.length, createdAt: r.createdAt, approvedAt: r.approvedAt, invoicedAt: r.invoicedAt, loadedAt: r.loadedAt,
      deliveredAt: r.deliveredAt, receivedAt: r.receivedAt, cancelledAt: r.cancelledAt,
    };
  }

  /** One order with the seller's invoice lines (names and quantities only), the purchase and payments. */
  async detail(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.tradeOrder.findFirst({ where: { id, buyerTenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Order nahi mila');
    await this.sync.syncOne(t).catch(() => undefined);
    const fresh = await this.prisma.tradeOrder.findUniqueOrThrow({ where: { id } });
    const so = fresh.salesOrderId
      ? await this.prisma.salesOrder.findFirst({ where: { id: fresh.salesOrderId, tenantId: fresh.sellerTenantId }, include: { items: { orderBy: { sortOrder: 'asc' } } } })
      : null;
    const productIds = so ? [...new Set(so.items.flatMap((i) => [i.productId, ...(i.freeProductId ? [i.freeProductId] : [])]))] : [];
    const [products, purchase, payments, cards] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId: fresh.sellerTenantId, id: { in: productIds } }, select: { id: true, name: true, unit: true } }),
      fresh.purchaseId ? this.prisma.purchase.findFirst({ where: { id: fresh.purchaseId, tenantId: user.tenantId }, select: { id: true, purchaseNumber: true, status: true, total: true } }) : null,
      this.prisma.tradePayment.findMany({ where: { tradeOrderId: id, buyerTenantId: user.tenantId }, orderBy: { paidAt: 'asc' } }),
      businessCards(this.prisma, [fresh.sellerTenantId]),
    ]);
    const name = new Map(products.map((p) => [p.id, p]));
    return {
      ...this.row(fresh),
      seller: cards.get(fresh.sellerTenantId) ?? null,
      sellerStatus: so?.status ?? null,
      lines: so
        ? so.items.map((i) => ({
          id: i.id, productId: i.productId, name: name.get(i.productId)?.name ?? null, baseUnit: name.get(i.productId)?.unit ?? 'pcs',
          unitName: i.unitName, conversionRate: i.conversionRate, qty: i.qty, baseQty: i.baseQty, price: i.price, schemeDiscount: i.schemeDiscount, total: i.total,
          schemeNote: i.schemeNote, freeBaseQty: i.freeBaseQty, freeProductName: i.freeProductId ? name.get(i.freeProductId)?.name ?? null : null,
          deliveredBaseQty: i.deliveredBaseQty, deliveredFreeQty: i.deliveredFreeQty,
        }))
        : [],
      totals: so ? { subtotal: so.subtotal, schemeDiscount: so.schemeDiscount, discount: so.discount, total: so.total } : null,
      purchase,
      payments: payments.map((p) => ({ id: p.id, amount: p.amount, method: p.method, status: p.status, source: p.source, paidAt: p.paidAt })),
    };
  }

  /** The buyer takes back an order the seller has not yet approved. */
  async cancel(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.tradeOrder.findFirst({ where: { id, buyerTenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Order nahi mila');
    if (!t.salesOrderId) throw new BadRequestException('Order cancel nahi ho sakta');
    const done = await this.prisma.salesOrder.updateMany({
      where: { id: t.salesOrderId, tenantId: t.sellerTenantId, status: 'BOOKED' },
      data: { status: 'CANCELLED', cancelReason: 'Dukaan ne Nafaa par Order wapas liya', cancelledAt: new Date() },
    });
    if (!done.count) throw new BadRequestException('Supplier Order approve kar chuka — ab supplier se baat karein');
    await this.prisma.tradeOrder.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
    const buyer = (await businessCards(this.prisma, [user.tenantId])).get(user.tenantId)?.name ?? 'Customer';
    void notify(this.notifications, {
      tenantId: t.sellerTenantId, kind: 'ORDER_CANCELLED_BY_BUYER', refId: t.salesOrderId, type: 'WARNING',
      title: 'Order wapas liya gaya', message: `${buyer} ne Order ${t.orderNumber ?? ''} wapas le liya`, link: '/distribution/orders?status=BOOKED',
    });
    return this.detail(user, id);
  }

  /* ───────────── receiving ───────────── */

  /** Delivered orders waiting for "Maal mil gaya", each with its lines and match state. */
  async receiving(user: AuthenticatedUser) {
    await this.sync.syncOrders({ buyerTenantId: user.tenantId }, 60).catch(() => undefined);
    const rows = await this.prisma.tradeOrder.findMany({
      where: { buyerTenantId: user.tenantId, receiveState: { in: ['DRAFT', 'NEEDS_MAP', 'NONE', 'PREPARING'] }, status: { in: DONE_STATUSES } },
      orderBy: { deliveredAt: 'asc' }, take: 100, include: { link: true },
    });
    const recent = await this.prisma.tradeOrder.findMany({
      where: { buyerTenantId: user.tenantId, receiveState: 'RECEIVED' }, orderBy: { receivedAt: 'desc' }, take: 10,
    });
    const cards = await businessCards(this.prisma, [...rows, ...recent].map((r) => r.sellerTenantId));
    const waiting = [];
    for (const t of rows) {
      const so = await this.prisma.salesOrder.findFirst({ where: { id: t.salesOrderId!, tenantId: t.sellerTenantId }, include: { items: true } });
      if (!so) continue;
      const lines = deliveredLines(so.items, so.status);
      const resolver = await this.catalog.resolveMaps(this.prisma, t.link, lines.map((l) => ({ productId: l.sellerProductId, variantId: l.sellerVariantId })));
      const ids = [...new Set(lines.map((l) => l.sellerProductId))];
      const mineIds = lines.map((l) => resolver.get(l.sellerProductId, l.sellerVariantId)?.buyerProductId).filter((x): x is string => !!x);
      const [sellerProducts, mine] = await Promise.all([
        this.prisma.product.findMany({ where: { tenantId: t.sellerTenantId, id: { in: ids } }, select: { id: true, name: true, unit: true, sku: true, barcode: true } }),
        this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: mineIds } }, select: { id: true, name: true, unit: true, stock: true } }),
      ]);
      const purchase = t.purchaseId ? await this.prisma.purchase.findFirst({ where: { id: t.purchaseId, tenantId: user.tenantId }, select: { id: true, purchaseNumber: true, total: true, status: true } }) : null;
      waiting.push({
        ...this.row(t), seller: cards.get(t.sellerTenantId) ?? null, purchase,
        lines: lines.map((l) => {
          const sp = sellerProducts.find((p) => p.id === l.sellerProductId);
          const m = resolver.get(l.sellerProductId, l.sellerVariantId);
          const own = m ? mine.find((p) => p.id === m.buyerProductId) : undefined;
          return {
            sellerProductId: l.sellerProductId, sellerVariantId: l.sellerVariantId, name: sp?.name ?? null, sku: sp?.sku ?? null, barcode: sp?.barcode ?? null,
            baseUnit: sp?.unit ?? 'pcs', baseQty: l.baseQty, unitCost: l.unitCost, value: r2(l.baseQty * l.unitCost), free: l.free,
            mine: own ? { productId: own.id, name: own.name, stock: own.stock, matchedBy: m!.by } : null,
          };
        }),
      });
    }
    return {
      waiting,
      recent: recent.map((r) => ({ ...this.row(r), seller: cards.get(r.sellerTenantId) ?? null })),
    };
  }

  /**
   * "Maal mil gaya": matches any unmatched lines (once; remembered), makes the
   * draft purchase if needed and receives it into stock.
   */
  async receive(user: AuthenticatedUser, id: string, dto: ReceiveDto) {
    requirePerm(user, PERMISSIONS.TRADE_RECEIVE);
    const t = await this.prisma.tradeOrder.findFirst({ where: { id, buyerTenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Order nahi mila');
    if (!DONE_STATUSES.includes(t.status as TradeStatus)) throw new BadRequestException('Maal abhi deliver nahi hua');
    if (t.receiveState === 'RECEIVED') return { state: 'RECEIVED', order: await this.detail(user, id) };
    if (t.receiveState !== 'DRAFT') {
      if (dto.maps?.length) await linkFor(this.prisma, user.tenantId, t.linkId, 'BUYER');
      const state = await this.sync.prepareReceiving(id, { maps: dto.maps });
      if (state === 'NEEDS_MAP') throw new BadRequestException('Kuch items abhi apne products se nahi mile — har item ke saamne product chunein ya naya banayein');
      if (state === 'BUSY') throw new BadRequestException('Purchase ban rahi hai — thori der me dobara dabayein');
      if (state === 'NOTHING') return { state, order: await this.detail(user, id) };
    }
    const fresh = await this.prisma.tradeOrder.findUniqueOrThrow({ where: { id } });
    const state = fresh.receiveState === 'DRAFT' ? await this.sync.receiveDraft(id, user) : fresh.receiveState;
    return { state, order: await this.detail(user, id) };
  }

  /** Seller side: network orders of one buyer (for the customer drawer). */
  async sellerOrders(user: AuthenticatedUser, linkId: string) {
    const link = await linkFor(this.prisma, user.tenantId, linkId, 'SELLER');
    await this.sync.syncOrders({ linkId: link.id }, 60).catch(() => undefined);
    const rows = await this.prisma.tradeOrder.findMany({ where: { linkId: link.id }, orderBy: { createdAt: 'desc' }, take: 100 });
    return rows.map((r) => ({
      id: r.id, salesOrderId: r.salesOrderId, orderNumber: r.orderNumber, status: r.status, total: r.total, invoiceNumber: r.invoiceNumber,
      invoiceTotal: r.invoiceTotal, returnsValue: r.returnsValue, receiveState: r.receiveState, createdAt: r.createdAt, receivedAt: r.receivedAt,
    }));
  }
}
