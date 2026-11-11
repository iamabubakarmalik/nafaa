/**
 * Meta ads management for the Marketing hub: campaigns, ad sets and ads read
 * live from the shop's chosen ad account, the insights pull into the AdSpend
 * and AdCampaign tables (replacing the CSV import for connected shops),
 * pause / resume / daily budget / duplicate, and the "Boost product" wizard
 * that creates a PAUSED campaign, ad set and ad.
 *
 * Every Graph call goes through MetaGraphService (token, appsecret_proof,
 * retries, friendly errors). Every change is logged in MetaAdAction with its
 * before/after state so it can be undone (AdRulesService.undo).
 */

import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '../../../core/system-control/cron.decorator';
import { MetaConnection, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { apiMessage, apiText } from '../../../common/i18n/api-message';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey } from '../../../common/helpers/business-time.helper';
import { MetaGraphService } from '../../../integrations/meta/meta-graph.service';
import { metaAccess } from '../../../integrations/meta/meta-access';
import { AdsService } from '../ads/ads.service';
import { MetaCapiService } from '../marketing/meta-capi.service';
import {
  AD_FIELDS, ADSET_FIELDS, CAMPAIGN_FIELDS, INSIGHT_FIELDS, MappedInsight, MetaAd, MetaAdSet, MetaCampaign, PK_CITIES, adBody, adSetBody, boostProblem,
  campaignBody, changedBudget, cleanAudience, creativeBody, fromMinor, insightsToSpend, mapAd, mapAdSet, mapCampaign, mapInsightRow, minDailyBudget, pullWindow, toMinor,
  type BoostPlan, type Destination,
} from './meta-ads-math';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MANAGERS = ['OWNER', 'ADMIN', 'MANAGER', 'SUPER_ADMIN'];
const CACHE_MS = 60_000;

export interface AdAccountRef { id: string; act: string; name: string; currency: string }

export interface BoostInput {
  productId?: string;
  name?: string;
  destination?: Destination;
  link?: string | null;
  imageUrl?: string;
  dailyBudget?: number;
  days?: number;
  audience?: unknown;
  cityNames?: string[];
  copy?: { headline?: string; primaryText?: string; description?: string | null };
}

const PROBLEM_TEXT: Record<string, string> = {
  NAME: apiText('Campaign ka naam likhein'),
  LINK: apiText('Product ka website link chahiye (https se shuru)'),
  DAYS: apiText('Din 1 se 90 tak'),
  BUDGET: apiText('Roz ka budget kam hai'),
  COPY: apiText('Headline aur ad ki baat likhein'),
};

