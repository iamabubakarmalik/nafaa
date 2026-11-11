/**
 * Admin billing catalog: the add-on list (prices, what each one turns on,
 * bundles, plan availability) and the revenue summary by plan and add-on.
 */

import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, TenantAddOnStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementsService } from '../../modules/billing/entitlements/entitlements.service';
import { loadBillingSettings } from '../../modules/billing/entitlements/billing-settings';
import { AddOnInput } from './billing-catalog-input';

const DAY = 86_400_000;
const PK_OFFSET = 5 * 3_600_000;
const SYSTEM_SLUG = 'nafaa-system';
const MONTHS: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };
const RANK: Record<string, number> = { ACTIVE: 0, TRIAL: 1, PAST_DUE: 2, EXPIRED: 3 };

/** Pakistan calendar day of a moment, "2026-11-12". */
const pkDay = (d: Date) => new Date(d.getTime() + PK_OFFSET).toISOString().slice(0, 10);

type ShopState = 'trial' | 'active' | 'free' | 'grace' | 'expired';

@Injectable()
export class AdminBillingCatalogService {
  private readonly logger = new Logger(AdminBillingCatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  // ─── Add-ons ───

  /** Every add-on with how many shops have it, by state. */
  async listAddOns() {
    const now = new Date();
    const [addOns, rows] = await Promise.all([
      this.prisma.addOn.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.tenantAddOn.findMany({
        where: { status: { not: TenantAddOnStatus.CANCELLED }, tenant: { slug: { not: SYSTEM_SLUG } } },
        select: { addOnId: true, status: true, source: true, freeUntil: true, currentPeriodEnd: true, paymentDueAt: true, quantity: true },
      }),
    ]);
    return addOns.map((a) => {
      const mine = rows.filter((r) => r.addOnId === a.id);
      const free = mine.filter((r) => r.status === 'ACTIVE' && ((r.freeUntil && r.freeUntil > now) || (r.source === 'ADMIN' && !r.freeUntil && !r.currentPeriodEnd)));
      const paying = mine.filter((r) => r.status === 'ACTIVE' && !free.includes(r) && r.currentPeriodEnd && r.currentPeriodEnd > now);
      return {
        ...a,
        shops: {
          total: mine.length,
          paying: paying.length,
          free: free.length,
          pendingPayment: mine.filter((r) => r.status === 'PENDING_PAYMENT').length,
          pastDue: mine.filter((r) => r.status === 'PAST_DUE').length,
          units: mine.reduce((n, r) => n + r.quantity, 0),
        },
      };
    });
  }

  /** Bundles may only list existing, non-bundle add-ons; plans must exist. */
  private async checkRefs(input: AddOnInput, selfKey: string) {
    if (input.bundleKeys?.length) {
      if (input.bundleKeys.includes(selfKey)) throw new BadRequestException('A bundle cannot include itself');
      const found = await this.prisma.addOn.findMany({ where: { key: { in: input.bundleKeys } }, select: { key: true, bundleKeys: true } });
      const missing = input.bundleKeys.filter((k) => !found.some((f) => f.key === k));
      if (missing.length) throw new BadRequestException(`Unknown add-on in bundle: ${missing.join(', ')}`);
      const nested = found.filter((f) => f.bundleKeys.length).map((f) => f.key);
      if (nested.length) throw new BadRequestException(`A bundle cannot include another bundle: ${nested.join(', ')}`);
    }
    if (input.availableOnPlans?.length) {
      const plans = await this.prisma.plan.findMany({ where: { slug: { in: input.availableOnPlans } }, select: { slug: true } });
      const missing = input.availableOnPlans.filter((s) => !plans.some((p) => p.slug === s));
      if (missing.length) throw new BadRequestException(`Unknown plan: ${missing.join(', ')}`);
    }
  }

  private toData(input: AddOnInput): Prisma.AddOnUpdateInput {
    const { key: _key, grantsLimits, ...rest } = input;
    const data: Prisma.AddOnUpdateInput = { ...rest };
    if (grantsLimits !== undefined) data.grantsLimits = grantsLimits ?? Prisma.DbNull;
    return data;
  }

  async createAddOn(input: AddOnInput) {
    const key = input.key!;
    if (await this.prisma.addOn.findUnique({ where: { key }, select: { id: true } })) throw new ConflictException('An add-on with this key exists');
    await this.checkRefs(input, key);
    return this.prisma.addOn.create({
      data: { ...(this.toData(input) as Prisma.AddOnCreateInput), key, name: input.name!, category: input.category! },
    });
  }

  async updateAddOn(id: string, input: AddOnInput) {
    const addOn = await this.prisma.addOn.findUnique({ where: { id } });
    if (!addOn) throw new NotFoundException('Add-on not found');
    await this.checkRefs(input, addOn.key);
    if (input.bundleKeys?.length) {
      const usedInBundle = await this.prisma.addOn.count({ where: { bundleKeys: { has: addOn.key } } });
      if (usedInBundle) throw new BadRequestException('This add-on is part of a bundle, so it cannot be a bundle itself');
    }
    const updated = await this.prisma.addOn.update({ where: { id }, data: this.toData(input) });

    // Shops using it see the change at once; channels pause or resume when access changed.
    const accessChanged = input.isActive !== undefined && input.isActive !== addOn.isActive
      || (input.grantsFeatures !== undefined && input.grantsFeatures.join() !== addOn.grantsFeatures.join())
      || (input.bundleKeys !== undefined && input.bundleKeys.join() !== addOn.bundleKeys.join());
    const shops = await this.prisma.tenantAddOn.findMany({ where: { addOnId: id, status: { not: TenantAddOnStatus.CANCELLED } }, select: { tenantId: true } });
    for (const { tenantId } of shops) {
      this.entitlements.invalidate(tenantId);
      if (accessChanged) await this.entitlements.syncChannels(tenantId).catch((e) => this.logger.warn(`Channel sync for ${tenantId} failed: ${e instanceof Error ? e.message : e}`));
    }
    return updated;
  }

  // ─── Revenue ───

  /**
   * Monthly recurring revenue and where it comes from. Each shop's state is
   * worked out from its subscriptions the same way as the entitlements
   * (best of active, trial, past due, expired), so one shop counts once.
   */
  async revenue() {
    const now = new Date();
    const settings = await loadBillingSettings(this.prisma);
    const graceMs = settings.graceDays * DAY;
    const since30 = new Date(now.getTime() - 30 * DAY);

    const [subs, plans, addOnRows, grandfathered, payments] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'EXPIRED'] }, tenant: { slug: { not: SYSTEM_SLUG } } },
        select: { tenantId: true, planId: true, status: true, interval: true, amount: true, trialEndsAt: true, currentPeriodEnd: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.plan.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, slug: true, isFree: true, isActive: true, priceMonthly: true } }),
      this.prisma.tenantAddOn.findMany({
        where: { status: { not: TenantAddOnStatus.CANCELLED }, tenant: { slug: { not: SYSTEM_SLUG } } },
        select: { status: true, source: true, quantity: true, unitPrice: true, freeUntil: true, currentPeriodEnd: true, addOn: { select: { id: true, key: true, name: true, category: true, kind: true, priceMonthly: true } } },
      }),
      this.prisma.tenant.findMany({
        where: { slug: { not: SYSTEM_SLUG }, billingGrandfatherUntil: { gt: now } },
        select: { billingGrandfatherUntil: true },
      }),
      this.prisma.payment.findMany({
        where: { status: 'APPROVED', approvedAt: { gte: since30 }, tenant: { slug: { not: SYSTEM_SLUG } } },
        select: { amount: true, approvedAt: true },
      }),
    ]);

    // One deciding subscription per shop.
    const byShop = new Map<string, (typeof subs)[number]>();
    for (const s of subs) {
      const cur = byShop.get(s.tenantId);
      if (!cur || (RANK[s.status] ?? 9) < (RANK[cur.status] ?? 9)) byShop.set(s.tenantId, s);
    }
    const planById = new Map(plans.map((p) => [p.id, p]));
    const stateOf = (s: (typeof subs)[number]): ShopState => {
      if (s.status === 'TRIAL') return s.trialEndsAt && s.trialEndsAt > now ? 'trial' : 'expired';
      if (s.status === 'ACTIVE' || s.status === 'PAST_DUE') {
        if (planById.get(s.planId)?.isFree) return 'free';
        if (s.currentPeriodEnd > now) return 'active';
        return s.currentPeriodEnd.getTime() + graceMs > now.getTime() ? 'grace' : 'expired';
      }
      return 'expired';
    };
    const monthly = (s: (typeof subs)[number]) => s.amount / (MONTHS[s.interval] ?? 1);

    const counts: Record<ShopState, number> = { trial: 0, active: 0, free: 0, grace: 0, expired: 0 };
    const planRows = new Map(plans.map((p) => [p.id, { planId: p.id, name: p.name, slug: p.slug, isFree: p.isFree, isActive: p.isActive, active: 0, paying: 0, trial: 0, grace: 0, free: 0, mrr: 0 }]));
    let planMrr = 0;
    let atRisk = 0;
    let paying = 0;
    for (const s of byShop.values()) {
      const state = stateOf(s);
      counts[state]++;
      const row = planRows.get(s.planId);
      if (state === 'active') {
        if (row) row.active++;
        if (s.amount > 0) {
          paying++;
          planMrr += monthly(s);
          if (row) { row.paying++; row.mrr += monthly(s); }
        }
      } else if (state === 'trial') { if (row) row.trial++; }
      else if (state === 'grace') { atRisk += monthly(s); if (row) row.grace++; }
      else if (state === 'free') { if (row) row.free++; }
    }

    // Add-ons: paid and running, free (gift, trial, grandfather), waiting for payment, switched off.
    const addOnMap = new Map<string, { key: string; name: string; category: string; kind: string; paying: number; free: number; pendingPayment: number; pastDue: number; mrr: number }>();
    for (const r of addOnRows) {
      const a = r.addOn;
      const row = addOnMap.get(a.id) ?? { key: a.key, name: a.name, category: a.category, kind: a.kind, paying: 0, free: 0, pendingPayment: 0, pastDue: 0, mrr: 0 };
      addOnMap.set(a.id, row);
      const isFree = r.status === 'ACTIVE' && ((r.freeUntil && r.freeUntil > now) || (r.source === 'ADMIN' && !r.freeUntil && !r.currentPeriodEnd));
      if (r.status === 'PENDING_PAYMENT') row.pendingPayment++;
      else if (r.status === 'PAST_DUE') row.pastDue++;
      else if (isFree) row.free++;
      else if (r.status === 'ACTIVE' && r.currentPeriodEnd && r.currentPeriodEnd > now && a.kind !== 'ONE_TIME') {
        row.paying++;
        row.mrr += (r.unitPrice ?? a.priceMonthly) * Math.max(1, r.quantity);
      }
    }
    const addOns = [...addOnMap.values()].sort((x, y) => y.mrr - x.mrr || y.paying - x.paying);
    const addOnMrr = addOns.reduce((n, a) => n + a.mrr, 0);

    // Grandfathered shops by the day their free period ends.
    const gfDays = new Map<string, number>();
    for (const t of grandfathered) {
      const d = pkDay(t.billingGrandfatherUntil!);
      gfDays.set(d, (gfDays.get(d) ?? 0) + 1);
    }

    // Approved payments per Pakistan day, last 30 days.
    const daily = new Map<string, { amount: number; count: number }>();
    for (let i = 29; i >= 0; i--) daily.set(pkDay(new Date(now.getTime() - i * DAY)), { amount: 0, count: 0 });
    for (const p of payments) {
      const d = daily.get(pkDay(p.approvedAt!));
      if (d) { d.amount += p.amount; d.count++; }
    }

    const round = (n: number) => Math.round(n);
    return {
      mrr: round(planMrr + addOnMrr),
      planMrr: round(planMrr),
      addOnMrr: round(addOnMrr),
      payingShops: paying,
      states: counts,
      graceAtRisk: round(atRisk),
      graceDays: settings.graceDays,
      byPlan: [...planRows.values()].map((r) => ({ ...r, mrr: round(r.mrr) })),
      addOns: addOns.map((a) => ({ ...a, mrr: round(a.mrr) })),
      grandfathered: {
        count: grandfathered.length,
        byDay: [...gfDays.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
      },
      payments30: {
        total: round(payments.reduce((n, p) => n + p.amount, 0)),
        count: payments.length,
        daily: [...daily.entries()].map(([date, v]) => ({ date, amount: round(v.amount), count: v.count })),
      },
    };
  }
}
