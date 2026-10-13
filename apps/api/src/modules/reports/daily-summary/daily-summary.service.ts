/**
 * Daily closing summary: one business day's sales, cash, profit, expenses,
 * low stock and best sellers, sent once a day at the shop's chosen time.
 *
 * Who gets it: the owner and every active user with `reports.view`, narrowed
 * to the people chosen in Settings → Reports. A user tied to one branch gets
 * that branch only. Profit lines need `cost.view`; profit and drawer lines
 * also follow "figures staff may see" in Settings → Reports.
 *
 * Channels (Settings → Reports): in-app notification with mobile push always;
 * email (EmailService, people with a verified address, when shop email is on);
 * WhatsApp as a click-to-send link inside the in-app notification.
 *
 * Settings used (TenantSettings): notifyDailySummary, dailySummaryTime,
 * reportsConfig.summary, emailNotifications, timezone, businessDayStartHour,
 * firstDayOfWeek, currencySymbol, shopName, shopWhatsapp. `dailySummarySentDay`
 * records the last automatic send so a shop never gets two in one day.
 *
 * Numbers follow the shop's business day. Sales are net of returns made the
 * same day; voided bills are left out. Cash from sales is paid − change.
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, safeDayStart, startOfBusinessDayTz, tzParts, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { computeLiveCash } from '../../../common/helpers/live-cash.helper';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import {
  hiddenFiguresFor, normalizeReportsConfig, type ReportsConfig, type SummaryPart,
} from '../../../common/helpers/reports-config.helper';
import { EmailService } from '../../email/email.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { LowStockService } from '../../inventory/low-stock/low-stock.service';

const SOLD = ['COMPLETED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED'] as const;
const KIND = 'daily-summary';
/** A summary sent this soon after a business day starts covers the day before. */
const EARLY_HOURS = 6;
const WEEKDAYS: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', BANK_TRANSFER: 'Bank', JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa',
};

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Khata lines written by bookings; their money is counted from the booking payment. */
const NOT_BOOKING_LINE: Prisma.CustomerLedgerWhereInput = {
  OR: [
    { reference: null },
    { note: null },
    { NOT: { AND: [{ reference: { startsWith: 'BK-' } }, { note: { startsWith: 'Booking ' } }] } },
  ],
};

function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function weekdayOfKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "monday", "Mon", "sat" → 0–6; Monday when unknown. */
export function weekStartIndex(value?: string | null): number {
  return WEEKDAYS[(value ?? '').slice(0, 3).toLowerCase()] ?? 1;
}

/** "21:00" → minutes after midnight; 21:00 when malformed. */
function parseTime(value?: string | null): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value ?? '');
  if (!m) return 21 * 60;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59 ? h * 60 + min : 21 * 60;
}

interface Clock { tz: string; startHour: number; weekStart: number }

export interface DailySummary {
  day: string;
  isToday: boolean;
  shopId: string | null;
  shopName: string | null;
  sales: {
    gross: number; returns: number; returnCount: number; net: number; bills: number; average: number;
    discount: number; itemsSold: number; voided: number; voidedCount: number; credit: number;
  };
  compare: { previousDay: number; lastWeekSameDay: number; weekToDate: number; monthToDate: number; weekStart: string };
  money: {
    methods: Array<{ method: string; label: string; amount: number }>;
    cashSales: number; nonCash: number; khataCollected: number; cashRefunds: number;
    drawerNow: number | null; openDrawers: number; closedDrawers: number; shortExcess: number | null;
  };
  cogs: number;
  grossProfit: number;
  netProfit: number;
  expenses: { total: number; count: number; top: Array<{ name: string; amount: number }> };
  lowStock: { out: number; low: number };
  topItems: Array<{ name: string; qty: number; revenue: number }>;
  topStaff: Array<{ name: string; bills: number; total: number }>;
  branches: Array<{ id: string; name: string; sales: number; bills: number }>;
}

interface Recipient {
  id: string; fullName: string; role: UserRole; permissions: string[]; shopId: string | null; shopName: string | null;
  /** Verified address only. */
  email: string | null;
}

interface MessageOptions {
  shop: string;
  symbol: string;
  include: SummaryPart[];
  roundOff: ReportsConfig['roundOff'];
  withProfit: boolean;
  withDrawer: boolean;
}

