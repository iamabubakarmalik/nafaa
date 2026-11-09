/**
 * Marketing hub: campaigns and how their orders are recognised, the
 * attribution report (spend against delivered orders by campaign and by
 * traffic source), product links with UTM tags, and Nafaa AI ad copy.
 *
 * Spend comes from AdSpend (the Ads & ROAS log); order money comes from
 * online-economics (bill, product cost and selling costs), so profit here is
 * the same profit the Ads and Profit pages show.
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { apiMessage } from '../../../common/i18n/api-message';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey } from '../../../common/helpers/business-time.helper';
import { periodRange } from '../../inventory/taxonomy/taxonomy.helper';
import { phoneKey } from '../../../integrations/online-orders/customer-risk';
import { readWebsiteConfig } from '../../../integrations/online-orders/website-config';
import { onlineOrdersMoney } from '../online-economics';
import { AD_PLATFORMS, AdPlatform, r2 } from '../ads/ads-math';
import { CampaignRule, campaignKey, matchCampaign } from './attribution';
import { DayPoint, Tally, addOrder, blankTally, budgetMoves, fatigueOf, finishTally, outcomeOf } from './marketing-math';
import { AdCopyInput, AdCopyService } from './ad-copy.service';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MARKETPLACES = ['DARAZ', 'FOODPANDA'];
/** Spend platforms that are also traffic sources on orders. */
const SOURCE_OF_PLATFORM: Partial<Record<AdPlatform, string>> = { META: 'META', GOOGLE: 'GOOGLE', TIKTOK: 'TIKTOK', SNAPCHAT: 'SNAPCHAT' };

export interface CampaignInput {
  platform?: string;
  name?: string;
  utmCampaign?: string | null;
  discountCodes?: string[] | string;
  productIds?: string[];
  dailyBudget?: number | string | null;
  status?: string;
  note?: string | null;
}

