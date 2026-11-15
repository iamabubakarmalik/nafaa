/**
 * Admin panel: Nafaa Market overview, shops (approval, verification, pause,
 * featured), orders monitor with cancel, and shop settlements. Reads the
 * Market tables directly; order cancels go through Online Orders so the POS
 * bill is voided and the customer's wallet/points come back.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MarketplaceOrderStatus, Prisma, ShopVerificationLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopScope } from '../../common/shop-scope';
import { OnlineOrdersService } from '../../integrations/online-orders/online-orders.service';
import { GATE_DEFINITIONS, MARKET_GATES, MarketGate, isMarketGate, resolveGate } from '../../marketplace/_shared/market-config';
import { MARKET_HOME_KEY, sanitizeHome } from '../../marketplace/_shared/market-home';
import { MarketSettingsService } from '../../marketplace/_shared/market-settings.service';
import { MarketStatusSyncService } from '../../marketplace/_shared/market-status-sync.service';
import { visibleShopWhere } from '../../marketplace/_shared/market-visibility';
import { STUCK_INTAKE_MS, STUCK_PENDING_MS, dayRange, lim, num, optionalRange, page, pages, round, text } from './admin-market.helpers';

const OPEN: MarketplaceOrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'];
const ORDER_STATUSES: MarketplaceOrderStatus[] = ['DRAFT', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'DISPUTED', 'RETURNED'];
const LEVELS: ShopVerificationLevel[] = ['UNVERIFIED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
const CHANNEL_DONE = ['DELIVERED', 'CANCELLED', 'REJECTED', 'RETURNED'];

type Review = { status: 'APPROVED' | 'REJECTED'; reason?: string; by: string; at: string };
export type ApprovalState = 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_LISTED';

/** The admin review note kept inside the profile's documents JSON (no extra column). */
function reviewOf(documents: unknown): Review | null {
  const r = documents && typeof documents === 'object' && !Array.isArray(documents) ? (documents as Record<string, any>).review : null;
  return r && (r.status === 'APPROVED' || r.status === 'REJECTED') ? (r as Review) : null;
}

/** Documents JSON with the review note set; an older array of files is kept under `files`. */
function withReview(documents: unknown, review: Review): Prisma.InputJsonValue {
  const base = Array.isArray(documents) ? { files: documents } : documents && typeof documents === 'object' ? { ...(documents as object) } : {};
  return { ...base, review } as Prisma.InputJsonValue;
}

/** Shop documents without the admin review note. */
function documentsOnly(documents: unknown) {
  if (!documents || typeof documents !== 'object' || Array.isArray(documents)) return documents ?? null;
  const { review: _review, ...rest } = documents as Record<string, unknown>;
  return Object.keys(rest).length ? rest : null;
}

function approvalState(p: { isListedOnMarketplace: boolean; verifiedAt: Date | null; documents: unknown }): ApprovalState {
  if (p.verifiedAt) return 'APPROVED';
  if (reviewOf(p.documents)?.status === 'REJECTED') return 'REJECTED';
  return p.isListedOnMarketplace ? 'PENDING' : 'NOT_LISTED';
}

const gateLabel = (g: MarketGate) => GATE_DEFINITIONS[g].label.en;

