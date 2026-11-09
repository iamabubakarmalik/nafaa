/**
 * Website conversion tools:
 *   - bought together: products that sell in the same bill, from the shop's
 *     own bills (online bills when there are enough, else all bills), for
 *     the website API, the order-form snippet and the merchant's list;
 *   - free-delivery threshold advice from the spread of online order values;
 *   - coupon automation: personal codes for abandoned carts and customers
 *     who stopped ordering (win-back), kept here, accepted by the Nafaa order
 *     form, and matched to the order that used them (the code on a Shopify,
 *     WooCommerce or website order, or the order form).
 * Nafaa cannot create Shopify discount codes (that needs a store permission
 * it does not ask for), so for those shops the merchant types one shared code
 * in Shopify/WooCommerce and Nafaa sends that code and matches it by phone.
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { phoneKey } from '../customer-risk';
import { readForm } from '../storefront.service';
import { readWebsiteConfig } from '../website-config';
import {
  CouponRow, PairCount, boughtWith, cleanCouponCode, couponApplies, couponCode, freeShippingAdvice, topPairs,
} from './conversion-math';

const DAY = 86_400_000;
const CACHE_MS = 6 * 3_600_000;
const HISTORY_DAYS = 180;
/** Online bills needed before only online bills are used. */
const MIN_ONLINE_BILLS = 50;
const settingsKey = (tenantId: string) => `online_coupon_auto:${tenantId}`;

export interface CouponRule { enabled: boolean; type: 'PERCENT' | 'FIXED'; value: number; validDays: number; minSubtotal: number }
export interface CouponSettings {
  abandoned: CouponRule & { afterHours: number };
  winBack: CouponRule & { afterDays: number };
  /** Shopify/WooCommerce shops: the one code typed there; sent instead of personal codes. */
  sharedCode: string | null;
}

export const DEFAULT_COUPONS: CouponSettings = {
  abandoned: { enabled: false, type: 'PERCENT', value: 5, validDays: 3, minSubtotal: 0, afterHours: 2 },
  winBack: { enabled: false, type: 'PERCENT', value: 10, validDays: 14, minSubtotal: 0, afterDays: 60 },
  sharedCode: null,
};

