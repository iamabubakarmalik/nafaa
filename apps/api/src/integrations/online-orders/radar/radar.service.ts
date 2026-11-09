/**
 * Product Radar: from the shop's own bills and its channel orders, which
 * products are rising or falling (recent period against the one before),
 * where margin can improve and which products sell together (bundle ideas).
 * Billed channel orders are already bills; channel orders not yet billed are
 * added as waiting demand. Margin and bundle prices need cost.view.
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { CLOSED_STATUSES } from '../order-board';
import {
  BundleInfo, TREND_DEFAULTS, bundleIdeas, classifyTrend, countPairs, marginOpportunities, marginPct, windows,
} from './radar-math';

const LIVE = `'COMPLETED','PARTIALLY_RETURNED','FULLY_RETURNED'`;
const DAY = 86_400_000;
const PERIODS = [7, 14, 30];

export interface RadarRow {
  productId: string;
  name: string;
  sku: string | null;
  image: string | null;
  trend: string;
  recent: number;
  prior: number;
  delta: number;
  changePct: number | null;
  revenue: number;
  stock: number;
  /** Units in channel orders that are not billed yet. */
  waiting: number;
  channels: Array<{ name: string; units: number }>;
  /** Percent; only with cost.view. */
  margin: number | null;
}

@Injectable()
export class RadarService {
  constructor(private readonly prisma: PrismaService) {}

  async radar(user: AuthenticatedUser, scope: ShopScope, q: { days?: string; integrationId?: string }) {
    const days = PERIODS.includes(Number(q.days)) ? Number(q.days) : 14;
    const seesCost = hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW);
    const tenantId = user.tenantId;
    const now = new Date();
    const w = windows(now, days);
    const shopId = scope.shopId ?? null;

    const shops = shopId ? await this.prisma.shop.findMany({ where: { tenantId, isActive: true }, select: { id: true, isMain: true }, orderBy: { isMain: 'desc' } }) : [];
    const mainId = shops.find((x) => x.isMain)?.id ?? shops[0]?.id ?? null;
    const saleShop = !shopId ? Prisma.empty
      : shopId === mainId ? Prisma.sql`AND (s."shopId" = ${shopId} OR s."shopId" IS NULL)` : Prisma.sql`AND s."shopId" = ${shopId}`;

