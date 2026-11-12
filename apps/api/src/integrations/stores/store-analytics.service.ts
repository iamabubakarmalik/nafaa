/**
 * Store visitor analytics, kept small: storefront events are counted in
 * memory and added to one StoreAnalyticsDaily row per store per day (PKT)
 * every 30 seconds. No personal data is kept: visitor ids are only used to
 * count unique visitors for the day and are then forgotten.
 * Orders and revenue in reports come from the store channel's orders.
 */
import { BadRequestException, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { tzParts } from '../../common/helpers/business-time.helper';
import { Cron } from '../../core/system-control/cron.decorator';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { StoreAccessService } from './store-access.service';

export const EVENT_TYPES = ['page_view', 'product_view', 'collection_view', 'search', 'add_to_cart', 'checkout_started', 'purchase'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface Bucket {
  storeId: string; tenantId: string; day: string;
  visitors: number; sessions: number; pageViews: number; productViews: number; addToCart: number; checkouts: number; purchases: number; revenue: number;
  sources: Record<string, number>; devices: Record<string, number>; products: Record<string, { v: number; a: number }>; searches: Record<string, number>;
}

const CLOSED = ['CANCELLED', 'REJECTED'];
const n = (v: unknown) => Number(v ?? 0) || 0;
const dayKey = (d = new Date()) => {
  const p = tzParts(d);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
};

/** Traffic source label from UTM/referrer. */
export function sourceOf(e: { utm?: { source?: string; medium?: string }; referrer?: string }, ownHost?: string): string {
  const s = String(e.utm?.source ?? '').trim().toLowerCase().slice(0, 40);
  if (s) return s === 'fb' || s === 'ig' || s === 'facebook' || s === 'instagram' ? (s.startsWith('i') ? 'instagram' : 'facebook') : s;
  const ref = String(e.referrer ?? '');
  if (!ref) return 'direct';
  let host = '';
  try { host = new URL(ref).hostname.replace(/^www\./, ''); } catch { return 'direct'; }
  if (ownHost && host === ownHost.replace(/^www\./, '')) return 'direct';
  if (/google\./.test(host)) return 'google';
  if (/facebook\.com|fb\.com|fb\.me/.test(host)) return 'facebook';
  if (/instagram\.com/.test(host)) return 'instagram';
  if (/tiktok\.com/.test(host)) return 'tiktok';
  if (/whatsapp|wa\.me/.test(host)) return 'whatsapp';
  if (/youtube\.com|youtu\.be/.test(host)) return 'youtube';
  if (/bing\.|yahoo\.|duckduckgo/.test(host)) return 'search';
  return host.slice(0, 40);
}

@Injectable()
export class StoreAnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(StoreAnalyticsService.name);
  private buckets = new Map<string, Bucket>();
  private seen = new Map<string, Set<string>>();
  private seenDay = dayKey();

  constructor(private readonly prisma: PrismaService, private readonly access: StoreAccessService) {}

  async onModuleDestroy() {
    await this.flush().catch(() => null);
  }

  private bucket(storeId: string, tenantId: string): Bucket {
    const day = dayKey();
    if (day !== this.seenDay) {
      this.seen.clear();
      this.seenDay = day;
    }
    const k = `${storeId}|${day}`;
    let b = this.buckets.get(k);
    if (!b) {
      b = { storeId, tenantId, day, visitors: 0, sessions: 0, pageViews: 0, productViews: 0, addToCart: 0, checkouts: 0, purchases: 0, revenue: 0, sources: {}, devices: {}, products: {}, searches: {} };
      this.buckets.set(k, b);
    }
    return b;
  }

  /** Storefront beacon: up to 20 events. */
  async ingest(storeId: string, body: unknown) {
    const ctx = await this.access.publicStore(storeId, {}, true).catch(() => null);
    if (!ctx) return { ok: true };
    let raw = body;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch { throw new BadRequestException('Bad events'); }
    }
    const list = Array.isArray((raw as any)?.events) ? (raw as any).events.slice(0, 20) : [];
    const b = this.bucket(storeId, ctx.tenantId);
    const seen = this.seen.get(storeId) ?? new Set<string>();
    this.seen.set(storeId, seen);
    for (const e of list) {
      const type = e?.type as EventType;
      if (!EVENT_TYPES.includes(type) || type === 'purchase') continue; // purchases are counted by the API at checkout
      const visitor = String(e?.visitorId ?? '').slice(0, 64);
      const session = String(e?.sessionId ?? '').slice(0, 64);
      if (visitor && !seen.has(`v:${visitor}`) && seen.size < 200_000) {
        seen.add(`v:${visitor}`);
        b.visitors++;
        const device = ['mobile', 'desktop', 'tablet'].includes(e?.device) ? e.device : 'other';
        b.devices[device] = (b.devices[device] ?? 0) + 1;
      }
      if (session && !seen.has(`s:${session}`) && seen.size < 200_000) {
        seen.add(`s:${session}`);
        b.sessions++;
        const src = sourceOf(e);
        b.sources[src] = (b.sources[src] ?? 0) + 1;
      }
      const pid = typeof e?.productId === 'string' && /^[\w-]{8,64}$/.test(e.productId) ? e.productId : null;
      if (type === 'page_view' || type === 'collection_view') b.pageViews++;
      if (type === 'product_view') {
        b.pageViews++;
        b.productViews++;
        if (pid) (b.products[pid] ??= { v: 0, a: 0 }).v++;
      }
      if (type === 'add_to_cart') {
        b.addToCart++;
        if (pid) (b.products[pid] ??= { v: 0, a: 0 }).a++;
      }
      if (type === 'checkout_started') b.checkouts++;
      if (type === 'search') {
        const q = String(e?.query ?? '').trim().toLowerCase().slice(0, 40);
        if (q.length >= 2 && Object.keys(b.searches).length < 300) b.searches[q] = (b.searches[q] ?? 0) + 1;
      }
    }
    return { ok: true };
  }

  /** Called by checkout for each order. */
  purchase(storeId: string, tenantId: string, total: number) {
    const b = this.bucket(storeId, tenantId);
    b.purchases++;
    b.revenue += total;
  }

  @Cron('*/30 * * * * *')
  async flush() {
    if (process.env.DISABLE_STORE_JOBS === '1' && !this.buckets.size) return;
    const list = [...this.buckets.values()];
    this.buckets = new Map();
    for (const b of list) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const day = new Date(`${b.day}T00:00:00.000Z`);
          const row = await tx.storeAnalyticsDaily.upsert({
            where: { storeId_day: { storeId: b.storeId, day } },
            create: { storeId: b.storeId, tenantId: b.tenantId, day },
            update: {},
          });
          const merge = (a: unknown, add: Record<string, number>, cap: number) => {
            const out = { ...((a ?? {}) as Record<string, number>) };
            for (const [k, v] of Object.entries(add)) if (out[k] !== undefined || Object.keys(out).length < cap) out[k] = (out[k] ?? 0) + v;
            return out;
          };
          const products = { ...((row.products ?? {}) as Record<string, { v: number; a: number }>) };
          for (const [k, v] of Object.entries(b.products)) {
            if (!products[k] && Object.keys(products).length >= 500) continue;
            products[k] = { v: (products[k]?.v ?? 0) + v.v, a: (products[k]?.a ?? 0) + v.a };
          }
          await tx.storeAnalyticsDaily.update({
            where: { id: row.id },
            data: {
              visitors: { increment: b.visitors }, sessions: { increment: b.sessions }, pageViews: { increment: b.pageViews }, productViews: { increment: b.productViews },
              addToCart: { increment: b.addToCart }, checkouts: { increment: b.checkouts }, purchases: { increment: b.purchases }, revenue: { increment: b.revenue },
              sources: merge(row.sources, b.sources, 100), devices: merge(row.devices, b.devices, 10), searches: merge(row.searches, b.searches, 300),
              products: products as Prisma.InputJsonValue,
            },
          });
        });
      } catch (e: any) {
        this.logger.warn(`Store analytics flush ${b.storeId}: ${e?.message}`);
      }
    }
  }

  // ─── reports ───

  async report(user: AuthenticatedUser, id: string, daysRaw: unknown) {
    const ctx = await this.access.requireStore(user, id);
    const days = [7, 30, 90].includes(Number(daysRaw)) ? Number(daysRaw) : 30;
    await this.flush();
    const now = Date.now();
    const from = new Date(now - days * 86_400_000);
    const prevFrom = new Date(now - 2 * days * 86_400_000);
    const [rows, prevRows, orders, prevOrders] = await Promise.all([
      this.prisma.storeAnalyticsDaily.findMany({ where: { storeId: ctx.store.id, day: { gte: new Date(dayKey(from)) } }, orderBy: { day: 'asc' } }),
      this.prisma.storeAnalyticsDaily.findMany({ where: { storeId: ctx.store.id, day: { gte: new Date(dayKey(prevFrom)), lt: new Date(dayKey(from)) } } }),
      this.prisma.channelOrder.findMany({ where: { integrationId: ctx.integration.id, deletedAt: null, receivedAt: { gte: from }, orderStatus: { notIn: CLOSED } }, select: { total: true, receivedAt: true, items: true, metadata: true } }),
      this.prisma.channelOrder.aggregate({ where: { integrationId: ctx.integration.id, deletedAt: null, receivedAt: { gte: prevFrom, lt: from }, orderStatus: { notIn: CLOSED } }, _count: { _all: true }, _sum: { total: true } }),
    ]);
    const sum = (list: typeof rows, k: 'visitors' | 'pageViews' | 'productViews' | 'addToCart' | 'checkouts') => list.reduce((s, r) => s + r[k], 0);
    const revenue = orders.reduce((s, o) => s + n(o.total), 0);
    const totals = {
      visitors: sum(rows, 'visitors'), pageViews: sum(rows, 'pageViews'), productViews: sum(rows, 'productViews'), addToCart: sum(rows, 'addToCart'), checkouts: sum(rows, 'checkouts'),
      orders: orders.length, revenue, conversion: 0, aov: orders.length ? Math.round(revenue / orders.length) : 0,
    };
    totals.conversion = totals.visitors ? Math.round((totals.orders / totals.visitors) * 1000) / 10 : 0;
    const pv = sum(prevRows, 'visitors');
    const pRevenue = n(prevOrders._sum.total);
    const previous = {
      visitors: pv, pageViews: sum(prevRows, 'pageViews'), productViews: sum(prevRows, 'productViews'), addToCart: sum(prevRows, 'addToCart'), checkouts: sum(prevRows, 'checkouts'),
      orders: prevOrders._count._all, revenue: pRevenue, conversion: pv ? Math.round((prevOrders._count._all / pv) * 1000) / 10 : 0, aov: prevOrders._count._all ? Math.round(pRevenue / prevOrders._count._all) : 0,
    };
    const daily: Array<{ date: string; visitors: number; pageViews: number; orders: number; revenue: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = dayKey(new Date(now - i * 86_400_000));
      const r = rows.find((x) => x.day.toISOString().slice(0, 10) === d);
      const dayOrders = orders.filter((o) => dayKey(o.receivedAt) === d);
      daily.push({ date: d, visitors: r?.visitors ?? 0, pageViews: r?.pageViews ?? 0, orders: dayOrders.length, revenue: dayOrders.reduce((s, o) => s + n(o.total), 0) });
    }
    const addMap = (key: 'sources' | 'devices' | 'searches') => {
      const out: Record<string, number> = {};
      for (const r of rows) for (const [k, v] of Object.entries((r[key] ?? {}) as Record<string, number>)) out[k] = (out[k] ?? 0) + n(v);
      return out;
    };
    const orderSources: Record<string, { orders: number; revenue: number }> = {};
    const productOrders: Record<string, { orders: number; revenue: number }> = {};
    for (const o of orders) {
      const att = ((o.metadata as any)?.attribution ?? {}) as { utmSource?: string; referrer?: string };
      const src = sourceOf({ utm: { source: att.utmSource }, referrer: att.referrer });
      orderSources[src] = { orders: (orderSources[src]?.orders ?? 0) + 1, revenue: (orderSources[src]?.revenue ?? 0) + n(o.total) };
      for (const it of (Array.isArray(o.items) ? o.items : []) as Array<{ productId?: string; quantity?: number; price?: number }>) {
        if (!it?.productId) continue;
        productOrders[it.productId] = { orders: (productOrders[it.productId]?.orders ?? 0) + 1, revenue: (productOrders[it.productId]?.revenue ?? 0) + n(it.price) * n(it.quantity) };
      }
    }
    const sessions = addMap('sources');
    const sources = [...new Set([...Object.keys(sessions), ...Object.keys(orderSources)])]
      .map((s) => ({ source: s, visitors: sessions[s] ?? 0, orders: orderSources[s]?.orders ?? 0, revenue: orderSources[s]?.revenue ?? 0 }))
      .sort((a, b) => b.visitors - a.visitors || b.orders - a.orders).slice(0, 15);
    const pstats: Record<string, { v: number; a: number }> = {};
    for (const r of rows) for (const [k, v] of Object.entries((r.products ?? {}) as Record<string, { v: number; a: number }>)) pstats[k] = { v: (pstats[k]?.v ?? 0) + n(v?.v), a: (pstats[k]?.a ?? 0) + n(v?.a) };
    const topIds = [...new Set([...Object.keys(pstats), ...Object.keys(productOrders)])]
      .sort((a, b) => (productOrders[b]?.revenue ?? 0) - (productOrders[a]?.revenue ?? 0) || (pstats[b]?.v ?? 0) - (pstats[a]?.v ?? 0)).slice(0, 15);
    const prods = await this.prisma.product.findMany({ where: { tenantId: ctx.tenantId, id: { in: topIds } }, select: { id: true, name: true, images: { take: 1, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], select: { url: true } } } });
    const pmap = new Map(prods.map((p) => [p.id, p]));
    const devices = addMap('devices');
    const searches = addMap('searches');
    return {
      days,
      totals,
      previous,
      daily,
      funnel: [
        { step: 'visitors', count: totals.visitors }, { step: 'product_views', count: totals.productViews }, { step: 'add_to_cart', count: totals.addToCart },
        { step: 'checkout', count: totals.checkouts }, { step: 'orders', count: totals.orders },
      ],
      sources,
      devices: Object.entries(devices).map(([device, visitors]) => ({ device, visitors })).sort((a, b) => b.visitors - a.visitors),
      topProducts: topIds.filter((id) => pmap.has(id)).map((id) => ({ productId: id, name: pmap.get(id)!.name, image: pmap.get(id)!.images[0]?.url ?? null, views: pstats[id]?.v ?? 0, addToCart: pstats[id]?.a ?? 0, orders: productOrders[id]?.orders ?? 0, revenue: productOrders[id]?.revenue ?? 0 })),
      searches: Object.entries(searches).map(([query, count]) => ({ query, count })).sort((a, b) => b.count - a.count).slice(0, 20),
    };
  }
}