const clamp = (v: unknown, min: number, max: number, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

function normalizeRule<T extends CouponRule>(raw: any, d: T): T {
  const type = raw?.type === 'FIXED' ? 'FIXED' : 'PERCENT';
  return {
    ...d,
    enabled: raw?.enabled === true,
    type,
    value: clamp(raw?.value, 1, type === 'PERCENT' ? 50 : 50_000, d.value),
    validDays: Math.round(clamp(raw?.validDays, 1, 60, d.validDays)),
    minSubtotal: clamp(raw?.minSubtotal, 0, 1_000_000, d.minSubtotal),
  };
}

export function normalizeCoupons(raw: any): CouponSettings {
  const a = normalizeRule(raw?.abandoned, DEFAULT_COUPONS.abandoned);
  const w = normalizeRule(raw?.winBack, DEFAULT_COUPONS.winBack);
  return {
    abandoned: { ...a, afterHours: Math.round(clamp(raw?.abandoned?.afterHours, 1, 72, 2)) },
    winBack: { ...w, afterDays: Math.round(clamp(raw?.winBack?.afterDays, 30, 365, 60)) },
    sharedCode: cleanCouponCode(raw?.sharedCode) || null,
  };
}

interface Basket { at: number; bills: number; online: boolean; counts: Map<string, number>; pairs: PairCount[] }

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);
  private readonly baskets = new Map<string, Basket>();

  constructor(private readonly prisma: PrismaService) {}

  /* ───────────── bought together ───────────── */

  /** Bill counts per product and per pair, cached for 6 hours per business. */
  private async basket(tenantId: string): Promise<Basket> {
    const hit = this.baskets.get(tenantId);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit;
    const since = new Date(Date.now() - HISTORY_DAYS * DAY);
    const onlineBills = await this.prisma.sale.count({
      where: { tenantId, createdAt: { gte: since }, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }, source: { notIn: ['POS', 'DISTRIBUTION'] } },
    });
    const online = onlineBills >= MIN_ONLINE_BILLS;
    const sourceSql = online ? Prisma.sql`AND s.source::text NOT IN ('POS', 'DISTRIBUTION')` : Prisma.sql`AND s.source::text <> 'DISTRIBUTION'`;
    // Bills with 2–30 different products; very big (wholesale) bills would pair everything with everything.
    const cte = Prisma.sql`WITH b AS (
      SELECT s.id, array_agg(DISTINCT si."productId") AS p
      FROM "Sale" s JOIN "SaleItem" si ON si."saleId" = s.id
      WHERE s."tenantId" = ${tenantId} AND s."createdAt" >= ${since} AND s.status::text IN ('COMPLETED', 'PARTIALLY_RETURNED')
        AND si."productId" IS NOT NULL ${sourceSql}
      GROUP BY s.id HAVING count(DISTINCT si."productId") BETWEEN 1 AND 30
    )`;
    const [billsRow, countRows, pairRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ n: bigint }>>`${cte} SELECT count(*)::bigint AS n FROM b`,
      this.prisma.$queryRaw<Array<{ id: string; n: bigint }>>`${cte} SELECT x AS id, count(*)::bigint AS n FROM b, unnest(b.p) x GROUP BY x`,
      this.prisma.$queryRaw<Array<{ a: string; b: string; n: bigint }>>`${cte}
        SELECT x AS a, y AS b, count(*)::bigint AS n FROM b, unnest(b.p) x, unnest(b.p) y
        WHERE x < y GROUP BY x, y HAVING count(*) >= 2 ORDER BY n DESC LIMIT 5000`,
    ]);
    const basket: Basket = {
      at: Date.now(), online,
      bills: Number(billsRow[0]?.n ?? 0),
      counts: new Map(countRows.map((r) => [r.id, Number(r.n)])),
      pairs: pairRows.map((r) => ({ a: r.a, b: r.b, together: Number(r.n) })),
    };
    this.baskets.set(tenantId, basket);
    return basket;
  }

  /** Product cards for ids, in the given order, with the branch stock. */
  private async cards(tenantId: string, shopId: string | null, ids: string[], allowed?: string[] | null) {
    if (!ids.length) return [];
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: allowed ? ids.filter((i) => allowed.includes(i)) : ids }, isActive: true, price: { gt: 0 } },
      select: {
        id: true, name: true, sku: true, price: true, hasVariants: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } },
      },
    });
    const stock = shopId
      ? await this.prisma.shopStock.findMany({ where: { shopId, productId: { in: products.map((p) => p.id) } }, select: { productId: true, stock: true } })
      : [];
    const stockOf = (id: string) => stock.filter((s) => s.productId === id).reduce((s, x) => s + Number(x.stock ?? 0), 0);
    const byId = new Map(products.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p).map((p) => ({
      id: p.id, name: p.name, sku: p.sku, price: Number(p.price), image: p.images[0]?.url ?? null, hasVariants: p.hasVariants,
      inStock: shopId ? stockOf(p.id) > 0 : true,
    }));
  }

  private async productIdFor(tenantId: string, ref: { productId?: string; sku?: string }) {
    if (ref.productId) return ref.productId;
    const sku = String(ref.sku ?? '').trim().slice(0, 80);
    if (!sku) return null;
    const p = await this.prisma.product.findFirst({ where: { tenantId, OR: [{ sku }, { barcode: sku }] }, select: { id: true } })
      ?? (await this.prisma.productVariant.findFirst({ where: { product: { tenantId }, sku }, select: { productId: true } }).then((v) => (v ? { id: v.productId } : null)));
    return p?.id ?? null;
  }

  /** "Customers also bought": products bought with one product, as cards. */
  async together(tenantId: string, shopId: string | null, ref: { productId?: string; sku?: string }, limit = 4, allowed?: string[] | null) {
    const id = await this.productIdFor(tenantId, ref);
    if (!id) return { product: null, items: [] };
    const b = await this.basket(tenantId);
    const top = boughtWith(id, b.pairs, b.counts, b.bills, Math.min(12, limit + 4));
    const cards = await this.cards(tenantId, shopId, top.map((t) => t.productId), allowed);
    const stat = new Map(top.map((t) => [t.productId, t]));
    // Out-of-stock suggestions go last, so a shop never pushes what it cannot send.
    const items = cards
      .map((c) => ({ ...c, together: stat.get(c.id)!.together, confidence: stat.get(c.id)!.confidence, lift: stat.get(c.id)!.lift }))
      .sort((x, y) => Number(y.inStock) - Number(x.inStock))
      .slice(0, Math.max(1, Math.min(12, limit)));
    return { product: id, items };
  }

  /** Public order form ("form key"): bought-together cards limited to the form's products. */
  async formTogether(key: string, ref: { productId?: string; sku?: string }, limit?: number) {
    if (!key || !/^f_[A-Za-z0-9_-]{8,40}$/.test(key)) throw new NotFoundException('Ye order form nahi mila');
    const ch = await this.prisma.integration.findFirst({ where: { isActive: true, config: { path: ['form', 'key'], equals: key } } });
    const f = ch ? readForm(ch.config) : null;
    if (!ch || !f?.enabled) throw new NotFoundException('Ye order form band hai');
    const shopId = readWebsiteConfig(ch.config).shopId ?? ch.shopId;
    const r = await this.together(ch.tenantId, shopId, ref, limit ?? 4, f.productIds);
    return { items: r.items.filter((i) => !f.onlyInStock || i.inStock).map(({ together: _t, confidence: _c, lift: _l, ...card }) => card) };
  }

  /** Merchant overview: the strongest pairs and what the list is based on. */
  async overview(user: AuthenticatedUser, scope: ShopScope) {
    const b = await this.basket(user.tenantId);
    const pairs = topPairs(b.pairs, b.counts, b.bills, 25);
    const ids = [...new Set(pairs.flatMap((p) => [p.a, p.b]))];
    const cards = await this.cards(user.tenantId, scope.shopId ?? null, ids);
    const byId = new Map(cards.map((c) => [c.id, c]));
    return {
      basis: { bills: b.bills, online: b.online, days: HISTORY_DAYS, computedAt: new Date(b.at) },
      productsWithPairs: new Set(b.pairs.filter((p) => p.together >= 2).flatMap((p) => [p.a, p.b])).size,
      pairs: pairs.filter((p) => byId.has(p.a) && byId.has(p.b)).map((p) => ({ a: byId.get(p.a)!, b: byId.get(p.b)!, together: p.together, lift: p.lift, confidence: p.confidence })),
    };
  }

  /* ───────────── free delivery threshold ───────────── */

  async freeShipping(user: AuthenticatedUser, scope: ShopScope) {
    const since = new Date(Date.now() - 90 * DAY);
    const orders = await this.prisma.channelOrder.findMany({
      where: { tenantId: user.tenantId, ...(scope.whereLoose as any), receivedAt: { gte: since }, deletedAt: null, orderStatus: { notIn: ['CANCELLED', 'REJECTED'] } },
      select: { subtotal: true, discount: true, deliveryFee: true, courierCharge: true },
      take: 20_000,
    });
    const values = orders.map((o) => Number(o.subtotal) - Number(o.discount));
    const known = orders.filter((o) => o.courierCharge != null && o.courierCharge > 0);
    const fees = orders.filter((o) => Number(o.deliveryFee) > 0);
    const shippingCost = known.length
      ? known.reduce((s, o) => s + Number(o.courierCharge), 0) / known.length
      : fees.length ? fees.reduce((s, o) => s + Number(o.deliveryFee), 0) / fees.length : 250;
    const advice = freeShippingAdvice(values, shippingCost);
    const forms = await this.prisma.integration.findMany({ where: { tenantId: user.tenantId, isActive: true, config: { path: ['form', 'key'], not: Prisma.AnyNull } }, select: { id: true, displayName: true, config: true } });
    return {
      ...advice,
      shippingCost: Math.round(shippingCost),
      shippingCostKnown: known.length > 0,
      days: 90,
      forms: forms.map((f) => { const c = readForm(f.config); return { id: f.id, name: f.displayName, enabled: c.enabled, freeAbove: c.freeAbove, deliveryFee: c.deliveryFee }; }),
    };
  }

  /* ───────────── coupon automation ───────────── */

  async settings(tenantId: string): Promise<CouponSettings> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: settingsKey(tenantId) } });
    let raw: unknown = null;
    try { raw = row?.value ? JSON.parse(row.value) : null; } catch { raw = null; }
    return normalizeCoupons(raw);
  }

  async saveSettings(user: AuthenticatedUser, body: unknown) {
    const s = normalizeCoupons(body);
    const value = JSON.stringify(s);
    await this.prisma.systemSetting.upsert({ where: { key: settingsKey(user.tenantId) }, create: { key: settingsKey(user.tenantId), value, category: 'online_orders', isPublic: false }, update: { value } });
    return s;
  }

  /** Coupons with their status, newest first, plus totals. Matches used codes first. */
  async coupons(user: AuthenticatedUser, q: { kind?: string; status?: string }) {
    await this.attribute(user.tenantId);
    const now = new Date();
    const where: Prisma.CommerceCouponWhereInput = { tenantId: user.tenantId, ...(q.kind && ['WIN_BACK', 'ABANDONED_CART', 'MANUAL'].includes(q.kind) && { kind: q.kind }) };
    const statusWhere: Record<string, Prisma.CommerceCouponWhereInput> = {
      OPEN: { usedAt: null, sentAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      SENT: { usedAt: null, sentAt: { not: null }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      USED: { usedAt: { not: null } },
      EXPIRED: { usedAt: null, expiresAt: { lte: now } },
    };
    const [rows, all] = await Promise.all([
      this.prisma.commerceCoupon.findMany({ where: { ...where, ...(statusWhere[q.status ?? ''] ?? {}) }, orderBy: { createdAt: 'desc' }, take: 300 }),
      this.prisma.commerceCoupon.findMany({ where: { tenantId: user.tenantId, createdAt: { gte: new Date(now.getTime() - 90 * DAY) } }, select: { kind: true, sentAt: true, usedAt: true, usedOrderTotal: true, type: true, value: true } }),
    ]);
    const orderIds = rows.map((r) => r.usedOrderId).filter((x): x is string => !!x);
    const orders = orderIds.length ? await this.prisma.channelOrder.findMany({ where: { id: { in: orderIds } }, select: { id: true, externalOrderId: true, externalOrderNumber: true } }) : [];
    const om = new Map(orders.map((o) => [o.id, String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '')]));
    const used = all.filter((c) => c.usedAt);
    const sent = all.filter((c) => c.sentAt || c.usedAt);
    return {
      settings: await this.settings(user.tenantId),
      stats: {
        issued: all.length, sent: sent.length, used: used.length,
        usedValue: Math.round(used.reduce((s, c) => s + Number(c.usedOrderTotal ?? 0), 0)),
        rate: sent.length ? Math.round((used.length / sent.length) * 1000) / 10 : 0,
        byKind: ['ABANDONED_CART', 'WIN_BACK', 'MANUAL'].map((k) => ({ kind: k, issued: all.filter((c) => c.kind === k).length, used: used.filter((c) => c.kind === k).length })),
      },
      items: rows.map((r) => ({
        id: r.id, code: r.code, kind: r.kind, type: r.type, value: r.value, minSubtotal: r.minSubtotal, shared: r.shared,
        customerName: r.customerName, customerPhone: r.customerPhone, expiresAt: r.expiresAt, sentAt: r.sentAt,
        usedAt: r.usedAt, usedOrderId: r.usedOrderId, usedOrderNo: r.usedOrderId ? om.get(r.usedOrderId) ?? null : null, usedOrderTotal: r.usedOrderTotal,
        abandonedCheckoutId: r.abandonedCheckoutId, createdAt: r.createdAt,
        status: r.usedAt ? 'USED' : r.expiresAt && r.expiresAt <= now ? 'EXPIRED' : r.sentAt ? 'SENT' : 'OPEN',
      })),
    };
  }

  async markSent(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.commerceCoupon.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!row) throw new NotFoundException('Code nahi mila');
    return this.prisma.commerceCoupon.update({ where: { id }, data: { sentAt: row.sentAt ?? new Date() } });
  }

  /** Makes codes now for the rules that are on. */
  async runNow(user: AuthenticatedUser) {
    const s = await this.settings(user.tenantId);
    if (!s.abandoned.enabled && !s.winBack.enabled) throw new BadRequestException('Pehle koi rule on karein');
    return this.generate(user.tenantId, s, user.id);
  }

  private async issue(tenantId: string, rule: CouponRule, kind: string, prefix: string, sharedCode: string | null, who: { name: string | null; phone: string | null; cartId?: string }, userId: string | null) {
    let code = sharedCode;
    if (!code) {
      for (let i = 0; i < 5 && !code; i += 1) {
        const c = couponCode(prefix);
        if (!(await this.prisma.commerceCoupon.count({ where: { tenantId, code: c } }))) code = c;
      }
    }
    if (!code) return false;
    await this.prisma.commerceCoupon.create({
      data: {
        tenantId, code, kind, type: rule.type, value: rule.value, minSubtotal: rule.minSubtotal, shared: !!sharedCode,
        phoneKey: phoneKey(who.phone), customerName: who.name?.slice(0, 120) ?? null, customerPhone: who.phone?.slice(0, 30) ?? null,
        abandonedCheckoutId: who.cartId ?? null, expiresAt: new Date(Date.now() + rule.validDays * DAY), createdById: userId,
      },
    });
    return true;
  }

  /**
   * Abandoned carts: one code per cart with a phone, left `afterHours` ago
   * (within 7 days), not recovered. Win-back: one code per customer whose
   * last order is older than `afterDays` (within a year) and who got no code
   * in 90 days. At most 300 new codes per run.
   */
  async generate(tenantId: string, s: CouponSettings, userId: string | null = null) {
    const now = Date.now();
    let abandoned = 0;
    let winBack = 0;
    if (s.abandoned.enabled) {
      const carts = await this.prisma.abandonedCheckout.findMany({
        where: {
          tenantId, customerPhone: { not: null }, completedAt: null, recoveredAt: null,
          abandonedAt: { lte: new Date(now - s.abandoned.afterHours * 3_600_000), gte: new Date(now - 7 * DAY) },
        },
        select: { id: true, customerName: true, customerPhone: true },
        take: 300,
      });
      const done = new Set((await this.prisma.commerceCoupon.findMany({ where: { tenantId, abandonedCheckoutId: { in: carts.map((c) => c.id) } }, select: { abandonedCheckoutId: true } })).map((c) => c.abandonedCheckoutId));
      for (const c of carts) {
        if (done.has(c.id) || abandoned >= 300) continue;
        if (await this.issue(tenantId, s.abandoned, 'ABANDONED_CART', 'CART', s.sharedCode, { name: c.customerName, phone: c.customerPhone, cartId: c.id }, userId)) abandoned += 1;
      }
    }
    if (s.winBack.enabled) {
      const rows = await this.prisma.$queryRaw<Array<{ k: string; name: string | null; phone: string | null }>>`
        SELECT right(regexp_replace(o."customerPhone", '\\D', '', 'g'), 10) AS k, max(o."customerName") AS name, max(o."customerPhone") AS phone
        FROM "ChannelOrder" o
        WHERE o."tenantId" = ${tenantId} AND o."customerPhone" IS NOT NULL AND o."deletedAt" IS NULL AND o."orderStatus" = 'DELIVERED'
        GROUP BY 1
        HAVING length(right(regexp_replace(max(o."customerPhone"), '\\D', '', 'g'), 10)) = 10
          AND max(o."receivedAt") < ${new Date(now - s.winBack.afterDays * DAY)} AND max(o."receivedAt") >= ${new Date(now - 365 * DAY)}
        LIMIT 1000`;
      // Anyone who ordered since (any status) is not lost.
      const recent = new Set((await this.prisma.channelOrder.findMany({
        where: { tenantId, receivedAt: { gte: new Date(now - s.winBack.afterDays * DAY) }, customerPhone: { not: null } }, select: { customerPhone: true }, take: 50_000,
      })).map((o) => phoneKey(o.customerPhone)));
      const had = new Set((await this.prisma.commerceCoupon.findMany({
        where: { tenantId, kind: 'WIN_BACK', createdAt: { gte: new Date(now - 90 * DAY) } }, select: { phoneKey: true },
      })).map((c) => c.phoneKey));
      for (const r of rows) {
        if (winBack + abandoned >= 300) break;
        if (!r.k || recent.has(r.k) || had.has(r.k)) continue;
        if (await this.issue(tenantId, s.winBack, 'WIN_BACK', 'WAPAS', s.sharedCode, { name: r.name, phone: r.phone }, userId)) winBack += 1;
      }
    }
    return { abandoned, winBack };
  }

  /**
   * Matches codes to orders: a channel order carrying the code (Shopify,
   * WooCommerce, website, order form) received after the code was made. A
   * shared code also needs the same phone.
   */
  async attribute(tenantId: string) {
    const open = await this.prisma.commerceCoupon.findMany({
      where: { tenantId, usedAt: null, createdAt: { gte: new Date(Date.now() - 120 * DAY) } },
      select: { id: true, code: true, shared: true, phoneKey: true, createdAt: true }, take: 3000,
    });
    if (!open.length) return 0;
    const since = new Date(Math.min(...open.map((c) => c.createdAt.getTime())));
    const orders = await this.prisma.channelOrder.findMany({
      where: { tenantId, receivedAt: { gte: since }, discountCodes: { hasSome: [...new Set(open.map((c) => c.code))] } },
      select: { id: true, discountCodes: true, customerPhone: true, receivedAt: true, total: true },
      orderBy: { receivedAt: 'asc' }, take: 5000,
    });
    const taken = new Set((await this.prisma.commerceCoupon.findMany({ where: { tenantId, usedOrderId: { in: orders.map((o) => o.id) } }, select: { usedOrderId: true } })).map((c) => c.usedOrderId));
    let n = 0;
    for (const c of open) {
      const o = orders.find((x) => !taken.has(x.id) && x.receivedAt >= c.createdAt
        && x.discountCodes.map(cleanCouponCode).includes(c.code)
        && (!c.shared || (c.phoneKey && phoneKey(x.customerPhone) === c.phoneKey)));
      if (!o) continue;
      taken.add(o.id);
      await this.prisma.commerceCoupon.update({ where: { id: c.id }, data: { usedAt: o.receivedAt, usedOrderId: o.id, usedOrderTotal: Number(o.total) } });
      n += 1;
    }
    return n;
  }

  /** Daily at 10:00 Pakistan time: codes for every business with a rule on, then matching. */
  @Cron('0 0 5 * * *')
  async daily() {
    if (process.env.DISABLE_COUPON_AUTOMATION === '1' || process.env.DISABLE_COUPON_AUTOMATION === 'true') return;
    const rows = await this.prisma.systemSetting.findMany({ where: { key: { startsWith: 'online_coupon_auto:' } }, select: { key: true, value: true } });
    for (const r of rows) {
      const tenantId = r.key.slice('online_coupon_auto:'.length);
      try {
        const s = normalizeCoupons(JSON.parse(r.value ?? '{}'));
        if (s.abandoned.enabled || s.winBack.enabled) await this.generate(tenantId, s);
        await this.attribute(tenantId);
      } catch (e: any) {
        this.logger.warn(`Coupon automation ${tenantId}: ${e?.message}`);
      }
    }
  }
}
