/**
 * Ad rules: stored rules, the run that turns them into suggestions or
 * automatic changes, applying / dismissing suggestions, and undo.
 *
 * Numbers per campaign: spend, delivered orders and delivered sale from
 * Nafaa's marketing attribution (MarketingService.report), status and daily
 * budget from Meta, and today's spend from Meta's insights. Rules run after
 * every insights pull and can be dry-run from the page.
 */

import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MetaAdAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { apiText } from '../../../common/i18n/api-message';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { metaAccess } from '../../../integrations/meta/meta-access';
import { MarketingService } from '../marketing/marketing.service';
import { campaignKey } from '../marketing/attribution';
import { AdAccountRef, MetaAdsService } from './meta-ads.service';
import { AdRule, CampaignStat, ProposedAction, RULE_DEFAULTS, RULE_KINDS, applyCaps, evaluateRules, normalizeRule, undoOf } from './ad-rules';

const MANAGERS = ['OWNER', 'ADMIN', 'MANAGER', 'SUPER_ADMIN'];
const RULE_ERRORS: Record<string, string> = { KIND: apiText('Rule ki qism chunein'), THRESHOLD: apiText('Had sahi nahi') };

const shiftDay = (day: string, by: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
};

@Injectable()
export class AdRulesService {
  private readonly logger = new Logger(AdRulesService.name);
  /** One run per shop at a time on this server. */
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaAdsService,
    private readonly marketing: MarketingService,
  ) {}

  private assertManager(user: AuthenticatedUser) {
    if (!MANAGERS.includes(String(user.role))) throw new ForbiddenException('Ye kaam sirf malik ya manager kar sakte hain');
  }

  /* ───────────────────────── rules ───────────────────────── */

  private toRule(r: { id: string; name: string; kind: string; threshold: number; days: number; pct: number; minSpend: number; campaignIds: string[]; mode: string; enabled: boolean }): AdRule {
    return normalizeRule(r, r.id);
  }

  async list(user: AuthenticatedUser) {
    const [rules, s] = await Promise.all([
      this.prisma.metaAdRule.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'asc' } }),
      this.meta.settings(user.tenantId),
    ]);
    return { rules, defaults: RULE_DEFAULTS, kinds: RULE_KINDS, caps: { maxChangePct: s.maxChangePct, maxActionsPerDay: s.maxActionsPerDay } };
  }

  private clean(raw: unknown, id = '') {
    try {
      return normalizeRule(raw, id);
    } catch (e: any) {
      throw new BadRequestException(RULE_ERRORS[e?.message] ?? 'Rule sahi nahi');
    }
  }

  async create(user: AuthenticatedUser, body: unknown) {
    this.assertManager(user);
    if ((await this.prisma.metaAdRule.count({ where: { tenantId: user.tenantId } })) >= 30) throw new BadRequestException('30 se zyada rules nahi');
    const r = this.clean(body);
    const { id: _id, ...data } = r;
    return this.prisma.metaAdRule.create({ data: { ...data, name: r.name || r.kind, tenantId: user.tenantId, createdById: user.id } });
  }

  async update(user: AuthenticatedUser, id: string, body: unknown) {
    this.assertManager(user);
    const old = await this.prisma.metaAdRule.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!old) throw new NotFoundException('Rule nahi mila');
    const r = this.clean({ ...old, ...(body as object) }, id);
    const { id: _id, ...data } = r;
    return this.prisma.metaAdRule.update({ where: { id }, data: { ...data, name: r.name || r.kind } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    this.assertManager(user);
    const res = await this.prisma.metaAdRule.deleteMany({ where: { id, tenantId: user.tenantId } });
    if (!res.count) throw new NotFoundException('Rule nahi mila');
    await this.prisma.metaAdAction.updateMany({ where: { tenantId: user.tenantId, ruleId: id, status: 'SUGGESTED' }, data: { status: 'DISMISSED' } });
    return { deleted: true };
  }

  /* ───────────────────────── numbers ───────────────────────── */

  /**
   * Campaign numbers for each look-back window the rules use. Spend and
   * delivered sale come from Nafaa's attribution; Meta gives status,
   * budget, its own ROAS and today's spend.
   */
  async stats(tenantId: string, acct: AdAccountRef, windows: number[]): Promise<Map<number, CampaignStat[]>> {
    const today = await this.meta.today(tenantId);
    const maxDays = Math.max(1, ...windows);
    const [campaigns, insights, actor, s, tenant] = await Promise.all([
      this.meta.campaigns(tenantId, acct, true),
      this.meta.insights(tenantId, acct, shiftDay(today, -(maxDays - 1)), today, 'campaign'),
      this.meta.ownerActor(tenantId),
      this.meta.settings(tenantId),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } }),
    ]);
    const rate = acct.currency === (tenant?.currency ?? 'PKR').toUpperCase() ? 1 : s.fxRate ?? null;
    const out = new Map<number, CampaignStat[]>();
    for (const days of [...new Set(windows)]) {
      const from = shiftDay(today, -(days - 1));
      const report = await this.marketing.report(actor, new ShopScope(null, true), { from, to: today });
      const ours = new Map(report.campaigns.filter((c) => c.platform === 'META' && c.name).map((c) => [campaignKey(c.name), c]));
      out.set(days, campaigns.map((c) => {
        const o = ours.get(campaignKey(c.name));
        const meta = insights.filter((r) => r.campaignId === c.id && r.day >= from);
        const metaSpend = meta.reduce((t, r) => t + r.spend, 0);
        const metaValue = meta.reduce((t, r) => t + r.purchaseValue, 0);
        const todaySpend = insights.filter((r) => r.campaignId === c.id && r.day === today).reduce((t, r) => t + r.spend, 0);
        return {
          id: c.id, name: c.name, status: c.status, dailyBudget: c.dailyBudget, currency: acct.currency,
          spend: o?.spend ?? (rate ? metaSpend * rate : 0),
          delivered: o?.delivered ?? 0, deliveredSales: o?.deliveredSales ?? 0,
          roas: o?.roas ?? null, cpa: o?.costPerOrder ?? null,
          metaRoas: metaSpend > 0 && metaValue > 0 ? Math.round((metaValue / metaSpend) * 100) / 100 : null,
          todaySpend: rate ? Math.round(todaySpend * rate) : 0,
        };
      }));
    }
    return out;
  }

  private async evaluate(tenantId: string, acct: AdAccountRef, rules: AdRule[]): Promise<ProposedAction[]> {
    if (!rules.length) return [];
    const windows = rules.map((r) => (r.kind === 'SPEND_CAP' ? 1 : r.days));
    const byWindow = await this.stats(tenantId, acct, windows);
    // Each rule sees its own window; one action per campaign overall.
    const all: ProposedAction[] = [];
    for (const r of rules) all.push(...evaluateRules([r], byWindow.get(r.kind === 'SPEND_CAP' ? 1 : r.days) ?? []));
    const order = { SPEND_CAP: 0, ROAS_PAUSE: 1, CPA_LOWER: 2, ROAS_RAISE: 3 } as const;
    const seen = new Set<string>();
    return all.sort((a, b) => order[a.reason.kind] - order[b.reason.kind]).filter((a) => (seen.has(a.campaignId) ? false : (seen.add(a.campaignId), true)));
  }

  /** What the rules would do now, without saving or changing anything. */
  async dryRun(user: AuthenticatedUser, body: { rule?: unknown }) {
    const { acct } = await this.meta.need(user.tenantId);
    const rules = body?.rule
      ? [this.clean(body.rule, 'dry-run')]
      : (await this.prisma.metaAdRule.findMany({ where: { tenantId: user.tenantId, enabled: true } })).map((r) => this.toRule(r));
    const actions = await this.evaluate(user.tenantId, acct, rules);
    const s = await this.meta.settings(user.tenantId);
    const { usedPct, usedCount } = await this.usedToday(user.tenantId);
    const auto = applyCaps(actions.filter((a) => a.mode === 'AUTO'), { maxChangePct: s.maxChangePct, maxActions: s.maxActionsPerDay }, usedPct, usedCount);
    return { actions, autoAllowed: auto.allowed.map((a) => a.campaignId), autoHeld: auto.held.map((h) => ({ campaignId: h.campaignId, held: h.held })) };
  }

  /** Automatic changes already made today: % per campaign and the count. */
  private async usedToday(tenantId: string) {
    const day = await this.meta.today(tenantId);
    const done = await this.prisma.metaAdAction.findMany({ where: { tenantId, day, source: 'RULE', status: { in: ['APPLIED', 'UNDONE'] }, appliedById: null }, select: { objectId: true, changePct: true } });
    const usedPct = new Map<string, number>();
    for (const d of done) usedPct.set(d.objectId, (usedPct.get(d.objectId) ?? 0) + Math.abs(d.changePct ?? 0));
    return { usedPct, usedCount: done.length };
  }

  /**
   * Runs the shop's rules: suggestions are saved once per campaign and day,
   * automatic changes are applied within the caps (the rest are saved as
   * HELD suggestions).
   */
  async run(tenantId: string) {
    if (this.running.has(tenantId)) return { skipped: true };
    this.running.add(tenantId);
    try {
      const rules = (await this.prisma.metaAdRule.findMany({ where: { tenantId, enabled: true } })).map((r) => this.toRule(r));
      if (!rules.length) return { suggested: 0, applied: 0, held: 0 };
      const { acct } = await this.meta.need(tenantId);
      const actions = await this.evaluate(tenantId, acct, rules);
      const day = await this.meta.today(tenantId);
      const open = await this.prisma.metaAdAction.findMany({ where: { tenantId, day, source: 'RULE', status: { in: ['SUGGESTED', 'HELD', 'APPLIED'] } }, select: { objectId: true, ruleId: true, status: true } });
      const already = new Set(open.map((o) => `${o.ruleId}|${o.objectId}`));
      const fresh = actions.filter((a) => !already.has(`${a.ruleId}|${a.campaignId}`));
      const s = await this.meta.settings(tenantId);
      const { usedPct, usedCount } = await this.usedToday(tenantId);
      const auto = applyCaps(fresh.filter((a) => a.mode === 'AUTO'), { maxChangePct: s.maxChangePct, maxActions: s.maxActionsPerDay }, usedPct, usedCount);
      let applied = 0;
      for (const a of auto.allowed) {
        const row = await this.save(tenantId, acct, day, a, 'SUGGESTED');
        const ok = await this.execute(tenantId, acct, row, null).then(() => true).catch(() => false);
        if (ok) applied++;
      }
      for (const h of auto.held) await this.save(tenantId, acct, day, h, 'HELD');
      const suggested = fresh.filter((a) => a.mode === 'SUGGEST');
      for (const a of suggested) await this.save(tenantId, acct, day, a, 'SUGGESTED');
      await this.prisma.metaAdSettings.update({ where: { tenantId }, data: { lastRulesRunAt: new Date() } });
      return { suggested: suggested.length, applied, held: auto.held.length };
    } finally {
      this.running.delete(tenantId);
    }
  }

  async runNow(user: AuthenticatedUser) {
    this.assertManager(user);
    return this.run(user.tenantId);
  }

  private save(tenantId: string, acct: AdAccountRef, day: string, a: ProposedAction, status: 'SUGGESTED' | 'HELD') {
    return this.prisma.metaAdAction.create({
      data: {
        tenantId, ruleId: a.ruleId, adAccountId: acct.act, objectType: 'CAMPAIGN', objectId: a.campaignId, objectName: a.campaignName,
        action: a.action, before: a.before as Prisma.InputJsonValue, after: a.after as Prisma.InputJsonValue, changePct: a.changePct || null,
        source: 'RULE', status, reason: { ...a.reason, ...('held' in a ? { held: (a as any).held } : {}) } as Prisma.InputJsonValue, day,
      },
    });
  }

  /** Applies a saved action at Meta. `by` = null for automatic changes. */
  private async execute(tenantId: string, acct: AdAccountRef, a: MetaAdAction, by: string | null) {
    try {
      const after = (a.after ?? {}) as { status?: string; dailyBudget?: number };
      if (a.action === 'PAUSE' || a.action === 'RESUME') {
        await this.meta.writeStatus(tenantId, a.objectId, a.action === 'PAUSE' ? 'PAUSED' : 'ACTIVE');
      } else if (a.action === 'BUDGET' && typeof after.dailyBudget === 'number') {
        // Budget may have changed since the suggestion: apply the same % to today's value.
        const now = await this.meta.own(tenantId, acct, a.objectId);
        const before = (a.before ?? {}) as { dailyBudget?: number };
        const pct = a.changePct ?? (before.dailyBudget ? ((after.dailyBudget - before.dailyBudget) / before.dailyBudget) * 100 : 0);
        const next = now.dailyBudget ? Math.max(1, Math.round(now.dailyBudget * (1 + pct / 100))) : after.dailyBudget;
        await this.meta.writeBudget(tenantId, acct, a.objectId, next);
        await this.prisma.metaAdAction.update({ where: { id: a.id }, data: { before: { dailyBudget: now.dailyBudget ?? before.dailyBudget ?? null }, after: { dailyBudget: next } } });
      } else {
        throw new BadRequestException('Ye tabdeeli yahan se nahi hoti');
      }
      return await this.prisma.metaAdAction.update({ where: { id: a.id }, data: { status: 'APPLIED', appliedAt: new Date(), appliedById: by, error: null } });
    } catch (e: any) {
      await this.prisma.metaAdAction.update({ where: { id: a.id }, data: { status: 'FAILED', error: String(e?.response?.message ?? e?.message ?? 'Nahi hua').slice(0, 300) } });
      throw e;
    }
  }

  /* ───────────────────────── actions log ───────────────────────── */

  async actions(user: AuthenticatedUser, q: { status?: string; limit?: string }) {
    const status = ['SUGGESTED', 'APPLIED', 'FAILED', 'UNDONE', 'DISMISSED', 'HELD'].includes(String(q.status)) ? String(q.status) : undefined;
    const take = Math.min(200, Math.max(10, Number(q.limit) || 60));
    const [items, counts] = await Promise.all([
      this.prisma.metaAdAction.findMany({ where: { tenantId: user.tenantId, ...(status && { status }) }, orderBy: { createdAt: 'desc' }, take }),
      this.prisma.metaAdAction.groupBy({ by: ['status'], where: { tenantId: user.tenantId, createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } }, _count: { _all: true } }),
    ]);
    const rules = await this.prisma.metaAdRule.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } });
    const ruleName = new Map(rules.map((r) => [r.id, r.name]));
    return {
      items: items.map((a) => ({ ...a, ruleName: a.ruleId ? ruleName.get(a.ruleId) ?? null : null, canUndo: a.status === 'APPLIED' && ['PAUSE', 'RESUME', 'BUDGET', 'DUPLICATE', 'CREATE'].includes(a.action) })),
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    };
  }

  async apply(user: AuthenticatedUser, id: string) {
    this.assertManager(user);
    const a = await this.prisma.metaAdAction.findFirst({ where: { id, tenantId: user.tenantId, status: { in: ['SUGGESTED', 'HELD', 'FAILED'] } } });
    if (!a) throw new NotFoundException('Mashwara nahi mila');
    const { acct } = await this.meta.need(user.tenantId);
    if (a.adAccountId !== acct.act) throw new BadRequestException('Ye mashwara purane ads account ka hai');
    return this.execute(user.tenantId, acct, a, user.id);
  }

  async dismiss(user: AuthenticatedUser, id: string) {
    this.assertManager(user);
    const res = await this.prisma.metaAdAction.updateMany({ where: { id, tenantId: user.tenantId, status: { in: ['SUGGESTED', 'HELD', 'FAILED'] } }, data: { status: 'DISMISSED' } });
    if (!res.count) throw new NotFoundException('Mashwara nahi mila');
    return { ok: true };
  }

  /** Puts an applied change back (status, budget, or deletes what was created). */
  async undo(user: AuthenticatedUser, id: string) {
    this.assertManager(user);
    const a = await this.prisma.metaAdAction.findFirst({ where: { id, tenantId: user.tenantId, status: 'APPLIED' } });
    if (!a) throw new NotFoundException('Ye tabdeeli wapas nahi ho sakti');
    const { acct } = await this.meta.need(user.tenantId);
    if (a.adAccountId !== acct.act) throw new BadRequestException('Ye tabdeeli purane ads account ki hai');
    let u;
    try {
      u = undoOf({ action: a.action as any, before: (a.before ?? {}) as any, after: (a.after ?? {}) as any });
    } catch {
      throw new BadRequestException('Is tabdeeli ki pehli halat maloom nahi');
    }
    if (u.action === 'SET_STATUS') {
      await this.meta.own(user.tenantId, acct, a.objectId);
      await this.meta.writeStatus(user.tenantId, a.objectId, u.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED');
    } else if (u.action === 'SET_BUDGET') {
      await this.meta.own(user.tenantId, acct, a.objectId);
      await this.meta.writeBudget(user.tenantId, acct, a.objectId, u.dailyBudget!);
    } else {
      for (const created of u.ids ?? []) {
        await this.meta.own(user.tenantId, acct, created).catch(() => null);
        await this.meta.writeStatus(user.tenantId, created, 'DELETED').catch(() => null);
      }
    }
    return this.prisma.metaAdAction.update({ where: { id }, data: { status: 'UNDONE', undoneAt: new Date(), undoneById: user.id } });
  }

  /** After the 3-hourly pull: rules of every connected shop. */
  @Cron('0 45 */3 * * *')
  async runAll() {
    if (process.env.DISABLE_META_ADS_SYNC === '1') return;
    const tenants = await this.prisma.metaAdRule.findMany({ where: { enabled: true }, distinct: ['tenantId'], select: { tenantId: true } });
    for (const { tenantId } of tenants) {
      if (!(await metaAccess(this.prisma, tenantId)).live) continue;
      await this.run(tenantId).catch((e) => this.logger.warn(`Ad rules ${tenantId}: ${e?.response?.message ?? e?.message ?? e}`));
    }
  }
}
