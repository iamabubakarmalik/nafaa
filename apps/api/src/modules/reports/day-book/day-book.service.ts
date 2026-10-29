/**
 * Day book: the end-of-day (Z) report for one business day, for one branch
 * or all of them.
 *
 *   sales      bills, discounts, service charges, returns, net, profit
 *   compare    the day before and the same weekday last week
 *   money      payment methods (cash net of change), booking payments, khata
 *   drawers    every register that ran in the day, reconciled with the
 *              shared live-cash calculation, plus cash in and out
 *   spending   expenses, purchases, supplier payments
 *   detail     items, categories, hours, staff, voids, returns, discounts,
 *              items that ran low, branch split
 *
 * Day boundaries follow the shop's timezone and business-day start hour.
 * Net sales = bills (voided bills left out) minus returns made in the day.
 * Cost and profit fields use names the cost-masking interceptor removes.
 * Drawer figures (`drawer`, cash in/out, branch drawer difference) are null
 * or empty when Settings → Reports hides them from staff.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { businessDayKey, safeDayStart, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { computeLiveCash } from '../../../common/helpers/live-cash.helper';
import { hiddenFigures } from '../../../common/helpers/reports-config.helper';
import { DayBookQueries, type Scope, type Window, type WindowTotals } from './day-book.queries';

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const LIST_LIMIT = 300;

/** Khata lines written by bookings; their money is counted from the booking payment. */
const NOT_BOOKING_LINE: Prisma.CustomerLedgerWhereInput = {
  OR: [
    { reference: null },
    { note: null },
    { NOT: { AND: [{ reference: { startsWith: 'BK-' } }, { note: { startsWith: 'Booking ' } }] } },
  ],
};

function shiftKey(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + days));
  return x.toISOString().slice(0, 10);
}

function dayWindow(key: string, tz: string, startHour: number): Window {
  const [y, m, d] = key.split('-').map(Number);
  return { from: zonedToUtc(y, m, d, startHour, 0, 0, tz), to: zonedToUtc(y, m, d + 1, startHour, 0, 0, tz) };
}

/** Headline numbers for a window, net of returns. */
function snapshot(date: string, t: WindowTotals) {
  const net = r2(t.billed - t.returns);
  return {
    date,
    bills: t.bills,
    net,
    avgBill: t.bills ? r2(t.billed / t.bills) : 0,
    itemsSold: r2(t.soldQty - t.returnQty),
    profit: r2(net - (t.cogs - t.returnCost)),
  };
}