    // Bills of the last 90 days feed the bundle ideas; the two periods are inside the same pass.
    const since = new Date(now.getTime() - Math.max(90, days * 2) * DAY);
    const [sold, lines, orders, products] = await Promise.all([
      this.prisma.$queryRaw<Array<{ pid: string; recent: number; prior: number; revenue: number }>>`
        SELECT si."productId" AS pid,
          SUM(CASE WHEN s."soldAt" >= ${w.recentFrom} THEN si.quantity - si."returnedQty" ELSE 0 END)::float AS recent,
          SUM(CASE WHEN s."soldAt" < ${w.recentFrom} THEN si.quantity - si."returnedQty" ELSE 0 END)::float AS prior,
          SUM(CASE WHEN s."soldAt" >= ${w.recentFrom} THEN si.total ELSE 0 END)::float AS revenue
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId"
        WHERE s."tenantId" = ${tenantId} AND s.status::text IN (${Prisma.raw(LIVE)}) AND si."productId" IS NOT NULL
          AND s."soldAt" >= ${w.priorFrom} ${saleShop}
        GROUP BY 1`,
      this.prisma.$queryRaw<Array<{ sid: string; pid: string }>>`
        SELECT si."saleId" AS sid, si."productId" AS pid
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId"
        WHERE s."tenantId" = ${tenantId} AND s.status::text IN (${Prisma.raw(LIVE)}) AND si."productId" IS NOT NULL
          AND s."soldAt" >= ${since} ${saleShop}
        LIMIT 60000`,
      this.prisma.channelOrder.findMany({
        where: {
          tenantId, deletedAt: null, receivedAt: { gte: w.priorFrom }, orderStatus: { notIn: CLOSED_STATUSES },
          ...(q.integrationId ? { integrationId: q.integrationId } : {}),
          ...(shopId ? { OR: [{ shopId }, ...(shopId === mainId ? [{ shopId: null }] : [])] } : {}),
        },
        select: { receivedAt: true, items: true, nafaaSaleId: true, integration: { select: { displayName: true } } },
        take: 8000,
      }),
      this.prisma.product.findMany({
        where: { tenantId, isActive: true, isRawMaterial: false },
        select: { id: true, name: true, sku: true, price: true, costPrice: true, stock: true, images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } } },
        take: 4000,
      }),
    ]);
    const byId = new Map(products.map((p) => [p.id, p]));

    // Channel mix (recent period) and waiting demand.
    const mix = new Map<string, Map<string, number>>();
    const waiting = new Map<string, number>();
    for (const o of orders) {
      if (o.receivedAt < w.recentFrom) continue;
      const channel = o.integration?.displayName || 'Online';
      for (const it of (Array.isArray(o.items) ? o.items : []) as any[]) {
        const pid = it?.productId ? String(it.productId) : '';
        const qty = Number(it?.quantity) || 0;
        if (!pid || qty <= 0) continue;
        const m = mix.get(pid) ?? new Map<string, number>();
        m.set(channel, (m.get(channel) ?? 0) + qty);
        mix.set(pid, m);
        if (!o.nafaaSaleId) waiting.set(pid, (waiting.get(pid) ?? 0) + qty);
      }
    }

    const rows: RadarRow[] = [];
    const seen = new Set<string>();
    for (const s of sold) {
      const p = byId.get(s.pid);
      if (!p) continue;
      seen.add(s.pid);
      const recent = Math.max(0, s.recent) + (waiting.get(s.pid) ?? 0);
      const t = classifyTrend(recent, Math.max(0, s.prior), TREND_DEFAULTS);
      rows.push({
        productId: p.id, name: p.name, sku: p.sku, image: p.images[0]?.url ?? null, trend: t.trend,
        recent: Math.round(recent * 10) / 10, prior: Math.round(Math.max(0, s.prior) * 10) / 10, delta: t.delta, changePct: t.changePct,
        revenue: Math.round(s.revenue), stock: Number(p.stock), waiting: waiting.get(p.id) ?? 0,
        channels: [...(mix.get(p.id) ?? [])].map(([name, units]) => ({ name, units })).sort((a, b) => b.units - a.units),
        margin: seesCost ? marginPct(p.price, p.costPrice) : null,
      });
    }
    // Waiting channel demand for products with no bills yet in either period.
    for (const [pid, units] of waiting) {
      if (seen.has(pid)) continue;
      const p = byId.get(pid);
      if (!p) continue;
      const t = classifyTrend(units, 0, TREND_DEFAULTS);
      rows.push({
        productId: p.id, name: p.name, sku: p.sku, image: p.images[0]?.url ?? null, trend: t.trend, recent: units, prior: 0, delta: t.delta, changePct: null,
        revenue: 0, stock: Number(p.stock), waiting: units,
        channels: [...(mix.get(pid) ?? [])].map(([name, u]) => ({ name, units: u })).sort((a, b) => b.units - a.units),
        margin: seesCost ? marginPct(p.price, p.costPrice) : null,
      });
    }

    const pick = (trend: string, dir: 1 | -1) => rows.filter((r) => r.trend === trend).sort((a, b) => dir * (b.delta - a.delta) || b.revenue - a.revenue).slice(0, 30);
    const rising = [...pick('rising', 1), ...pick('new', 1)].sort((a, b) => b.delta - a.delta).slice(0, 30);
    const falling = [...pick('falling', -1), ...pick('stopped', -1)].sort((a, b) => a.delta - b.delta).slice(0, 30);

    let margin: ReturnType<typeof marginOpportunities> | null = null;
    let bundles: ReturnType<typeof bundleIdeas> | null = null;
    if (seesCost) {
      const recentUnits = new Map(rows.map((r) => [r.productId, r.recent]));
      margin = marginOpportunities(products.map((p) => ({
        productId: p.id, name: p.name, price: p.price, cost: p.costPrice, units: recentUnits.get(p.id) ?? 0, stock: Number(p.stock),
      })));
    }
    const grouped = new Map<string, string[]>();
    for (const l of lines) grouped.set(l.sid, [...(grouped.get(l.sid) ?? []), l.pid]);
    const { pairs, counts, bills } = countPairs([...grouped.values()]);
    const info = new Map<string, BundleInfo>(products.map((p) => [p.id, { name: p.name, price: p.price, cost: seesCost ? p.costPrice : 0 }]));
    bundles = bundleIdeas(pairs, counts, bills, info);
    if (!seesCost) bundles = bundles.map((b) => ({ ...b, marginPct: null }));

    return {
      days, generatedAt: now.toISOString(), seesCost, bills,
      summary: {
        rising: rows.filter((r) => r.trend === 'rising').length,
        newItems: rows.filter((r) => r.trend === 'new').length,
        falling: rows.filter((r) => r.trend === 'falling').length,
        stopped: rows.filter((r) => r.trend === 'stopped').length,
        opportunities: margin?.list.length ?? 0,
        bundles: bundles.length,
      },
      rising, falling, margin, bundles,
    };
  }
}
