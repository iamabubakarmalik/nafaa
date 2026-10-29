/**
 * Ads spend ("Ads ka kharcha"): the daily log, import from an ads manager
 * export, the expense that carries the spend into the P&L, and the ROAS
 * report by day, week, product and channel.
 *
 * P&L: ads spend reaches profit only through expenses. With the shop setting
 * "Ads ka kharcha Nafaa kharche me likhe" on (default), each new entry is
 * marked `postExpense`, and the entries of one day, platform and branch are
 * carried by one PAID expense in the "Ads / marketing" category
 * (sourceType AD_SPEND, sourceId "day|platform|branch"). Every change to
 * those entries rewrites that expense's amount, and it is removed when its
 * entries are gone, so the spend is counted once. Entries made with the
 * setting off are never written to expenses (the shop records them itself).
 * The ROAS report reads the entries directly and never the expenses.
 *
 * Payment method is bank transfer: ads are paid by card or bank, so the
 * cash drawer is never touched.
 */

import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope, assertShopAccess, resolveWriteShopId } from '../../../common/shop-scope';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey } from '../../../common/helpers/business-time.helper';
import { periodRange } from '../../inventory/taxonomy/taxonomy.helper';
import { ExpensesService } from '../../finance/expenses/expenses.service';
import { GrowthSettingsService } from '../growth-settings.service';
import { billProductLines, onlineOrdersMoney } from '../online-economics';
import { AD_PLATFORMS, AdColumnMap, AdImportRow, AdPlatform, costPerOrder, guessPlatform, importKeyOf, r2, readAdsExport, roas, spreadOverProducts, weekOf } from './ads-math';

/** A hand entry with no campaign matches any campaign of that day. */
const sameCampaign = (typed: string | null, imported: string | null) => !typed || typed.trim().toLowerCase() === (imported ?? '').trim().toLowerCase();

export const AD_SPEND_SOURCE = 'AD_SPEND';
const CATEGORY = 'Ads / marketing';
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const PLATFORM_LABEL: Record<AdPlatform, string> = { META: 'Facebook/Instagram', TIKTOK: 'TikTok', GOOGLE: 'Google', OTHER: 'Doosra' };

export interface AdEntryInput {
  day?: string;
  platform?: string;
  amount?: number | string;
  campaign?: string | null;
  integrationId?: string | null;
  productIds?: string[];
  orders?: number | string | null;
  note?: string | null;
  shopId?: string;
}

