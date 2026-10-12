/**
 * Loyalty points for shop customers: programme overview (members, points
 * outstanding and their rupee value, points issued and redeemed over a
 * period, by day and branch), a searchable member list, a customer's history,
 * manual adjustment, and expiry. Expiry settles oldest points first and runs
 * nightly for shops that set an expiry period.
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, dateKeyTz, safeDayStart, zonedToUtc } from '../../../common/helpers/business-time.helper';

const KEY = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;
const n = (v: unknown) => Number(v ?? 0);

/** Member levels by points held; the page shows the same names. */
export const TIERS = [
  { id: 'starter', min: 1 }, { id: 'bronze', min: 100 }, { id: 'silver', min: 500 },
  { id: 'gold', min: 1000 }, { id: 'platinum', min: 2000 }, { id: 'diamond', min: 5000 },
] as const;

/** Points that are older than `cutoff` and still unspent, using oldest-first. */
export function pointsToExpire(entries: Array<{ points: number; createdAt: Date }>, cutoff: Date): number {
  const lots: Array<{ left: number; at: Date }> = [];
  for (const e of [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    if (e.points > 0) lots.push({ left: e.points, at: e.createdAt });
    else {
      let use = -e.points;
      while (use > 0 && lots.length) {
        const take = Math.min(use, lots[0].left);
        lots[0].left -= take; use -= take;
        if (lots[0].left <= 0) lots.shift();
      }
    }
  }
  return lots.filter((l) => l.at < cutoff).reduce((s, l) => s + l.left, 0);
}

@Injectable()
export class LoyaltyService {
  private readonly log = new Logger(LoyaltyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  private async range(tenantId: string, from?: string, to?: string) {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const start = safeDayStart(dayStartHour);
    const today = businessDayKey(new Date(), tz, start);
    const f = from && KEY.test(from) ? from : null;
    const t = to && KEY.test(to) ? to : today;
    const at = (k: string) => { const [y, m, d] = k.split('-').map(Number); return zonedToUtc(y, m, d, start, 0, 0, tz); };
    return { tz, start, from: f, to: t, gte: f ? at(f) : undefined, lt: new Date(at(t).getTime() + DAY) };
  }

  /** Programme health for a period (business days) at the active branch or all branches. */
  async overview(user: AuthenticatedUser, scope: ShopScope, q: { from?: string; to?: string }) {
    const tenantId = user.tenantId;
    const r = await this.range(tenantId, q.from, q.to);
    const shopId = scope.shopId ?? undefined;
    const txWhere = { tenantId, createdAt: { ...(r.gte && { gte: r.gte }), lt: r.lt }, ...(shopId && { shopId }) };
    const tierCounts = Promise.all(TIERS.map((t, i) => this.prisma.customer.count({
      where: { tenantId, loyaltyPoints: { gte: t.min, ...(TIERS[i + 1] && { lt: TIERS[i + 1].min }) } },
    })));
    const [settings, outstanding, members, byType, txs, byShop, shops, sales, tiers] = await Promise.all([
      this.prisma.tenantSettings.findUnique({ where: { tenantId } }),
      this.prisma.customer.aggregate({ where: { tenantId, loyaltyPoints: { gt: 0 } }, _sum: { loyaltyPoints: true }, _count: { _all: true } }),
      this.prisma.customer.count({ where: { tenantId, isActive: true } }),
      this.prisma.loyaltyTransaction.groupBy({ by: ['type'], where: txWhere, _sum: { points: true }, _count: { _all: true } }),
      this.prisma.loyaltyTransaction.findMany({ where: txWhere, select: { type: true, points: true, createdAt: true } }),
      this.prisma.loyaltyTransaction.groupBy({ by: ['shopId', 'type'], where: txWhere, _sum: { points: true } }),
      this.prisma.shop.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      this.prisma.sale.aggregate({
        where: { tenantId, status: { not: 'VOIDED' }, soldAt: { ...(r.gte && { gte: r.gte }), lt: r.lt }, ...(shopId && { shopId }) },
        _sum: { loyaltyDiscount: true, total: true }, _count: { _all: true },
      }),
      tierCounts,
    ]);
    const rate = settings?.loyaltyRedemptionRate ?? 1;
    const sum = (t: string) => Math.abs(n(byType.find((b) => b.type === t)?._sum.points));

    // Daily (or monthly for long periods) issued vs redeemed.
    const days = r.gte ? Math.round((r.lt.getTime() - r.gte.getTime()) / DAY) : 9999;
    const monthly = days > 92;
    const shift = r.start * 3600_000;
    const buckets = new Map<string, { key: string; issued: number; redeemed: number }>();
    for (const t of txs) {
      const k = dateKeyTz(new Date(t.createdAt.getTime() - shift), r.tz);
      const key = monthly ? k.slice(0, 7) : k;
      const b = buckets.get(key) ?? { key, issued: 0, redeemed: 0 };
      if (t.type === 'EARNED') b.issued += t.points;
      if (t.type === 'REDEEMED') b.redeemed += -t.points;
      buckets.set(key, b);
    }
    const shopName = new Map(shops.map((s) => [s.id, s.name]));
    const branchMap = new Map<string, { shopId: string | null; name: string; issued: number; redeemed: number }>();
    for (const b of byShop) {
      const key = b.shopId ?? 'none';
      const row = branchMap.get(key) ?? { shopId: b.shopId, name: b.shopId ? shopName.get(b.shopId) ?? '—' : 'Purani entries', issued: 0, redeemed: 0 };
      if (b.type === 'EARNED') row.issued += n(b._sum.points);
      if (b.type === 'REDEEMED') row.redeemed += -n(b._sum.points);
      branchMap.set(key, row);
    }

    return {
      enabled: !!settings?.enableLoyalty,
      settings: {
        pointsPerRupee: settings?.loyaltyPointsPerRupee ?? 0.01, redemptionRate: rate,
        minRedeem: settings?.loyaltyMinRedeem ?? 0, maxRedeemPercent: settings?.loyaltyMaxRedeemPercent ?? 100, expiryDays: settings?.loyaltyExpiryDays ?? 0,
      },
      from: r.from, to: r.to, grouping: monthly ? 'month' : 'day',
      members: { withPoints: outstanding._count._all, customers: members },
      outstanding: { points: n(outstanding._sum.loyaltyPoints), value: n(outstanding._sum.loyaltyPoints) * rate },
      period: {
        issued: sum('EARNED'), redeemed: sum('REDEEMED'), expired: sum('EXPIRED'),
        adjusted: n(byType.find((b) => b.type === 'ADJUSTMENT')?._sum.points),
        redeemedValue: n(sales._sum.loyaltyDiscount),
        salesTotal: n(sales._sum.total),
        bills: sales._count._all,
      },
      trend: [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key)),
      branches: [...branchMap.values()].sort((a, b) => b.issued - a.issued),
      tiers: TIERS.map((t, i) => ({ id: t.id, min: t.min, count: tiers[i] })),
    };
  }

  /** Members with points, searchable, sorted by points, spend or last activity. */
  async members(user: AuthenticatedUser, q: { search?: string; sort?: string; page?: string | number; limit?: string | number; min?: string | number }) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 30));
    const term = q.search?.trim();
    const digits = term?.replace(/\D/g, '') ?? '';
    const where = {
      tenantId: user.tenantId,
      loyaltyPoints: { gte: Math.max(0, Number(q.min) || 1) },
      ...(term && { OR: [{ name: { contains: term, mode: 'insensitive' as const } }, ...(digits.length >= 3 ? [{ phone: { contains: digits.slice(-7) } }] : [])] }),
    };
    const orderBy = q.sort === 'spent' ? { totalSpent: 'desc' as const } : q.sort === 'name' ? { name: 'asc' as const } : q.sort === 'recent' ? { updatedAt: 'desc' as const } : { loyaltyPoints: 'desc' as const };
    const [items, count] = await Promise.all([
      this.prisma.customer.findMany({
        where, orderBy, skip: (page - 1) * limit, take: limit,
        select: { id: true, name: true, phone: true, avatarUrl: true, loyaltyPoints: true, totalSpent: true, isVip: true, gender: true, updatedAt: true },
      }),
      this.prisma.customer.count({ where }),
    ]);
    const last = items.length
      ? await this.prisma.loyaltyTransaction.groupBy({ by: ['customerId'], where: { tenantId: user.tenantId, customerId: { in: items.map((i) => i.id) } }, _max: { createdAt: true } })
      : [];
    const lastAt = new Map(last.map((l) => [l.customerId, l._max.createdAt]));
    return { page, limit, count, hasMore: page * limit < count, items: items.map((i) => ({ ...i, lastActivityAt: lastAt.get(i.id) ?? null })) };
  }

  async customerHistory(user: AuthenticatedUser, customerId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');
    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where: { customerId, tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 100,
    });
    return { customer, transactions };
  }

  /** Kept for older screens: top members and lifetime totals. */
  async leaderboard(user: AuthenticatedUser) {
    const [customers, earned, redeemed] = await Promise.all([
      this.prisma.customer.findMany({
        where: { tenantId: user.tenantId, loyaltyPoints: { gt: 0 } }, orderBy: { loyaltyPoints: 'desc' }, take: 20,
        select: { id: true, name: true, phone: true, loyaltyPoints: true, totalSpent: true },
      }),
      this.prisma.loyaltyTransaction.aggregate({ where: { tenantId: user.tenantId, type: 'EARNED' }, _sum: { points: true } }),
      this.prisma.loyaltyTransaction.aggregate({ where: { tenantId: user.tenantId, type: 'REDEEMED' }, _sum: { points: true } }),
    ]);
    return { topCustomers: customers, totalEarned: earned._sum.points ?? 0, totalRedeemed: Math.abs(redeemed._sum.points ?? 0) };
  }

  /** Add or remove points by hand (gift, correction); never below zero. */
  async adjust(user: AuthenticatedUser, scope: ShopScope, customerId: string, dto: { points: number; note?: string }) {
    const points = Math.trunc(Number(dto.points));
    if (!points) throw new BadRequestException('Points likhein');
    const c = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } });
    if (!c) throw new NotFoundException('Customer not found');
    return this.prisma.$transaction(async (tx) => {
      if (points < 0) {
        const done = await tx.customer.updateMany({ where: { id: customerId, loyaltyPoints: { gte: -points } }, data: { loyaltyPoints: { increment: points } } });
        if (!done.count) throw new BadRequestException('Itne points nahi hain');
      } else {
        await tx.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { increment: points } } });
      }
      const { loyaltyPoints } = await tx.customer.findUniqueOrThrow({ where: { id: customerId }, select: { loyaltyPoints: true } });
      const entry = await tx.loyaltyTransaction.create({
        data: {
          tenantId: user.tenantId, customerId, type: 'ADJUSTMENT', points, balanceAfter: loyaltyPoints,
          shopId: scope.shopId ?? null, note: (dto.note ?? '').slice(0, 200) || (points > 0 ? 'Tohfa' : 'Durusti'),
        },
      });
      return { loyaltyPoints, entry };
    });
  }

  /** How many points would expire now for this shop (preview), or expire them. */
  async expire(tenantId: string, apply: boolean) {
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    const days = settings?.loyaltyExpiryDays ?? 0;
    if (!days) return { customers: 0, points: 0 };
    const cutoff = new Date(Date.now() - days * DAY);
    const holders = await this.prisma.customer.findMany({ where: { tenantId, loyaltyPoints: { gt: 0 } }, select: { id: true, loyaltyPoints: true } });
    let customers = 0;
    let total = 0;
    for (const h of holders) {
      const entries = await this.prisma.loyaltyTransaction.findMany({ where: { tenantId, customerId: h.id }, select: { points: true, createdAt: true } });
      const due = Math.min(pointsToExpire(entries, cutoff), h.loyaltyPoints);
      if (due <= 0) continue;
      customers += 1; total += due;
      if (!apply) continue;
      await this.prisma.$transaction(async (tx) => {
        const done = await tx.customer.updateMany({ where: { id: h.id, loyaltyPoints: { gte: due } }, data: { loyaltyPoints: { decrement: due } } });
        if (!done.count) return;
        const { loyaltyPoints } = await tx.customer.findUniqueOrThrow({ where: { id: h.id }, select: { loyaltyPoints: true } });
        await tx.loyaltyTransaction.create({
          data: { tenantId, customerId: h.id, type: 'EXPIRED', points: -due, balanceAfter: loyaltyPoints, note: `${days} din purane points khatam` },
        });
      });
    }
    return { customers, points: total };
  }

  /** Nightly expiry for every shop that set an expiry period. */
  @Cron('30 3 * * *')
  async expireAll() {
    const shops = await this.prisma.tenantSettings.findMany({ where: { enableLoyalty: true, loyaltyExpiryDays: { gt: 0 } }, select: { tenantId: true } });
    for (const s of shops) {
      try {
        const r = await this.expire(s.tenantId, true);
        if (r.points) this.log.log(`Expired ${r.points} points for ${r.customers} customers (tenant ${s.tenantId})`);
      } catch (e) {
        this.log.warn(`Expiry failed for tenant ${s.tenantId}: ${(e as Error).message}`);
      }
    }
  }
}
