import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { businessDayKey } from '../../common/helpers/business-time.helper';
import { periodRange } from '../../modules/inventory/taxonomy/taxonomy.helper';
import { PERMISSIONS, hasPermission } from '../../common/constants/permissions.constants';
import { courierName } from './couriers';
import { paidAdvance } from './order-money';
import { shopDue } from './shop-due';
import { phoneKey } from './customer-risk';
import { orderCosts, r2 } from './order-costs';
import { ORDER_COSTS_SOURCE, OrderCostsService, assertManager, costOrderOf } from './order-costs.service';
import { OrderToolsService } from './order-tools.service';
import {
  AGE_BUCKETS, AgeBucket, ForecastWhen, WA_TEMPLATE_KEYS, ageBucket, forecastOf, normalizeWaTemplates, orderCash, profitWaterfall, settleDays,
} from './growth-math';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;
const waKey = (tenantId: string) => `online_wa_templates:${tenantId}`;
/** Expense source of ads spend (see AdsService); counted from AdSpend, not twice. */
const AD_SPEND_SOURCE = 'AD_SPEND';
const OPEN_DONE = ['DELIVERED', 'CANCELLED', 'REJECTED', 'RETURNED'];
const LINK_TTL_MS = 3 * DAY;
const isTest = (meta: unknown) => !!(meta as any)?.test;
const orderNo = (o: { externalOrderNumber: string | null; externalOrderId: string }) => String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '');

/**
 * Commerce growth and protection screens: payment health, the profit
 * statement (sales − product cost − ads − courier − returns − other
 * expenses), the team work queue, WhatsApp message templates and scammer
 * reports. Money math comes from order-costs and growth-math; nothing here
 * keeps its own copy of it.
 */