const groupKey = (day: string, platform: string, shopId: string | null) => `${day}|${platform}|${shopId ?? '-'}`;

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);
  /** One sync per expense group at a time on this server. */
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly expenses: ExpensesService,
    private readonly settings: GrowthSettingsService,
  ) {}

  /* ───────────────────────── settings ───────────────────────── */

  /** The posting setting, and the shop's sales channels for tying an entry to one. */
  async getSettings(user: AuthenticatedUser) {
    const [s, channels] = await Promise.all([
      this.settings.get(user.tenantId),
      this.prisma.integration.findMany({
        where: { tenantId: user.tenantId, type: { in: ['WOOCOMMERCE', 'SHOPIFY', 'DARAZ', 'CUSTOM_WEBSITE', 'FOODPANDA'] }, status: { not: 'PENDING' } },
        select: { id: true, displayName: true, type: true, config: true }, orderBy: { createdAt: 'asc' },
      }),
    ]);
    return { ...s.ads, channels: channels.map((c) => ({ id: c.id, name: c.displayName, type: c.type, platform: (c.config as any)?.platform ?? null })) };
  }

  async saveSettings(user: AuthenticatedUser, body: { postExpenses?: unknown }) {
    if (typeof body?.postExpenses !== 'boolean') throw new BadRequestException('Setting sahi nahi');
    return (await this.settings.save(user.tenantId, { ads: { postExpenses: body.postExpenses } })).ads;
  }

  /* ───────────────────────── entries ───────────────────────── */

  private async today(tenantId: string) {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    return businessDayKey(new Date(), tz, dayStartHour);
  }

  private async clean(user: AuthenticatedUser, b: AdEntryInput, before?: { day: string; platform: string; amount: number }) {
    const day = b.day ?? before?.day;
    if (!day || !DAY_KEY.test(day)) throw new BadRequestException('Date sahi nahi');
    if (day > (await this.today(user.tenantId))) throw new BadRequestException('Aane wale din ka kharcha abhi nahi likh sakte');
    const platform = String(b.platform ?? before?.platform ?? '').toUpperCase();
    if (!(AD_PLATFORMS as readonly string[]).includes(platform)) throw new BadRequestException('Platform chunein');
    const amount = b.amount === undefined ? before?.amount : Number(b.amount);
    if (amount === undefined || !Number.isFinite(amount) || amount < 0 || amount > 100_000_000) throw new BadRequestException('Amount sahi nahi');
    const integrationId = b.integrationId || null;
    if (integrationId && !(await this.prisma.integration.findFirst({ where: { id: integrationId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Channel nahi mila');
    }
    let productIds: string[] | undefined;
    if (b.productIds !== undefined) {
      const ids = [...new Set((Array.isArray(b.productIds) ? b.productIds : []).map(String))].slice(0, 50);
      const found = ids.length ? await this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: ids } }, select: { id: true } }) : [];
      productIds = found.map((p) => p.id);
    }
    const orders = b.orders === undefined ? undefined : b.orders === null || b.orders === '' ? null : Math.max(0, Math.round(Number(b.orders) || 0));
    return {
      day, platform, amount: r2(amount), integrationId,
      ...(productIds !== undefined && { productIds }),
      ...(orders !== undefined && { orders }),
      ...(b.campaign !== undefined && { campaign: String(b.campaign ?? '').trim().slice(0, 120) || null }),
      ...(b.note !== undefined && { note: String(b.note ?? '').trim().slice(0, 500) || null }),
    };
  }

  /** Writing to expenses needs expenses.create on top of ads.manage. */
  private assertCanPost(user: AuthenticatedUser) {
    if (!hasPermission(user.role, user.permissions, PERMISSIONS.EXPENSES_CREATE)) {
      throw new ForbiddenException('Ads ka kharcha Expenses me bhi likha jata hai — is ke liye "Create Expenses" ki permission chahiye. Malik se kehein, ya setting band karwayein.');
    }
  }

  async list(user: AuthenticatedUser, scope: ShopScope, q: { from?: string; to?: string; platform?: string; page?: string | number; limit?: string | number }) {
    const where: Prisma.AdSpendWhereInput = {
      tenantId: user.tenantId, ...scope.where,
      ...(q.from && DAY_KEY.test(q.from) && { day: { gte: q.from, ...(q.to && DAY_KEY.test(q.to) && { lte: q.to }) } }),
      ...(!q.from && q.to && DAY_KEY.test(q.to) && { day: { lte: q.to } }),
      ...(q.platform && (AD_PLATFORMS as readonly string[]).includes(q.platform) && { platform: q.platform }),
    };
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(q.limit) || 30));
    const [rows, total, sums] = await Promise.all([
      this.prisma.adSpend.findMany({ where, orderBy: [{ day: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.adSpend.count({ where }),
      this.prisma.adSpend.groupBy({ by: ['platform'], where, _sum: { amount: true }, _count: { _all: true } }),
    ]);
    const [products, channels, expenses] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: [...new Set(rows.flatMap((r) => r.productIds))] } }, select: { id: true, name: true } }),
      this.prisma.integration.findMany({ where: { tenantId: user.tenantId, id: { in: [...new Set(rows.map((r) => r.integrationId).filter(Boolean) as string[])] } }, select: { id: true, displayName: true, type: true, config: true } }),
      this.prisma.expense.findMany({ where: { tenantId: user.tenantId, id: { in: [...new Set(rows.map((r) => r.expenseId).filter(Boolean) as string[])] } }, select: { id: true, expenseNumber: true } }),
    ]);
    const P = new Map(products.map((p) => [p.id, p.name]));
    const C = new Map(channels.map((c) => [c.id, c]));
    const E = new Map(expenses.map((e) => [e.id, e.expenseNumber]));
    return {
      items: rows.map((r) => ({
        ...r,
        products: r.productIds.map((id) => ({ id, name: P.get(id) ?? 'Product' })),
        channel: r.integrationId && C.get(r.integrationId) ? { id: r.integrationId, name: C.get(r.integrationId)!.displayName, type: C.get(r.integrationId)!.type, platform: (C.get(r.integrationId)!.config as any)?.platform ?? null } : null,
        expenseNumber: r.expenseId ? E.get(r.expenseId) ?? null : null,
      })),
      total, page, pages: Math.max(1, Math.ceil(total / limit)),
      totals: {
        amount: r2(sums.reduce((s, x) => s + Number(x._sum.amount ?? 0), 0)),
        count: sums.reduce((s, x) => s + x._count._all, 0),
        byPlatform: sums.map((x) => ({ platform: x.platform, amount: r2(Number(x._sum.amount ?? 0)), count: x._count._all })),
      },
    };
  }

  async create(user: AuthenticatedUser, scope: ShopScope, b: AdEntryInput) {
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, b.shopId);
    assertShopAccess(user, shopId, 'Ads ka kharcha likhna');
    const data = await this.clean(user, b);
    const post = (await this.settings.get(user.tenantId)).ads.postExpenses;
    if (post) this.assertCanPost(user);
    const row = await this.prisma.adSpend.create({
      data: { ...data, tenantId: user.tenantId, shopId, postExpense: post, source: 'MANUAL', createdById: user.id } as Prisma.AdSpendUncheckedCreateInput,
    });
    if (post) await this.sync(user, row.day, row.platform, row.shopId);
    return this.prisma.adSpend.findUniqueOrThrow({ where: { id: row.id } });
  }

  private async own(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const row = await this.prisma.adSpend.findFirst({ where: { id, tenantId: user.tenantId, ...scope.where } });
    if (!row) throw new NotFoundException('Entry nahi mili');
    if (row.shopId) assertShopAccess(user, row.shopId, 'Ads ka kharcha badalna');
    return row;
  }

  async update(user: AuthenticatedUser, scope: ShopScope, id: string, b: AdEntryInput) {
    const before = await this.own(user, scope, id);
    if (before.postExpense) this.assertCanPost(user);
    const data = await this.clean(user, b, before);
    const row = await this.prisma.adSpend.update({ where: { id }, data });
    if (before.postExpense) {
      await this.sync(user, before.day, before.platform, before.shopId);
      if (groupKey(row.day, row.platform, row.shopId) !== groupKey(before.day, before.platform, before.shopId)) {
        await this.sync(user, row.day, row.platform, row.shopId);
      }
    }
    return this.prisma.adSpend.findUniqueOrThrow({ where: { id } });
  }

  async remove(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const row = await this.own(user, scope, id);
    if (row.postExpense) this.assertCanPost(user);
    await this.prisma.adSpend.delete({ where: { id } });
    if (row.postExpense) await this.sync(user, row.day, row.platform, row.shopId);
    return { deleted: true };
  }

  /* ───────────────────────── import ───────────────────────── */

  /** Reads an export and marks the rows already imported (same day, campaign and amount). */
  async importPreview(user: AuthenticatedUser, b: { headers?: unknown[]; rows?: unknown[][]; platform?: string; mapping?: AdColumnMap }) {
    const headers = (Array.isArray(b.headers) ? b.headers : []).map((h) => String(h ?? '')).slice(0, 200);
    const rows = (Array.isArray(b.rows) ? b.rows : []).filter(Array.isArray).slice(0, 20_000);
    if (!headers.length || !rows.length) throw new BadRequestException('File me rows nahi mili');
    const platform = (AD_PLATFORMS as readonly string[]).includes(String(b.platform)) ? (b.platform as AdPlatform) : guessPlatform(headers);
    const read = readAdsExport(headers, rows, platform, b.mapping);
    const keys = read.rows.map((r) => r.importKey);
    const existing = keys.length ? await this.prisma.adSpend.findMany({ where: { tenantId: user.tenantId, importKey: { in: keys } }, select: { importKey: true, amount: true } }) : [];
    const seen = new Map(existing.map((e) => [e.importKey!, e.amount]));
    const manual = await this.manualEntries(user.tenantId, platform, read.rows.map((r) => r.day));
    const today = await this.today(user.tenantId);
    return {
      platform, headers, map: read.map, needs: read.needs, skipped: read.skipped,
      rows: read.rows.map((r) => ({
        ...r,
        status: r.day > today ? 'future'
          : seen.has(r.importKey) ? (Math.abs(seen.get(r.importKey)! - r.amount) < 0.005 ? 'same' : 'changed')
            : manual.some((m) => m.day === r.day && sameCampaign(m.campaign, r.campaign)) ? 'manual' : 'new',
      })),
      total: r2(read.rows.reduce((s, r) => s + r.amount, 0)),
    };
  }

  /** Saves new rows and updates changed ones; rows already saved with the same amount are left alone. */
  async importApply(user: AuthenticatedUser, scope: ShopScope, b: { platform?: string; rows?: AdImportRow[]; integrationId?: string | null; shopId?: string }) {
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, b.shopId);
    assertShopAccess(user, shopId, 'Ads ka kharcha likhna');
    const platform = String(b.platform ?? '').toUpperCase();
    if (!(AD_PLATFORMS as readonly string[]).includes(platform)) throw new BadRequestException('Platform chunein');
    const today = await this.today(user.tenantId);
    const rows = (Array.isArray(b.rows) ? b.rows : []).filter((r) => r && DAY_KEY.test(r.day) && r.day <= today && Number(r.amount) >= 0).slice(0, 5000);
    if (!rows.length) throw new BadRequestException('Import karne ko koi row nahi');
    const integrationId = b.integrationId || null;
    if (integrationId && !(await this.prisma.integration.findFirst({ where: { id: integrationId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Channel nahi mila');
    }
    const post = (await this.settings.get(user.tenantId)).ads.postExpenses;
    if (post) this.assertCanPost(user);

    const keyed = rows.map((r) => ({ ...r, importKey: importKeyOf(platform as AdPlatform, r.day, r.campaign ?? null) }));
    const existing = await this.prisma.adSpend.findMany({ where: { tenantId: user.tenantId, importKey: { in: keyed.map((r) => r.importKey) } } });
    const byKey = new Map(existing.map((e) => [e.importKey!, e]));
    const manual = await this.manualEntries(user.tenantId, platform, keyed.map((r) => r.day));
    const taken = new Set<string>();
    const groups = new Map<string, { day: string; platform: string; shopId: string | null }>();
    let added = 0; let changed = 0; let same = 0;
    for (const r of keyed) {
      const amount = r2(Number(r.amount));
      const orders = r.orders === null || r.orders === undefined ? null : Math.max(0, Math.round(Number(r.orders) || 0));
      // An entry typed by hand for the same day and campaign (or with no campaign) is replaced, not doubled.
      const typed = !byKey.has(r.importKey) ? manual.find((m) => m.day === r.day && sameCampaign(m.campaign, r.campaign) && !taken.has(m.id)) : undefined;
      if (typed) {
        taken.add(typed.id);
        await this.prisma.adSpend.update({ where: { id: typed.id }, data: { amount, orders, campaign: r.campaign?.trim().slice(0, 120) || null, source: 'CSV', importKey: r.importKey } });
        if (typed.postExpense) groups.set(groupKey(typed.day, typed.platform, typed.shopId), { day: typed.day, platform: typed.platform, shopId: typed.shopId });
        changed++;
        continue;
      }
      const old = byKey.get(r.importKey);
      if (old) {
        if (Math.abs(old.amount - amount) < 0.005 && (old.orders ?? null) === orders) { same++; continue; }
        await this.prisma.adSpend.update({ where: { id: old.id }, data: { amount, orders } });
        if (old.postExpense) groups.set(groupKey(old.day, old.platform, old.shopId), { day: old.day, platform: old.platform, shopId: old.shopId });
        changed++;
        continue;
      }
      await this.prisma.adSpend.create({
        data: {
          tenantId: user.tenantId, shopId, day: r.day, platform, amount, orders, campaign: r.campaign?.trim().slice(0, 120) || null,
          integrationId, source: 'CSV', importKey: r.importKey, postExpense: post, createdById: user.id,
        },
      });
      if (post) groups.set(groupKey(r.day, platform, shopId), { day: r.day, platform, shopId });
      added++;
    }
    for (const g of groups.values()) await this.sync(user, g.day, g.platform, g.shopId);
    return { added, changed, same, expenses: groups.size };
  }

  /** Entries typed by hand on these days for a platform (no import key). */
  private manualEntries(tenantId: string, platform: string, days: string[]) {
    const list = [...new Set(days)];
    if (!list.length) return Promise.resolve([]);
    return this.prisma.adSpend.findMany({
      where: { tenantId, platform, day: { in: list }, importKey: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, day: true, platform: true, campaign: true, shopId: true, postExpense: true },
    });
  }

  /* ───────────────────────── expenses (P&L) ───────────────────────── */

  private async sync(user: AuthenticatedUser, day: string, platform: string, shopId: string | null) {
    const key = `${user.tenantId}|${groupKey(day, platform, shopId)}`;
    const prev = this.locks.get(key) ?? Promise.resolve();
    const run = prev.catch(() => null).then(() => this.syncGroup(user, day, platform, shopId));
    this.locks.set(key, run);
    try {
      return await run;
    } finally {
      if (this.locks.get(key) === run) this.locks.delete(key);
    }
  }

  /**
   * Brings the group's expense in line with its entries: created when the
   * first posted entry arrives, amount rewritten on every change, removed
   * when no posted entry is left.
   */
  private async syncGroup(user: AuthenticatedUser, day: string, platform: string, shopId: string | null) {
    const tenantId = user.tenantId;
    const sourceId = groupKey(day, platform, shopId);
    const rows = await this.prisma.adSpend.findMany({ where: { tenantId, day, platform, shopId, postExpense: true }, select: { id: true, amount: true, campaign: true } });
    const amount = r2(rows.reduce((s, r) => s + r.amount, 0));
    const found = await this.prisma.expense.findMany({ where: { tenantId, sourceType: AD_SPEND_SOURCE, sourceId }, orderBy: { createdAt: 'asc' }, select: { id: true, amount: true, title: true } });
    // A second expense for the same group (two servers at once) is removed.
    for (const extra of found.slice(1)) await this.prisma.expense.delete({ where: { id: extra.id } }).catch(() => null);
    const current = found[0] ?? null;
    const label = PLATFORM_LABEL[platform as AdPlatform] ?? platform;
    const shopName = shopId && (await this.prisma.shop.count({ where: { tenantId } })) > 1
      ? (await this.prisma.shop.findUnique({ where: { id: shopId }, select: { name: true } }))?.name ?? null
      : null;
    const title = `Ads: ${label} · ${day}${shopName ? ` · ${shopName}` : ''}`.slice(0, 120);
    const campaigns = [...new Set(rows.map((r) => r.campaign).filter(Boolean))];
    const description = [
      `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'} Ads ke kharche se`,
      campaigns.length ? `Campaign: ${campaigns.slice(0, 5).join(', ')}${campaigns.length > 5 ? '…' : ''}` : null,
      'Nafaa ne khud likha (Ads ka kharcha) — badalna ho to Ads ke page se badlein',
    ].filter(Boolean).join(' · ').slice(0, 500);

    if (!(amount > 0)) {
      if (current) await this.prisma.expense.delete({ where: { id: current.id } }).catch(() => null);
      await this.prisma.adSpend.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { expenseId: null } });
      return null;
    }
    let expenseId = current?.id ?? null;
    if (current) {
      if (Math.abs(current.amount - amount) > 0.004 || current.title !== title) {
        await this.prisma.expense.update({ where: { id: current.id }, data: { amount, title, description } });
      }
    } else {
      const exp = await this.expenses.create(user, new ShopScope(shopId, !shopId), {
        title, description, amount, paymentMethod: 'BANK_TRANSFER', status: 'PAID',
        categoryId: await this.categoryId(tenantId), expenseDate: day,
        ...(shopId && { shopId }),
      } as any);
      await this.prisma.expense.update({ where: { id: exp.id }, data: { sourceType: AD_SPEND_SOURCE, sourceId } });
      expenseId = exp.id;
    }
    await this.prisma.adSpend.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { expenseId } });
    return expenseId;
  }

  private async categoryId(tenantId: string) {
    const c = await this.prisma.expenseCategory.upsert({
      where: { tenantId_name: { tenantId, name: CATEGORY } },
      create: { tenantId, name: CATEGORY, color: '#8b5cf6', icon: 'megaphone' },
      update: { isActive: true },
      select: { id: true },
    });
    return c.id;
  }

  /* ───────────────────────── ROAS report ───────────────────────── */

  /**
   * Ads spend against online sales for a period: totals, and rows by day,
   * week, product and channel. Spend tied to products is split over them by
   * their online sales; spend tied to a channel goes to it, the rest shows
   * as "not tied to a channel". Profit is the online orders' profit after
   * selling costs, less ads; it is shown only with cost.view and
   * profit_report.view.
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
    const [ads, orders] = await Promise.all([
      this.prisma.adSpend.findMany({ where: { tenantId, ...scope.where, day: { gte: from, lte: to } }, select: { day: true, platform: true, amount: true, integrationId: true, productIds: true, orders: true } }),
      onlineOrdersMoney(this.prisma, { tenantId, shopId: scope.shopId, range, tz, dayStartHour }),
    ]);
    const lines = await billProductLines(this.prisma, orders.filter((o) => !o.returned).map((o) => o.saleId));

    type Row = { spend: number; sales: number; orders: number; returned: number; profit: number; adOrders: number };
    const blank = (): Row => ({ spend: 0, sales: 0, orders: 0, returned: 0, profit: 0, adOrders: 0 });
    const finish = (r: Row) => ({
      spend: r2(r.spend), sales: r2(r.sales), orders: r.orders, returned: r.returned,
      roas: roas(r.sales, r.spend), costPerOrder: costPerOrder(r.spend, r.orders),
      adOrders: r.adOrders || null,
      profitBeforeAds: seesProfit ? r2(r.profit) : null,
      profitAfterAds: seesProfit ? r2(r.profit - r.spend) : null,
    });

    const total = blank();
    const byDay = new Map<string, Row>();
    const byWeek = new Map<string, Row>();
    const byChannel = new Map<string, Row & { name: string; type: string | null }>();
    const byPlatform = new Map<string, Row>();
    const at = <T extends Row>(m: Map<string, T>, k: string, make: () => T) => { const r = m.get(k) ?? make(); m.set(k, r); return r; };

    for (const o of orders) {
      for (const r of [total, at(byDay, o.day, blank), at(byWeek, weekOf(o.day), blank), at(byChannel, o.integrationId, () => ({ ...blank(), name: o.channel, type: o.channelType }))]) {
        r.sales += o.sale; r.orders += 1; r.profit += o.profit; if (o.returned) r.returned += 1;
      }
    }
    for (const a of ads) {
      for (const r of [total, at(byDay, a.day, blank), at(byWeek, weekOf(a.day), blank), at(byPlatform, a.platform, blank)]) {
        r.spend += a.amount; r.adOrders += a.orders ?? 0;
      }
      const ch = a.integrationId ?? 'NONE';
      at(byChannel, ch, () => ({ ...blank(), name: ch === 'NONE' ? 'Kisi channel se nahi juda' : 'Channel', type: null })).spend += a.amount;
    }
    // Products: sales and profit from the bill lines; each order's selling costs split by line revenue.
    const orderBySale = new Map(orders.map((o) => [o.saleId, o]));
    const revenueOfSale = new Map<string, number>();
    for (const l of lines) revenueOfSale.set(l.saleId, (revenueOfSale.get(l.saleId) ?? 0) + Math.max(0, l.revenue));
    const byProduct = new Map<string, Row & { name: string; qty: number }>();
    for (const l of lines) {
      const o = orderBySale.get(l.saleId);
      if (!o) continue;
      const share = (revenueOfSale.get(l.saleId) ?? 0) > 0 ? Math.max(0, l.revenue) / revenueOfSale.get(l.saleId)! : 0;
      const row = at(byProduct, l.productId, () => ({ ...blank(), name: l.name, qty: 0 }));
      row.sales += l.revenue; row.orders += 1; row.qty += l.qty;
      row.profit += l.revenue - l.cost - (o.sellingCosts - (o.sale - (revenueOfSale.get(l.saleId) ?? 0))) * share;
    }
    for (const a of ads) {
      if (!a.productIds.length) continue;
      for (const [id, v] of spreadOverProducts(a.amount, a.productIds, (pid) => byProduct.get(pid)?.sales ?? 0)) {
        const row = byProduct.get(id) ?? at(byProduct, id, () => ({ ...blank(), name: '', qty: 0 }));
        row.spend += v;
      }
    }
    const missing = [...byProduct.entries()].filter(([, r]) => !r.name).map(([id]) => id);
    if (missing.length) {
      const names = await this.prisma.product.findMany({ where: { tenantId, id: { in: missing } }, select: { id: true, name: true } });
      for (const n of names) byProduct.get(n.id)!.name = n.name;
    }
    const channelIds = [...byChannel.keys()].filter((k) => k !== 'NONE' && byChannel.get(k)!.type === null);
    if (channelIds.length) {
      const list = await this.prisma.integration.findMany({ where: { tenantId, id: { in: channelIds } }, select: { id: true, displayName: true, type: true } });
      for (const c of list) Object.assign(byChannel.get(c.id)!, { name: c.displayName, type: c.type });
    }

    const days: string[] = [];
    for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to && days.length < 400; d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
    return {
      range: { from, to },
      seesProfit,
      totals: finish(total),
      byDay: days.map((d) => ({ day: d, ...finish(byDay.get(d) ?? blank()) })),
      byWeek: [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, r]) => ({ week, ...finish(r) })),
      byPlatform: [...byPlatform.entries()]
        .map(([platform, r]) => ({ platform, spend: r2(r.spend), share: total.spend > 0 ? Math.round((r.spend / total.spend) * 1000) / 10 : 0, adOrders: r.adOrders || null }))
        .sort((a, b) => b.spend - a.spend),
      byChannel: [...byChannel.entries()].map(([id, r]) => ({ id, name: r.name, type: r.type, ...finish(r) })).sort((a, b) => b.sales + b.spend - (a.sales + a.spend)),
      byProduct: [...byProduct.entries()]
        .map(([id, r]) => ({ id, name: r.name, qty: r2(r.qty), ...finish(r) }))
        .sort((a, b) => b.spend - a.spend || b.sales - a.sales)
        .slice(0, 50),
    };
  }
}
