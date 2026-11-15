/**
 * Merchant journey for the admin panel: per-shop milestones, stuck step and
 * health (Shop 360 "Journey" tab), the signup funnel by platform and source,
 * the stuck-shops list, and the journey filters of the Shops list.
 *
 * Milestones come from existing tables (products, bills, khata, purchases,
 * staff, store, channels, devices, payments); only the signup source and the
 * last seen per app come from tenant_journey. The facts for every shop are
 * loaded in one pass of grouped queries and cached for two minutes.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { addDaysTz, dateKeyTz, startOfDayTz } from '../../common/helpers/business-time.helper';
import { dayRange } from '../common/date-range';
import {
  FUNNEL_STEPS, HEALTH_LABEL, ONBOARDING_STEPS, STUCK_LABEL, healthOf, lastImportantAction, milestonesOf, onboardingNextStep,
  platformsSeen, signupPlatformOf, sourceOf, stuckAt, summarize, funnelReached,
  type Health, type JourneySummary, type Platform, type StuckStep, type TenantFacts, type Uses,
} from './journey.logic';

const CACHE_MS = 2 * 60_000;
const PLATFORMS: Array<Platform | 'unknown'> = ['web', 'android', 'ios', 'desktop', 'unknown'];
const PLATFORM_LABEL: Record<Platform | 'unknown', string> = { web: 'Web', android: 'Android', ios: 'iOS', desktop: 'Desktop', unknown: 'Unknown' };

export interface JourneyFilter {
  platform?: string;
  uses?: string;
  stuck?: string;
  health?: string;
  source?: string;
}

const isHealth = (v?: string): v is Health => !!v && v in HEALTH_LABEL;
const isStuck = (v?: string): v is StuckStep | 'none' => !!v && (v === 'none' || v in STUCK_LABEL);
const isUses = (v?: string): v is Uses => v === 'web' || v === 'mobile' || v === 'both' || v === 'none';

@Injectable()
export class AdminJourneyService {
  private cache: { at: number; facts: Map<string, TenantFacts> } | null = null;
  private loading: Promise<Map<string, TenantFacts>> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  // ─── Facts ──────────────────────────────────────────────────────────

  /** Facts for every shop, cached briefly (lists, filters and the funnel read this). */
  async allFacts(): Promise<Map<string, TenantFacts>> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.facts;
    if (!this.loading) {
      this.loading = this.loadFacts()
        .then((facts) => { this.cache = { at: Date.now(), facts }; return facts; })
        .finally(() => { this.loading = null; });
    }
    return this.loading;
  }

  private async loadFacts(ids?: string[]): Promise<Map<string, TenantFacts>> {
    const tw = ids ? { tenantId: { in: ids } } : {};
    const [
      tenants, onboarding, products, sales, customers, ledgers, purchases, staff, stores, channels, devices, payments, paidSubs, trials, journeys,
    ] = await Promise.all([
      this.prisma.tenant.findMany({
        where: { slug: { not: 'nafaa-system' }, ...(ids ? { id: { in: ids } } : {}) },
        select: { id: true, name: true, slug: true, phone: true, status: true, createdAt: true, lastActiveAt: true, partnerId: true, referredById: true },
      }),
      this.prisma.onboardingProgress.findMany({ where: tw, select: { tenantId: true, isCompleted: true, isSkipped: true, completedSteps: true, currentStep: true, completedAt: true } }),
      this.prisma.product.groupBy({ by: ['tenantId'], where: tw, _min: { createdAt: true }, _max: { createdAt: true } }),
      this.prisma.sale.groupBy({ by: ['tenantId'], where: { ...tw, status: { not: 'VOIDED' } }, _min: { soldAt: true }, _max: { soldAt: true } }),
      this.prisma.customer.groupBy({ by: ['tenantId'], where: tw, _min: { createdAt: true } }),
      this.prisma.customerLedger.groupBy({ by: ['tenantId'], where: tw, _min: { createdAt: true }, _max: { createdAt: true } }),
      this.prisma.purchase.groupBy({ by: ['tenantId'], where: tw, _min: { createdAt: true }, _max: { createdAt: true } }),
      this.prisma.user.groupBy({ by: ['tenantId'], where: { ...tw, role: { in: ['MANAGER', 'CASHIER', 'STAFF'] } }, _min: { createdAt: true } }),
      this.prisma.nafaaStore.groupBy({ by: ['tenantId'], where: { ...tw, status: 'LIVE' }, _min: { launchedAt: true, createdAt: true } }),
      this.prisma.integration.groupBy({
        by: ['tenantId'],
        where: { ...tw, category: 'SALES_CHANNEL', type: { notIn: ['MANUAL', 'NAFAA_STORE'] }, status: 'CONNECTED' },
        _min: { createdAt: true },
      }),
      this.prisma.mobileDevice.groupBy({ by: ['tenantId', 'platform'], where: tw, _min: { firstSeenAt: true }, _max: { lastSeenAt: true } }),
      this.prisma.payment.groupBy({ by: ['tenantId'], where: { ...tw, status: 'APPROVED', amount: { gt: 0 } }, _min: { approvedAt: true, createdAt: true } }),
      this.prisma.subscription.groupBy({ by: ['tenantId'], where: { ...tw, status: 'ACTIVE', amount: { gt: 0 } }, _min: { createdAt: true } }),
      this.prisma.subscription.findMany({ where: { ...tw, status: 'TRIAL' }, select: { tenantId: true, trialEndsAt: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.tenantJourney.findMany({ where: tw }),
    ]);

    const by = <T extends { tenantId: string }>(rows: T[]) => new Map(rows.map((r) => [r.tenantId, r]));
    const ob = by(onboarding);
    const pr = by(products);
    const sa = by(sales);
    const cu = by(customers);
    const le = by(ledgers);
    const pu = by(purchases);
    const st = by(staff);
    const so = by(stores);
    const ch = by(channels);
    const pa = by(payments);
    const ps = by(paidSubs);
    const jo = by(journeys);
    const trial = new Map<string, Date | null>();
    for (const t of trials) if (!trial.has(t.tenantId)) trial.set(t.tenantId, t.trialEndsAt);
    const dev = new Map<string, { first: Date | null; android: Date | null; ios: Date | null }>();
    for (const d of devices) {
      const cur = dev.get(d.tenantId) ?? { first: null, android: null, ios: null };
      const first = d._min.firstSeenAt;
      if (first && (!cur.first || first < cur.first)) cur.first = first;
      const last = d._max.lastSeenAt;
      const key = d.platform === 'ios' ? 'ios' : 'android';
      if (last && (!cur[key] || last > cur[key]!)) cur[key] = last;
      dev.set(d.tenantId, cur);
    }

    const earliest = (...d: Array<Date | null | undefined>) => d.filter((x): x is Date => !!x).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
    const out = new Map<string, TenantFacts>();
    for (const t of tenants) {
      const j = jo.get(t.id) ?? null;
      const o = ob.get(t.id);
      const d = dev.get(t.id);
      out.set(t.id, {
        id: t.id,
        name: t.name,
        slug: t.slug,
        phone: t.phone,
        status: t.status,
        createdAt: t.createdAt,
        lastActiveAt: t.lastActiveAt,
        partnerId: t.partnerId,
        referredById: t.referredById,
        onboarding: o ? { isCompleted: o.isCompleted, isSkipped: o.isSkipped, completedSteps: o.completedSteps, currentStep: o.currentStep, completedAt: o.completedAt } : null,
        firstProductAt: pr.get(t.id)?._min.createdAt ?? null,
        lastProductAt: pr.get(t.id)?._max.createdAt ?? null,
        firstSaleAt: sa.get(t.id)?._min.soldAt ?? null,
        lastSaleAt: sa.get(t.id)?._max.soldAt ?? null,
        firstCustomerAt: cu.get(t.id)?._min.createdAt ?? null,
        firstKhataAt: le.get(t.id)?._min.createdAt ?? null,
        lastKhataAt: le.get(t.id)?._max.createdAt ?? null,
        firstPurchaseAt: pu.get(t.id)?._min.createdAt ?? null,
        lastPurchaseAt: pu.get(t.id)?._max.createdAt ?? null,
        staffAddedAt: st.get(t.id)?._min.createdAt ?? null,
        storeLiveAt: so.has(t.id) ? (so.get(t.id)!._min.launchedAt ?? so.get(t.id)!._min.createdAt ?? null) : null,
        channelAt: ch.get(t.id)?._min.createdAt ?? null,
        mobileAt: earliest(d?.first, j?.firstSeenAndroidAt, j?.firstSeenIosAt),
        mobileLastSeen: { android: d?.android ?? null, ios: d?.ios ?? null },
        paidAt: earliest(pa.get(t.id)?._min.approvedAt ?? pa.get(t.id)?._min.createdAt, ps.get(t.id)?._min.createdAt),
        trialEndsAt: trial.get(t.id) ?? null,
        journey: j,
      });
    }
    return out;
  }

  // ─── Shops list support ─────────────────────────────────────────────

  /** Journey columns for the given shops (from the cached facts). */
  async summaries(ids: string[]): Promise<Record<string, JourneySummary>> {
    if (!ids.length) return {};
    const facts = await this.allFacts();
    const now = new Date();
    const out: Record<string, JourneySummary> = {};
    for (const id of ids) {
      const f = facts.get(id);
      if (f) out[id] = summarize(f, now);
    }
    return out;
  }

  /** True when any journey filter is set. */
  hasFilter(f: JourneyFilter): boolean {
    return !!(f.platform || isUses(f.uses) || isStuck(f.stuck) || isHealth(f.health) || f.source);
  }

  /** Shop ids matching the journey filters. */
  async matchIds(filter: JourneyFilter): Promise<string[]> {
    const facts = await this.allFacts();
    const now = new Date();
    const ids: string[] = [];
    for (const f of facts.values()) if (this.matches(f, summarize(f, now), filter)) ids.push(f.id);
    return ids;
  }

  private matches(f: TenantFacts, s: JourneySummary, filter: JourneyFilter): boolean {
    if (filter.platform) {
      if (filter.platform === 'mobile' ? s.signupPlatform !== 'android' && s.signupPlatform !== 'ios' : s.signupPlatform !== filter.platform) return false;
    }
    if (isUses(filter.uses) && s.uses !== filter.uses) return false;
    if (isStuck(filter.stuck) && (filter.stuck === 'none' ? s.stuckAt !== null : s.stuckAt !== filter.stuck)) return false;
    if (isHealth(filter.health) && s.health !== filter.health) return false;
    if (filter.source && s.source !== filter.source.toLowerCase()) return false;
    return true;
  }

  // ─── Shop 360: Journey tab ─────────────────────────────────────────

  async tenantJourney(id: string) {
    const [facts, tenant, users] = await Promise.all([
      this.loadFacts([id]),
      this.prisma.tenant.findUnique({
        where: { id },
        select: { id: true, name: true, partnerSource: true, referredBy: { select: { id: true, name: true } }, partner: { select: { id: true, code: true } } },
      }),
      this.prisma.user.findMany({
        where: { tenantId: id, role: { notIn: ['ADMIN_STAFF', 'PARTNER', 'SUPER_ADMIN'] } },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, fullName: true, role: true, lastSeenAt: true, lastSeenWebAt: true, lastSeenDesktopAt: true, lastSeenAndroidAt: true, lastSeenIosAt: true },
      }),
    ]);
    const f = facts.get(id);
    if (!f || !tenant) throw new NotFoundException('Shop not found');
    const now = new Date();
    const j = f.journey;
    const seen = platformsSeen(f);
    const health = healthOf(f, now);
    const stuck = stuckAt(f);
    const milestones = milestonesOf(f);

    const firstSeen: Record<Platform, Date | null> = {
      web: null,
      desktop: null,
      android: j?.firstSeenAndroidAt ?? null,
      ios: j?.firstSeenIosAt ?? null,
    };
    const timeline = [
      ...milestones.filter((m) => m.at).map((m) => ({ key: m.key, label: m.label, at: m.at as Date, kind: 'milestone' as const })),
      ...(j?.firstSeenAndroidAt ? [{ key: 'first_android', label: 'First used the Android app', at: j.firstSeenAndroidAt, kind: 'platform' as const }] : []),
      ...(j?.firstSeenIosAt ? [{ key: 'first_ios', label: 'First used the iOS app', at: j.firstSeenIosAt, kind: 'platform' as const }] : []),
      ...(f.lastSaleAt && f.lastSaleAt.getTime() !== f.firstSaleAt?.getTime() ? [{ key: 'last_sale', label: 'Latest bill', at: f.lastSaleAt, kind: 'activity' as const }] : []),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    return {
      tenantId: id,
      source: {
        label: sourceOf(f),
        utm: { source: j?.utmSource ?? null, medium: j?.utmMedium ?? null, campaign: j?.utmCampaign ?? null, term: j?.utmTerm ?? null, content: j?.utmContent ?? null },
        firstTouch: { source: j?.ftSource ?? null, medium: j?.ftMedium ?? null, campaign: j?.ftCampaign ?? null, term: j?.ftTerm ?? null, content: j?.ftContent ?? null },
        cta: j?.cta ?? null,
        referrerDomain: j?.referrerDomain ?? null,
        landingPage: j?.landingPage ?? null,
        referralCode: j?.referralCode ?? null,
        referredBy: tenant.referredBy,
        partner: tenant.partner ? { id: tenant.partner.id, code: tenant.partner.code, via: tenant.partnerSource } : null,
      },
      signup: {
        platform: signupPlatformOf(f),
        appVersion: j?.signupAppVersion ?? null,
        method: j?.signupMethod ?? null,
        at: f.createdAt,
        recorded: !!j?.signupRecordedAt,
        inferred: j?.inferred ?? false,
      },
      platforms: (['web', 'android', 'ios', 'desktop'] as Platform[]).map((p) => ({ platform: p, label: PLATFORM_LABEL[p], lastSeenAt: seen[p], firstSeenAt: firstSeen[p] })),
      users: users.map((u) => ({
        id: u.id, name: u.fullName, role: u.role, lastSeenAt: u.lastSeenAt,
        web: u.lastSeenWebAt, desktop: u.lastSeenDesktopAt, android: u.lastSeenAndroidAt, ios: u.lastSeenIosAt,
      })),
      milestones,
      onboarding: {
        steps: ONBOARDING_STEPS.map((s) => ({ id: s.id, label: s.label, required: s.required, done: !!f.onboarding?.completedSteps.includes(s.apiStep) || !!f.onboarding?.isCompleted })),
        finished: !!f.onboarding?.isCompleted,
        skipped: !!f.onboarding?.isSkipped,
        next: onboardingNextStep(f),
      },
      stuckAt: stuck ? { key: stuck, label: STUCK_LABEL[stuck] } : null,
      health: { state: health.state, label: HEALTH_LABEL[health.state], reason: health.reason },
      lastAction: lastImportantAction(f),
      trialEndsAt: f.trialEndsAt,
      timeline,
    };
  }

  // ─── Funnel ────────────────────────────────────────────────────────

  /** Shops that signed up in the range (all time when no range), with their summary. */
  private async cohort(q: { from?: string; to?: string; platform?: string; source?: string }) {
    const facts = await this.allFacts();
    const range = dayRange(q.from, q.to);
    const now = new Date();
    const rows: Array<{ f: TenantFacts; s: JourneySummary }> = [];
    for (const f of facts.values()) {
      if (range?.gte && f.createdAt < range.gte) continue;
      if (range?.lt && f.createdAt >= range.lt) continue;
      const s = summarize(f, now);
      if (!this.matches(f, s, { platform: q.platform, source: q.source })) continue;
      rows.push({ f, s });
    }
    return { rows, range, now };
  }

  async funnel(q: { from?: string; to?: string; platform?: string; source?: string }) {
    const { rows, range, now } = await this.cohort(q);

    // Signups by Pakistan day, split by platform and by the top sources.
    const sourceTotals = new Map<string, number>();
    for (const r of rows) sourceTotals.set(r.s.source, (sourceTotals.get(r.s.source) ?? 0) + 1);
    const topSources = [...sourceTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
    const firstDay = range?.gte ?? (rows.length ? rows.reduce((m, r) => (r.f.createdAt < m ? r.f.createdAt : m), rows[0].f.createdAt) : startOfDayTz(now));
    const lastDay = range?.lt ? addDaysTz(range.lt, -1) : now;
    const dayKeys: string[] = [];
    for (let d = startOfDayTz(firstDay), i = 0; d <= lastDay && i < 731; d = addDaysTz(d, 1), i++) dayKeys.push(dateKeyTz(d));
    const daily = new Map(dayKeys.map((k) => [k, { date: k, total: 0, platforms: Object.fromEntries(PLATFORMS.map((p) => [p, 0])) as Record<string, number>, sources: Object.fromEntries([...topSources, 'other'].map((s) => [s, 0])) as Record<string, number> }]));
    for (const r of rows) {
      const day = daily.get(dateKeyTz(r.f.createdAt));
      if (!day) continue;
      day.total++;
      day.platforms[r.s.signupPlatform]++;
      day.sources[topSources.includes(r.s.source) ? r.s.source : 'other']++;
    }

    // Step funnel overall, per platform and per source.
    const reached = rows.map((r) => ({ r, steps: funnelReached(r.f, now) }));
    const count = (list: typeof reached) => FUNNEL_STEPS.map((_, i) => list.filter((x) => x.steps[i]).length);
    const group = (keyOf: (x: (typeof reached)[number]) => string, labelOf: (k: string) => string, limit = 12) => {
      const groups = new Map<string, typeof reached>();
      for (const x of reached) { const k = keyOf(x); groups.set(k, [...(groups.get(k) ?? []), x]); }
      return [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, limit)
        .map(([key, list]) => ({ key, label: labelOf(key), total: list.length, steps: count(list) }));
    };

    // Web vs mobile: signup platform groups, plus how long the first bill took.
    const hoursToFirstBill = (list: typeof rows) => {
      const hours = list.filter((r) => r.f.firstSaleAt).map((r) => (r.f.firstSaleAt!.getTime() - r.f.createdAt.getTime()) / 3_600_000).filter((h) => h >= 0).sort((a, b) => a - b);
      return hours.length ? Math.round(hours[Math.floor(hours.length / 2)] * 10) / 10 : null;
    };
    const side = (key: 'web' | 'mobile', match: (p: string) => boolean) => {
      const list = rows.filter((r) => match(r.s.signupPlatform));
      const steps = count(reached.filter((x) => match(x.r.s.signupPlatform)));
      return { key, label: key === 'web' ? 'Web and desktop' : 'Android and iOS', signups: list.length, steps, medianHoursToFirstBill: hoursToFirstBill(list) };
    };

    // Which apps shops use now (every shop, not only this cohort).
    const all = await this.allFacts();
    const uses: Record<Uses, number> = { web: 0, mobile: 0, both: 0, none: 0 };
    for (const f of all.values()) uses[summarize(f, now).uses]++;

    const health: Record<Health, number> = { active: 0, at_risk: 0, stuck: 0, churned: 0 };
    const stuck: Record<string, number> = { onboarding: 0, first_product: 0, first_sale: 0, paid: 0 };
    for (const r of rows) {
      health[r.s.health]++;
      if (r.s.stuckAt) stuck[r.s.stuckAt]++;
    }

    const overall = count(reached);
    return {
      range: { from: range?.gte ?? null, to: range?.lt ?? null },
      total: rows.length,
      steps: FUNNEL_STEPS.map((s, i) => ({ key: s.key, label: s.label, count: overall[i] })),
      daily: [...daily.values()],
      topSources,
      byPlatform: group((x) => x.r.s.signupPlatform, (k) => PLATFORM_LABEL[k as Platform] ?? k),
      bySource: group((x) => x.r.s.source, (k) => k),
      webVsMobile: [side('web', (p) => p === 'web' || p === 'desktop'), side('mobile', (p) => p === 'android' || p === 'ios')],
      unknownPlatform: rows.filter((r) => r.s.signupPlatform === 'unknown').length,
      uses,
      health,
      stuck: Object.entries(stuck).map(([key, n]) => ({ key, label: STUCK_LABEL[key as StuckStep], count: n })),
      sources: [...sourceTotals.keys()].sort(),
    };
  }

  /** Shops in the cohort with their journey state, for the "Stuck shops" list. */
  async shops(q: { from?: string; to?: string; platform?: string; source?: string; stuck?: string; health?: string; uses?: string; search?: string; page?: number; limit?: number }) {
    const { rows } = await this.cohort(q);
    const search = q.search?.trim().toLowerCase();
    const list = rows
      .filter((r) => this.matches(r.f, r.s, { stuck: q.stuck, health: q.health, uses: q.uses }))
      .filter((r) => !search || r.f.name.toLowerCase().includes(search) || r.f.slug.toLowerCase().includes(search) || (r.f.phone ?? '').includes(search))
      .sort((a, b) => b.f.createdAt.getTime() - a.f.createdAt.getTime());
    const page = Math.max(1, q.page ?? 1);
    const limit = Math.min(200, Math.max(1, q.limit ?? 25));
    const items = list.slice((page - 1) * limit, page * limit).map(({ f, s }) => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      phone: f.phone,
      status: f.status,
      createdAt: f.createdAt,
      signupPlatform: s.signupPlatform,
      source: s.source,
      stuckAt: s.stuckAt,
      stuckLabel: s.stuckAt ? STUCK_LABEL[s.stuckAt] : null,
      onboardingNext: onboardingNextStep(f),
      health: s.health,
      healthReason: s.healthReason,
      uses: s.uses,
      lastSeenAt: s.lastSeenAt,
      lastAction: s.lastAction,
    }));
    return { items, meta: { page, limit, total: list.length, totalPages: Math.ceil(list.length / limit) } };
  }
}

