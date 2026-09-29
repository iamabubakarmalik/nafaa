import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { Integration, IntegrationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { decrypt, encrypt } from '../../core/lib/crypto';
import { OnlineOrdersService } from './online-orders.service';
import { WebsiteSetupService } from './website-setup.service';
import { WebsiteCatalogService } from './website-catalog.service';
import { NormalizedOrder } from './order-normalizer';
import { readWebsiteConfig } from './website-config';
import { DARAZ_AUTHORIZE, DarazClient, DarazError, readTokenResponse, stockXml } from './daraz.client';

const CLOSED = ['CANCELLED', 'REJECTED', 'RETURNED'];
/** Pehli dafa kitne din pichhe ke orders laane hain */
const FIRST_SYNC_DAYS = 3;

/** Daraz ki tareekh: ISO8601 Pakistan waqt ke saath (2026-09-30T10:00:00+05:00) */
export function isoPk(d: Date) {
  const pk = new Date(d.getTime() + 5 * 3600_000);
  return `${pk.toISOString().slice(0, 19)}+05:00`;
}

/**
 * Daraz order ke items ki statuses → ek faisla. Daraz har unit ki alag
 * status rakhta hai (pending, ready_to_ship, shipped, delivered, canceled,
 * returned, failed…).
 */
export function darazOrderState(statuses: string[]): 'skip' | 'open' | 'shipped' | 'delivered' | 'cancelled' | 'returned' {
  const s = statuses.map((x) => String(x).toLowerCase());
  if (!s.length || s.every((x) => x === 'unpaid')) return 'skip';
  if (s.every((x) => x === 'canceled' || x === 'cancelled')) return 'cancelled';
  if (s.some((x) => x === 'returned' || x === 'failed' || x === 'lost')) return 'returned';
  const live = s.filter((x) => x !== 'canceled' && x !== 'cancelled');
  if (live.length && live.every((x) => x === 'delivered')) return 'delivered';
  if (live.some((x) => x === 'shipped' || x === 'shipping' || x === 'delivered')) return 'shipped';
  return 'open';
}

/** Order items (har unit alag row) → SKU ke hisaab se jore hue items */
export function groupDarazItems(rows: any[]) {
  const map = new Map<string, { name: string; sku?: string; externalProductId?: string; externalVariantId?: string; variant?: string; quantity: number; price: number; image?: string; ids: string[] }>();
  for (const r of rows) {
    const st = String(r?.status ?? '').toLowerCase();
    if (st === 'canceled' || st === 'cancelled') continue;
    const key = `${r?.sku ?? ''}|${r?.sku_id ?? ''}|${r?.variation ?? ''}`;
    const unit = Number(r?.paid_price ?? r?.item_price ?? 0) || 0;
    const qty = Number(r?.quantity) > 0 ? Number(r.quantity) : 1;
    const cur = map.get(key);
    if (cur) {
      cur.quantity += qty;
      cur.ids.push(String(r.order_item_id));
      continue;
    }
    map.set(key, {
      name: String(r?.name ?? 'Daraz item'),
      sku: r?.sku ? String(r.sku) : undefined,
      externalProductId: r?.product_id ? String(r.product_id) : undefined,
      externalVariantId: r?.sku_id ? String(r.sku_id) : undefined,
      variant: r?.variation ? String(r.variation) : undefined,
      quantity: qty,
      price: unit,
      image: r?.product_main_image ? String(r.product_main_image) : undefined,
      ids: [String(r?.order_item_id)],
    });
  }
  return [...map.values()];
}

/**
 * Daraz — Shopify jaisa ek click: "Daraz jorein" → Daraz login → Allow →
 * jur gaya. Phir har 5 minute naye orders (webhook ke liye Daraz OV/EV SSL
 * maangta hai, is liye polling), stock Nafaa → Daraz, products SKU se jorna,
 * ready to ship + Daraz ka label Nafaa se.
 */
@Injectable()
export class DarazService {
  private readonly logger = new Logger(DarazService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly setup: WebsiteSetupService,
    private readonly orders: OnlineOrdersService,
    private readonly catalog: WebsiteCatalogService,
  ) {}

  configured() {
    return !!(process.env.DARAZ_APP_KEY && process.env.DARAZ_APP_SECRET);
  }

  private app() {
    if (!this.configured()) throw new BadRequestException('Daraz app ki keys server par nahi lagi (DARAZ_APP_KEY / DARAZ_APP_SECRET)');
    return { key: process.env.DARAZ_APP_KEY!, secret: process.env.DARAZ_APP_SECRET! };
  }

  /** Daraz App Console ke "Callback URL" se bilkul milna chahiye */
  redirectUri() {
    return (process.env.DARAZ_REDIRECT_URI || `${this.setup.apiBase()}/integrations/daraz/oauth/callback`).trim();
  }

  // ═══════════════════════════════════════════════════════════
  // CONNECT (OAuth)
  // ═══════════════════════════════════════════════════════════

  async start(user: AuthenticatedUser, body: { displayName?: string; shopId?: string; channelId?: string; returnOrigin?: string }) {
    this.setup.assertCanManage(user);
    this.app();
    const integration = body.channelId
      ? await this.setup.requireChannel(user.tenantId, body.channelId)
      : await this.setup.createChannel(user, { type: 'DARAZ', displayName: body.displayName?.trim() || 'Daraz store', shopId: body.shopId, status: IntegrationStatus.PENDING });
    const params = new URLSearchParams({
      response_type: 'code',
      force_auth: 'true',
      redirect_uri: this.redirectUri(),
      client_id: this.app().key,
      state: this.signState(integration.id, this.webOrigin(body.returnOrigin)),
    });
    return { channelId: integration.id, authUrl: `${DARAZ_AUTHORIZE}?${params}` };
  }

  /** Daraz yahan wapas aata hai (?code&state) — jawab web ke done-safhe par redirect */
  async callback(query: Record<string, string>): Promise<string> {
    let web = this.webOrigin();
    let channelId = '';
    try {
      const { id, origin } = this.verifyState(String(query.state ?? ''));
      channelId = id;
      web = origin;
      if (!query.code) throw new BadRequestException(query.error_description || query.error || 'Daraz par "Allow" nahi dabaya');
      const { key, secret } = this.app();
      const tok = readTokenResponse(await new DarazClient(key, secret).createToken(String(query.code)));
      if (!tok.accessToken) throw new BadRequestException('Daraz se token nahi mila');
      const integration = await this.prisma.integration.findUniqueOrThrow({ where: { id } });

      // Seller ka naam — channel ke naam ke liye
      const seller: any = await new DarazClient(key, secret, tok.accessToken).call('/seller/get').then((r) => r.data).catch(() => null);
      const cfg = readWebsiteConfig(integration.config) as any;
      await this.prisma.integration.update({
        where: { id },
        data: {
          credentials: {
            darazAccessToken: encrypt(tok.accessToken),
            darazRefreshToken: encrypt(tok.refreshToken),
            darazExpiresAt: tok.expiresAt,
            darazRefreshExpiresAt: tok.refreshExpiresAt,
            darazSellerId: seller?.seller_id ? String(seller.seller_id) : tok.sellerId,
            darazShortCode: seller?.short_code ?? tok.shortCode,
            darazAccount: tok.account,
            darazConnectedAt: new Date().toISOString(),
          },
          config: { ...cfg, darazError: null, platform: 'daraz', siteUrl: seller?.short_code ? `https://www.daraz.pk/shop/${String(seller.short_code).toLowerCase()}` : cfg.siteUrl } as any,
          ...(seller?.name && integration.displayName === 'Daraz store' ? { displayName: String(seller.name).slice(0, 80) } : {}),
          status: IntegrationStatus.CONNECTED,
          isActive: true,
          webhookVerified: true,
          lastSyncStatus: null,
        },
      });
      setTimeout(() => this.afterConnect(id).catch((e) => this.logger.warn(`Daraz setup: ${e?.message}`)), 300);
      return `${web}/connect/daraz/done?channel=${id}&success=1`;
    } catch (e: any) {
      this.logger.warn(`Daraz callback: ${e?.message}`);
      const msg = encodeURIComponent(String(e?.response?.message ?? e?.message ?? 'Masla hua').slice(0, 200));
      return `${web}/connect/daraz/done?channel=${channelId}&success=0&error=${msg}`;
    }
  }

  /** Jurte hi: products SKU se jorna, pichhle 3 din ke orders, stock */
  async afterConnect(id: string) {
    const ch = await this.prisma.integration.findUnique({ where: { id } });
    if (!ch) return;
    await this.linkProducts(ch).catch((e) => this.logger.warn(`Daraz link: ${e?.message}`));
    await this.syncOrders(ch).catch((e) => this.logger.warn(`Daraz orders: ${e?.message}`));
    await this.syncStock(ch).catch((e) => this.logger.warn(`Daraz stock: ${e?.message}`));
  }

  isConnected(i: Integration) {
    return i.type === 'DARAZ' && !!(i.credentials as any)?.darazAccessToken;
  }

  /** Token 1 din me khatam hone wala ho to naya lo (har refresh par naya refresh token) */
  async client(i: Integration): Promise<DarazClient> {
    const { key, secret } = this.app();
    const c = (i.credentials ?? {}) as any;
    if (!c.darazAccessToken) throw new BadRequestException('Daraz jura nahi — "Daraz jorein" dabayein');
    const exp = Date.parse(c.darazExpiresAt ?? '');
    if (!exp || exp - Date.now() < 24 * 3600_000) {
      const refresh = decrypt(c.darazRefreshToken);
      if (!refresh || Date.parse(c.darazRefreshExpiresAt ?? '') < Date.now()) {
        await this.markNeedsReconnect(i, 'Daraz ki ijazat khatam — "Dobara jorein" dabayein');
        throw new BadRequestException('Daraz ki ijazat khatam ho gayi — channel par "Dobara jorein" dabayein');
      }
      try {
        const tok = readTokenResponse(await new DarazClient(key, secret).refreshToken(refresh));
        await this.prisma.integration.update({
          where: { id: i.id },
          data: { credentials: { ...c, darazAccessToken: encrypt(tok.accessToken), darazRefreshToken: encrypt(tok.refreshToken || refresh), darazExpiresAt: tok.expiresAt, darazRefreshExpiresAt: tok.refreshToken ? tok.refreshExpiresAt : c.darazRefreshExpiresAt } },
        });
        return new DarazClient(key, secret, tok.accessToken);
      } catch (e: any) {
        if (e instanceof DarazError && e.auth) await this.markNeedsReconnect(i, e.message);
        throw e;
      }
    }
    return new DarazClient(key, secret, decrypt(c.darazAccessToken));
  }

  private async markNeedsReconnect(i: Integration, reason: string) {
    const cfg = (i.config ?? {}) as any;
    await this.prisma.integration.update({
      where: { id: i.id },
      data: { status: IntegrationStatus.ERROR, lastSyncStatus: 'FAILED', config: { ...cfg, darazError: reason, darazErrorAt: new Date().toISOString() } },
    }).catch(() => null);
  }

  // ═══════════════════════════════════════════════════════════
  // ORDERS — har 5 minute (Daraz webhook OV/EV SSL maangta hai)
  // ═══════════════════════════════════════════════════════════

  @Cron('20 */5 * * * *')
  async syncAll() {
    if (this.running || process.env.DISABLE_DARAZ_SYNC === '1' || !this.configured()) return;
    this.running = true;
    try {
      const list = await this.prisma.integration.findMany({ where: { type: 'DARAZ', isActive: true, status: IntegrationStatus.CONNECTED } });
      for (const i of list) {
        if (!this.isConnected(i)) continue;
        await this.syncOrders(i).catch((e) => this.logger.warn(`Daraz orders ${i.displayName}: ${e?.message}`));
      }
    } finally {
      this.running = false;
    }
  }

  async syncOrders(i: Integration) {
    const client = await this.client(i);
    const cfg = (i.config ?? {}) as any;
    const since = cfg.darazOrdersSyncedAt ? new Date(Date.parse(cfg.darazOrdersSyncedAt) - 15 * 60_000) : new Date(Date.now() - FIRST_SYNC_DAYS * 86_400_000);
    const startedAt = new Date();
    const orders: any[] = [];
    for (let offset = 0; offset < 2000; offset += 100) {
      const r = await client.call('/orders/get', { update_after: isoPk(since), sort_by: 'updated_at', sort_direction: 'ASC', offset, limit: 100 });
      const page: any[] = r?.data?.orders ?? [];
      orders.push(...page);
      if (page.length < 100) break;
    }
    let created = 0;
    for (let k = 0; k < orders.length; k += 20) {
      const chunk = orders.slice(k, k + 20);
      const itemsRes = await client.call('/orders/items/get', { order_ids: `[${chunk.map((o) => o.order_id).join(',')}]` }).catch(() => null);
      const byOrder = new Map<string, any[]>(((itemsRes?.data ?? []) as any[]).map((x) => [String(x.order_id), x.order_items ?? []]));
      for (const o of chunk) {
        const r = await this.applyOrder(i, o, byOrder.get(String(o.order_id)) ?? []).catch((e) => { this.logger.warn(`Daraz order ${o.order_number}: ${e?.message}`); return null; });
        if (r === 'created') created++;
      }
    }
    const fresh = await this.prisma.integration.findUnique({ where: { id: i.id }, select: { config: true } });
    await this.prisma.integration.update({
      where: { id: i.id },
      data: { config: { ...((fresh?.config as any) ?? {}), darazOrdersSyncedAt: startedAt.toISOString() }, lastSyncAt: new Date(), lastSyncStatus: 'SUCCESS' },
    });
    await this.log(i, 'ORDER_SYNC', true, undefined, { seen: orders.length, created });
    return { seen: orders.length, created };
  }

  /** Ek Daraz order → Nafaa: naya ho to receive, warna status mila do */
  private async applyOrder(i: Integration, o: any, rows: any[]) {
    const state = darazOrderState(Array.isArray(o.statuses) ? o.statuses : rows.map((r) => r.status));
    if (state === 'skip') return 'skip';
    const externalId = String(o.order_id);
    const existing = await this.prisma.channelOrder.findUnique({
      where: { integrationId_externalOrderId: { integrationId: i.id, externalOrderId: externalId } },
      select: { id: true, orderStatus: true, nafaaSaleId: true, dispatchedAt: true },
    });

    if (!existing) {
      if (state === 'cancelled') return 'skip'; // pehle hi cancel — Nafaa me laane ki zaroorat nahi
      const items = groupDarazItems(rows);
      if (!items.length) return 'skip';
      const a = o.address_shipping ?? {};
      const subtotal = items.reduce((s, x) => s + x.price * x.quantity, 0);
      const shipping = Number(o.shipping_fee ?? 0) || 0;
      const voucher = Number(o.voucher_seller ?? 0) || 0;
      const order: NormalizedOrder = {
        platform: 'daraz',
        externalOrderId: externalId,
        externalOrderNumber: String(o.order_number ?? externalId),
        customerName: [o.customer_first_name ?? a.first_name, o.customer_last_name ?? a.last_name].filter(Boolean).join(' ').trim() || 'Daraz customer',
        customerPhone: a.phone ? String(a.phone) : undefined,
        customerAddress: [a.address1, a.address2, a.address3, a.address4, a.address5].filter(Boolean).join(', ') || undefined,
        customerCity: a.city ? String(a.city) : undefined,
        items: items.map(({ ids, ...x }) => x) as any,
        subtotal,
        deliveryFee: 0, // Daraz ka shipping Daraz ka — dukandar ke bill me nahi
        discount: voucher,
        total: Math.max(0, subtotal - voucher),
        paymentMethod: 'daraz',
        paymentStatus: 'PENDING',
        cancelled: false,
        notes: [o.buyer_note, o.remarks].filter(Boolean).join(' · ') || undefined,
        paymentTitle: `Daraz · ${o.payment_method ?? ''}`.trim(),
        shippingMethod: `Daraz${shipping ? ` (customer shipping Rs ${shipping})` : ''}`,
      };
      const saved = await this.orders.receive(i, order, { signed: true });
      await this.mergeDarazMeta(saved.id, { orderItemIds: rows.map((r) => String(r.order_item_id)), statuses: o.statuses ?? [] });
      return 'created';
    }

    // Maujood order: Daraz ka haal Nafaa par
    await this.mergeDarazMeta(existing.id, { statuses: o.statuses ?? [] });
    if (CLOSED.includes(existing.orderStatus)) return 'same';
    const actor = await this.orders.systemActor(i.tenantId);
    const all = new ShopScope(null, true);
    if (state === 'cancelled') {
      await this.orders.applyWebsiteUpdate(i, externalId, { cancelled: true, reason: 'Daraz par cancel hua' });
    } else if (!existing.nafaaSaleId) {
      return 'same'; // abhi accept nahi — dukandar pehle accept kare
    } else if (state === 'returned' && existing.dispatchedAt) {
      await this.orders.markReturned(actor, all, existing.id, 'Daraz: wapas / failed');
    } else if (state === 'delivered' && existing.orderStatus !== 'DELIVERED') {
      await this.orders.updateStatus(actor, all, existing.id, { status: 'DELIVERED' });
    } else if ((state === 'shipped' || state === 'delivered') && ['CONFIRMED', 'PREPARING', 'READY'].includes(existing.orderStatus)) {
      await this.orders.updateStatus(actor, all, existing.id, { status: 'OUT_FOR_DELIVERY' });
    }
    return 'updated';
  }

  private async mergeDarazMeta(orderId: string, patch: Record<string, unknown>) {
    const row = await this.prisma.channelOrder.findUnique({ where: { id: orderId }, select: { metadata: true } });
    const meta = (row?.metadata ?? {}) as any;
    await this.prisma.channelOrder.update({ where: { id: orderId }, data: { metadata: { ...meta, daraz: { ...(meta.daraz ?? {}), ...patch } } } }).catch(() => null);
  }

  // ═══════════════════════════════════════════════════════════
  // PRODUCTS — Daraz ke SellerSku = Nafaa SKU se jorna
  // ═══════════════════════════════════════════════════════════

  async linkProducts(i: Integration) {
    const client = await this.client(i);
    const skus: { itemId: string; skuId: string; sellerSku: string; title: string; image: string | null }[] = [];
    for (let offset = 0; offset < 10_000; offset += 50) {
      const r = await client.call('/products/get', { filter: 'all', offset, limit: 50 });
      const page: any[] = r?.data?.products ?? [];
      for (const p of page) {
        for (const s of (p.skus ?? []) as any[]) {
          if (!s?.SellerSku) continue;
          skus.push({ itemId: String(p.item_id), skuId: String(s.SkuId ?? ''), sellerSku: String(s.SellerSku), title: String(p.attributes?.name ?? s.SellerSku), image: p.images?.[0] ?? s.Images?.[0] ?? null });
        }
      }
      if (page.length < 50) break;
    }
    const all = [...new Set(skus.map((s) => s.sellerSku))];
    const [variants, products] = await Promise.all([
      this.prisma.productVariant.findMany({ where: { sku: { in: all }, isActive: true, product: { tenantId: i.tenantId } }, select: { id: true, productId: true, sku: true } }),
      this.prisma.product.findMany({ where: { tenantId: i.tenantId, sku: { in: all }, isActive: true }, select: { id: true, sku: true } }),
    ]);
    let linked = 0;
    for (const s of skus) {
      const v = variants.find((x) => x.sku === s.sellerSku);
      const p = v ? { id: v.productId } : products.find((x) => x.sku === s.sellerSku);
      if (!p) continue;
      const linkKey = `${p.id}:${v?.id ?? '-'}`;
      await this.prisma.productChannelMapping.upsert({
        where: { integrationId_linkKey: { integrationId: i.id, linkKey } },
        create: { integrationId: i.id, productId: p.id, variantId: v?.id ?? null, linkKey, externalProductId: s.itemId, externalVariantId: s.skuId || null, externalSku: s.sellerSku, externalTitle: s.title.slice(0, 200), externalImage: s.image, syncStatus: 'SUCCESS' },
        update: { externalProductId: s.itemId, externalVariantId: s.skuId || null, externalSku: s.sellerSku, externalTitle: s.title.slice(0, 200), externalImage: s.image },
      });
      linked++;
    }
    await this.log(i, 'PRODUCT_LINK', true, undefined, { daraz: skus.length, linked, unmatched: skus.length - linked });
    return { daraz: skus.length, linked, unmatched: skus.length - linked };
  }

  // ═══════════════════════════════════════════════════════════
  // STOCK — Nafaa → Daraz (har 30 minute poora + POS sale par foran)
  // ═══════════════════════════════════════════════════════════

  @Cron('0 25,55 * * * *')
  async stockAll() {
    if (process.env.DISABLE_DARAZ_SYNC === '1' || !this.configured()) return;
    const list = await this.prisma.integration.findMany({ where: { type: 'DARAZ', isActive: true, status: IntegrationStatus.CONNECTED } });
    for (const i of list) {
      if (this.isConnected(i)) await this.syncStock(i).catch((e) => this.logger.warn(`Daraz stock ${i.displayName}: ${e?.message}`));
    }
  }

  /** productIds = sirf yeh (POS sale ke baad), warna sab jore hue */
  async syncStock(i: Integration, opts: { productIds?: string[] } = {}) {
    const client = await this.client(i);
    const maps = await this.prisma.productChannelMapping.findMany({
      where: { integrationId: i.id, externalProductId: { not: null }, externalVariantId: { not: null }, ...(opts.productIds ? { productId: { in: opts.productIds } } : {}) },
      select: { externalProductId: true, externalVariantId: true, externalSku: true },
    });
    if (!maps.length) return { updated: 0 };
    const stock = await this.catalog.stockByLink(i);
    const rows = maps
      .map((m) => ({ itemId: m.externalProductId!, skuId: m.externalVariantId!, sellerSku: m.externalSku ?? '', quantity: stock.get(String(m.externalVariantId)) ?? stock.get(String(m.externalProductId)) }))
      .filter((r): r is { itemId: string; skuId: string; sellerSku: string; quantity: number } => r.quantity !== undefined && !!r.sellerSku);
    let updated = 0;
    for (let k = 0; k < rows.length; k += 20) {
      const chunk = rows.slice(k, k + 20);
      await client.call('/product/price_quantity/update', { payload: stockXml(chunk) }, 'POST');
      updated += chunk.length;
    }
    await this.log(i, 'STOCK_SYNC', true, undefined, { updated });
    return { updated };
  }

  // ═══════════════════════════════════════════════════════════
  // FULFILLMENT — pack + ready to ship + Daraz ka label
  // ═══════════════════════════════════════════════════════════

  private async darazOrder(user: AuthenticatedUser, orderId: string) {
    const order = await this.prisma.channelOrder.findFirst({ where: { id: orderId, tenantId: user.tenantId }, include: { integration: true } });
    if (!order || order.integration.type !== 'DARAZ') throw new NotFoundException('Daraz order nahi mila');
    return order;
  }

  async readyToShip(user: AuthenticatedUser, orderId: string) {
    const order = await this.darazOrder(user, orderId);
    if (!order.nafaaSaleId) throw new BadRequestException('Pehle order accept karein (bill + stock), phir Daraz par ready to ship');
    const client = await this.client(order.integration);
    const meta = (order.metadata ?? {}) as any;
    const items: any[] = (await client.call('/order/items/get', { order_id: order.externalOrderId }))?.data ?? [];
    const itemIds = items.filter((x) => !['canceled', 'cancelled'].includes(String(x.status).toLowerCase())).map((x) => Number(x.order_item_id));
    if (!itemIds.length) throw new BadRequestException('Is order me bhejne wala koi item nahi (sab cancel?)');

    let packages: string[] = meta.daraz?.packageIds ?? [];
    let tracking: string | null = meta.daraz?.trackingNumber ?? null;
    let provider: string | null = meta.daraz?.provider ?? null;
    if (!packages.length) {
      const prov = (await client.call('/order/shipment/providers/get', { getShipmentProvidersReq: { orders: [{ order_id: Number(order.externalOrderId), order_item_ids: itemIds }] } }))?.result?.data ?? {};
      const allocate = String(prov.shipping_allocate_type ?? 'TFS');
      const code = prov.platform_default ?? prov.shipment_providers?.[0]?.provider_code;
      const pack = await client.call('/order/fulfill/pack', {
        packReq: {
          pack_order_list: [{ order_id: Number(order.externalOrderId), order_item_list: itemIds }],
          delivery_type: 'dropship',
          shipping_allocate_type: allocate,
          ...(allocate !== 'TFS' && code ? { shipment_provider_code: code } : {}),
        },
      }, 'POST');
      const found = collect(pack, 'package_id');
      const errs = collect(pack, 'item_err_code').filter((x: any) => String(x.item_err_code) !== '0');
      if (errs.length && !found.length) throw new BadRequestException(`Daraz ne pack nahi kiya: ${errs[0].msg ?? errs[0].item_err_code}`);
      packages = [...new Set(found.map((x: any) => String(x.package_id)))];
      tracking = found.find((x: any) => x.tracking_number)?.tracking_number ?? null;
      provider = found.find((x: any) => x.shipment_provider)?.shipment_provider ?? null;
      if (!packages.length) throw new BadRequestException('Daraz ne package number nahi diya — Seller Center par check karein');
    }
    await client.call('/order/package/rts', { readyToShipReq: { packages: packages.map((p) => ({ package_id: p })) } }, 'POST');
    await this.mergeDarazMeta(order.id, { packageIds: packages, trackingNumber: tracking, provider, rtsAt: new Date().toISOString() });
    await this.prisma.channelOrder.update({
      where: { id: order.id },
      data: { trackingNumber: tracking, courierName: provider ? `Daraz · ${provider}` : 'Daraz', courierCode: 'OTHER', ...(['CONFIRMED', 'PREPARING'].includes(order.orderStatus) ? { orderStatus: 'READY' } : {}) },
    });
    return { ok: true, packages, trackingNumber: tracking, provider };
  }

  async label(user: AuthenticatedUser, orderId: string): Promise<{ pdf?: Buffer; url?: string }> {
    const order = await this.darazOrder(user, orderId);
    const packages: string[] = ((order.metadata as any)?.daraz?.packageIds ?? []);
    if (!packages.length) throw new BadRequestException('Pehle "Daraz: ready to ship" dabayein — phir label banta hai');
    const client = await this.client(order.integration);
    const r = await client.call('/order/package/document/get', { getDocumentReq: { doc_type: 'PDF', packages: packages.map((p) => ({ package_id: p })), print_item_list: false } }, 'POST');
    const data = r?.result?.data ?? r?.data ?? {};
    if (data.file) return { pdf: Buffer.from(String(data.file), 'base64') };
    if (data.pdf_url) return { url: String(data.pdf_url) };
    throw new BadRequestException('Daraz se label nahi mila — Seller Center se print karein');
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  private webOrigin(requested?: string) {
    const fallback = (process.env.WEB_APP_URL || 'https://app.nafaa.pk').replace(/\/+$/, '');
    if (!requested) return fallback;
    try {
      const u = new URL(requested);
      const ok = /(^|\.)nafaa\.pk$/.test(u.hostname) || (process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(u.hostname));
      return ok ? u.origin : fallback;
    } catch {
      return fallback;
    }
  }

  private secret() {
    return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'nafaa-dev-state';
  }

  private signState(id: string, origin: string) {
    const exp = Date.now() + 30 * 60_000;
    const payload = `${id}.${exp}.${Buffer.from(origin).toString('base64url')}`;
    return `${payload}.${crypto.createHmac('sha256', this.secret()).update(`daraz:${payload}`).digest('hex').slice(0, 32)}`;
  }

  private verifyState(state: string) {
    const [id, exp, o, sig] = state.split('.');
    if (!id || !exp || !o || !sig) throw new UnauthorizedException('Ghalat request');
    const expected = crypto.createHmac('sha256', this.secret()).update(`daraz:${id}.${exp}.${o}`).digest('hex').slice(0, 32);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new UnauthorizedException('Ghalat request');
    if (Date.now() > Number(exp)) throw new UnauthorizedException('Link purana ho gaya — dobara "Daraz jorein" dabayein');
    return { id, origin: this.webOrigin(Buffer.from(o, 'base64url').toString()) };
  }

  private async log(i: Integration, operation: string, ok: boolean, error?: string, details?: any) {
    await this.prisma.syncLog.create({
      data: {
        integrationId: i.id, tenantId: i.tenantId, operation,
        direction: operation === 'ORDER_SYNC' || operation === 'PRODUCT_LINK' ? 'INBOUND' : 'OUTBOUND',
        status: ok ? 'SUCCESS' : 'FAILED',
        recordsSuccess: Number(details?.created ?? details?.linked ?? details?.updated ?? (ok ? 1 : 0)) || 0,
        recordsFailed: Number(details?.unmatched ?? (ok ? 0 : 1)) || 0,
        errorMessage: error ?? null,
        details: details ?? undefined,
        completedAt: new Date(),
      },
    }).catch(() => null);
  }
}

/** Jawab me kahin bhi `key` wale objects (Daraz ki nested shakal badalti rehti hai) */
function collect(o: any, key: string, out: any[] = []): any[] {
  if (!o || typeof o !== 'object') return out;
  if (Array.isArray(o)) { o.forEach((x) => collect(x, key, out)); return out; }
  if (key in o) out.push(o);
  for (const v of Object.values(o)) if (v && typeof v === 'object') collect(v, key, out);
  return out;
}
