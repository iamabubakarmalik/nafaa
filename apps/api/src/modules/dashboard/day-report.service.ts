/**
 * End-of-day report for one business day: opening cash, every item sold
 * with quantities, totals per category, cash vs online, expenses and the
 * closing cash. This is the sheet shop staff otherwise write by hand.
 *
 * Day boundaries follow the tenant's timezone and business-day start hour,
 * the same as every other dashboard number. As a day-close sheet, the day's
 * bills count at full value and returns count on the day they were made;
 * cost and cash follow business-math.helper.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { businessDayKey, safeDayStart, zonedToUtc } from '../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { LIVE_BILL, dayCloseCost } from '../../common/helpers/business-math.helper';
const DAY_MS = 24 * 3600_000;
const n = (v: unknown) => Number(v ?? 0);

@Injectable()
export class DayReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /** `date` is `YYYY-MM-DD` in the shop's calendar; defaults to the current business day. */
  async report(user: AuthenticatedUser, shopId: string | undefined, date?: string) {
    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const startHour = safeDayStart(dayStartHour);
    const today = businessDayKey(new Date(), tz, startHour);
    const key = date ?? today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new BadRequestException('date must be YYYY-MM-DD');
    if (key > today) throw new BadRequestException('Future date');

    const [y, m, d] = key.split('-').map(Number);
    const from = zonedToUtc(y, m, d, startHour, 0, 0, tz);
    const to = new Date(from.getTime() + DAY_MS);
    const prevFrom = new Date(from.getTime() - DAY_MS);

    const tenantId = user.tenantId;
    const shop = shopId ? { shopId } : {};
    const saleWhere = { tenantId, status: LIVE_BILL, soldAt: { gte: from, lt: to }, ...shop };

    const [
      salesAgg, prevAgg, byMethod, itemGroups, expenses, refunds, registers,
      cashPurchases, supplierCash, sellers, cost,
    ] = await Promise.all([
      this.prisma.sale.aggregate({
        where: saleWhere,
        _sum: { total: true, paidAmount: true, changeAmount: true, creditAmount: true, discount: true },
        _count: { _all: true },
      }),
      this.prisma.sale.aggregate({
        where: { ...saleWhere, soldAt: { gte: prevFrom, lt: from } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: saleWhere,
        _sum: { total: true, paidAmount: true, changeAmount: true },
        _count: { _all: true },
      }),
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: { sale: saleWhere },
        _sum: { quantity: true, returnedQty: true, total: true },
        _count: { _all: true },
      }),
      this.prisma.expense.findMany({
        where: { tenantId, status: 'PAID', expenseDate: { gte: from, lt: to }, ...shop },
        select: { id: true, title: true, amount: true, paymentMethod: true, category: { select: { name: true } } },
        orderBy: { amount: 'desc' },
      }),
      this.prisma.saleReturn.groupBy({
        by: ['refundMethod'],
        where: {
          tenantId, returnedAt: { gte: from, lt: to },
          // A return belongs to the branch it was made at; older rows fall back to the bill's branch.
          ...(shopId && { OR: [{ shopId }, { shopId: null, sale: { shopId } }] }),
        },
        _sum: { refundAmount: true },
        _count: { _all: true },
      }),
      this.prisma.cashRegister.findMany({
        where: { tenantId, openedAt: { gte: from, lt: to }, ...shop },
        select: {
          status: true, openingBalance: true, closingBalance: true, difference: true,
          totalCashIn: true, totalCashOut: true, openedAt: true, closedAt: true,
        },
      }),
      this.prisma.purchase.aggregate({
        where: { tenantId, paymentMethod: 'CASH', purchasedAt: { gte: from, lt: to }, ...shop },
        _sum: { paidAmount: true },
      }),
      this.prisma.supplierLedger.aggregate({
        where: {
          tenantId, type: 'PAYMENT_MADE', entryDate: { gte: from, lt: to },
          OR: [{ paymentMethod: 'CASH' }, { paymentMethod: null }],
          ...(shopId ? { AND: [{ OR: [{ shopId }, { shopId: null }] }] } : {}),
        },
        _sum: { amount: true },
      }),
      this.prisma.sale.groupBy({
        by: ['soldById', 'createdById'],
        where: saleWhere,
        _sum: { total: true },
        _count: { _all: true },
      }),
      dayCloseCost(this.prisma, { tenantId, shopId }, { gte: from, lt: to }),
    ]);

    // ── Items and categories ──
    const productIds = itemGroups.map((g) => g.productId).filter((id): id is string => !!id);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, unit: true, category: { select: { id: true, name: true, color: true } } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const items = itemGroups
      .map((g) => {
        const p = g.productId ? productMap.get(g.productId) : undefined;
        const sold = n(g._sum.quantity);
        const returned = n(g._sum.returnedQty);
        return {
          productId: g.productId,
          name: p?.name ?? 'Other items',
          sku: p?.sku ?? null,
          unit: p?.unit ?? 'pcs',
          categoryId: p?.category?.id ?? null,
          category: p?.category?.name ?? 'Uncategorized',
          qty: sold - returned,
          returnedQty: returned,
          revenue: n(g._sum.total),
          lines: g._count._all,
        };
      })
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);

    const catMap = new Map<string, { id: string | null; name: string; color: string | null; qty: number; revenue: number; items: number; units: Record<string, number> }>();
    for (const it of items) {
      const k = it.categoryId ?? 'none';
      const color = it.productId ? productMap.get(it.productId)?.category?.color ?? null : null;
      const c = catMap.get(k) ?? { id: it.categoryId, name: it.category, color, qty: 0, revenue: 0, items: 0, units: {} };
      c.qty += it.qty;
      c.revenue += it.revenue;
      c.items += 1;
      c.units[it.unit] = (c.units[it.unit] ?? 0) + it.qty;
      catMap.set(k, c);
    }
    const categories = [...catMap.values()].sort((a, b) => b.revenue - a.revenue);

    // ── Money in ──
    // Collected = paid at the counter less change given (credit is not collected yet).
    const payments = byMethod
      .map((r) => ({ method: r.paymentMethod, sales: n(r._sum.total), collected: n(r._sum.paidAmount) - n(r._sum.changeAmount), bills: r._count._all }))
      .sort((a, b) => b.collected - a.collected);
    const cashCollected = payments.filter((p) => p.method === 'CASH').reduce((x, p) => x + p.collected, 0);
    const onlineCollected = payments.filter((p) => p.method !== 'CASH').reduce((x, p) => x + p.collected, 0);

    const refundCash = n(refunds.find((r) => r.refundMethod === 'CASH')?._sum.refundAmount);
    const refundTotal = refunds.reduce((x, r) => x + n(r._sum.refundAmount), 0);
    const refundCount = refunds.reduce((x, r) => x + r._count._all, 0);

    const expenseTotal = expenses.reduce((x, e) => x + e.amount, 0);
    const expenseCash = expenses.filter((e) => e.paymentMethod === 'CASH').reduce((x, e) => x + e.amount, 0);

    // ── Cash drawer ──
    // Registers opened on this day. Expected closing uses the same formula
    // as the live cash register screen, bounded to this day.
    const opening = registers.reduce((x, r) => x + n(r.openingBalance), 0);
    const cashIn = registers.reduce((x, r) => x + n(r.totalCashIn), 0);
    const cashOut = registers.reduce((x, r) => x + n(r.totalCashOut), 0);
    const purchasesCash = n(cashPurchases._sum.paidAmount);
    const supplierPaidCash = n(supplierCash._sum.amount);
    const expectedClosing = opening + cashCollected + cashIn - cashOut - expenseCash - refundCash - purchasesCash - supplierPaidCash;
    const closed = registers.filter((r) => r.status === 'CLOSED');
    const allClosed = registers.length > 0 && closed.length === registers.length;

    // ── People ──
    const sellerTotals = new Map<string, { total: number; bills: number }>();
    for (const s of sellers) {
      const id = s.soldById ?? s.createdById;
      if (!id) continue;
      const cur = sellerTotals.get(id) ?? { total: 0, bills: 0 };
      cur.total += n(s._sum.total);
      cur.bills += s._count._all;
      sellerTotals.set(id, cur);
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...sellerTotals.keys()] } },
      select: { id: true, fullName: true },
    });
    const staff = users
      .map((u) => ({ userId: u.id, name: u.fullName, ...sellerTotals.get(u.id)! }))
      .sort((a, b) => b.total - a.total);

    const total = n(salesAgg._sum.total);
    const bills = salesAgg._count._all;
    // The day's bills less the day's returns, and their cost on the same footing.
    const cogs = cost.sold - cost.returned;

    return {
      date: key,
      isToday: key === today,
      from,
      to,
      sales: {
        total,
        bills,
        average: bills > 0 ? total / bills : 0,
        discount: n(salesAgg._sum.discount),
        collected: n(salesAgg._sum.paidAmount) - n(salesAgg._sum.changeAmount),
        credit: n(salesAgg._sum.creditAmount),
        itemsSold: items.reduce((x, i) => x + i.qty, 0),
        cogs,
        grossProfit: total - refundTotal - cogs,
        refunds: refundTotal,
        refundCount,
        previousTotal: n(prevAgg._sum.total),
        previousBills: prevAgg._count._all,
      },
      payments,
      cashCollected,
      onlineCollected,
      items,
      categories,
      expenses: {
        total: expenseTotal,
        cash: expenseCash,
        list: expenses.map((e) => ({ id: e.id, title: e.title, category: e.category?.name ?? null, amount: e.amount, method: e.paymentMethod })),
      },
      cash: {
        registers: registers.length,
        opening,
        cashSales: cashCollected,
        cashIn,
        cashOut,
        expenses: expenseCash,
        refunds: refundCash,
        purchases: purchasesCash,
        supplierPaid: supplierPaidCash,
        expectedClosing,
        countedClosing: allClosed ? closed.reduce((x, r) => x + n(r.closingBalance), 0) : null,
        difference: allClosed ? closed.reduce((x, r) => x + n(r.difference), 0) : null,
        allClosed,
      },
      staff,
    };
  }
}