@Injectable()
export class DayBookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly sql: DayBookQueries,
  ) {}

  /** Owners may pick any branch of their tenant; staff stay in their own. */
  private async branch(user: AuthenticatedUser, scope: ShopScope, requested?: string): Promise<string | null> {
    const owner = user.role === 'OWNER' || user.role === 'SUPER_ADMIN';
    if (!owner || !requested || requested === 'all') return scope.shopId;
    const shop = await this.prisma.shop.findFirst({ where: { id: requested, tenantId: user.tenantId }, select: { id: true } });
    if (!shop) throw new NotFoundException('Branch nahi mili');
    return shop.id;
  }

  async report(user: AuthenticatedUser, shopScope: ShopScope, date?: string, requestedShop?: string) {
    const clock = await this.tz.clock(user.tenantId);
    const tz = clock.tz;
    const startHour = safeDayStart(clock.dayStartHour);
    const today = businessDayKey(new Date(), tz, startHour);
    const key = date ?? today;
    if (key > today) throw new BadRequestException('Aane wale din ka hisaab nahi ban sakta');

    const tenantId = user.tenantId;
    const shopId = await this.branch(user, shopScope, requestedShop);
    const scope: Scope = { tenantId, shopId };
    const day = dayWindow(key, tz, startHour);
    const yKey = shiftKey(key, -1);
    const wKey = shiftKey(key, -7);
    const yesterday = dayWindow(yKey, tz, startHour);
    const lastWeek = dayWindow(wKey, tz, startHour);

    const range = { gte: day.from, lt: day.to };
    const shop = shopId ? { shopId } : {};
    const loose = shopId ? [{ OR: [{ shopId }, { shopId: null }] }] : [];
    const notVoided = { tenantId, ...shop, status: { not: 'VOIDED' as const }, soldAt: range };
    const returnWhere: Prisma.SaleReturnWhereInput = {
      tenantId, returnedAt: range,
      ...(shopId && { OR: [{ shopId }, { shopId: null, sale: { shopId } }] }),
    };

    const [
      totals, yTotals, wTotals, sums, counts, hours, itemRows, people, methods, sources,
      chargeRows, returns, voided, discounts, discountList, bookingPays, bookingsConverted,
      khataRows, expenses, purchases, supplierPays, cashMoves, registers, dayFlow, previousClose,
    ] = await Promise.all([
      this.sql.totals(scope, day),
      this.sql.totals(scope, yesterday),
      this.sql.totals(scope, lastWeek),
      this.prisma.sale.aggregate({
        where: notVoided,
        _sum: { subtotal: true, serviceCharges: true, paidAmount: true, changeAmount: true, creditAmount: true },
        _max: { total: true },
        _min: { soldAt: true },
      }),
      this.prisma.$queryRaw<Array<{ customers: number; walkins: number; last: Date | null }>>`
        SELECT COUNT(DISTINCT s."customerId")::int AS customers,
               COUNT(*) FILTER (WHERE s."customerId" IS NULL)::int AS walkins,
               MAX(s."soldAt") AS last
        FROM "Sale" s
        WHERE s."tenantId" = ${tenantId} AND s.status <> 'VOIDED'
          AND s."soldAt" >= ${day.from} AND s."soldAt" < ${day.to}
          ${shopId ? Prisma.sql`AND s."shopId" = ${shopId}` : Prisma.empty}`,
      this.sql.hourly(scope, tz, day, yesterday, lastWeek),
      this.sql.items(scope, day),
      this.sql.people(scope, day),
      this.sql.methods(scope, day),
      this.prisma.sale.groupBy({ by: ['source'], where: notVoided, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.sale.findMany({
        where: { ...notVoided, serviceCharges: { gt: 0 } },
        select: { serviceChargesBreakdown: true },
        take: 3000,
      }),
      this.prisma.saleReturn.findMany({
        where: returnWhere,
        select: {
          id: true, returnNumber: true, refundAmount: true, refundMethod: true, reason: true, returnedAt: true, shopId: true,
          createdById: true,
          sale: { select: { id: true, saleNumber: true, shopId: true, customer: { select: { name: true } } } },
          createdBy: { select: { fullName: true } },
          items: { select: { quantity: true } },
        },
        orderBy: { returnedAt: 'desc' },
        take: LIST_LIMIT,
      }),
      this.prisma.sale.findMany({
        where: { tenantId, ...shop, status: 'VOIDED', OR: [{ soldAt: range }, { updatedAt: range }] },
        select: {
          id: true, saleNumber: true, soldAt: true, updatedAt: true, total: true, paymentMethod: true,
          customer: { select: { name: true } },
          soldBy: { select: { fullName: true } }, createdBy: { select: { fullName: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: LIST_LIMIT,
      }),
      this.prisma.sale.aggregate({
        where: { ...notVoided, discount: { gt: 0 } },
        _sum: { discount: true, codeDiscount: true, loyaltyDiscount: true },
        _count: { _all: true },
      }),
      this.prisma.sale.findMany({
        where: { ...notVoided, discount: { gt: 0 } },
        select: {
          id: true, saleNumber: true, soldAt: true, subtotal: true, discount: true, codeDiscount: true, loyaltyDiscount: true,
          discountCode: true, total: true,
          customer: { select: { name: true } },
          soldBy: { select: { fullName: true } }, createdBy: { select: { fullName: true } },
        },
        orderBy: { discount: 'desc' },
        take: 100,
      }),
      this.prisma.bookingPayment.findMany({
        where: { booking: { tenantId, ...shop }, paidAt: range },
        select: {
          id: true, type: true, amount: true, paymentMethod: true, paidAt: true,
          booking: { select: { id: true, bookingNumber: true, customer: { select: { name: true } } } },
        },
        orderBy: { paidAt: 'desc' },
        take: LIST_LIMIT,
      }),
      this.prisma.booking.count({ where: { tenantId, ...shop, convertedAt: range } }),
      this.prisma.customerLedger.findMany({
        where: {
          tenantId, createdAt: range,
          AND: [...loose, { OR: [{ type: 'SALE_CREDIT' }, { type: 'PAYMENT_RECEIVED', ...NOT_BOOKING_LINE }] }],
        },
        select: {
          id: true, type: true, amount: true, reference: true, createdAt: true, paymentMethod: true,
          customer: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      this.prisma.expense.findMany({
        where: { tenantId, ...shop, status: 'PAID', expenseDate: range },
        select: {
          id: true, expenseNumber: true, title: true, amount: true, paymentMethod: true, expenseDate: true,
          category: { select: { name: true } }, createdBy: { select: { fullName: true } },
        },
        orderBy: { amount: 'desc' },
        take: LIST_LIMIT,
      }),
      this.prisma.purchase.findMany({
        where: { tenantId, ...shop, status: { not: 'CANCELLED' }, purchasedAt: range },
        select: {
          id: true, purchaseNumber: true, total: true, paidAmount: true, paymentMethod: true, status: true, purchasedAt: true,
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { purchasedAt: 'desc' },
        take: LIST_LIMIT,
      }),
      this.prisma.supplierLedger.findMany({
        where: { tenantId, type: 'PAYMENT_MADE', entryDate: range, AND: loose },
        select: {
          id: true, amount: true, paymentMethod: true, reference: true, note: true, entryDate: true,
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { entryDate: 'desc' },
        take: LIST_LIMIT,
      }),
      this.prisma.cashTransaction.findMany({
        where: { tenantId, type: { in: ['CASH_IN', 'CASH_OUT'] }, createdAt: range, ...(shopId && { cashRegister: { shopId } }) },
        select: {
          id: true, type: true, amount: true, reason: true, note: true, createdAt: true,
          createdBy: { select: { fullName: true } }, cashRegister: { select: { registerNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
      }),
      this.prisma.cashRegister.findMany({
        where: { tenantId, ...shop, openedAt: { lt: day.to }, OR: [{ closedAt: null }, { closedAt: { gte: day.from } }] },
        select: {
          id: true, shopId: true, registerNumber: true, status: true, openingBalance: true, expectedBalance: true,
          closingBalance: true, difference: true, openedAt: true, closedAt: true, notes: true,
          shop: { select: { name: true } },
          openedBy: { select: { fullName: true } }, closedBy: { select: { fullName: true } },
        },
        orderBy: { openedAt: 'asc' },
        take: 60,
      }),
      // Cash that moved through drawers in the day, from the shared formula (manual entries added below).
      computeLiveCash(this.prisma, tenantId, { id: '', shopId, openedAt: day.from, openingBalance: 0 }, new Date(day.to.getTime() - 1)),
      shopId
        ? this.prisma.cashRegister.findFirst({
          where: { tenantId, shopId, status: 'CLOSED', closedAt: { lt: day.from } },
          orderBy: { closedAt: 'desc' },
          select: { registerNumber: true, closingBalance: true, closedAt: true },
        })
        : Promise.resolve(null),
    ]);

    /* ── Sales summary ── */
    const subtotal = n(sums._sum.subtotal);
    const charges = n(sums._sum.serviceCharges);
    const net = r2(totals.billed - totals.returns);
    const cogs = r2(totals.cogs - totals.returnCost);
    const grossProfit = r2(net - cogs);
    const paidNet = r2(n(sums._sum.paidAmount) - n(sums._sum.changeAmount));

    /* ── Items and categories ── */
    const items = itemRows
      .map((r) => {
        const revenue = r2(r.revenue - r.ramount);
        const cost = r2(r.cost - r.rcost);
        return {
          productId: r.pid,
          name: r.name ?? 'Doosri cheezein',
          sku: r.sku,
          unit: r.unit ?? 'pcs',
          categoryId: r.cat_id,
          category: r.cat_name ?? 'Baghair category',
          color: r.cat_color,
          soldQty: r2(r.qty),
          returnedQty: r2(r.rqty),
          qty: r2(r.qty - r.rqty),
          bills: r.bills,
          revenue,
          cost,
          profit: r2(revenue - cost),
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.qty - a.qty);

    const catMap = new Map<string, { id: string | null; name: string; color: string | null; qty: number; revenue: number; profit: number; items: number }>();
    for (const it of items) {
      const k = it.categoryId ?? 'none';
      const c = catMap.get(k) ?? { id: it.categoryId, name: it.category, color: it.color, qty: 0, revenue: 0, profit: 0, items: 0 };
      c.qty = r2(c.qty + it.qty);
      c.revenue = r2(c.revenue + it.revenue);
      c.profit = r2(c.profit + it.profit);
      c.items += 1;
      catMap.set(k, c);
    }
    const categories = [...catMap.values()].sort((a, b) => b.revenue - a.revenue);

    /* ── Hours, ordered from the business-day start ── */
    const hourOrder = Array.from({ length: 24 }, (_, i) => (startHour + i) % 24);
    const hourly = hourOrder.map((h) => {
      const pick = (win: string) => hours.find((x) => x.hour === h && x.win === win);
      return {
        hour: h,
        sales: r2(n(pick('day')?.sales)),
        bills: n(pick('day')?.bills),
        yesterday: r2(n(pick('yesterday')?.sales)),
        lastWeek: r2(n(pick('lastWeek')?.sales)),
      };
    });

    /* ── Money in: payment methods and booking payments ── */
    const bookingByMethod = new Map<string, number>();
    let advances = 0; let advanceCount = 0; let bookingRefunds = 0; let bookingRefundCount = 0;
    for (const p of bookingPays) {
      const refund = p.type === 'REFUND';
      if (refund) { bookingRefunds += p.amount; bookingRefundCount += 1; } else { advances += p.amount; advanceCount += 1; }
      bookingByMethod.set(p.paymentMethod, (bookingByMethod.get(p.paymentMethod) ?? 0) + (refund ? -p.amount : p.amount));
    }
    const methodKeys = new Set<string>([...methods.map((m) => m.method), ...bookingByMethod.keys()]);
    const payments = [...methodKeys].map((method) => {
      const m = methods.find((x) => x.method === method);
      const bookings = r2(bookingByMethod.get(method) ?? 0);
      const collected = r2(n(m?.collected));
      return {
        method,
        bills: n(m?.bills),
        billed: r2(n(m?.billed)),
        collected,
        credit: r2(n(m?.credit)),
        bookingBills: n(m?.booking_bills),
        bookings,
        total: r2(collected + bookings),
      };
    }).sort((a, b) => b.total - a.total);

    /* ── Service charges by label ── */
    const chargeMap = new Map<string, { label: string; amount: number; bills: number }>();
    for (const row of chargeRows) {
      const list = Array.isArray(row.serviceChargesBreakdown) ? (row.serviceChargesBreakdown as Array<Record<string, unknown>>) : [];
      for (const sc of list) {
        if (!sc || sc.passThrough) continue;
        const label = String(sc.label || sc.type || 'Charges');
        const c = chargeMap.get(label) ?? { label, amount: 0, bills: 0 };
        c.amount = r2(c.amount + n(sc.amount));
        c.bills += 1;
        chargeMap.set(label, c);
      }
    }

    /* ── Khata ── */
    let given = 0; let givenCount = 0; let collected = 0; let collectedCount = 0;
    const khataList = khataRows.map((k) => {
      const isGiven = k.type === 'SALE_CREDIT';
      // Collections are stored as negative amounts; installments as positive ones.
      const amount = isGiven ? k.amount : k.amount < 0 ? -k.amount : k.amount;
      if (isGiven) { given += amount; givenCount += 1; } else { collected += amount; collectedCount += 1; }
      return {
        id: k.id, kind: isGiven ? 'given' as const : 'collected' as const, amount: r2(amount), reference: k.reference,
        method: isGiven ? null : k.paymentMethod ?? 'CASH', at: k.createdAt, customerId: k.customer.id, customer: k.customer.name, phone: k.customer.phone,
      };
    });

    /* ── Drawers ── */
    const drawerRows = await Promise.all(registers.map(async (reg) => {
      const closed = reg.status === 'CLOSED';
      const live = await computeLiveCash(this.prisma, tenantId, reg, closed && reg.closedAt ? reg.closedAt : undefined);
      // A closed register keeps the figure it was counted against.
      const expected = closed ? r2(n(reg.expectedBalance)) : live.expected;
      return {
        id: reg.id,
        number: reg.registerNumber,
        shop: reg.shop?.name ?? null,
        status: reg.status,
        openedAt: reg.openedAt,
        closedAt: reg.closedAt,
        openedBy: reg.openedBy.fullName,
        closedBy: reg.closedBy?.fullName ?? null,
        startedEarlier: reg.openedAt < day.from,
        notes: reg.notes,
        opening: r2(n(reg.openingBalance)),
        expected,
        counted: closed ? r2(n(reg.closingBalance)) : null,
        difference: closed ? r2(n(reg.difference)) : null,
        flow: {
          cashSales: live.cashSales, bookingReceived: live.bookingReceived, khataReceived: live.khataReceived, otherIncome: live.otherIncome,
          cashIn: live.cashIn, cashOut: live.cashOut, returns: live.returns, bookingRefunds: live.bookingRefunds,
          expenses: live.expenses, purchases: live.purchases, supplierPaid: live.supplierPaid,
        },
      };
    }));
    const cashIn = r2(cashMoves.filter((c) => c.type === 'CASH_IN').reduce((s, c) => s + c.amount, 0));
    const cashOut = r2(cashMoves.filter((c) => c.type === 'CASH_OUT').reduce((s, c) => s + c.amount, 0));
    const openedToday = drawerRows.filter((d) => !d.startedEarlier);
    const allClosed = drawerRows.length > 0 && drawerRows.every((d) => d.status === 'CLOSED');
    const firstOpen = openedToday[0];

    /* ── People ── */
    const returnsByUser = new Map<string, { count: number; amount: number }>();
    for (const r of returns) {
      if (!r.createdById) continue;
      const cur = returnsByUser.get(r.createdById) ?? { count: 0, amount: 0 };
      cur.count += 1; cur.amount += r.refundAmount;
      returnsByUser.set(r.createdById, cur);
    }
    const userIds = [...new Set([...people.map((p) => p.uid), ...returnsByUser.keys()].filter((x): x is string => !!x))];
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds }, tenantId }, select: { id: true, fullName: true, role: true } })
      : [];
    const staff = userIds.map((id) => {
      const u = users.find((x) => x.id === id);
      const p = people.find((x) => x.uid === id);
      const rt = returnsByUser.get(id);
      const total = r2(n(p?.total));
      return {
        userId: id,
        name: u?.fullName ?? 'Purana user',
        role: u?.role ?? null,
        bills: n(p?.bills),
        total,
        avgBill: p?.bills ? r2(total / p.bills) : 0,
        discount: r2(n(p?.discount)),
        credit: r2(n(p?.credit)),
        profit: r2(total - n(p?.cogs)),
        voids: n(p?.voids),
        returns: rt?.count ?? 0,
        returnAmount: r2(rt?.amount ?? 0),
      };
    }).filter((s) => s.bills || s.voids || s.returns).sort((a, b) => b.total - a.total);

    /* ── Voids with their reason (written on the stock movement) ── */
    const voidNumbers = voided.map((v) => v.saleNumber);
    const reasons = voidNumbers.length
      ? await this.prisma.stockMovement.findMany({
        where: { tenantId, reference: { in: voidNumbers }, note: { startsWith: 'Voided: ' } },
        select: { reference: true, note: true },
        distinct: ['reference'],
      })
      : [];

    /* ── Items that ran low ── */
    const low = await this.sql.lowStock(scope, items.map((i) => i.productId).filter((x): x is string => !!x));

    /* ── Branch split, for the all-branches view ── */
    const branchRows = shopId ? [] : await this.branches(tenantId, day, registers, drawerRows, returns);
    const drawerHidden = (await hiddenFigures(this.prisma, user)).includes('drawer');
    const branches = drawerHidden ? branchRows.map((b) => ({ ...b, difference: null })) : branchRows;

    const expenseTotal = r2(expenses.reduce((s, e) => s + e.amount, 0));
    const expenseByCat = new Map<string, { name: string; amount: number; count: number }>();
    for (const e of expenses) {
      const name = e.category?.name ?? 'Baghair category';
      const c = expenseByCat.get(name) ?? { name, amount: 0, count: 0 };
      c.amount = r2(c.amount + e.amount); c.count += 1;
      expenseByCat.set(name, c);
    }

    return {
      date: key,
      isToday: key === today,
      from: day.from,
      to: day.to,
      tz,
      dayStartHour: startHour,
      generatedAt: new Date(),
      shopId,
      summary: {
        bills: totals.bills,
        voidedBills: voided.filter((v) => v.soldAt >= day.from && v.soldAt < day.to).length,
        subtotal: r2(subtotal),
        discount: r2(totals.discount),
        charges: r2(charges),
        billed: r2(totals.billed),
        returns: r2(totals.returns),
        returnCount: totals.returnCount,
        net,
        avgBill: totals.bills ? r2(totals.billed / totals.bills) : 0,
        biggestBill: r2(n(sums._max.total)),
        itemsSold: r2(totals.soldQty - totals.returnQty),
        uniqueItems: items.filter((i) => i.qty > 0).length,
        customers: n(counts[0]?.customers),
        walkIns: n(counts[0]?.walkins),
        collected: paidNet,
        credit: r2(n(sums._sum.creditAmount)),
        firstBillAt: sums._min.soldAt,
        lastBillAt: counts[0]?.last ?? null,
        cogs,
        grossProfit,
        margin: net > 0 ? r2((grossProfit / net) * 100) : 0,
      },
      compare: {
        yesterday: snapshot(yKey, yTotals),
        lastWeek: snapshot(wKey, wTotals),
      },
      payments,
      sources: sources.map((s) => ({ source: s.source, bills: s._count._all, total: r2(n(s._sum.total)) })).sort((a, b) => b.total - a.total),
      charges: [...chargeMap.values()].sort((a, b) => b.amount - a.amount),
      hourly,
      drawer: drawerHidden ? null : {
        registers: drawerRows,
        allClosed,
        openNow: drawerRows.filter((d) => d.status === 'OPEN').length,
        opening: r2(openedToday.reduce((s, d) => s + d.opening, 0)),
        expected: r2(drawerRows.reduce((s, d) => s + d.expected, 0)),
        counted: allClosed ? r2(drawerRows.reduce((s, d) => s + (d.counted ?? 0), 0)) : null,
        difference: allClosed ? r2(drawerRows.reduce((s, d) => s + (d.difference ?? 0), 0)) : null,
        previousClosing: previousClose && firstOpen
          ? { number: previousClose.registerNumber, amount: r2(previousClose.closingBalance), at: previousClose.closedAt, nextOpening: firstOpen.opening }
          : null,
        flow: {
          cashSales: dayFlow.cashSales, bookingReceived: dayFlow.bookingReceived, khataReceived: dayFlow.khataReceived, otherIncome: dayFlow.otherIncome,
          cashIn, cashOut, returns: dayFlow.returns, bookingRefunds: dayFlow.bookingRefunds,
          expenses: dayFlow.expenses, purchases: dayFlow.purchases, supplierPaid: dayFlow.supplierPaid,
          net: r2(dayFlow.expected + cashIn - cashOut),
        },
      },
      cashMoves: drawerHidden ? [] : cashMoves.map((c) => ({
        id: c.id, type: c.type, amount: c.amount, reason: c.reason, note: c.note, at: c.createdAt,
        by: c.createdBy?.fullName ?? null, register: c.cashRegister.registerNumber,
      })),
      expenses: {
        total: expenseTotal,
        cash: r2(expenses.filter((e) => e.paymentMethod === 'CASH').reduce((s, e) => s + e.amount, 0)),
        count: expenses.length,
        byCategory: [...expenseByCat.values()].sort((a, b) => b.amount - a.amount),
        list: expenses.map((e) => ({
          id: e.id, number: e.expenseNumber, title: e.title, category: e.category?.name ?? null, amount: e.amount,
          method: e.paymentMethod, by: e.createdBy?.fullName ?? null, at: e.expenseDate,
        })),
      },
      purchases: {
        count: purchases.length,
        total: r2(purchases.reduce((s, p) => s + p.total, 0)),
        paid: r2(purchases.reduce((s, p) => s + p.paidAmount, 0)),
        list: purchases.map((p) => ({
          id: p.id, number: p.purchaseNumber, supplierId: p.supplier.id, supplier: p.supplier.name, total: p.total,
          paid: p.paidAmount, method: p.paymentMethod, status: p.status, at: p.purchasedAt,
        })),
      },
      supplierPayments: {
        total: r2(supplierPays.reduce((s, p) => s + p.amount, 0)),
        cash: r2(supplierPays.filter((p) => !p.paymentMethod || p.paymentMethod === 'CASH').reduce((s, p) => s + p.amount, 0)),
        list: supplierPays.map((p) => ({
          id: p.id, supplierId: p.supplier.id, supplier: p.supplier.name, amount: p.amount,
          method: p.paymentMethod ?? 'CASH', reference: p.reference, note: p.note, at: p.entryDate,
        })),
      },
      khata: {
        given: r2(given), givenCount, collected: r2(collected), collectedCount,
        list: khataList.slice(0, LIST_LIMIT),
      },
      bookings: {
        advances: r2(advances), advanceCount, refunds: r2(bookingRefunds), refundCount: bookingRefundCount,
        converted: bookingsConverted,
        list: bookingPays.map((p) => ({
          id: p.id, bookingId: p.booking.id, number: p.booking.bookingNumber, customer: p.booking.customer?.name ?? null,
          type: p.type, amount: p.amount, method: p.paymentMethod, at: p.paidAt,
        })),
      },
      items,
      categories,
      staff,
      voids: voided.map((v) => ({
        id: v.id, saleNumber: v.saleNumber, soldAt: v.soldAt, voidedAt: v.updatedAt, total: v.total, method: v.paymentMethod,
        customer: v.customer?.name ?? null, by: v.soldBy?.fullName ?? v.createdBy?.fullName ?? null,
        earlierBill: v.soldAt < day.from,
        reason: reasons.find((x) => x.reference === v.saleNumber)?.note?.slice('Voided: '.length) ?? null,
      })),
      returns: returns.map((r) => ({
        id: r.id, number: r.returnNumber, saleId: r.sale.id, saleNumber: r.sale.saleNumber, amount: r.refundAmount,
        method: r.refundMethod, reason: r.reason, at: r.returnedAt, by: r.createdBy?.fullName ?? null,
        customer: r.sale.customer?.name ?? null, qty: r2(r.items.reduce((s, i) => s + i.quantity, 0)),
      })),
      discounts: {
        total: r2(n(discounts._sum.discount)),
        bills: discounts._count._all,
        code: r2(n(discounts._sum.codeDiscount)),
        loyalty: r2(n(discounts._sum.loyaltyDiscount)),
        list: discountList.map((d) => ({
          id: d.id, saleNumber: d.saleNumber, soldAt: d.soldAt, subtotal: d.subtotal, discount: d.discount,
          code: d.discountCode, codeAmount: d.codeDiscount, loyaltyAmount: d.loyaltyDiscount, total: d.total,
          customer: d.customer?.name ?? null, by: d.soldBy?.fullName ?? d.createdBy?.fullName ?? null,
        })),
      },
      lowStock: low.map((l) => ({ productId: l.pid, name: l.name, unit: l.unit, stock: r2(l.stock), alert: r2(l.alert), shop: l.shop })),
      branches,
    };
  }

  /** Sales, cash, returns, expenses and drawer result per branch. */
  private async branches(
    tenantId: string,
    day: Window,
    registers: Array<{ shopId: string | null }>,
    drawers: Array<{ status: string; difference: number | null }>,
    returns: Array<{ shopId: string | null; refundAmount: number; sale: { shopId: string | null } }>,
  ) {
    const range = { gte: day.from, lt: day.to };
    const [shops, sales, cashRows, expenses] = await Promise.all([
      this.prisma.shop.findMany({ where: { tenantId }, select: { id: true, name: true, isActive: true }, orderBy: [{ isMain: 'desc' }, { name: 'asc' }] }),
      this.prisma.sale.groupBy({
        by: ['shopId'],
        where: { tenantId, status: { not: 'VOIDED' }, soldAt: range },
        _sum: { total: true },
        _count: { _all: true },
      }),
      // Cash parts of the day's bills (the card part of a split bill is not cash).
      this.prisma.salePayment.groupBy({
        by: ['shopId'],
        where: { tenantId, method: 'CASH', sale: { tenantId, status: { not: 'VOIDED' }, soldAt: range } },
        _sum: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['shopId'],
        where: { tenantId, status: 'PAID', expenseDate: range },
        _sum: { amount: true },
      }),
    ]);
    return shops.map((s) => {
      const mine = sales.filter((x) => x.shopId === s.id);
      const billed = mine.reduce((a, x) => a + n(x._sum.total), 0);
      const cash = n(cashRows.find((x) => x.shopId === s.id)?._sum.amount);
      const back = returns.filter((r) => (r.shopId ?? r.sale.shopId) === s.id).reduce((a, r) => a + r.refundAmount, 0);
      const regs = registers.map((r, i) => ({ r, d: drawers[i] })).filter((x) => x.r.shopId === s.id);
      const closedRegs = regs.filter((x) => x.d.status === 'CLOSED');
      return {
        shopId: s.id,
        name: s.name,
        bills: mine.reduce((a, x) => a + x._count._all, 0),
        net: r2(billed - back),
        cash: r2(cash),
        expenses: r2(n(expenses.find((e) => e.shopId === s.id)?._sum.amount)),
        registers: regs.length,
        openRegisters: regs.length - closedRegs.length,
        difference: closedRegs.length ? r2(closedRegs.reduce((a, x) => a + (x.d.difference ?? 0), 0)) : null,
      };
    }).filter((b) => b.bills || b.registers || b.expenses || shops.find((s) => s.id === b.shopId)?.isActive);
  }
}