const keyOf = (platform: string, name: string | null | undefined) => `${platform}|${campaignKey(name)}`;

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly copy: AdCopyService,
  ) {}

  /* ───────────────────────── campaigns ───────────────────────── */

  async campaigns(user: AuthenticatedUser) {
    const rows = await this.prisma.adCampaign.findMany({ where: { tenantId: user.tenantId }, orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }], take: 300 });
    // Spend campaign names not yet saved as campaigns, so the shop can add codes to them.
    const names = await this.prisma.adSpend.groupBy({
      by: ['platform', 'campaign'], where: { tenantId: user.tenantId, campaign: { not: null } }, _sum: { amount: true }, _max: { day: true },
      orderBy: { _max: { day: 'desc' } }, take: 200,
    });
    const saved = new Set(rows.map((r) => keyOf(r.platform, r.name)));
    return {
      items: rows,
      fromSpend: names.filter((n) => n.campaign && !saved.has(keyOf(n.platform, n.campaign)))
        .map((n) => ({ platform: n.platform, name: n.campaign!, spend: r2(Number(n._sum.amount ?? 0)), lastDay: n._max.day })),
    };
  }

  private async cleanCampaign(user: AuthenticatedUser, b: CampaignInput, before?: { platform: string; name: string }) {
    const platform = String(b.platform ?? before?.platform ?? '').toUpperCase();
    if (!(AD_PLATFORMS as readonly string[]).includes(platform)) throw new BadRequestException('Platform chunein');
    const name = String(b.name ?? before?.name ?? '').trim().slice(0, 120);
    if (!name) throw new BadRequestException('Campaign ka naam likhein');
    const rawCodes = Array.isArray(b.discountCodes) ? b.discountCodes : typeof b.discountCodes === 'string' ? b.discountCodes.split(/[,\s]+/) : undefined;
    const discountCodes = rawCodes ? [...new Set(rawCodes.map((c) => String(c).trim().toUpperCase().slice(0, 60)).filter(Boolean))].slice(0, 30) : undefined;
    let productIds: string[] | undefined;
    if (b.productIds !== undefined) {
      const ids = [...new Set((Array.isArray(b.productIds) ? b.productIds : []).map(String))].slice(0, 50);
      productIds = ids.length ? (await this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: ids } }, select: { id: true } })).map((p) => p.id) : [];
    }
    const budget = b.dailyBudget === undefined ? undefined : b.dailyBudget === null || b.dailyBudget === '' ? null : Number(b.dailyBudget);
    if (budget !== undefined && budget !== null && (!Number.isFinite(budget) || budget < 0 || budget > 100_000_000)) throw new BadRequestException('Budget sahi nahi');
    const status = b.status === undefined ? undefined : String(b.status).toUpperCase();
    if (status !== undefined && !['ACTIVE', 'PAUSED', 'ENDED'].includes(status)) throw new BadRequestException('Status sahi nahi');
    return {
      platform, name,
      ...(b.utmCampaign !== undefined && { utmCampaign: String(b.utmCampaign ?? '').trim().slice(0, 200) || null }),
      ...(discountCodes !== undefined && { discountCodes }),
      ...(productIds !== undefined && { productIds }),
      ...(budget !== undefined && { dailyBudget: budget === null ? null : r2(budget) }),
      ...(status !== undefined && { status }),
      ...(b.note !== undefined && { note: String(b.note ?? '').trim().slice(0, 500) || null }),
    };
  }

  /** A discount code may point to one campaign only. */
  private async assertCodesFree(tenantId: string, codes: string[] | undefined, exceptId?: string) {
    if (!codes?.length) return;
    const clash = await this.prisma.adCampaign.findFirst({ where: { tenantId, discountCodes: { hasSome: codes }, ...(exceptId && { id: { not: exceptId } }) }, select: { name: true, discountCodes: true } });
    if (clash) {
      const code = codes.find((c) => clash.discountCodes.includes(c));
      throw new BadRequestException(apiMessage('Code {{code}} pehle se "{{name}}" campaign me hai', { code, name: clash.name }));
    }
  }

  async createCampaign(user: AuthenticatedUser, b: CampaignInput) {
    const data = await this.cleanCampaign(user, b);
    await this.assertCodesFree(user.tenantId, data.discountCodes);
    try {
      return await this.prisma.adCampaign.create({ data: { ...data, tenantId: user.tenantId, createdById: user.id } });
    } catch (e) {
      if ((e as Prisma.PrismaClientKnownRequestError)?.code === 'P2002') throw new BadRequestException('Is naam ki campaign pehle se hai');
      throw e;
    }
  }

  async updateCampaign(user: AuthenticatedUser, id: string, b: CampaignInput) {
    const before = await this.prisma.adCampaign.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!before) throw new NotFoundException('Campaign nahi mili');
    const data = await this.cleanCampaign(user, b, before);
    await this.assertCodesFree(user.tenantId, data.discountCodes, id);
    try {
      return await this.prisma.adCampaign.update({ where: { id }, data });
    } catch (e) {
      if ((e as Prisma.PrismaClientKnownRequestError)?.code === 'P2002') throw new BadRequestException('Is naam ki campaign pehle se hai');
      throw e;
    }
  }

  async removeCampaign(user: AuthenticatedUser, id: string) {
    const n = await this.prisma.adCampaign.deleteMany({ where: { id, tenantId: user.tenantId } });
    if (!n.count) throw new NotFoundException('Campaign nahi mili');
    return { deleted: true };
  }

  /* ───────────────────────── attribution report ───────────────────────── */

  /**
   * Spend against orders for a period, by campaign (spend rows by platform
   * and campaign name; orders by discount code or utm_campaign) and by
   * traffic source. Orders count by the day they came in; outcomes are
   * read now, so recent orders still on the way show as "open".
   */
  async report(user: AuthenticatedUser, scope: ShopScope, q: { from?: string; to?: string }) {
    const tenantId = user.tenantId;
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const today = businessDayKey(new Date(), tz, dayStartHour);
    const to = q.to && DAY_KEY.test(q.to) ? q.to : today;
    const from = q.from && DAY_KEY.test(q.from) ? q.from : to.slice(0, 8) + '01';
    if (from > to) throw new BadRequestException('Date sahi nahi');
    const seesProfit = hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW) && hasPermission(user.role, user.permissions, PERMISSIONS.PROFIT_REPORT_VIEW);
    const range = await periodRange(this.tz, tenantId, from, to);

    const [ads, saved, orders, money] = await Promise.all([
      this.prisma.adSpend.findMany({ where: { tenantId, ...scope.where, day: { gte: from, lte: to } }, select: { day: true, platform: true, amount: true, campaign: true, adSet: true } }),
      this.prisma.adCampaign.findMany({ where: { tenantId } }),
      this.prisma.channelOrder.findMany({
        where: { tenantId, receivedAt: range, deletedAt: null, mergedIntoId: null, ...(scope.shopId && { OR: [{ shopId: scope.shopId }, { shopId: null }] }) },
        select: {
          id: true, orderStatus: true, total: true, customerPhone: true, receivedAt: true, metadata: true,
          utmCampaign: true, utmSource: true, trafficSource: true, discountCodes: true, integration: { select: { type: true } },
        },
        take: 30_000,
      }),
      onlineOrdersMoney(this.prisma, { tenantId, shopId: scope.shopId, range, tz, dayStartHour }),
    ]);
    const live = orders.filter((o) => !(o.metadata as any)?.test);
    const moneyById = new Map(money.map((m) => [m.id, m]));
    const newPhones = await this.firstOrders(tenantId, live, range.gte);

    // Campaigns: saved ones plus every campaign name seen on spend rows.
    type Camp = CampaignRule & { savedId: string | null; status: string; tally: Tally; adSets: Map<string, number>; days: Map<string, DayPoint>; byCode: number; byUtm: number; spendDays: Set<string> };
    const camps = new Map<string, Camp>();
    const make = (platform: string, name: string, s?: (typeof saved)[number]): Camp => ({
      id: keyOf(platform, name), platform, name, utmCampaign: s?.utmCampaign ?? null, discountCodes: s?.discountCodes ?? [],
      savedId: s?.id ?? null, status: s?.status ?? 'ACTIVE', tally: blankTally(), adSets: new Map(), days: new Map(), byCode: 0, byUtm: 0, spendDays: new Set(),
    });
    for (const s of saved) camps.set(keyOf(s.platform, s.name), make(s.platform, s.name, s));
    const day = (c: Camp, d: string) => { const p = c.days.get(d) ?? { day: d, spend: 0, orders: 0 }; c.days.set(d, p); return p; };

    const total = blankTally();
    const sources = new Map<string, Tally>();
    const at = (k: string) => { const t = sources.get(k) ?? blankTally(); sources.set(k, t); return t; };
    const daily = new Map<string, { spend: number; placed: number; delivered: number }>();
    const dayRow = (d: string) => { const r = daily.get(d) ?? { spend: 0, placed: 0, delivered: 0 }; daily.set(d, r); return r; };

    for (const a of ads) {
      total.spend += a.amount;
      dayRow(a.day).spend += a.amount;
      const src = SOURCE_OF_PLATFORM[a.platform as AdPlatform] ?? a.platform;
      at(src).spend += a.amount;
      const k = keyOf(a.platform, a.campaign);
      const c = camps.get(k) ?? make(a.platform, a.campaign ?? '');
      camps.set(k, c);
      c.tally.spend += a.amount;
      c.spendDays.add(a.day);
      day(c, a.day).spend += a.amount;
      if (a.adSet) c.adSets.set(a.adSet, (c.adSets.get(a.adSet) ?? 0) + a.amount);
    }

    const rules = [...camps.values()].filter((c) => c.name);
    const unmatchedUtm = new Map<string, number>();
    const unmatchedCode = new Map<string, number>();
    for (const o of live) {
      const m = moneyById.get(o.id);
      const outcome = outcomeOf(o.orderStatus);
      const key = phoneKey(o.customerPhone);
      const row = {
        outcome, total: Number(o.total) || 0,
        sale: m && !m.returned ? m.sale : null,
        profit: m ? m.profit : null,
        newCustomer: !!key && newPhones.get(key) === o.id,
      };
      addOrder(total, row);
      const d = businessDayKey(o.receivedAt, tz, dayStartHour);
      dayRow(d).placed += 1;
      if (outcome === 'DELIVERED') dayRow(d).delivered += 1;
      const src = o.trafficSource ?? (MARKETPLACES.includes(o.integration.type) ? 'MARKETPLACE' : 'UNKNOWN');
      addOrder(at(src), row);
      const hit = matchCampaign(o, rules);
      if (hit) {
        addOrder(hit.rule.tally, row);
        day(hit.rule, d).orders += 1;
        if (hit.by === 'CODE') hit.rule.byCode += 1; else hit.rule.byUtm += 1;
      } else {
        if (o.utmCampaign) unmatchedUtm.set(o.utmCampaign, (unmatchedUtm.get(o.utmCampaign) ?? 0) + 1);
        for (const code of o.discountCodes ?? []) unmatchedCode.set(code, (unmatchedCode.get(code) ?? 0) + 1);
      }
    }

    const campaignRows = [...camps.values()]
      .filter((c) => c.tally.spend > 0 || c.tally.placed > 0 || (c.savedId && c.status === 'ACTIVE'))
      .map((c) => ({
        key: c.id, id: c.savedId, platform: c.platform, name: c.name || null, status: c.status,
        utmCampaign: c.utmCampaign ?? null, discountCodes: c.discountCodes ?? [],
        byCode: c.byCode, byUtm: c.byUtm,
        adSets: [...c.adSets.entries()].map(([name, spend]) => ({ name, spend: r2(spend) })).sort((a, b) => b.spend - a.spend).slice(0, 20),
        fatigue: fatigueOf([...c.days.values()]),
        spendDays: c.spendDays.size,
        ...finishTally(c.tally, seesProfit),
      }))
      .sort((a, b) => b.spend - a.spend || b.placed - a.placed);

    const suggestions = budgetMoves(campaignRows.filter((c) => c.name).map((c) => ({
      key: c.key, name: c.name!, spend: c.spend, roas: c.roas, spendDays: c.spendDays, closed: c.delivered + c.returned,
    })));

    const days: string[] = [];
    for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to && days.length < 400; d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
    const attributed = live.filter((o) => o.trafficSource || o.utmCampaign || (o.discountCodes ?? []).length).length;

    return {
      range: { from, to },
      seesProfit,
      totals: { ...finishTally(total, seesProfit), attributedPct: live.length ? Math.round((attributed / live.length) * 1000) / 10 : null },
      campaigns: campaignRows,
      sources: [...sources.entries()].map(([source, t]) => ({ source, ...finishTally(t, seesProfit) })).sort((a, b) => b.spend - a.spend || b.placed - a.placed),
      daily: days.map((d) => ({ day: d, spend: r2(daily.get(d)?.spend ?? 0), placed: daily.get(d)?.placed ?? 0, delivered: daily.get(d)?.delivered ?? 0 })),
      suggestions,
      fatigued: campaignRows.filter((c) => c.fatigue).map((c) => ({ key: c.key, name: c.name, platform: c.platform, ...c.fatigue! })),
      unmatched: {
        utmCampaigns: [...unmatchedUtm.entries()].map(([value, orders]) => ({ value, orders })).sort((a, b) => b.orders - a.orders).slice(0, 20),
        codes: [...unmatchedCode.entries()].map(([code, orders]) => ({ code, orders })).sort((a, b) => b.orders - a.orders).slice(0, 20),
      },
    };
  }

  /**
   * New customers: phone key → id of that phone's first order in the period,
   * only for phones with no order before the period.
   */
  private async firstOrders(tenantId: string, orders: Array<{ id: string; customerPhone: string | null; receivedAt: Date }>, before: Date) {
    const first = new Map<string, { id: string; at: Date }>();
    for (const o of orders) {
      const k = phoneKey(o.customerPhone);
      if (!k) continue;
      const cur = first.get(k);
      if (!cur || o.receivedAt < cur.at) first.set(k, { id: o.id, at: o.receivedAt });
    }
    const keys = [...first.keys()];
    const seen = new Set<string>();
    for (let i = 0; i < keys.length; i += 2000) {
      const part = keys.slice(i, i + 2000);
      const rows = await this.prisma.$queryRaw<Array<{ k: string }>>`
        SELECT DISTINCT right(regexp_replace("customerPhone", '\\D', '', 'g'), 10) AS k
        FROM "channel_orders"
        WHERE "tenantId" = ${tenantId} AND "receivedAt" < ${before} AND "customerPhone" IS NOT NULL
          AND right(regexp_replace("customerPhone", '\\D', '', 'g'), 10) IN (${Prisma.join(part)})`;
      for (const r of rows) seen.add(r.k);
    }
    const out = new Map<string, string>();
    for (const [k, v] of first) if (!seen.has(k)) out.set(k, v.id);
    return out;
  }

  /* ───────────────────────── product links ───────────────────────── */

  /** Products with their page on each connected store, for the UTM link builder. */
  async productLinks(user: AuthenticatedUser, q: { search?: string; limit?: string | number }) {
    const search = String(q.search ?? '').trim().slice(0, 80);
    const take = Math.min(50, Math.max(5, Number(q.limit) || 20));
    const [products, stores] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          tenantId: user.tenantId, isActive: true, channelMappings: { some: { externalUrl: { not: null } } },
          ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }] }),
        },
        select: {
          id: true, name: true, price: true,
          images: { select: { url: true, thumbnail: true }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
          channelMappings: { where: { externalUrl: { not: null } }, select: { integrationId: true, externalUrl: true, integration: { select: { displayName: true, type: true } } }, take: 10 },
        },
        orderBy: { updatedAt: 'desc' },
        take,
      }),
      this.prisma.integration.findMany({
        where: { tenantId: user.tenantId, type: { in: ['SHOPIFY', 'WOOCOMMERCE', 'CUSTOM_WEBSITE'] }, status: 'CONNECTED' },
        select: { id: true, displayName: true, type: true, config: true },
      }),
    ]);
    const seen = new Set<string>();
    return {
      stores: stores.map((s) => ({ id: s.id, name: s.displayName, type: s.type, url: readWebsiteConfig(s.config).siteUrl ?? null })),
      items: products.map((p) => ({
        id: p.id, name: p.name, price: p.price, image: p.images[0]?.thumbnail ?? p.images[0]?.url ?? null,
        links: p.channelMappings
          .filter((m) => { const k = `${p.id}|${m.integrationId}`; if (seen.has(k)) return false; seen.add(k); return true; })
          .map((m) => ({ integrationId: m.integrationId, channel: m.integration.displayName, type: m.integration.type, url: m.externalUrl! })),
      })),
    };
  }

  /* ───────────────────────── ad copy ───────────────────────── */

  async adCopy(user: AuthenticatedUser, b: AdCopyInput) {
    let product: { name: string; price: number; description: string | null; category: string | null } | null = null;
    if (b.productId) {
      const p = await this.prisma.product.findFirst({
        where: { id: String(b.productId), tenantId: user.tenantId },
        select: { name: true, price: true, description: true, category: { select: { name: true } } },
      });
      if (!p) throw new NotFoundException('Product nahi mila');
      product = { name: p.name, price: p.price, description: p.description, category: p.category?.name ?? null };
    }
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true } });
    return this.copy.write(user, { ...b, shopName: tenant?.name ?? null }, product);
  }
}