/** Shop phone → WhatsApp number (Pakistani 03xx becomes 923xx). */
function waNumber(phone: string | null): string | null {
  const d = (phone ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('92')) return d;
  if (d.startsWith('0')) return `92${d.slice(1)}`;
  return d.length === 10 ? `92${d}` : d;
}

@Injectable()
export class DailySummaryService {
  private readonly logger = new Logger('DailySummary');

  constructor(
    private readonly prisma: PrismaService,
    private readonly tzService: TenantTimezoneService,
    private readonly notifications: NotificationsService,
    private readonly lowStock: LowStockService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  // ─── Clock ───────────────────────────────────────────────────

  private async clock(tenantId: string, firstDayOfWeek?: string | null): Promise<Clock> {
    const { tz, dayStartHour } = await this.tzService.clock(tenantId);
    return { tz, startHour: safeDayStart(dayStartHour), weekStart: weekStartIndex(firstDayOfWeek) };
  }

  private dayStart(key: string, c: Clock): Date {
    const [y, m, d] = key.split('-').map(Number);
    return zonedToUtc(y, m, d, c.startHour, 0, 0, c.tz);
  }

  /** The day a summary sent at `at` covers: the running day, or yesterday early in the morning. */
  summaryDayAt(at: Date, c: Clock): string {
    const key = businessDayKey(at, c.tz, c.startHour);
    const started = startOfBusinessDayTz(at, c.tz, c.startHour);
    return at.getTime() - started.getTime() < EARLY_HOURS * 3600_000 ? shiftKey(key, -1) : key;
  }

  /** Minutes the local clock is past the summary time (0–1439). */
  minutesPastTarget(now: Date, tz: string, time?: string | null): number {
    const p = tzParts(now, tz);
    return (p.hour * 60 + p.minute - parseTime(time) + 1440) % 1440;
  }

  private nextRunAt(now: Date, tz: string, time?: string | null): Date {
    const p = tzParts(now, tz);
    const t = parseTime(time);
    let at = zonedToUtc(p.year, p.month, p.day, Math.floor(t / 60), t % 60, 0, tz);
    if (at.getTime() <= now.getTime()) at = zonedToUtc(p.year, p.month, p.day + 1, Math.floor(t / 60), t % 60, 0, tz);
    return at;
  }

  private checkDay(key: string, c: Clock): void {
    const today = businessDayKey(new Date(), c.tz, c.startHour);
    if (key > today) throw new BadRequestException('Aane wale din ki report nahi ban sakti');
  }

  // ─── Numbers ─────────────────────────────────────────────────

  private returnWhere(tenantId: string, shopId: string | null, from: Date, to: Date): Prisma.SaleReturnWhereInput {
    // A return belongs to the branch it was made at; older rows fall back to the bill's branch.
    return {
      tenantId, returnedAt: { gte: from, lt: to },
      ...(shopId && { OR: [{ shopId }, { shopId: null, sale: { shopId } }] }),
    };
  }

  private async netSales(tenantId: string, shopId: string | null, from: Date, to: Date): Promise<number> {
    const [s, r] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { tenantId, ...(shopId && { shopId }), status: { in: [...SOLD] }, soldAt: { gte: from, lt: to } },
        _sum: { total: true },
      }),
      this.prisma.saleReturn.aggregate({ where: this.returnWhere(tenantId, shopId, from, to), _sum: { refundAmount: true } }),
    ]);
    return r2(n(s._sum.total) - n(r._sum.refundAmount));
  }

  /** Every figure for one business day and one branch (null = all branches). */
  async build(tenantId: string, shopId: string | null, key: string, c: Clock): Promise<DailySummary> {
    const from = this.dayStart(key, c);
    const to = this.dayStart(shiftKey(key, 1), c);
    const today = businessDayKey(new Date(), c.tz, c.startHour);
    const isToday = key === today;
    const shop = shopId ? { shopId } : {};
    const loose = shopId ? [{ OR: [{ shopId }, { shopId: null }] }] : [];
    const sold: Prisma.SaleWhereInput = { tenantId, ...shop, status: { in: [...SOLD] }, soldAt: { gte: from, lt: to } };
    const returnWhere = this.returnWhere(tenantId, shopId, from, to);

    const weekStartKey = shiftKey(key, -((weekdayOfKey(key) - c.weekStart + 7) % 7));
    const monthStartKey = `${key.slice(0, 8)}01`;

    const [
      salesAgg, voidAgg, saleMethods, bookingMethods, returns, returnedItems, expenseGroups, khata,
      itemGroups, sellerGroups, closedAgg, openRegisters, branchGroups, shopRow,
      previousDay, lastWeekSameDay, weekToDate, monthToDate,
    ] = await Promise.all([
      this.prisma.sale.aggregate({
        where: sold,
        _sum: { total: true, discount: true, creditAmount: true, costOfGoods: true },
        _count: { _all: true },
      }),
      this.prisma.sale.aggregate({
        where: { tenantId, ...shop, status: 'VOIDED', soldAt: { gte: from, lt: to } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      // A bill made from a booking carries the booking payments, which are counted when received.
      this.prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: { ...sold, bookingId: null },
        _sum: { paidAmount: true, changeAmount: true },
      }),
      this.prisma.bookingPayment.groupBy({
        by: ['paymentMethod', 'type'],
        where: { booking: { tenantId, ...shop }, paidAt: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
      this.prisma.saleReturn.groupBy({
        by: ['refundMethod'],
        where: returnWhere,
        _sum: { refundAmount: true },
        _count: { _all: true },
      }),
      this.prisma.saleReturnItem.findMany({
        where: { return: returnWhere },
        select: { quantity: true, saleItem: { select: { costPrice: true } } },
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: { tenantId, ...shop, status: 'PAID', expenseDate: { gte: from, lt: to } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      // Collections are stored as negative amounts.
      this.prisma.customerLedger.aggregate({
        where: { tenantId, type: 'PAYMENT_RECEIVED', amount: { lt: 0 }, createdAt: { gte: from, lt: to }, AND: [...loose, NOT_BOOKING_LINE] },
        _sum: { amount: true },
      }),
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: { sale: sold },
        _sum: { quantity: true, returnedQty: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      this.prisma.sale.groupBy({
        by: ['soldById', 'createdById'],
        where: sold,
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.cashRegister.aggregate({
        where: { tenantId, ...shop, status: 'CLOSED', closedAt: { gte: from, lt: to } },
        _sum: { difference: true },
        _count: { _all: true },
      }),
      isToday
        ? this.prisma.cashRegister.findMany({
          where: { tenantId, ...shop, status: 'OPEN' },
          select: { id: true, shopId: true, openedAt: true, openingBalance: true },
        })
        : Promise.resolve([]),
      shopId
        ? Promise.resolve([])
        : this.prisma.sale.groupBy({ by: ['shopId'], where: sold, _sum: { total: true }, _count: { _all: true } }),
      shopId ? this.prisma.shop.findFirst({ where: { id: shopId, tenantId }, select: { name: true } }) : Promise.resolve(null),
      this.netSales(tenantId, shopId, this.dayStart(shiftKey(key, -1), c), from),
      this.netSales(tenantId, shopId, this.dayStart(shiftKey(key, -7), c), this.dayStart(shiftKey(key, -6), c)),
      this.netSales(tenantId, shopId, this.dayStart(weekStartKey, c), to),
      this.netSales(tenantId, shopId, this.dayStart(monthStartKey, c), to),
    ]);

    // ── Sales ──
    const gross = n(salesAgg._sum.total);
    const returnTotal = returns.reduce((a, r) => a + n(r._sum.refundAmount), 0);
    const returnCount = returns.reduce((a, r) => a + r._count._all, 0);
    const net = gross - returnTotal;
    const bills = salesAgg._count._all;

    // ── Money in by method: bills (paid − change) plus booking payments ──
    const byMethod = new Map<string, number>();
    for (const m of saleMethods) {
      byMethod.set(m.paymentMethod, (byMethod.get(m.paymentMethod) ?? 0) + n(m._sum.paidAmount) - n(m._sum.changeAmount));
    }
    for (const b of bookingMethods) {
      const sign = b.type === 'REFUND' ? -1 : 1;
      byMethod.set(b.paymentMethod, (byMethod.get(b.paymentMethod) ?? 0) + sign * n(b._sum.amount));
    }
    const methods = [...byMethod.entries()]
      .map(([method, amount]) => ({ method, label: METHOD_LABEL[method] ?? method, amount: r2(amount) }))
      .filter((m) => m.amount !== 0)
      .sort((a, b) => b.amount - a.amount);
    const cashSales = methods.find((m) => m.method === 'CASH')?.amount ?? 0;

    // ── Profit: today's bills less the cost of goods that came back today ──
    const cogs = n(salesAgg._sum.costOfGoods);
    const returnedCost = returnedItems.reduce((a, r) => a + n(r.quantity) * n(r.saleItem.costPrice), 0);
    const grossProfit = net - (cogs - returnedCost);

    // ── Expenses ──
    const categoryIds = expenseGroups.map((g) => g.categoryId).filter((id): id is string => !!id);
    const productIds = itemGroups.map((g) => g.productId).filter((id): id is string => !!id);
    const staffIds = new Set<string>();
    for (const s of sellerGroups) { const id = s.soldById ?? s.createdById; if (id) staffIds.add(id); }
    const branchIds = branchGroups.map((b) => b.shopId).filter((id): id is string => !!id);

    const [categories, products, people, shops, lowRows, liveCash] = await Promise.all([
      categoryIds.length ? this.prisma.expenseCategory.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } }) : [],
      productIds.length ? this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }) : [],
      staffIds.size ? this.prisma.user.findMany({ where: { id: { in: [...staffIds] } }, select: { id: true, fullName: true } }) : [],
      branchIds.length > 1 ? this.prisma.shop.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } }) : [],
      this.lowStock.rows({ tenantId } as AuthenticatedUser, new ShopScope(shopId, !shopId), this.lowStock.settings()),
      Promise.all(openRegisters.map((r) => computeLiveCash(this.prisma, tenantId, {
        id: r.id, shopId: r.shopId, openedAt: r.openedAt, openingBalance: n(r.openingBalance),
      }))),
    ]);

    const catName = new Map(categories.map((x) => [x.id, x.name]));
    const expenseTotal = expenseGroups.reduce((a, g) => a + n(g._sum.amount), 0);
    const expenseTop = expenseGroups
      .map((g) => ({ name: (g.categoryId && catName.get(g.categoryId)) || 'Baghair category', amount: r2(n(g._sum.amount)) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    const productName = new Map(products.map((p) => [p.id, p.name]));
    const topItems = itemGroups.map((g) => {
      const qty = n(g._sum.quantity);
      const back = n(g._sum.returnedQty);
      const kept = qty > 0 ? (qty - back) / qty : 0;
      return { name: (g.productId && productName.get(g.productId)) || 'Doosra maal', qty: r2(qty - back), revenue: r2(n(g._sum.total) * kept) };
    }).filter((x) => x.qty > 0);
    const itemsSold = await this.prisma.saleItem.aggregate({ where: { sale: sold }, _sum: { quantity: true, returnedQty: true } });

    const personName = new Map(people.map((p) => [p.id, p.fullName]));
    const staffTotals = new Map<string, { bills: number; total: number }>();
    for (const s of sellerGroups) {
      const id = s.soldById ?? s.createdById;
      if (!id) continue;
      const cur = staffTotals.get(id) ?? { bills: 0, total: 0 };
      cur.bills += s._count._all;
      cur.total += n(s._sum.total);
      staffTotals.set(id, cur);
    }
    const topStaff = [...staffTotals.entries()]
      .map(([id, v]) => ({ name: personName.get(id) ?? 'Staff', bills: v.bills, total: r2(v.total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    const shopName = new Map(shops.map((s) => [s.id, s.name]));
    const branches = shops.length > 1
      ? branchGroups
        .flatMap((b) => {
          const name = b.shopId ? shopName.get(b.shopId) : undefined;
          return b.shopId && name ? [{ id: b.shopId, name, sales: r2(n(b._sum.total)), bills: b._count._all }] : [];
        })
        .sort((a, b) => b.sales - a.sales)
      : [];

    const live = lowRows.filter((r) => !r.ignored);
    const cashRefunds = n(returns.find((r) => r.refundMethod === 'CASH')?._sum.refundAmount);

    return {
      day: key,
      isToday,
      shopId,
      shopName: shopRow?.name ?? null,
      sales: {
        gross: r2(gross),
        returns: r2(returnTotal),
        returnCount,
        net: r2(net),
        bills,
        average: bills ? r2(gross / bills) : 0,
        discount: r2(n(salesAgg._sum.discount)),
        itemsSold: r2(n(itemsSold._sum.quantity) - n(itemsSold._sum.returnedQty)),
        voided: r2(n(voidAgg._sum.total)),
        voidedCount: voidAgg._count._all,
        credit: r2(n(salesAgg._sum.creditAmount)),
      },
      compare: { previousDay, lastWeekSameDay, weekToDate, monthToDate, weekStart: weekStartKey },
      money: {
        methods,
        cashSales,
        nonCash: r2(methods.filter((m) => m.method !== 'CASH').reduce((a, m) => a + m.amount, 0)),
        khataCollected: r2(-n(khata._sum.amount)),
        cashRefunds: r2(cashRefunds),
        drawerNow: isToday && liveCash.length ? r2(liveCash.reduce((a, l) => a + l.expected, 0)) : null,
        openDrawers: liveCash.length,
        closedDrawers: closedAgg._count._all,
        shortExcess: closedAgg._count._all ? r2(n(closedAgg._sum.difference)) : null,
      },
      cogs: r2(cogs - returnedCost),
      grossProfit: r2(grossProfit),
      netProfit: r2(grossProfit - expenseTotal),
      expenses: { total: r2(expenseTotal), count: expenseGroups.reduce((a, g) => a + g._count._all, 0), top: expenseTop },
      lowStock: { out: live.filter((r) => r.status === 'out').length, low: live.filter((r) => r.status === 'low').length },
      topItems,
      topStaff,
      branches,
    };
  }

  // ─── Message ─────────────────────────────────────────────────

  /** Plain text for the notification, the email and the WhatsApp link, with the chosen lines only. */
  text(s: DailySummary, opts: MessageOptions): { title: string; body: string } {
    const digits = opts.roundOff === 'rupee' ? 0 : 2;
    const money = (v: number) => `${opts.symbol} ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: digits }).format(digits ? r2(v) : Math.round(v))}`;
    const has = (part: SummaryPart) => opts.include.includes(part);
    const [y, m, d] = s.day.split('-').map(Number);
    const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(y, m - 1, d)));
    const change = (now: number, before: number) => {
      if (!before) return '';
      const pct = Math.round(((now - before) / Math.abs(before)) * 100);
      return pct === 0 ? ' (kal jitni)' : ` (kal se ${pct > 0 ? '+' : ''}${pct}%)`;
    };

    const lines: string[] = [];
    const where = s.shopName ? `${opts.shop} - ${s.shopName}` : opts.shop;
    lines.push(`${where} | ${date}`);
    lines.push('');
    lines.push(`Bikri: ${money(s.sales.net)} | ${s.sales.bills} bill${change(s.sales.net, s.compare.previousDay)}`);
    if (has('returns') && s.sales.returns) lines.push(`Wapsi: ${money(s.sales.returns)} (${s.sales.returnCount})`);
    if (has('voids') && s.sales.voidedCount) lines.push(`Cancel bill: ${s.sales.voidedCount} (${money(s.sales.voided)})`);
    if (has('discount') && s.sales.discount) lines.push(`Chhoot di: ${money(s.sales.discount)}`);
    if (has('payments') && s.money.methods.length) lines.push(`Paisa aaya: ${s.money.methods.map((x) => `${x.label} ${money(x.amount)}`).join(', ')}`);
    if (has('drawer') && opts.withDrawer) {
      if (s.money.drawerNow !== null) lines.push(`Galle me abhi: ${money(s.money.drawerNow)}`);
      if (s.money.shortExcess) lines.push(`Galla band karte waqt farq: ${money(s.money.shortExcess)}`);
    }
    if (has('profit') && opts.withProfit) {
      lines.push(`Munafa: ${money(s.grossProfit)}${s.expenses.total && has('expenses') ? ` | kharchon ke baad ${money(s.netProfit)}` : ''}`);
    }
    if (has('expenses') && s.expenses.total) lines.push(`Kharche: ${money(s.expenses.total)} (${s.expenses.count})`);
    if (has('khata') && (s.sales.credit || s.money.khataCollected)) {
      lines.push(`Udhaar diya: ${money(s.sales.credit)} | wapas aaya: ${money(s.money.khataCollected)}`);
    }
    if (has('lowStock') && (s.lowStock.out || s.lowStock.low)) lines.push(`Stock: ${s.lowStock.out} khatam, ${s.lowStock.low} kam`);
    if (has('topItems') && s.topItems.length) lines.push(`Sab se zyada bika: ${s.topItems.slice(0, 3).map((x) => `${x.name} (${x.qty})`).join(', ')}`);
    if (has('topStaff') && s.topStaff.length > 1) lines.push(`Sab se zyada bikri: ${s.topStaff[0].name} ${money(s.topStaff[0].total)}`);
    if (has('branches') && s.branches.length) lines.push(`Branches: ${s.branches.map((b) => `${b.name} ${money(b.sales)}`).join(', ')}`);
    if (has('trend')) lines.push(`Is hafte: ${money(s.compare.weekToDate)} | Is mahine: ${money(s.compare.monthToDate)}`);

    return { title: `Din ka hisaab, ${date}: ${money(s.sales.net)}`, body: lines.join('\n') };
  }

  /** What one person may see in their copy: profit needs `cost.view`; both follow Settings → Reports. */
  private visibility(role: string, permissions: string[], config: ReportsConfig) {
    const hidden = hiddenFiguresFor(role, config);
    return {
      withProfit: hasPermission(role, permissions, PERMISSIONS.COST_VIEW) && !hidden.includes('profit'),
      withDrawer: !hidden.includes('drawer'),
    };
  }

  private waLink(body: string, phone: string | null) {
    return `https://wa.me/${waNumber(phone) ?? ''}?text=${encodeURIComponent(body)}`;
  }

  private emailHtml(title: string, body: string) {
    const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const url = `${(this.config.get<string>('APP_URL') || 'http://localhost:5173').replace(/\/+$/, '')}/day-report`;
    return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e293b">
<h2 style="margin:0 0 16px;font-size:18px">${esc(title)}</h2>
<div style="font-size:14px;line-height:1.7;white-space:pre-wrap">${esc(body)}</div>
<p style="margin:24px 0 0"><a href="${url}" style="background:#16a34a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">Poora hisaab dekhein</a></p>
</div>`;
  }

  // ─── Recipients and delivery ─────────────────────────────────

  /** The owner and every active user with `reports.view`, oldest role first. */
  private async eligible(tenantId: string): Promise<Recipient[]> {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId, isActive: true,
        OR: [{ role: 'OWNER' }, { permissions: { has: PERMISSIONS.REPORTS_VIEW } }],
      },
      select: {
        id: true, fullName: true, role: true, permissions: true, shopId: true, email: true, emailVerified: true,
        assignedShop: { select: { name: true } },
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });
    return users.map((u) => ({
      id: u.id, fullName: u.fullName, role: u.role, permissions: u.permissions,
      email: u.emailVerified ? u.email : null,
      // The owner always sees every branch.
      shopId: u.role === 'OWNER' ? null : u.shopId,
      shopName: u.role === 'OWNER' ? null : u.assignedShop?.name ?? null,
    }));
  }

  /** Eligible people, narrowed to the ones chosen in Settings → Reports. */
  private async recipients(tenantId: string, ids: string[] | null): Promise<Recipient[]> {
    const all = await this.eligible(tenantId);
    return ids ? all.filter((p) => ids.includes(p.id)) : all;
  }

  private async tenantInfo(tenantId: string) {
    const s = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        shopName: true, currencySymbol: true, firstDayOfWeek: true, notifyDailySummary: true, dailySummaryTime: true,
        emailNotifications: true, shopWhatsapp: true, shopPhone: true, reportsConfig: true,
        tenant: { select: { name: true } },
      },
    });
    return {
      shop: s?.shopName || s?.tenant.name || 'Dukaan',
      symbol: s?.currencySymbol || 'Rs',
      firstDayOfWeek: s?.firstDayOfWeek ?? 'monday',
      enabled: s?.notifyDailySummary ?? true,
      time: s?.dailySummaryTime || '21:00',
      emailOn: s?.emailNotifications ?? true,
      phone: s?.shopWhatsapp || s?.shopPhone || null,
      config: normalizeReportsConfig(s?.reportsConfig),
    };
  }

  /**
   * Sends the summary for `key` to the chosen recipients through the chosen
   * channels: in-app always (with mobile push), email to people with a
   * verified address, and a WhatsApp click-to-send link inside the in-app
   * notification. Automatic runs skip a day with no bills, returns or
   * expenses, so a closed shop gets nothing.
   */
  async deliver(tenantId: string, key: string, auto: boolean, sentBy?: string): Promise<{ day: string; sent: number; emailed: number; skipped: boolean }> {
    const info = await this.tenantInfo(tenantId);
    const { channels, include, recipientIds } = info.config.summary;
    const c = await this.clock(tenantId, info.firstDayOfWeek);
    const people = await this.recipients(tenantId, recipientIds);
    const cache = new Map<string, Promise<DailySummary>>();
    const summaryFor = (shopId: string | null) => {
      const k = shopId ?? 'all';
      if (!cache.has(k)) cache.set(k, this.build(tenantId, shopId, key, c));
      return cache.get(k)!;
    };

    if (auto) {
      const all = await summaryFor(null);
      if (!all.sales.bills && !all.expenses.count && !all.sales.returnCount) return { day: key, sent: 0, emailed: 0, skipped: true };
    }

    const email = channels.includes('email') && info.emailOn;
    const whatsapp = channels.includes('whatsapp');
    let sent = 0;
    let emailed = 0;
    for (const person of people) {
      const s = await summaryFor(person.shopId);
      const seen = this.visibility(person.role, person.permissions, info.config);
      const { title, body } = this.text(s, { shop: info.shop, symbol: info.symbol, include, roundOff: info.config.roundOff, ...seen });
      await this.notifications.create({
        tenantId,
        userId: person.id,
        type: NotificationType.INFO,
        title,
        message: body,
        link: '/day-report',
        metadata: {
          kind: KIND, day: key, shopId: person.shopId, auto, ...(sentBy && { sentBy }),
          ...(whatsapp && { whatsappUrl: this.waLink(body, info.phone) }),
        },
      });
      sent++;
      if (email && person.email) {
        try {
          const res = await this.email.send({ tenantId, toEmail: person.email, toName: person.fullName, subject: title, bodyText: body, bodyHtml: this.emailHtml(title, body) });
          if (res && 'success' in res && res.success) emailed++;
        } catch (e: any) {
          this.logger.warn(`Daily summary email to ${person.id} failed: ${e?.message}`);
        }
      }
    }
    return { day: key, sent, emailed, skipped: false };
  }

  /** True when an automatic summary for `key` is already in the notifications (sent before the day marker existed). */
  private async alreadySent(tenantId: string, key: string): Promise<boolean> {
    const hit = await this.prisma.notification.findFirst({
      where: {
        tenantId,
        createdAt: { gte: new Date(Date.now() - 3 * 86_400_000) },
        AND: [
          { metadata: { path: ['kind'], equals: KIND } },
          { metadata: { path: ['day'], equals: key } },
          { metadata: { path: ['auto'], equals: true } },
        ],
      },
      select: { id: true },
    });
    return !!hit;
  }

  /**
   * Marks `key` as the tenant's last automatic summary day. The update only
   * succeeds when the marker still holds the value just read, so two servers
   * (or two overlapping runs) cannot both claim the same day. Returns the
   * previous marker, or `undefined` when the day was already claimed.
   */
  private async claimDay(tenantId: string, key: string): Promise<{ prev: string | null } | undefined> {
    const row = await this.prisma.tenantSettings.findUnique({ where: { tenantId }, select: { dailySummarySentDay: true } });
    const prev = row?.dailySummarySentDay ?? null;
    if (prev && prev >= key) return undefined;
    const res = await this.prisma.tenantSettings.updateMany({ where: { tenantId, dailySummarySentDay: prev }, data: { dailySummarySentDay: key } });
    return res.count === 1 ? { prev } : undefined;
  }

  /** Called by the scheduler: sends for every tenant whose summary time has come, once per business day. */
  async runDue(windowMinutes: number): Promise<{ checked: number; sent: number }> {
    const rows = await this.prisma.tenantSettings.findMany({
      where: { notifyDailySummary: true, tenant: { status: { in: ['ACTIVE', 'TRIAL'] } } },
      select: { tenantId: true, dailySummaryTime: true, firstDayOfWeek: true },
    });
    const now = new Date();
    let sent = 0;
    for (const row of rows) {
      try {
        const c = await this.clock(row.tenantId, row.firstDayOfWeek);
        const past = this.minutesPastTarget(now, c.tz, row.dailySummaryTime);
        if (past >= windowMinutes) continue;
        // Use the scheduled moment, so a late run still reports the same day.
        const key = this.summaryDayAt(new Date(now.getTime() - past * 60_000), c);
        const claim = await this.claimDay(row.tenantId, key);
        if (!claim) continue;
        if (await this.alreadySent(row.tenantId, key)) continue;
        try {
          const res = await this.deliver(row.tenantId, key, true);
          sent += res.sent;
        } catch (e) {
          // Nothing went out: free the day so the next run tries again.
          await this.prisma.tenantSettings.updateMany({ where: { tenantId: row.tenantId, dailySummarySentDay: key }, data: { dailySummarySentDay: claim.prev } });
          throw e;
        }
      } catch (e: any) {
        this.logger.error(`Daily summary failed for ${row.tenantId}: ${e?.message}`);
      }
    }
    return { checked: rows.length, sent };
  }

  // ─── Endpoints ───────────────────────────────────────────────

  /** Schedule, channels, people who can get it and recent sends, for the settings screen. */
  async status(user: AuthenticatedUser) {
    const info = await this.tenantInfo(user.tenantId);
    const c = await this.clock(user.tenantId, info.firstDayOfWeek);
    const now = new Date();
    const next = this.nextRunAt(now, c.tz, info.time);
    const { channels, recipientIds } = info.config.summary;
    const [people, recent] = await Promise.all([
      this.eligible(user.tenantId),
      this.prisma.notification.findMany({
        where: { tenantId: user.tenantId, createdAt: { gte: new Date(now.getTime() - 14 * 86_400_000) }, metadata: { path: ['kind'], equals: KIND } },
        select: { createdAt: true, metadata: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    // One row per send: same day, same kind of run, within a minute.
    const sends: Array<{ day: string; at: Date; auto: boolean; people: number }> = [];
    for (const r of recent) {
      const meta = (r.metadata ?? {}) as { day?: string; auto?: boolean };
      const last = sends[sends.length - 1];
      if (last && last.day === meta.day && last.auto === !!meta.auto && last.at.getTime() - r.createdAt.getTime() < 60_000) {
        last.people++;
      } else {
        sends.push({ day: meta.day ?? '', at: r.createdAt, auto: !!meta.auto, people: 1 });
      }
    }

    return {
      enabled: info.enabled,
      time: info.time,
      timezone: c.tz,
      dayStartHour: c.startHour,
      weekStart: c.weekStart,
      nextRunAt: info.enabled ? next : null,
      nextDay: this.summaryDayAt(next, c),
      today: businessDayKey(now, c.tz, c.startHour),
      channels,
      emailOn: info.emailOn,
      recipients: people.map((p) => {
        const seen = this.visibility(p.role, p.permissions, info.config);
        return {
          id: p.id, name: p.fullName, role: p.role, branch: p.shopName,
          selected: !recipientIds || recipientIds.includes(p.id),
          hasEmail: !!p.email,
          seesProfit: seen.withProfit,
          seesDrawer: seen.withDrawer,
        };
      }),
      recent: sends.slice(0, 10),
    };
  }

  /** The summary for the caller's branch view, with the message they would get. */
  async preview(user: AuthenticatedUser, scope: ShopScope, date?: string) {
    const info = await this.tenantInfo(user.tenantId);
    const c = await this.clock(user.tenantId, info.firstDayOfWeek);
    const key = date ?? businessDayKey(new Date(), c.tz, c.startHour);
    this.checkDay(key, c);
    const built = await this.build(user.tenantId, scope.shopId, key, c);
    const seen = this.visibility(user.role, user.permissions, info.config);
    // Drawer money stays out when Settings → Reports hides it from this user; profit keys go through the interceptors.
    const summary = seen.withDrawer ? built : { ...built, money: { ...built.money, drawerNow: null, shortExcess: null } };
    return {
      summary,
      drawerHidden: !seen.withDrawer,
      message: this.text(summary, { shop: info.shop, symbol: info.symbol, include: info.config.summary.include, roundOff: info.config.roundOff, ...seen }),
    };
  }

  /** "Send now": the chosen recipients get the summary for `date` (today by default) through the chosen channels. */
  async sendNow(user: AuthenticatedUser, date?: string) {
    const info = await this.tenantInfo(user.tenantId);
    const c = await this.clock(user.tenantId, info.firstDayOfWeek);
    const key = date ?? businessDayKey(new Date(), c.tz, c.startHour);
    this.checkDay(key, c);
    // A double click must not send twice.
    const recent = await this.prisma.notification.findFirst({
      where: {
        tenantId: user.tenantId,
        createdAt: { gte: new Date(Date.now() - 60_000) },
        AND: [{ metadata: { path: ['kind'], equals: KIND } }, { metadata: { path: ['day'], equals: key } }],
      },
      select: { id: true },
    });
    if (recent) throw new BadRequestException('Ye report abhi abhi bheji gayi hai. Ek minute baad dobara koshish karein.');
    return this.deliver(user.tenantId, key, false, user.id);
  }
}