@Injectable()
export class CommerceGrowthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly costs: OrderCostsService,
    private readonly tools: OrderToolsService,
  ) {}

  private async period(tenantId: string, q: { from?: string; to?: string }) {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const today = businessDayKey(new Date(), tz, dayStartHour);
    const to = q.to && DAY_KEY.test(q.to) ? q.to : today;
    const from = q.from && DAY_KEY.test(q.from) ? q.from : to.slice(0, 8) + '01';
    if (from > to) throw new BadRequestException('Date sahi nahi');
    return { from, to, today, range: await periodRange(this.tz, tenantId, from, to), tz, dayStartHour };
  }

  // ═══════════════════════════════════════════════════════════
  // PAYMENT HEALTH
  // ═══════════════════════════════════════════════════════════

  async paymentHealth(user: AuthenticatedUser, scope: ShopScope, q: { from?: string; to?: string }) {
    const tenantId = user.tenantId;
    const p = await this.period(tenantId, q);
    const now = new Date();
    const base: Prisma.ChannelOrderWhereInput = { tenantId, deletedAt: null, ...(scope.whereLoose as any) };
    const [open, settled, inPeriod, returned, settings] = await Promise.all([
      // COD the courier is carrying or already collected, not yet paid to the shop.
      this.prisma.channelOrder.findMany({
        where: { ...base, nafaaSaleId: { not: null }, paymentStatus: { not: 'PAID' }, codSettledAt: null, orderStatus: { in: ['OUT_FOR_DELIVERY', 'DELIVERED'] } },
        select: { id: true, total: true, metadata: true, courierCode: true, courierName: true, orderStatus: true, dispatchedAt: true, deliveredAt: true, receivedAt: true },
        take: 20_000,
      }),
      this.prisma.channelOrder.findMany({
        where: { ...base, codSettledAt: { gte: new Date(now.getTime() - 90 * DAY) }, deliveredAt: { not: null } },
        select: { courierCode: true, deliveredAt: true, codSettledAt: true },
        take: 20_000,
      }),
      this.prisma.channelOrder.findMany({
        where: { ...base, receivedAt: p.range },
        select: {
          id: true, externalOrderNumber: true, externalOrderId: true, customerName: true, total: true, metadata: true,
          paymentStatus: true, orderStatus: true, nafaaSaleId: true,
        },
        take: 30_000,
      }),
      this.prisma.channelOrder.findMany({
        where: { ...base, orderStatus: 'RETURNED', returnedAt: p.range },
        select: {
          id: true, orderStatus: true, courierCode: true, customerCity: true, integrationId: true, dispatchedAt: true, total: true, metadata: true,
          paymentStatus: true, courierCharge: true, codFee: true, gatewayFee: true, packagingCost: true, rtoCost: true,
        },
        take: 10_000,
      }),
      this.costs.settings(tenantId),
    ]);

    // Days from delivery to payment, per courier.
    const samples = new Map<string, number[]>();
    for (const s of settled) {
      const k = s.courierCode ?? 'NONE';
      const list = samples.get(k) ?? [];
      list.push((s.codSettledAt!.getTime() - s.deliveredAt!.getTime()) / DAY);
      samples.set(k, list);
    }

    type Row = { code: string; name: string; inTransit: number; withCourier: number; count: number; ages: Record<AgeBucket, number>; settleDays: number; forecast: Record<ForecastWhen, number> };
    const blankAges = () => Object.fromEntries(AGE_BUCKETS.map((b) => [b, 0])) as Record<AgeBucket, number>;
    const blankForecast = (): Record<ForecastWhen, number> => ({ overdue: 0, thisWeek: 0, later: 0 });
    const byCourier = new Map<string, Row>();
    const ages = blankAges();
    const forecast = blankForecast();
    let inTransit = 0; let withCourier = 0;
    for (const o of open) {
      const meta = (o.metadata ?? {}) as any;
      if (isTest(meta) || !meta.cod) continue;
      const amount = Math.max(0, shopDue(o) - paidAdvance(meta));
      if (!(amount > 0)) continue;
      const code = o.courierCode ?? 'NONE';
      const row = byCourier.get(code) ?? {
        code, name: courierName(o.courierCode) ?? o.courierName ?? 'Courier nahi likha', inTransit: 0, withCourier: 0, count: 0,
        ages: blankAges(), settleDays: settleDays(samples.get(code) ?? []), forecast: blankForecast(),
      };
      const since = o.deliveredAt ?? o.dispatchedAt ?? o.receivedAt;
      const bucket = ageBucket(Math.floor((now.getTime() - since.getTime()) / DAY));
      row.count++; row.ages[bucket] += amount; ages[bucket] += amount;
      if (o.orderStatus === 'DELIVERED' && o.deliveredAt) {
        row.withCourier += amount; withCourier += amount;
        const when = forecastOf(o.deliveredAt, row.settleDays, now);
        row.forecast[when] += amount; forecast[when] += amount;
      } else {
        row.inTransit += amount; inTransit += amount;
      }
      byCourier.set(code, row);
    }

    // The period's orders: COD vs prepaid, advances and payment links.
    const mix = { cod: { count: 0, value: 0 }, prepaid: { count: 0, value: 0 } };
    let advance = 0; let advanceOrders = 0;
    const links = { created: 0, paid: 0, failed: 0, expired: 0, pending: 0, paidValue: 0, failedValue: 0 };
    const failures: Array<{ orderId: string; number: string; customerName: string; provider: string; amount: number; status: string; at: string }> = [];
    const saleIds: string[] = [];
    for (const o of inPeriod) {
      const meta = (o.metadata ?? {}) as any;
      if (isTest(meta)) continue;
      if (o.nafaaSaleId) {
        saleIds.push(o.nafaaSaleId);
        const bucket = meta.cod ? mix.cod : mix.prepaid;
        bucket.count++; bucket.value += Number(o.total) || 0;
      }
      const adv = paidAdvance(meta);
      if (adv > 0 && meta.cod) { advance += adv; advanceOrders++; }
      for (const l of (Array.isArray(meta.payments) ? meta.payments : []) as any[]) {
        if (!l || l.provider === 'MANUAL') continue;
        const status = l.status === 'PENDING' && Date.now() - Date.parse(l.createdAt) > LINK_TTL_MS ? 'EXPIRED' : String(l.status);
        const amount = Number(l.amount) || 0;
        links.created++;
        if (status === 'PAID') { links.paid++; links.paidValue += amount; } else if (status === 'FAILED') { links.failed++; links.failedValue += amount; } else if (status === 'EXPIRED') links.expired++; else links.pending++;
        if (status === 'FAILED' || status === 'EXPIRED') {
          failures.push({ orderId: o.id, number: orderNo(o), customerName: o.customerName, provider: String(l.provider), amount, status, at: l.createdAt });
        }
      }
    }

    // Losses: parcels that came back in the period, and refunds on its bills.
    let rtoCost = 0; let rtoGoods = 0; let rtoCount = 0;
    for (const o of returned) {
      if (isTest(o.metadata)) continue;
      rtoCount++; rtoGoods += Number(o.total) || 0;
      rtoCost += orderCosts(costOrderOf(o), settings).total;
    }
    let refunds = 0; let refundCount = 0;
    for (let i = 0; i < saleIds.length; i += 2000) {
      const agg = await this.prisma.sale.aggregate({ where: { id: { in: saleIds.slice(i, i + 2000) }, refundedAmount: { gt: 0 } }, _sum: { refundedAmount: true }, _count: true });
      refunds += Number(agg._sum.refundedAmount ?? 0); refundCount += agg._count;
    }

    const round = <T extends Record<string, number>>(o: T) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r2(v)])) as T;
    const total = mix.cod.value + mix.prepaid.value;
    return {
      range: { from: p.from, to: p.to },
      cod: {
        outstanding: r2(inTransit + withCourier), inTransit: r2(inTransit), withCourier: r2(withCourier), ages: round(ages),
        byCourier: [...byCourier.values()].map((r) => ({ ...r, inTransit: r2(r.inTransit), withCourier: r2(r.withCourier), ages: round(r.ages), forecast: round(r.forecast) }))
          .sort((a, b) => b.inTransit + b.withCourier - (a.inTransit + a.withCourier)),
      },
      forecast: round(forecast),
      mix: {
        cod: { count: mix.cod.count, value: r2(mix.cod.value), share: total > 0 ? Math.round((mix.cod.value / total) * 1000) / 10 : 0 },
        prepaid: { count: mix.prepaid.count, value: r2(mix.prepaid.value), share: total > 0 ? Math.round((mix.prepaid.value / total) * 1000) / 10 : 0 },
      },
      advance: { value: r2(advance), orders: advanceOrders },
      links: { ...links, paidValue: r2(links.paidValue), failedValue: r2(links.failedValue), failures: failures.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 20) },
      losses: { rtoCount, rtoGoods: r2(rtoGoods), rtoCost: r2(rtoCost), refunds: r2(refunds), refundCount },
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PROFIT STATEMENT
  // ═══════════════════════════════════════════════════════════

  async profit(user: AuthenticatedUser, scope: ShopScope, q: { from?: string; to?: string; integrationId?: string; expenses?: string }) {
    const sees = hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW) && hasPermission(user.role, user.permissions, PERMISSIONS.PROFIT_REPORT_VIEW);
    if (!sees) throw new ForbiddenException('Profit dekhne ki ijazat nahi');
    const tenantId = user.tenantId;
    const p = await this.period(tenantId, q);
    const channel = q.integrationId || undefined;
    // Shop-wide expenses only belong in the whole-store view.
    const withExpenses = q.expenses !== '0' && !channel;
    const report = await this.costs.profitReport(user, scope, { from: p.from, to: p.to, integrationId: channel, withOrders: true });

    const [ads, expenseRows, cashRows] = await Promise.all([
      this.prisma.adSpend.findMany({
        where: { tenantId, ...scope.where, day: { gte: p.from, lte: p.to }, ...(channel ? { integrationId: channel } : {}) },
        select: { platform: true, amount: true, integrationId: true },
      }),
      withExpenses ? this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: {
          tenantId, ...scope.where, status: { not: ExpenseStatus.CANCELLED }, expenseDate: p.range,
          OR: [{ sourceType: null }, { sourceType: { notIn: [ORDER_COSTS_SOURCE, AD_SPEND_SOURCE] } }],
        },
        _sum: { amount: true },
      }) : Promise.resolve([] as Array<{ categoryId: string | null; _sum: { amount: number | null } }>),
      this.prisma.channelOrder.findMany({
        where: { tenantId, deletedAt: null, ...(scope.whereLoose as any), receivedAt: p.range, nafaaSaleId: { not: null }, ...(channel ? { integrationId: channel } : {}) },
        select: { total: true, metadata: true, paymentStatus: true, orderStatus: true, codSettledAt: true, nafaaSaleId: true },
        take: 30_000,
      }),
    ]);

    const adsTotal = ads.reduce((s, a) => s + a.amount, 0);
    const adsByPlatform = new Map<string, number>();
    for (const a of ads) adsByPlatform.set(a.platform, (adsByPlatform.get(a.platform) ?? 0) + a.amount);
    const cats = await this.prisma.expenseCategory.findMany({
      where: { id: { in: expenseRows.map((e) => e.categoryId).filter(Boolean) as string[] } }, select: { id: true, name: true },
    });
    const catName = new Map(cats.map((c) => [c.id, c.name]));
    const expenses = expenseRows.map((e) => ({ category: (e.categoryId && catName.get(e.categoryId)) || '', amount: r2(e._sum.amount ?? 0) }))
      .filter((e) => e.amount > 0).sort((a, b) => b.amount - a.amount);
    const otherExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    let received = 0; let codOutstanding = 0;
    for (const o of cashRows) {
      const meta = (o.metadata ?? {}) as any;
      if (isTest(meta)) continue;
      const c = orderCash({
        orderStatus: o.orderStatus, paymentStatus: o.paymentStatus, isCod: !!meta.cod, due: shopDue(o), advance: paidAdvance(meta),
        hasBill: !!o.nafaaSaleId, codSettled: !!o.codSettledAt,
      });
      received += c.received; codOutstanding += c.codOutstanding;
    }

    const t = report.totals as any;
    const waterfall = profitWaterfall({
      sales: t.sale + t.deliveryCollected, productCost: t.cost, sellingCosts: t.sellingCosts,
      returnCosts: (report.returns as any).sellingCosts, ads: adsTotal, otherExpenses,
    });
    // Channel rows also carry the ads tied to that channel.
    const adsByChannel = new Map<string, number>();
    for (const a of ads) if (a.integrationId) adsByChannel.set(a.integrationId, (adsByChannel.get(a.integrationId) ?? 0) + a.amount);
    const channelIds = await this.prisma.integration.findMany({ where: { tenantId }, select: { id: true, displayName: true } });
    const idByName = new Map(channelIds.map((c) => [c.displayName, c.id]));

    return {
      range: { from: p.from, to: p.to },
      withExpenses,
      waterfall,
      cash: { received: r2(received), codOutstanding: r2(codOutstanding) },
      ads: { total: r2(adsTotal), byPlatform: [...adsByPlatform.entries()].map(([platform, amount]) => ({ platform, amount: r2(amount) })).sort((a, b) => b.amount - a.amount) },
      expenses,
      missingRates: report.missingRates,
      totals: report.totals,
      returns: report.returns,
      orders: (report as any).orders ?? [],
      byChannel: report.byChannel.map((c: any) => {
        const id = idByName.get(c.name);
        const spend = r2((id && adsByChannel.get(id)) || 0);
        return { ...c, id: id ?? null, ads: spend, afterAds: r2(c.profit - spend) };
      }),
      byCourier: report.byCourier,
      byCity: report.byCity,
      byProduct: report.byProduct,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // TEAM WORK QUEUE
  // ═══════════════════════════════════════════════════════════

  /** Per staff member: open orders assigned, follow-ups due and orders moved today. */
  async team(user: AuthenticatedUser, scope: ShopScope) {
    const tenantId = user.tenantId;
    const { today } = await this.period(tenantId, {});
    const dayStart = (await periodRange(this.tz, tenantId, today, today)).gte;
    const base: Prisma.ChannelOrderWhereInput = { tenantId, deletedAt: null, ...(scope.whereLoose as any), orderStatus: { notIn: OPEN_DONE } };
    const [open, due, unassigned, moves] = await Promise.all([
      this.prisma.channelOrder.groupBy({ by: ['assignedToId'], where: { ...base, assignedToId: { not: null } }, _count: true }),
      this.prisma.channelOrder.groupBy({ by: ['assignedToId'], where: { ...base, assignedToId: { not: null }, followUpAt: { lte: new Date() } }, _count: true }),
      this.prisma.channelOrder.count({ where: { ...base, assignedToId: null } }),
      // Board moves made today, from each order's timeline (orders of the last 60 days).
      this.prisma.$queryRaw<Array<{ by: string; orders: number }>>`
        SELECT e->>'by' AS by, COUNT(DISTINCT o.id)::int AS orders
        FROM "channel_orders" o, jsonb_array_elements(CASE WHEN jsonb_typeof(o."metadata"->'timeline') = 'array' THEN o."metadata"->'timeline' ELSE '[]'::jsonb END) e
        WHERE o."tenantId" = ${tenantId} AND o."receivedAt" >= ${new Date(Date.now() - 60 * DAY)}
          AND e->>'by' IS NOT NULL AND (e->>'at')::timestamptz >= ${dayStart}
        GROUP BY 1`,
    ]);
    const ids = new Set<string>([...open.map((r) => r.assignedToId!), ...due.map((r) => r.assignedToId!), ...moves.map((m) => m.by)]);
    const users = ids.size ? await this.prisma.user.findMany({
      where: { tenantId, id: { in: [...ids] } }, select: { id: true, fullName: true, email: true, isActive: true },
    }) : [];
    const name = (u: { fullName: string | null; email: string }) => u.fullName || u.email;
    const rows = users.map((u) => ({
      userId: u.id, name: name(u), active: u.isActive,
      open: open.find((r) => r.assignedToId === u.id)?._count ?? 0,
      followUpsDue: due.find((r) => r.assignedToId === u.id)?._count ?? 0,
      doneToday: moves.find((m) => m.by === u.id)?.orders ?? 0,
    })).filter((r) => r.open || r.followUpsDue || r.doneToday).sort((a, b) => b.open - a.open || b.doneToday - a.doneToday);
    return { staff: rows, unassigned, me: user.id };
  }

  // ═══════════════════════════════════════════════════════════
  // WHATSAPP TEMPLATES
  // ═══════════════════════════════════════════════════════════

  async waTemplates(tenantId: string) {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: waKey(tenantId) } });
    let raw: unknown = null;
    try { raw = row?.value ? JSON.parse(row.value) : null; } catch { raw = null; }
    return { keys: WA_TEMPLATE_KEYS, templates: normalizeWaTemplates(raw) };
  }

  async saveWaTemplates(user: AuthenticatedUser, body: unknown) {
    assertManager(user);
    const templates = normalizeWaTemplates(body);
    const value = JSON.stringify(templates);
    await this.prisma.systemSetting.upsert({
      where: { key: waKey(user.tenantId) },
      create: { key: waKey(user.tenantId), value, category: 'online_orders', isPublic: false },
      update: { value },
    });
    return { keys: WA_TEMPLATE_KEYS, templates };
  }

  // ═══════════════════════════════════════════════════════════
  // SCAMMER REPORTS
  // ═══════════════════════════════════════════════════════════

  /** Reports the customer of an order: blocks the number with the reason and evidence, and notes it on the order. */
  async reportScam(user: AuthenticatedUser, scope: ShopScope, id: string, body: { reason?: string; evidence?: string }) {
    const order = await this.prisma.channelOrder.findFirst({
      where: { id, tenantId: user.tenantId, ...(scope.whereLoose as any) },
      select: { id: true, customerPhone: true, customerName: true, externalOrderNumber: true, externalOrderId: true, metadata: true },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (!phoneKey(order.customerPhone)) throw new BadRequestException('Is order par sahi phone number nahi');
    const reason = String(body?.reason ?? '').trim();
    if (reason.length < 3) throw new BadRequestException('Wajah likhein');
    const res = await this.tools.block(user, {
      phone: order.customerPhone!, name: order.customerName, reason, evidence: body?.evidence, orderId: order.id, orderNo: orderNo(order),
    });
    const meta = (order.metadata ?? {}) as any;
    await this.prisma.channelOrder.update({
      where: { id: order.id },
      data: { metadata: { ...meta, scamReport: { at: new Date().toISOString(), by: user.id, reason: reason.slice(0, 200), evidence: String(body?.evidence ?? '').trim().slice(0, 1000) || null } } },
    });
    return res;
  }

  /**
   * The block list with each number's order history at this shop, and
   * numbers worth a look: two or more parcels returned, or a return and no
   * delivery. Suggestions are only shown; nothing is blocked by itself.
   */
  async scamOverview(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const list = await this.tools.blocklist(tenantId);
    const blocked = new Set(list.map((b) => b.key));
    const rows = await this.prisma.$queryRaw<Array<{ k: string; name: string | null; total: number; delivered: number; returned: number; cancelled: number; open: number; loss: number; last: Date }>>`
      SELECT right(regexp_replace("customerPhone", '\\D', '', 'g'), 10) AS k, MAX("customerName") AS name,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "orderStatus" = 'DELIVERED')::int AS delivered,
        COUNT(*) FILTER (WHERE "orderStatus" = 'RETURNED')::int AS returned,
        COUNT(*) FILTER (WHERE "orderStatus" IN ('CANCELLED', 'REJECTED'))::int AS cancelled,
        COUNT(*) FILTER (WHERE "orderStatus" NOT IN ('DELIVERED', 'RETURNED', 'CANCELLED', 'REJECTED'))::int AS open,
        COALESCE(SUM(COALESCE("courierCharge", 0) + COALESCE("rtoCost", 0)) FILTER (WHERE "orderStatus" = 'RETURNED'), 0)::float8 AS loss,
        MAX("receivedAt") AS last
      FROM "channel_orders"
      WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL AND "customerPhone" IS NOT NULL
        AND COALESCE("metadata"->>'test', 'false') <> 'true'
      GROUP BY 1
      HAVING length(right(regexp_replace("customerPhone", '\\D', '', 'g'), 10)) = 10
        AND COUNT(*) FILTER (WHERE "orderStatus" IN ('RETURNED', 'CANCELLED', 'REJECTED')) > 0`;
    const byKey = new Map(rows.map((r) => [r.k, r]));
    const empty = { total: 0, delivered: 0, returned: 0, cancelled: 0, open: 0, loss: 0, last: null as Date | null };
    const history = (k: string) => {
      const r = byKey.get(k);
      return r ? { total: r.total, delivered: r.delivered, returned: r.returned, cancelled: r.cancelled, open: r.open, loss: r2(r.loss), last: r.last } : null;
    };
    // Blocked numbers without returns or cancels still need their counts.
    const missing = list.filter((b) => !byKey.has(b.key)).map((b) => b.key).slice(0, 500);
    const extra = missing.length ? await this.prisma.channelOrder.findMany({
      where: { tenantId, deletedAt: null, OR: missing.map((k) => ({ customerPhone: { endsWith: k.slice(-7) } })) },
      select: { customerPhone: true, orderStatus: true, receivedAt: true },
      take: 5000,
    }) : [];
    const extraHistory = new Map<string, typeof empty>();
    for (const o of extra) {
      const k = phoneKey(o.customerPhone);
      if (!k || !missing.includes(k)) continue;
      const h = extraHistory.get(k) ?? { ...empty };
      h.total++;
      if (o.orderStatus === 'DELIVERED') h.delivered++; else h.open++;
      if (!h.last || o.receivedAt > h.last) h.last = o.receivedAt;
      extraHistory.set(k, h);
    }
    const suggestions = rows
      .filter((r) => !blocked.has(r.k) && (r.returned >= 2 || (r.returned >= 1 && r.delivered === 0)))
      .sort((a, b) => b.returned - a.returned || b.loss - a.loss)
      .slice(0, 50)
      .map((r) => ({ key: r.k, phone: `0${r.k}`, name: r.name, total: r.total, delivered: r.delivered, returned: r.returned, cancelled: r.cancelled, loss: r2(r.loss), last: r.last }));
    return {
      entries: list.map((b) => ({ ...b, history: history(b.key) ?? extraHistory.get(b.key) ?? empty })),
      suggestions,
      totals: {
        blocked: list.length,
        reportedFromOrders: list.filter((b) => b.orderId).length,
        suggestions: suggestions.length,
        knownLoss: r2(list.reduce((s, b) => s + (byKey.get(b.key)?.loss ?? 0), 0)),
      },
    };
  }
}