@Injectable()
export class AdminMarketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: MarketSettingsService,
    private readonly onlineOrders: OnlineOrdersService,
    private readonly sync: MarketStatusSyncService,
  ) {}

  // ─── Gate lookup ─────────────────────────────────────────────────────────

  /** shopId → resolved gate for every Market profile (the saved gate, else from the business type). */
  private async gateIndex(): Promise<Map<string, MarketGate>> {
    const rows = await this.prisma.shopMarketplaceProfile.findMany({ select: { shopId: true, gate: true, tenant: { select: { businessType: true } } } });
    return new Map(rows.map((r) => [r.shopId, resolveGate(r.gate, r.tenant?.businessType)]));
  }

  private async shopIdsForGate(gate: MarketGate): Promise<string[]> {
    const idx = await this.gateIndex();
    return [...idx.entries()].filter(([, g]) => g === gate).map(([id]) => id);
  }

  // ─── Overview ────────────────────────────────────────────────────────────

  async overview(q: { from?: string; to?: string }) {
    const { start, end } = dayRange(q.from, q.to);
    const cfg = await this.settings.platform();
    const home = await this.settings.home();
    const inRange = Prisma.sql`o."createdAt" >= ${start} AND o."createdAt" < ${end}`;
    const now = Date.now();

    const [totals, daily, groups, top, shopCounts, customers, newCustomers, stuck] = await Promise.all([
      this.prisma.$queryRaw<Array<Record<string, number>>>`
        SELECT count(*)::int AS orders,
          count(*) FILTER (WHERE o.status::text = 'DELIVERED')::int AS delivered,
          count(*) FILTER (WHERE o.status::text IN ('CANCELLED', 'REFUNDED'))::int AS cancelled,
          coalesce(sum(o.subtotal) FILTER (WHERE o.status::text = 'DELIVERED'), 0)::float AS gmv,
          count(DISTINCT o."customerId")::int AS buyers
        FROM marketplace_orders o WHERE ${inRange}`,
      this.prisma.$queryRaw<Array<{ day: Date; orders: number; gmv: number }>>`
        SELECT ((o."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Karachi')::date AS day,
          count(*)::int AS orders,
          coalesce(sum(o.subtotal) FILTER (WHERE o.status::text = 'DELIVERED'), 0)::float AS gmv
        FROM marketplace_orders o WHERE ${inRange} GROUP BY 1 ORDER BY 1`,
      this.prisma.$queryRaw<Array<{ gate: string | null; businessType: string | null; city: string | null; orders: number; gmv: number }>>`
        SELECT p.gate, t."businessType" AS "businessType", p.city,
          count(*)::int AS orders,
          coalesce(sum(o.subtotal) FILTER (WHERE o.status::text = 'DELIVERED'), 0)::float AS gmv
        FROM marketplace_orders o
        LEFT JOIN shop_marketplace_profiles p ON p."shopId" = o."shopId"
        LEFT JOIN "Tenant" t ON t.id = o."tenantId"
        WHERE ${inRange} GROUP BY 1, 2, 3`,
      this.prisma.$queryRaw<Array<{ shopId: string; name: string | null; city: string | null; gate: string | null; businessType: string | null; orders: number; gmv: number }>>`
        SELECT o."shopId", coalesce(p."publicName", s.name) AS name, p.city, p.gate, t."businessType" AS "businessType",
          count(*)::int AS orders,
          coalesce(sum(o.subtotal) FILTER (WHERE o.status::text = 'DELIVERED'), 0)::float AS gmv
        FROM marketplace_orders o
        LEFT JOIN shop_marketplace_profiles p ON p."shopId" = o."shopId"
        LEFT JOIN "Shop" s ON s.id = o."shopId"
        LEFT JOIN "Tenant" t ON t.id = o."tenantId"
        WHERE ${inRange} GROUP BY 1, 2, 3, 4, 5 ORDER BY gmv DESC, orders DESC LIMIT 10`,
      Promise.all([
        this.prisma.shopMarketplaceProfile.count(),
        this.prisma.shopMarketplaceProfile.count({ where: { isListedOnMarketplace: true } }),
        this.prisma.shopMarketplaceProfile.count({ where: { ...visibleShopWhere(cfg), isPaused: false } }),
        this.prisma.shopMarketplaceProfile.count({ where: { isPaused: true } }),
        this.prisma.shopMarketplaceProfile.count({ where: { isListedOnMarketplace: true, verifiedAt: null } }),
        this.prisma.shopMarketplaceProfile.count({ where: { listedAt: { gte: start, lt: end } } }),
      ]),
      this.prisma.marketplaceCustomer.count(),
      this.prisma.marketplaceCustomer.count({ where: { createdAt: { gte: start, lt: end } } }),
      this.prisma.marketplaceOrder.count({ where: this.stuckWhere(now) }),
    ]);

    const t = totals[0] ?? {};
    const orders = num(t.orders);
    const delivered = num(t.delivered);
    const gmv = round(num(t.gmv));

    const byGate = new Map<MarketGate, { orders: number; gmv: number }>();
    const byCity = new Map<string, { orders: number; gmv: number }>();
    for (const g of groups) {
      const gate = resolveGate(g.gate, g.businessType);
      const a = byGate.get(gate) ?? { orders: 0, gmv: 0 };
      a.orders += g.orders; a.gmv += num(g.gmv); byGate.set(gate, a);
      const city = (g.city ?? '').trim() || 'Unknown';
      const c = byCity.get(city) ?? { orders: 0, gmv: 0 };
      c.orders += g.orders; c.gmv += num(g.gmv); byCity.set(city, c);
    }
    const [total, listed, active, paused, pending, newShops] = shopCounts;

    return {
      from: start.toISOString(),
      to: end.toISOString(),
      totals: {
        orders, delivered, cancelled: num(t.cancelled), gmv,
        avgOrder: delivered ? round(gmv / delivered) : 0,
        cancelRate: orders ? Math.round((num(t.cancelled) / orders) * 1000) / 10 : 0,
        buyers: num(t.buyers),
      },
      shops: { total, listed, active, paused, pending, new: newShops },
      customers: { total: customers, new: newCustomers, buyers: num(t.buyers) },
      byGate: MARKET_GATES.map((g) => ({ gate: g, label: gateLabel(g), orders: byGate.get(g)?.orders ?? 0, gmv: round(byGate.get(g)?.gmv ?? 0) })),
      byCity: [...byCity.entries()].map(([city, v]) => ({ city, orders: v.orders, gmv: round(v.gmv) })).sort((a, b) => b.orders - a.orders).slice(0, 12),
      topShops: top.map((r) => ({ shopId: r.shopId, name: r.name ?? '—', city: r.city, gate: resolveGate(r.gate, r.businessType), orders: r.orders, gmv: round(num(r.gmv)) })),
      stuck,
      requireApproval: cfg.requireApproval,
      featuredCount: home.featuredShopIds.length,
      daily: daily.map((d) => ({ day: new Date(d.day).toISOString().slice(0, 10), orders: d.orders, gmv: round(num(d.gmv)) })),
    };
  }

  private stuckWhere(now: number): Prisma.MarketplaceOrderWhereInput {
    return {
      status: 'PENDING',
      createdAt: { gte: new Date(now - 30 * 86_400_000) },
      OR: [
        { createdAt: { lt: new Date(now - STUCK_PENDING_MS) } },
        { channelOrderId: null, createdAt: { lt: new Date(now - STUCK_INTAKE_MS) } },
      ],
    };
  }

  // ─── Shops ───────────────────────────────────────────────────────────────

  async shops(q: { search?: string; gate?: string; city?: string; status?: string; sort?: string; page?: string; limit?: string }) {
    const p = page(q.page);
    const l = lim(q.limit);
    const and: Prisma.ShopMarketplaceProfileWhereInput[] = [];
    const search = text(q.search);
    if (search) {
      and.push({ OR: [
        { publicName: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search.toLowerCase() } },
        { publicPhone: { contains: search } },
        { city: { contains: search, mode: 'insensitive' } },
        { tenant: { name: { contains: search, mode: 'insensitive' } } },
        { shop: { name: { contains: search, mode: 'insensitive' } } },
      ] });
    }
    if (isMarketGate(q.gate)) and.push({ shopId: { in: await this.shopIdsForGate(q.gate) } });
    const city = text(q.city);
    if (city) and.push({ city: { equals: city, mode: 'insensitive' } });
    switch (q.status) {
      case 'listed': and.push({ isListedOnMarketplace: true }); break;
      case 'unlisted': and.push({ isListedOnMarketplace: false }); break;
      case 'paused': and.push({ isPaused: true }); break;
      case 'pending': and.push({ isListedOnMarketplace: true, verifiedAt: null }); break;
      case 'verified': and.push({ verifiedAt: { not: null } }); break;
      case 'rejected': and.push({ verifiedAt: null, documents: { path: ['review', 'status'], equals: 'REJECTED' } }); break;
      default: break;
    }
    const where: Prisma.ShopMarketplaceProfileWhereInput = { AND: and };
    const orderBy: Prisma.ShopMarketplaceProfileOrderByWithRelationInput[] =
      q.status === 'pending' ? [{ listedAt: 'asc' }, { createdAt: 'asc' }]
        : q.sort === 'orders' ? [{ totalOrders: 'desc' }]
          : q.sort === 'rating' ? [{ ratingAverage: 'desc' }]
            : q.sort === 'name' ? [{ publicName: 'asc' }]
              : [{ createdAt: 'desc' }];

    const [rows, total, home] = await Promise.all([
      this.prisma.shopMarketplaceProfile.findMany({
        where, orderBy, skip: (p - 1) * l, take: l,
        select: {
          id: true, shopId: true, tenantId: true, publicName: true, slug: true, logoUrl: true, city: true, area: true, industry: true,
          gate: true, isListedOnMarketplace: true, listedAt: true, isOpen: true, isPaused: true, pausedReason: true,
          verificationLevel: true, verifiedAt: true, documents: true, ratingAverage: true, ratingCount: true, createdAt: true,
          tenant: { select: { name: true, phone: true, businessType: true } },
        },
      }),
      this.prisma.shopMarketplaceProfile.count({ where }),
      this.settings.home(),
    ]);
    const stats = await this.orderStats(rows.map((r) => r.shopId), new Date(Date.now() - 30 * 86_400_000));
    const featured = new Set(home.featuredShopIds);
    return {
      items: rows.map((r) => ({
        id: r.id, shopId: r.shopId, tenantId: r.tenantId, name: r.publicName, slug: r.slug, logoUrl: r.logoUrl,
        city: r.city, area: r.area, industry: r.industry, gate: resolveGate(r.gate, r.tenant?.businessType), gateSaved: r.gate,
        listed: r.isListedOnMarketplace, listedAt: r.listedAt, isOpen: r.isOpen, isPaused: r.isPaused, pausedReason: r.pausedReason,
        verificationLevel: r.verificationLevel, verifiedAt: r.verifiedAt, approval: approvalState(r), featured: featured.has(r.shopId),
        rating: r.ratingAverage, ratingCount: r.ratingCount, createdAt: r.createdAt,
        orders30d: stats.get(r.shopId)?.orders ?? 0, gmv30d: stats.get(r.shopId)?.gmv ?? 0,
        tenant: { id: r.tenantId, name: r.tenant?.name ?? null, phone: r.tenant?.phone ?? null },
      })),
      total, page: p, pages: pages(total, l),
    };
  }

  /** Orders and delivered item value per shop since a date. */
  private async orderStats(shopIds: string[], since: Date) {
    const out = new Map<string, { orders: number; gmv: number }>();
    if (!shopIds.length) return out;
    const [all, delivered] = await Promise.all([
      this.prisma.marketplaceOrder.groupBy({ by: ['shopId'], where: { shopId: { in: shopIds }, createdAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.marketplaceOrder.groupBy({ by: ['shopId'], where: { shopId: { in: shopIds }, createdAt: { gte: since }, status: 'DELIVERED' }, _sum: { subtotal: true } }),
    ]);
    for (const a of all) out.set(a.shopId, { orders: a._count._all, gmv: 0 });
    for (const d of delivered) out.set(d.shopId, { orders: out.get(d.shopId)?.orders ?? 0, gmv: round(num(d._sum.subtotal)) });
    return out;
  }

  private async profile(shopId: string) {
    const p = await this.prisma.shopMarketplaceProfile.findUnique({ where: { shopId } });
    if (!p) throw new NotFoundException('Shop is not on the Market');
    return p;
  }

  async shopDetail(shopId: string) {
    const p = await this.prisma.shopMarketplaceProfile.findUnique({
      where: { shopId },
      include: {
        tenant: { select: { id: true, name: true, phone: true, businessType: true, status: true } },
        shop: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!p) throw new NotFoundException('Shop is not on the Market');
    const since30 = new Date(Date.now() - 30 * 86_400_000);
    const [counts, gmv, gmv30, orders30, buyers, recent, ratings, hidden, integration, home] = await Promise.all([
      this.prisma.marketplaceOrder.groupBy({ by: ['status'], where: { shopId }, _count: { _all: true } }),
      this.prisma.marketplaceOrder.aggregate({ where: { shopId, status: 'DELIVERED' }, _sum: { subtotal: true } }),
      this.prisma.marketplaceOrder.aggregate({ where: { shopId, status: 'DELIVERED', createdAt: { gte: since30 } }, _sum: { subtotal: true } }),
      this.prisma.marketplaceOrder.count({ where: { shopId, createdAt: { gte: since30 } } }),
      this.prisma.marketplaceOrder.findMany({ where: { shopId }, distinct: ['customerId'], select: { customerId: true } }).then((r) => r.length),
      this.prisma.marketplaceOrder.findMany({
        where: { shopId }, orderBy: { createdAt: 'desc' }, take: 10,
        select: { id: true, orderNumber: true, status: true, total: true, createdAt: true, customer: { select: { fullName: true } } },
      }),
      this.prisma.marketplaceReview.groupBy({ by: ['rating'], where: { shopId, isHidden: false }, _count: { _all: true } }),
      this.prisma.marketplaceReview.count({ where: { shopId, isHidden: true } }),
      p.integrationId ? this.prisma.integration.findUnique({ where: { id: p.integrationId }, select: { id: true, status: true, isActive: true } }) : null,
      this.settings.home(),
    ]);
    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<string, number>;
    const totalOrders = counts.reduce((s, c) => s + c._count._all, 0);
    const reviewCount = ratings.reduce((s, r) => s + r._count._all, 0);
    const reviewSum = ratings.reduce((s, r) => s + r.rating * r._count._all, 0);
    const g = this.settings.shopGate(p);
    return {
      shopId: p.shopId, tenantId: p.tenantId, id: p.id,
      name: p.publicName, slug: p.slug, tagline: p.tagline, description: p.description, logoUrl: p.logoUrl, coverUrl: p.coverUrl,
      galleryUrls: p.galleryUrls, phone: p.publicPhone, whatsapp: p.whatsappNumber, email: p.publicEmail,
      address: [p.addressLine1, p.addressLine2, p.area, p.city, p.province].filter(Boolean).join(', '), city: p.city, area: p.area,
      industry: p.industry, gate: g.gate, gateSaved: p.gate, gateFilter: g.gateFilter, flow: g.flow, subCategories: p.subCategories,
      listed: p.isListedOnMarketplace, listedAt: p.listedAt, isOpen: p.isOpen, isPaused: p.isPaused, pausedReason: p.pausedReason,
      verificationLevel: p.verificationLevel, verifiedAt: p.verifiedAt, verifiedBy: p.verifiedBy,
      approval: approvalState(p), review: reviewOf(p.documents), featured: home.featuredShopIds.includes(p.shopId),
      cnicNumber: p.cnicNumber, businessRegNumber: p.businessRegNumber, taxNumber: p.taxNumber, documents: documentsOnly(p.documents),
      delivery: {
        offersDelivery: p.offersDelivery, offersPickup: p.offersPickup, radiusKm: p.deliveryRadiusKm, fee: num(p.deliveryFee),
        freeAbove: p.freeDeliveryAbove == null ? null : num(p.freeDeliveryAbove), minOrder: num(p.minOrderAmount), etaMinutes: p.estimatedDeliveryMinutes,
      },
      payments: { cod: p.acceptsCod, card: p.acceptsCard, jazzcash: p.acceptsJazzcash, easypaisa: p.acceptsEasypaisa, raast: p.acceptsRaast, wallet: p.acceptsWallet },
      tenant: p.tenant, shop: p.shop, integration,
      stats: {
        orders: totalOrders, delivered: byStatus.DELIVERED ?? 0, cancelled: (byStatus.CANCELLED ?? 0) + (byStatus.REFUNDED ?? 0),
        open: OPEN.reduce((s, st) => s + (byStatus[st] ?? 0), 0), gmv: round(num(gmv._sum.subtotal)),
        orders30d: orders30, gmv30d: round(num(gmv30._sum.subtotal)), customers: buyers,
      },
      reviews: {
        average: reviewCount ? Math.round((reviewSum / reviewCount) * 10) / 10 : 0, count: reviewCount, hidden,
        byRating: [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: ratings.find((x) => x.rating === r)?._count._all ?? 0 })),
      },
      recentOrders: recent.map((o) => ({ id: o.id, orderNumber: o.orderNumber, status: o.status, total: num(o.total), createdAt: o.createdAt, customer: o.customer?.fullName ?? null })),
      createdAt: p.createdAt,
    };
  }

  async updateShop(shopId: string, b: { gate?: unknown; isPaused?: unknown; pausedReason?: unknown; verificationLevel?: unknown; featured?: unknown }) {
    const p = await this.profile(shopId);
    const data: Prisma.ShopMarketplaceProfileUpdateInput = {};
    if (b.gate !== undefined) {
      if (b.gate !== null && b.gate !== '' && !isMarketGate(b.gate)) throw new BadRequestException('Unknown section');
      data.gate = isMarketGate(b.gate) ? b.gate : null;
    }
    if (b.isPaused !== undefined) {
      const paused = b.isPaused === true;
      data.isPaused = paused;
      data.pausedReason = paused ? text(b.pausedReason, 300) || 'Paused by Nafaa' : null;
    } else if (b.pausedReason !== undefined && p.isPaused) {
      data.pausedReason = text(b.pausedReason, 300) || 'Paused by Nafaa';
    }
    if (b.verificationLevel !== undefined) {
      if (!LEVELS.includes(b.verificationLevel as ShopVerificationLevel)) throw new BadRequestException('Unknown verification level');
      data.verificationLevel = b.verificationLevel as ShopVerificationLevel;
    }
    if (Object.keys(data).length) await this.prisma.shopMarketplaceProfile.update({ where: { shopId }, data });
    if (b.featured !== undefined) await this.setFeatured(shopId, b.featured === true);
    return this.shopDetail(shopId);
  }

  private async setFeatured(shopId: string, on: boolean) {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: MARKET_HOME_KEY }, select: { value: true } });
    let raw: unknown = {};
    try { raw = row?.value ? JSON.parse(row.value) : {}; } catch { raw = {}; }
    const home = sanitizeHome(raw);
    const ids = home.featuredShopIds.filter((id) => id !== shopId);
    if (on) ids.push(shopId);
    const value = JSON.stringify({ ...home, featuredShopIds: ids.slice(0, 30) });
    await this.prisma.systemSetting.upsert({
      where: { key: MARKET_HOME_KEY },
      create: { key: MARKET_HOME_KEY, value, category: 'marketplace', description: 'Nafaa Market home: banners, featured shops, sections' },
      update: { value },
    });
    this.settings.clearCache();
  }

  async approve(shopId: string, adminId: string) {
    const p = await this.profile(shopId);
    await this.prisma.shopMarketplaceProfile.update({
      where: { shopId },
      data: {
        verifiedAt: new Date(), verifiedBy: adminId,
        ...(p.verificationLevel === 'UNVERIFIED' && { verificationLevel: 'BRONZE' }),
        documents: withReview(p.documents, { status: 'APPROVED', by: adminId, at: new Date().toISOString() }),
      },
    });
    return this.shopDetail(shopId);
  }

  async reject(shopId: string, reason: unknown, adminId: string) {
    const why = text(reason, 300);
    if (why.length < 3) throw new BadRequestException('Write a reason for the shop');
    const p = await this.profile(shopId);
    // Rejecting takes the shop off the Market; the owner can fix it and publish again.
    await this.prisma.shopMarketplaceProfile.update({
      where: { shopId },
      data: {
        verifiedAt: null, verifiedBy: adminId, isListedOnMarketplace: false,
        documents: withReview(p.documents, { status: 'REJECTED', reason: why, by: adminId, at: new Date().toISOString() }),
      },
    });
    return this.shopDetail(shopId);
  }

  // ─── Orders ──────────────────────────────────────────────────────────────

  async orders(q: { search?: string; status?: string; gate?: string; city?: string; shopId?: string; stuck?: string; from?: string; to?: string; page?: string; limit?: string }) {
    const p = page(q.page);
    const l = lim(q.limit);
    const and: Prisma.MarketplaceOrderWhereInput[] = [];
    const search = text(q.search);
    if (search) {
      and.push({ OR: [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search } } },
        { shop: { name: { contains: search, mode: 'insensitive' } } },
        { shop: { marketplaceProfile: { publicName: { contains: search, mode: 'insensitive' } } } },
      ] });
    }
    if (q.status === 'OPEN') and.push({ status: { in: OPEN } });
    else if (ORDER_STATUSES.includes(q.status as MarketplaceOrderStatus)) and.push({ status: q.status as MarketplaceOrderStatus });
    if (isMarketGate(q.gate)) and.push({ shopId: { in: await this.shopIdsForGate(q.gate) } });
    const city = text(q.city);
    if (city) and.push({ shop: { marketplaceProfile: { city: { equals: city, mode: 'insensitive' } } } });
    if (q.shopId) and.push({ shopId: text(q.shopId, 60) });
    if (q.stuck === '1' || q.stuck === 'true') and.push(this.stuckWhere(Date.now()));
    const created = optionalRange(q.from, q.to);
    if (created) and.push({ createdAt: created });
    const where: Prisma.MarketplaceOrderWhereInput = { AND: and };

    const [rows, total] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * l, take: l,
        select: {
          id: true, orderNumber: true, status: true, createdAt: true, subtotal: true, deliveryFee: true, total: true,
          walletUsed: true, loyaltyDiscount: true, paymentMethod: true, paymentStatus: true, deliveryType: true, channelOrderId: true, shopId: true,
          customer: { select: { id: true, fullName: true, phone: true } },
          shop: { select: { name: true, tenant: { select: { businessType: true } }, marketplaceProfile: { select: { publicName: true, city: true, gate: true } } } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.marketplaceOrder.count({ where }),
    ]);
    const now = Date.now();
    return {
      items: rows.map((o) => ({
        id: o.id, orderNumber: o.orderNumber, status: o.status, createdAt: o.createdAt,
        subtotal: num(o.subtotal), deliveryFee: num(o.deliveryFee), total: num(o.total), marketFunded: round(num(o.walletUsed) + num(o.loyaltyDiscount)),
        paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus, deliveryType: o.deliveryType, items: o._count.items,
        sentToShop: !!o.channelOrderId,
        stuck: o.status === 'PENDING' && (now - o.createdAt.getTime() > STUCK_PENDING_MS || (!o.channelOrderId && now - o.createdAt.getTime() > STUCK_INTAKE_MS)),
        shop: { shopId: o.shopId, name: o.shop.marketplaceProfile?.publicName ?? o.shop.name, city: o.shop.marketplaceProfile?.city ?? null },
        gate: resolveGate(o.shop.marketplaceProfile?.gate, o.shop.tenant?.businessType),
        customer: { id: o.customer.id, name: o.customer.fullName, phone: o.customer.phone },
      })),
      total, page: p, pages: pages(total, l),
    };
  }

  async orderDetail(id: string) {
    const o = await this.prisma.marketplaceOrder.findUnique({
      where: { id },
      include: {
        items: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
        customer: { select: { id: true, fullName: true, phone: true, email: true, isBanned: true } },
        shop: { select: { id: true, name: true, phone: true, tenantId: true, marketplaceProfile: { select: { publicName: true, city: true, slug: true, publicPhone: true } } } },
      },
    });
    if (!o) throw new NotFoundException('Order not found');
    const co = o.channelOrderId
      ? await this.prisma.channelOrder.findUnique({
        where: { id: o.channelOrderId },
        select: {
          id: true, orderStatus: true, paymentStatus: true, stage: true, receivedAt: true, acceptedAt: true, dispatchedAt: true, deliveredAt: true,
          cancelledAt: true, cancelReason: true, courierName: true, courierCode: true, trackingNumber: true, nafaaSaleId: true, metadata: true,
        },
      })
      : null;
    const sale = co?.nafaaSaleId ? await this.prisma.sale.findUnique({ where: { id: co.nafaaSaleId }, select: { id: true, saleNumber: true, status: true } }) : null;
    const meta = (co?.metadata ?? null) as Record<string, any> | null;
    const open = OPEN.includes(o.status);
    return {
      id: o.id, orderNumber: o.orderNumber, status: o.status, createdAt: o.createdAt, updatedAt: o.updatedAt,
      deliveryType: o.deliveryType, source: o.source,
      money: {
        subtotal: num(o.subtotal), discount: num(o.discount), couponCode: o.couponCode, couponDiscount: num(o.couponDiscount),
        deliveryFee: num(o.deliveryFee), serviceFee: num(o.serviceFee), tax: num(o.taxAmount), tip: num(o.tipAmount),
        walletUsed: num(o.walletUsed), loyaltyPointsUsed: o.loyaltyPointsUsed, loyaltyDiscount: num(o.loyaltyDiscount), total: num(o.total),
        marketFunded: meta?.marketFunded ?? null,
      },
      payment: { method: o.paymentMethod, status: o.paymentStatus, ref: o.paymentGatewayRef, paidAt: o.paidAt },
      address: o.addressSnapshot, slot: o.deliverySlotStart ? { start: o.deliverySlotStart, end: o.deliverySlotEnd } : null,
      estimatedDeliveryAt: o.estimatedDeliveryAt, actualDeliveryAt: o.actualDeliveryAt,
      rider: o.riderName ? { name: o.riderName, phone: o.riderPhone } : null,
      notes: { customer: o.customerNotes, shop: o.shopNotes },
      cancel: o.cancelledAt ? { at: o.cancelledAt, by: o.cancelledBy, reason: o.cancelReason } : null,
      attachments: Array.isArray(o.attachments) ? o.attachments : [],
      items: o.items.map((i) => ({
        id: i.id, productId: i.productId, name: i.productName, variant: i.variantName, imageUrl: i.imageUrl,
        unitPrice: num(i.unitPrice), quantity: i.quantity, discount: num(i.discount), total: num(i.total), notes: i.notes,
        options: i.options ?? null, modifiers: i.modifiers ?? null,
      })),
      history: o.statusHistory.map((h) => ({ id: h.id, status: h.status, note: h.note, by: h.changedBy, at: h.changedAt })),
      customer: o.customer,
      shop: {
        shopId: o.shop.id, tenantId: o.shop.tenantId, name: o.shop.marketplaceProfile?.publicName ?? o.shop.name,
        city: o.shop.marketplaceProfile?.city ?? null, slug: o.shop.marketplaceProfile?.slug ?? null, phone: o.shop.marketplaceProfile?.publicPhone ?? o.shop.phone,
      },
      channel: co ? {
        id: co.id, status: co.orderStatus, paymentStatus: co.paymentStatus, stage: co.stage, receivedAt: co.receivedAt, acceptedAt: co.acceptedAt,
        dispatchedAt: co.dispatchedAt, deliveredAt: co.deliveredAt, cancelledAt: co.cancelledAt, cancelReason: co.cancelReason,
        courier: co.courierName ?? co.courierCode, trackingNumber: co.trackingNumber,
      } : null,
      bill: sale ? { id: sale.id, number: sale.saleNumber, status: sale.status } : null,
      canCancel: open && (!co || !CHANNEL_DONE.includes(co.orderStatus)),
    };
  }

  async cancelOrder(id: string, reason: unknown) {
    const why = text(reason, 300);
    if (why.length < 3) throw new BadRequestException('Write a reason; the customer and the shop see it');
    const o = await this.prisma.marketplaceOrder.findUnique({ where: { id }, select: { id: true, tenantId: true, status: true, channelOrderId: true } });
    if (!o) throw new NotFoundException('Order not found');
    if (!OPEN.includes(o.status)) throw new BadRequestException('Only open orders can be cancelled');
    if (o.channelOrderId) {
      const co = await this.prisma.channelOrder.findUnique({ where: { id: o.channelOrderId }, select: { orderStatus: true } });
      if (co?.orderStatus === 'DELIVERED') throw new BadRequestException('The shop has marked this order delivered; use a return in the POS instead');
      // Cancel at the source as the shop: the POS bill is voided and the stock comes back.
      const actor = await this.onlineOrders.systemActor(o.tenantId);
      await this.onlineOrders.cancel(actor, new ShopScope(null, true), o.channelOrderId, `Nafaa: ${why}`);
      await this.sync.syncFromChannel(o.channelOrderId, { by: 'ADMIN', note: why });
    } else {
      const done = await this.sync.cancelWithoutChannel(o.id, { by: 'ADMIN', reason: why });
      if (!done) throw new BadRequestException('The order changed meanwhile; reload and try again');
    }
    return this.orderDetail(id);
  }

  // ─── Settlements ─────────────────────────────────────────────────────────

  async settlements(q: { from?: string; to?: string; shopId?: string; page?: string; limit?: string }) {
    const { start, end } = dayRange(q.from, q.to);
    const p = page(q.page);
    const l = lim(q.limit);
    const cfg = await this.settings.platform();
    const shopId = text(q.shopId, 60);
    const where = Prisma.sql`o.status::text = 'DELIVERED'
      AND coalesce(o."actualDeliveryAt", o."updatedAt") >= ${start} AND coalesce(o."actualDeliveryAt", o."updatedAt") < ${end}
      ${shopId ? Prisma.sql`AND o."shopId" = ${shopId}` : Prisma.empty}`;
    type Row = { shopId: string; name: string | null; city: string | null; orders: number; subtotal: number; deliveryFees: number; coupons: number; wallet: number; loyalty: number; collected: number };
    const [rows, sums] = await Promise.all([
      this.prisma.$queryRaw<Row[]>`
        SELECT o."shopId", coalesce(p."publicName", s.name) AS name, p.city,
          count(*)::int AS orders,
          coalesce(sum(o.subtotal), 0)::float AS subtotal,
          coalesce(sum(o."deliveryFee"), 0)::float AS "deliveryFees",
          coalesce(sum(o."couponDiscount"), 0)::float AS coupons,
          coalesce(sum(o."walletUsed"), 0)::float AS wallet,
          coalesce(sum(o."loyaltyDiscount"), 0)::float AS loyalty,
          coalesce(sum(o.total), 0)::float AS collected
        FROM marketplace_orders o
        LEFT JOIN shop_marketplace_profiles p ON p."shopId" = o."shopId"
        LEFT JOIN "Shop" s ON s.id = o."shopId"
        WHERE ${where}
        GROUP BY 1, 2, 3 ORDER BY subtotal DESC
        LIMIT ${l} OFFSET ${(p - 1) * l}`,
      this.prisma.$queryRaw<Array<Record<string, number>>>`
        SELECT count(DISTINCT o."shopId")::int AS shops, count(*)::int AS orders,
          coalesce(sum(o.subtotal), 0)::float AS subtotal,
          coalesce(sum(o."deliveryFee"), 0)::float AS "deliveryFees",
          coalesce(sum(o."walletUsed"), 0)::float AS wallet,
          coalesce(sum(o."loyaltyDiscount"), 0)::float AS loyalty,
          coalesce(sum(o.total), 0)::float AS collected
        FROM marketplace_orders o WHERE ${where}`,
    ]);
    const pct = cfg.commissionPercent;
    const line = (subtotal: number, wallet: number, loyalty: number) => {
      const commission = round((subtotal * pct) / 100);
      const marketFunded = round(wallet + loyalty);
      return { commission, marketFunded, net: round(marketFunded - commission) };
    };
    const s = sums[0] ?? {};
    const total = num(s.shops);
    return {
      from: start.toISOString(), to: end.toISOString(), commissionPercent: pct,
      totals: { shops: total, orders: num(s.orders), subtotal: round(num(s.subtotal)), deliveryFees: round(num(s.deliveryFees)), collected: round(num(s.collected)), ...line(num(s.subtotal), num(s.wallet), num(s.loyalty)) },
      items: rows.map((r) => ({
        shopId: r.shopId, name: r.name ?? '—', city: r.city, orders: r.orders,
        subtotal: round(r.subtotal), deliveryFees: round(r.deliveryFees), coupons: round(r.coupons), collected: round(r.collected),
        wallet: round(r.wallet), loyalty: round(r.loyalty), ...line(r.subtotal, r.wallet, r.loyalty),
      })),
      total, page: p, pages: pages(total, l),
    };
  }
}