@Injectable()
export class MetaAdsService {
  private readonly logger = new Logger(MetaAdsService.name);
  private readonly cache = new Map<string, { at: number; value: unknown }>();
  private readonly cityKeys = new Map<string, { key: string; name: string } | null>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: MetaGraphService,
    private readonly tz: TenantTimezoneService,
    private readonly ads: AdsService,
    private readonly capi: MetaCapiService,
  ) {}

  /* ───────────────────────── account ───────────────────────── */

  async today(tenantId: string) {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    return businessDayKey(new Date(), tz, dayStartHour);
  }

  /** The chosen ad account, or null when the shop has not connected or picked one. */
  account(conn: MetaConnection | null): AdAccountRef | null {
    if (!conn?.adAccountId) return null;
    const id = conn.adAccountId.replace(/^act_/, '');
    const list = Array.isArray(conn.adAccounts) ? (conn.adAccounts as any[]) : [];
    const hit = list.find((a) => String(a?.id ?? '').replace(/^act_/, '') === id);
    return { id, act: `act_${id}`, name: hit?.name ?? id, currency: String(hit?.currency ?? 'PKR').toUpperCase() };
  }

  /** Connection and ad account for a working call; clear message otherwise. */
  async need(tenantId: string): Promise<{ conn: MetaConnection; acct: AdAccountRef }> {
    const access = await metaAccess(this.prisma, tenantId);
    if (!access.live) throw new ForbiddenException(access.reason === 'paused' ? 'Facebook ka kaam Nafaa ne thori der ke liye rok rakha hai' : 'Facebook ads abhi aap ki dukaan ke liye jald aa rahe hain');
    const conn = await this.graph.connection(tenantId);
    if (!conn || !conn.userToken) throw new BadRequestException('Facebook abhi jura nahi — Settings → Facebook & Instagram se joren');
    const acct = this.account(conn);
    if (!acct) throw new BadRequestException('Ads account chuna nahi gaya — Settings → Facebook & Instagram me ads account chunein');
    return { conn, acct };
  }

  /**
   * The shop owner as the actor of background work (expenses of pulled
   * spend, attribution numbers for rules). Same rule as
   * OnlineOrdersService.systemActor, which this module cannot import without
   * a load-order cycle.
   */
  async ownerActor(tenantId: string): Promise<AuthenticatedUser> {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId, isActive: true, role: UserRole.OWNER },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, role: true },
    });
    if (!owner) throw new BadRequestException('Dukaan ka koi active malik nahi mila');
    return { id: owner.id, sub: owner.id, tenantId, email: owner.email, role: owner.role, shopId: null, permissions: [] };
  }

  async settings(tenantId: string) {
    return this.prisma.metaAdSettings.upsert({ where: { tenantId }, create: { tenantId }, update: {} });
  }

  private assertManager(user: AuthenticatedUser) {
    if (!MANAGERS.includes(String(user.role))) throw new ForbiddenException('Ye kaam sirf malik ya manager kar sakte hain');
  }

  /** Status card: access, connection, ad account, pull state. */
  async status(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const [access, conn, s, tenant] = await Promise.all([
      metaAccess(this.prisma, tenantId),
      this.graph.connection(tenantId),
      this.settings(tenantId),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } }),
    ]);
    const acct = this.account(conn);
    const shopCurrency = tenant?.currency ?? 'PKR';
    return {
      access,
      connected: !!conn?.userToken && conn.status === 'CONNECTED',
      connectionStatus: conn?.status ?? null,
      lastError: conn?.lastError ?? null,
      adAccount: acct ? { id: acct.act, name: acct.name, currency: acct.currency } : null,
      pageId: conn?.pageId ?? null,
      hasInstagram: !!conn?.igUserId,
      shopCurrency,
      needsRate: !!acct && acct.currency !== shopCurrency.toUpperCase() && !(s.fxRate && s.fxRate > 0),
      settings: { autoPull: s.autoPull, fxRate: s.fxRate, maxChangePct: s.maxChangePct, maxActionsPerDay: s.maxActionsPerDay, lastPullAt: s.lastPullAt, lastPullError: s.lastPullError, lastRulesRunAt: s.lastRulesRunAt },
    };
  }

  async saveSettings(user: AuthenticatedUser, b: { autoPull?: unknown; fxRate?: unknown; maxChangePct?: unknown; maxActionsPerDay?: unknown }) {
    this.assertManager(user);
    const data: Prisma.MetaAdSettingsUpdateInput = {};
    if (typeof b.autoPull === 'boolean') data.autoPull = b.autoPull;
    if (b.fxRate !== undefined) {
      const n = b.fxRate === null || b.fxRate === '' ? null : Number(b.fxRate);
      if (n !== null && !(Number.isFinite(n) && n > 0 && n < 100_000)) throw new BadRequestException('Rate sahi nahi');
      data.fxRate = n;
    }
    if (b.maxChangePct !== undefined) data.maxChangePct = Math.min(100, Math.max(5, Math.round(Number(b.maxChangePct) || 30)));
    if (b.maxActionsPerDay !== undefined) data.maxActionsPerDay = Math.min(50, Math.max(1, Math.round(Number(b.maxActionsPerDay) || 10)));
    await this.prisma.metaAdSettings.upsert({ where: { tenantId: user.tenantId }, create: { tenantId: user.tenantId, ...(data as any) }, update: data });
    return (await this.status(user)).settings;
  }

  /* ───────────────────────── reading ───────────────────────── */

  private cached<T>(key: string, load: () => Promise<T>, fresh = false): Promise<T> {
    const hit = this.cache.get(key);
    if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return Promise.resolve(hit.value as T);
    return load().then((value) => { this.cache.set(key, { at: Date.now(), value }); return value; });
  }

  private drop(tenantId: string) {
    for (const k of this.cache.keys()) if (k.startsWith(`${tenantId}|`)) this.cache.delete(k);
  }

  async campaigns(tenantId: string, acct: AdAccountRef, fresh = false): Promise<MetaCampaign[]> {
    return this.cached(`${tenantId}|campaigns`, async () => {
      const rows = await this.graph.callAll(tenantId, { path: `${acct.act}/campaigns`, params: { fields: CAMPAIGN_FIELDS, limit: 200, effective_status: ['ACTIVE', 'PAUSED', 'IN_PROCESS', 'WITH_ISSUES', 'CAMPAIGN_PAUSED', 'PENDING_REVIEW', 'DISAPPROVED'] } }, 300);
      return rows.map((r) => mapCampaign(r, acct.currency));
    }, fresh);
  }

  async adSets(tenantId: string, acct: AdAccountRef, fresh = false): Promise<MetaAdSet[]> {
    return this.cached(`${tenantId}|adsets`, async () => {
      const rows = await this.graph.callAll(tenantId, { path: `${acct.act}/adsets`, params: { fields: ADSET_FIELDS, limit: 300, effective_status: ['ACTIVE', 'PAUSED', 'IN_PROCESS', 'WITH_ISSUES', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'PENDING_REVIEW'] } }, 600);
      return rows.map((r) => mapAdSet(r, acct.currency));
    }, fresh);
  }

  async adsList(tenantId: string, acct: AdAccountRef, fresh = false): Promise<MetaAd[]> {
    return this.cached(`${tenantId}|ads`, async () => {
      const rows = await this.graph.callAll(tenantId, { path: `${acct.act}/ads`, params: { fields: AD_FIELDS, limit: 300, effective_status: ['ACTIVE', 'PAUSED', 'IN_PROCESS', 'WITH_ISSUES', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'PENDING_REVIEW', 'DISAPPROVED'] } }, 800);
      return rows.map(mapAd);
    }, fresh);
  }

  /** Daily insights rows for the account between two days, at ad set or campaign level. */
  async insights(tenantId: string, acct: AdAccountRef, since: string, until: string, level: 'adset' | 'campaign' = 'adset'): Promise<MappedInsight[]> {
    const rows = await this.graph.callAll(tenantId, {
      path: `${acct.act}/insights`,
      params: { level, fields: INSIGHT_FIELDS, time_increment: 1, time_range: { since, until }, limit: 500 },
    }, 5000);
    return rows.map(mapInsightRow).filter((r): r is MappedInsight => !!r);
  }

  /**
   * The Meta tab: campaigns with their ad sets and ads, and Meta's numbers
   * for the period (spend, impressions, clicks, purchases, CPA).
   */
  async overview(user: AuthenticatedUser, q: { from?: string; to?: string; fresh?: string }) {
    const { acct } = await this.need(user.tenantId);
    const today = await this.today(user.tenantId);
    const to = q.to && DAY_KEY.test(q.to) ? q.to : today;
    const from = q.from && DAY_KEY.test(q.from) ? q.from : to.slice(0, 8) + '01';
    const fresh = q.fresh === '1';
    const [campaigns, adSets, ads, stats] = await Promise.all([
      this.campaigns(user.tenantId, acct, fresh),
      this.adSets(user.tenantId, acct, fresh),
      this.adsList(user.tenantId, acct, fresh),
      this.cached(`${user.tenantId}|ins|${from}|${to}`, () => this.insights(user.tenantId, acct, from, to, 'campaign'), fresh),
    ]);
    const sum = new Map<string, { spend: number; impressions: number; clicks: number; purchases: number; purchaseValue: number; conversations: number }>();
    for (const r of stats) {
      const t = sum.get(r.campaignId) ?? { spend: 0, impressions: 0, clicks: 0, purchases: 0, purchaseValue: 0, conversations: 0 };
      t.spend += r.spend; t.impressions += r.impressions; t.clicks += r.clicks; t.purchases += r.purchases; t.purchaseValue += r.purchaseValue; t.conversations += r.conversations;
      sum.set(r.campaignId, t);
    }
    const r2 = (v: number) => Math.round(v * 100) / 100;
    const rows = campaigns.map((c) => {
      const t = sum.get(c.id) ?? { spend: 0, impressions: 0, clicks: 0, purchases: 0, purchaseValue: 0, conversations: 0 };
      return {
        ...c,
        spend: r2(t.spend), impressions: t.impressions, clicks: t.clicks, purchases: t.purchases, conversations: t.conversations,
        cpa: t.purchases ? r2(t.spend / t.purchases) : null,
        metaRoas: t.spend > 0 && t.purchaseValue > 0 ? r2(t.purchaseValue / t.spend) : null,
        ctr: t.impressions ? r2((t.clicks / t.impressions) * 100) : null,
        adSets: adSets.filter((s) => s.campaignId === c.id).map((s) => ({ ...s, ads: ads.filter((a) => a.adSetId === s.id) })),
      };
    }).sort((a, b) => (a.status === b.status ? b.spend - a.spend : a.status === 'ACTIVE' ? -1 : 1));
    return {
      range: { from, to },
      account: { id: acct.act, name: acct.name, currency: acct.currency },
      totals: {
        spend: r2(rows.reduce((s, c) => s + c.spend, 0)),
        impressions: rows.reduce((s, c) => s + c.impressions, 0),
        clicks: rows.reduce((s, c) => s + c.clicks, 0),
        purchases: rows.reduce((s, c) => s + c.purchases, 0),
        active: rows.filter((c) => c.status === 'ACTIVE').length,
      },
      campaigns: rows,
    };
  }

  /* ───────────────────────── insights pull ───────────────────────── */

  /**
   * Pulls the last `back` days of spend into AdSpend (and campaigns into
   * AdCampaign). Meta keeps adjusting the last few days, so they are read
   * again each time.
   */
  async pull(tenantId: string, back = 3) {
    const { acct } = await this.need(tenantId);
    const s = await this.settings(tenantId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } });
    const today = await this.today(tenantId);
    const { since, until } = pullWindow(today, Math.min(30, Math.max(1, back)));
    try {
      const rows = await this.insights(tenantId, acct, since, until, 'adset');
      let spend;
      try {
        spend = insightsToSpend(rows, acct.currency, tenant?.currency ?? 'PKR', s.fxRate);
      } catch {
        throw new BadRequestException(apiMessage('Ads account {{currency}} me hai — Marketing → Meta ads me 1 {{currency}} ka rate likhein', { currency: acct.currency }));
      }
      const days: string[] = [];
      for (let d = new Date(`${since}T00:00:00Z`); d.toISOString().slice(0, 10) <= until; d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
      const actor = await this.ownerActor(tenantId);
      const saved = await this.ads.saveApiRows(actor, days, spend);
      await this.syncCampaigns(tenantId, acct).catch((e) => this.logger.warn(`Campaign sync ${tenantId}: ${e?.message ?? e}`));
      await this.prisma.metaAdSettings.update({ where: { tenantId }, data: { lastPullAt: new Date(), lastPullError: null } });
      this.drop(tenantId);
      return { ...saved, days: days.length, rows: rows.length };
    } catch (e: any) {
      const msg = String(e?.response?.message ?? e?.message ?? 'Nahi hua').slice(0, 300);
      await this.prisma.metaAdSettings.update({ where: { tenantId }, data: { lastPullError: msg } }).catch(() => null);
      throw e;
    }
  }

  async pullNow(user: AuthenticatedUser, b: { days?: number }) {
    return this.pull(user.tenantId, Number(b?.days) || 7);
  }

  /** Meta campaigns into AdCampaign (by name, as attribution matches), keeping the Meta id. */
  private async syncCampaigns(tenantId: string, acct: AdAccountRef) {
    const list = await this.campaigns(tenantId, acct, true);
    for (const c of list.slice(0, 300)) {
      const status = c.status === 'ACTIVE' ? 'ACTIVE' : c.status === 'PAUSED' ? 'PAUSED' : 'ENDED';
      await this.prisma.adCampaign.upsert({
        where: { tenantId_platform_name: { tenantId, platform: 'META', name: c.name.slice(0, 120) } },
        create: { tenantId, platform: 'META', name: c.name.slice(0, 120), externalId: c.id, adAccountId: acct.act, dailyBudget: c.dailyBudget, status },
        update: { externalId: c.id, adAccountId: acct.act, dailyBudget: c.dailyBudget, status },
      });
    }
  }

  /** Every 3 hours: shops with a connected ad account and the pull on. */
  @Cron('0 25 */3 * * *')
  async pullAll() {
    if (process.env.DISABLE_META_ADS_SYNC === '1') return;
    const conns = await this.prisma.metaConnection.findMany({ where: { status: 'CONNECTED', adAccountId: { not: null } }, select: { tenantId: true } });
    for (const { tenantId } of conns) {
      const s = await this.prisma.metaAdSettings.findUnique({ where: { tenantId }, select: { autoPull: true } });
      if (s && !s.autoPull) continue;
      if (!(await metaAccess(this.prisma, tenantId)).live) continue;
      await this.pull(tenantId, 3).catch((e) => this.logger.warn(`Meta ads pull ${tenantId}: ${e?.response?.message ?? e?.message ?? e}`));
    }
  }

  /* ───────────────────────── changes ───────────────────────── */

  /** Reads one object and checks it belongs to the shop's ad account. */
  async own(tenantId: string, acct: AdAccountRef, id: string): Promise<{ id: string; type: 'CAMPAIGN' | 'ADSET' | 'AD'; name: string; status: string; dailyBudget: number | null; campaignId: string | null }> {
    if (!/^\d{5,25}$/.test(String(id))) throw new BadRequestException('Ghalat id');
    const o = await this.graph.call(tenantId, { path: id, params: { fields: 'id,name,status,account_id,daily_budget,campaign_id', metadata: 1 } });
    if (String(o?.account_id ?? '') !== acct.id) throw new NotFoundException('Ye campaign aap ke ads account ki nahi');
    const type = String(o?.metadata?.type ?? '').toLowerCase();
    const kind = type === 'campaign' ? 'CAMPAIGN' : type === 'adset' ? 'ADSET' : type === 'ad' ? 'AD' : null;
    if (!kind) throw new BadRequestException('Is cheez ko yahan se nahi badal sakte');
    const daily = fromMinor(o?.daily_budget, acct.currency);
    return { id: String(o.id), type: kind, name: String(o.name ?? id), status: String(o.status ?? ''), dailyBudget: daily, campaignId: o?.campaign_id ? String(o.campaign_id) : kind === 'CAMPAIGN' ? String(o.id) : null };
  }

  /** Low-level writes used by manual changes, rules and undo. */
  async writeStatus(tenantId: string, id: string, status: 'ACTIVE' | 'PAUSED' | 'DELETED') {
    await this.graph.call(tenantId, { method: 'POST', path: id, body: { status } });
    this.drop(tenantId);
  }

  async writeBudget(tenantId: string, acct: AdAccountRef, id: string, dailyBudget: number) {
    if (!(dailyBudget >= minDailyBudget(acct.currency))) throw new BadRequestException(apiMessage('Roz ka budget kam se kam {{amount}} {{currency}}', { amount: minDailyBudget(acct.currency), currency: acct.currency }));
    await this.graph.call(tenantId, { method: 'POST', path: id, body: { daily_budget: toMinor(dailyBudget, acct.currency) } });
    this.drop(tenantId);
  }

  private async log(tenantId: string, data: Omit<Prisma.MetaAdActionUncheckedCreateInput, 'tenantId' | 'day'>) {
    return this.prisma.metaAdAction.create({ data: { tenantId, day: await this.today(tenantId), ...data } });
  }

  async setStatus(user: AuthenticatedUser, id: string, b: { status?: string }) {
    const status = b?.status === 'ACTIVE' ? 'ACTIVE' : b?.status === 'PAUSED' ? 'PAUSED' : null;
    if (!status) throw new BadRequestException('Status sahi nahi');
    const { acct } = await this.need(user.tenantId);
    const o = await this.own(user.tenantId, acct, id);
    if (o.status === status) return { ok: true, unchanged: true };
    try {
      await this.writeStatus(user.tenantId, o.id, status);
    } catch (e: any) {
      await this.log(user.tenantId, { adAccountId: acct.act, objectType: o.type, objectId: o.id, objectName: o.name, action: status === 'PAUSED' ? 'PAUSE' : 'RESUME', before: { status: o.status }, after: { status }, status: 'FAILED', error: String(e?.response?.message ?? e?.message).slice(0, 300), createdById: user.id });
      throw e;
    }
    const a = await this.log(user.tenantId, {
      adAccountId: acct.act, objectType: o.type, objectId: o.id, objectName: o.name, action: status === 'PAUSED' ? 'PAUSE' : 'RESUME',
      before: { status: o.status }, after: { status }, status: 'APPLIED', source: 'MANUAL', createdById: user.id, appliedAt: new Date(), appliedById: user.id,
    });
    return { ok: true, actionId: a.id };
  }

  async setBudget(user: AuthenticatedUser, id: string, b: { dailyBudget?: number; pct?: number }) {
    const { acct } = await this.need(user.tenantId);
    const o = await this.own(user.tenantId, acct, id);
    if (o.type === 'AD') throw new BadRequestException('Budget campaign ya ad set par hota hai');
    if (o.dailyBudget === null) throw new BadRequestException('Is ka roz ka budget nahi (budget ad set par ya poori muddat ka hai)');
    const next = b?.pct !== undefined ? changedBudget(o.dailyBudget, Number(b.pct), acct.currency) : Math.round(Number(b?.dailyBudget));
    if (!Number.isFinite(next) || next <= 0) throw new BadRequestException('Budget sahi nahi');
    await this.writeBudget(user.tenantId, acct, o.id, next);
    const a = await this.log(user.tenantId, {
      adAccountId: acct.act, objectType: o.type, objectId: o.id, objectName: o.name, action: 'BUDGET',
      before: { dailyBudget: o.dailyBudget }, after: { dailyBudget: next }, changePct: Math.round(((next - o.dailyBudget) / o.dailyBudget) * 1000) / 10,
      status: 'APPLIED', source: 'MANUAL', createdById: user.id, appliedAt: new Date(), appliedById: user.id,
    });
    return { ok: true, dailyBudget: next, actionId: a.id };
  }

  /** Deep copy of a campaign or ad set; the copy starts PAUSED. */
  async duplicate(user: AuthenticatedUser, id: string) {
    const { acct } = await this.need(user.tenantId);
    const o = await this.own(user.tenantId, acct, id);
    if (o.type === 'AD') throw new BadRequestException('Campaign ya ad set ki copy banti hai');
    const res = await this.graph.call(user.tenantId, { method: 'POST', path: `${o.id}/copies`, body: { deep_copy: true, status_option: 'PAUSED', rename_options: { rename_suffix: ' (copy)' } } });
    const newId = String(res?.copied_campaign_id ?? res?.copied_adset_id ?? res?.ad_object_ids?.[0]?.copied_id ?? '');
    this.drop(user.tenantId);
    const a = await this.log(user.tenantId, {
      adAccountId: acct.act, objectType: o.type, objectId: o.id, objectName: o.name, action: 'DUPLICATE',
      before: {}, after: { createdIds: newId ? [newId] : [] }, status: 'APPLIED', source: 'MANUAL', createdById: user.id, appliedAt: new Date(), appliedById: user.id,
    });
    return { ok: true, id: newId || null, actionId: a.id };
  }

  /* ───────────────────────── Boost product ───────────────────────── */

  /** What the wizard needs: page, Instagram, pixel, currency, cities, minimum budget. */
  async boostOptions(user: AuthenticatedUser) {
    const { conn, acct } = await this.need(user.tenantId);
    const capi = await this.capi.overview(user).catch(() => null);
    const page = this.graph.pages(conn).find((p) => p.id === conn.pageId) ?? null;
    return {
      account: { id: acct.act, name: acct.name, currency: acct.currency },
      page: page ? { id: page.id, name: page.name, instagram: page.igUsername ?? null } : null,
      pixel: !!(capi as any)?.pixelId,
      cities: PK_CITIES,
      minDailyBudget: minDailyBudget(acct.currency),
    };
  }

  /** Meta city keys for city names (cached on this server). */
  private async cities(tenantId: string, names: string[]) {
    const out: Array<{ key: string; name: string }> = [];
    for (const name of names.slice(0, 15)) {
      const k = name.trim().toLowerCase();
      if (!this.cityKeys.has(k)) {
        const res = await this.graph.call(tenantId, { path: 'search', params: { type: 'adgeolocation', location_types: ['city'], q: name.trim(), country_code: 'PK', limit: 3 } });
        const hit = (res?.data ?? []).find((c: any) => c?.type === 'city' && c?.country_code === 'PK');
        this.cityKeys.set(k, hit ? { key: String(hit.key), name: String(hit.name) } : null);
      }
      const v = this.cityKeys.get(k);
      if (v) out.push(v);
    }
    return out;
  }

  /** Uploads the product picture to the ad account and returns its hash. */
  private async imageHash(tenantId: string, acct: AdAccountRef, url: string) {
    if (!/^https:\/\//i.test(url)) throw new BadRequestException('Product ki tasveer chahiye');
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) }).catch(() => null);
    if (!res?.ok) throw new BadRequestException('Product ki tasveer nahi khuli');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) throw new BadRequestException('Tasveer 8 MB se bari hai');
    const up = await this.graph.call(tenantId, { method: 'POST', path: `${acct.act}/adimages`, body: { bytes: buf.toString('base64') } });
    const first: any = Object.values(up?.images ?? {})[0];
    if (!first?.hash) throw new BadRequestException('Tasveer Facebook par nahi gayi');
    return String(first.hash);
  }

  /**
   * Creates campaign → ad set → creative → ad, all PAUSED. If a step fails
   * the campaign made so far is deleted, so nothing half-made is left.
   */
  async boost(user: AuthenticatedUser, b: BoostInput) {
    this.assertManager(user);
    const { conn, acct } = await this.need(user.tenantId);
    if (!conn.pageId) throw new BadRequestException('Facebook page chuna nahi gaya — Settings → Facebook & Instagram me page chunein');
    const product = b.productId ? await this.prisma.product.findFirst({
      where: { id: String(b.productId), tenantId: user.tenantId },
      select: { id: true, name: true, images: { select: { url: true }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 } },
    }) : null;
    if (!product) throw new NotFoundException('Product nahi mila');
    const destination: Destination = b.destination === 'WHATSAPP' ? 'WHATSAPP' : 'WEBSITE';
    const capi = await this.capi.overview(user).catch(() => null);
    const audience = cleanAudience(b.audience);
    if (Array.isArray(b.cityNames) && b.cityNames.length) audience.cities = await this.cities(user.tenantId, b.cityNames.map(String).filter((n) => PK_CITIES.includes(n)));
    const draft = {
      name: String(b.name ?? `Boost: ${product.name}`).trim().slice(0, 150),
      destination,
      link: destination === 'WEBSITE' ? String(b.link ?? '').trim() || null : null,
      dailyBudget: Math.round(Number(b.dailyBudget) || 0),
      days: Math.round(Number(b.days) || 0),
      audience,
      copy: { headline: String(b.copy?.headline ?? '').trim(), primaryText: String(b.copy?.primaryText ?? '').trim(), description: String(b.copy?.description ?? '').trim() || null },
      currency: acct.currency,
    };
    const problem = boostProblem(draft);
    if (problem) throw new BadRequestException(PROBLEM_TEXT[problem] ?? 'Maloomat poori nahi');
    const page = this.graph.pages(conn).find((p) => p.id === conn.pageId);
    const imageUrl = String(b.imageUrl || product.images[0]?.url || '');
    const plan: BoostPlan = {
      ...draft, pageId: conn.pageId, instagramUserId: conn.igUserId ?? page?.igId ?? null,
      pixelId: (capi as any)?.pixelId ?? null, imageHash: await this.imageHash(user.tenantId, acct, imageUrl), start: new Date(Date.now() + 10 * 60_000),
    };

    let campaignId: string | null = null;
    try {
      campaignId = String((await this.graph.call(user.tenantId, { method: 'POST', path: `${acct.act}/campaigns`, body: campaignBody(plan) })).id);
      const adSetId = String((await this.graph.call(user.tenantId, { method: 'POST', path: `${acct.act}/adsets`, body: adSetBody(plan, campaignId) })).id);
      const creativeId = String((await this.graph.call(user.tenantId, { method: 'POST', path: `${acct.act}/adcreatives`, body: creativeBody(plan) })).id);
      const adId = String((await this.graph.call(user.tenantId, { method: 'POST', path: `${acct.act}/ads`, body: adBody(plan, adSetId, creativeId) })).id);
      this.drop(user.tenantId);
      const a = await this.log(user.tenantId, {
        adAccountId: acct.act, objectType: 'CAMPAIGN', objectId: campaignId, objectName: plan.name, action: 'CREATE', source: 'BOOST',
        before: {}, after: { createdIds: [campaignId], adSetId, adId, creativeId, productId: product.id, status: 'PAUSED' } as Prisma.InputJsonValue,
        status: 'APPLIED', createdById: user.id, appliedAt: new Date(), appliedById: user.id,
      });
      return { ok: true, campaignId, adSetId, adId, actionId: a.id, manageUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${acct.id}&selected_campaign_ids=${campaignId}` };
    } catch (e) {
      if (campaignId) await this.graph.call(user.tenantId, { method: 'DELETE', path: campaignId }).catch(() => null);
      throw e;
    }
  }

  /** The shop confirms a boosted campaign: campaign, ad set and ad go live. */
  async launch(user: AuthenticatedUser, actionId: string) {
    this.assertManager(user);
    const a = await this.prisma.metaAdAction.findFirst({ where: { id: actionId, tenantId: user.tenantId, action: 'CREATE' } });
    if (!a) throw new NotFoundException('Boost nahi mila');
    const { acct } = await this.need(user.tenantId);
    const after = (a.after ?? {}) as any;
    for (const id of [a.objectId, after.adSetId, after.adId].filter(Boolean)) {
      await this.own(user.tenantId, acct, String(id));
      await this.writeStatus(user.tenantId, String(id), 'ACTIVE');
    }
    await this.log(user.tenantId, {
      adAccountId: acct.act, objectType: 'CAMPAIGN', objectId: a.objectId, objectName: a.objectName, action: 'RESUME', source: 'BOOST',
      before: { status: 'PAUSED' }, after: { status: 'ACTIVE' }, status: 'APPLIED', createdById: user.id, appliedAt: new Date(), appliedById: user.id,
    });
    return { ok: true };
  }
}
