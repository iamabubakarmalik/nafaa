import { Injectable } from '@nestjs/common';
import { startOfDay, startOfMonth, subDays, subMonths, format } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

/* ═════════════════════════════════════════════════════════════
   DUKAAN KA HISAB — "mera paisa kahan hai?"
   ─────────────────────────────────────────────────────────────
   Nafaa har cheez alag alag batata tha: bikri Sales me, kharidari
   Purchases me, kharch Expenses me, udhaar Khata me, golak Cash
   Register me. Magar koi ek jagah nahi thi jo kahe:

     "Aaj tumhare paas ITNA cash hai, ITNA maal me phansa hai,
      ITNA logon se lena hai, ITNA dena hai — aur tum ne ab tak
      ITNA kamaya."

   Dukaan-daar isi ek sawal par faisla karta hai ke aaj maal
   khareede ya na khareede. Ab ye poora hisab ek hi jagah.

   Teen cheezein jo log gaddmadd karte hain:
     • CASH   — jo abhi haath me hai. Isi se kharidari hoti hai.
     • MAAL   — paisa jo stock me para hai. "Hai" magar haath me nahi.
     • MUNAFA — bikri munafa NAHI hoti. Bikri manhaa lagat manhaa kharch.
   ═════════════════════════════════════════════════════════════ */

type Range = { from: Date; to: Date };

@Injectable()
export class MoneyService {
  constructor(private readonly prisma: PrismaService) {}

  private range(from?: string, to?: string): Range {
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);
    const start = from ? new Date(from) : subDays(startOfDay(end), 29);
    start.setHours(0, 0, 0, 0);
    return { from: start, to: end };
  }

  /* ═══════════════════════════════════════════════════════════
     ABHI KA HAAL — sab se ahem safha
     ═══════════════════════════════════════════════════════════ */
  async position(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const now = new Date();
    const monthStart = startOfMonth(now);
    const todayStart = startOfDay(now);

    const [
      openRegisters,
      products,
      customers,
      suppliers,
      todaySales,
      monthSales,
      monthPurchases,
      monthExpenses,
      monthSupplierPaid,
      monthCustomerPaid,
    ] = await Promise.all([
      // Golak — khule hue register ka mutawaqqa balance
      this.prisma.cashRegister.findMany({
        where: { tenantId, status: 'OPEN' },
        select: {
          id: true, registerNumber: true, openingBalance: true, expectedBalance: true,
          totalSales: true, totalCashIn: true, totalCashOut: true, totalExpenses: true,
          openedAt: true, shop: { select: { id: true, name: true } },
        },
      }),

      // Maal me phansa paisa — lagat par, bechne ke rate par nahi
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: { stock: true, costPrice: true, price: true },
      }),

      // Logon se lena
      this.prisma.customer.aggregate({
        where: { tenantId, balance: { gt: 0 } },
        _sum: { balance: true },
        _count: { _all: true },
      }),

      // Supplier ko dena
      this.prisma.supplier.aggregate({
        where: { tenantId, outstandingDue: { gt: 0 } },
        _sum: { outstandingDue: true },
        _count: { _all: true },
      }),

      this.prisma.sale.aggregate({
        where: { tenantId, status: { not: 'VOIDED' }, soldAt: { gte: todayStart } },
        _sum: { total: true, paidAmount: true, creditAmount: true, costOfGoods: true },
        _count: { _all: true },
      }),
      this.prisma.sale.aggregate({
        where: { tenantId, status: { not: 'VOIDED' }, soldAt: { gte: monthStart } },
        _sum: { total: true, paidAmount: true, creditAmount: true, costOfGoods: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.aggregate({
        where: { tenantId, purchasedAt: { gte: monthStart } },
        _sum: { total: true, paidAmount: true },
        _count: { _all: true },
      }),
      this.prisma.expense.aggregate({
        where: { tenantId, status: { not: 'CANCELLED' }, expenseDate: { gte: monthStart } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.supplierLedger.aggregate({
        where: { tenantId, type: 'PAYMENT_MADE', entryDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.customerLedger.aggregate({
        where: { tenantId, type: 'PAYMENT_RECEIVED', createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
    ]);

    /* ─── Maal ka hisab ─── */
    let stockCost = 0;
    let stockRetail = 0;
    let stockUnits = 0;
    for (const p of products) {
      const s = Number(p.stock) || 0;
      stockUnits += s;
      stockCost += s * (Number(p.costPrice) || 0);
      stockRetail += s * (Number(p.price) || 0);
    }

    /* ─── Golak ─── */
    const cashInHand = openRegisters.reduce((s, r) => s + Number(r.expectedBalance || 0), 0);

    const receivables = Number(customers._sum.balance ?? 0);
    const payables = Number(suppliers._sum.outstandingDue ?? 0);

    /**
     * Dukaan ki kul maliyat — cash + maal + lena, manhaa dena.
     * Ye "kitna kama liya" nahi; ye "abhi kitne ka malik hoon".
     */
    const netWorth = cashInHand + stockCost + receivables - payables;

    /**
     * Kharch karne layak — sirf golak me se wo jo supplier ka
     * nahi hai. Dukaan-daar aksar poora golak apna samajh leta
     * hai aur maal khareed leta hai, phir supplier ka paisa dene
     * ka waqt aata hai to haath khali hota hai.
     */
    const spendable = Math.max(cashInHand - payables, 0);
    const shortfall = Math.max(payables - cashInHand, 0);

    const monthRevenue = Number(monthSales._sum.total ?? 0);
    const monthCogs = Number(monthSales._sum.costOfGoods ?? 0);
    const monthExp = Number(monthExpenses._sum.amount ?? 0);
    const monthGross = monthRevenue - monthCogs;
    const monthNet = monthGross - monthExp;

    const todayRevenue = Number(todaySales._sum.total ?? 0);
    const todayCogs = Number(todaySales._sum.costOfGoods ?? 0);

    return {
      /* ─── Abhi ka haal ─── */
      cashInHand,
      stockCost,
      stockRetail,
      stockUnits,
      /** Maal bik jaye to itna munafa — abhi sirf kaghaz par */
      stockPotentialProfit: stockRetail - stockCost,
      receivables,
      receivableCount: customers._count._all ?? 0,
      payables,
      payableCount: suppliers._count._all ?? 0,
      netWorth,
      spendable,
      shortfall,

      registers: openRegisters.map((r) => ({
        id: r.id,
        registerNumber: r.registerNumber,
        shop: r.shop?.name ?? null,
        openingBalance: Number(r.openingBalance || 0),
        expectedBalance: Number(r.expectedBalance || 0),
        totalSales: Number(r.totalSales || 0),
        totalCashIn: Number(r.totalCashIn || 0),
        totalCashOut: Number(r.totalCashOut || 0),
        totalExpenses: Number(r.totalExpenses || 0),
        openedAt: r.openedAt,
      })),

      /* ─── Aaj ─── */
      today: {
        revenue: todayRevenue,
        paid: Number(todaySales._sum.paidAmount ?? 0),
        credit: Number(todaySales._sum.creditAmount ?? 0),
        cogs: todayCogs,
        profit: todayRevenue - todayCogs,
        bills: todaySales._count._all ?? 0,
      },

      /* ─── Is mahine ─── */
      month: {
        revenue: monthRevenue,
        paid: Number(monthSales._sum.paidAmount ?? 0),
        credit: Number(monthSales._sum.creditAmount ?? 0),
        cogs: monthCogs,
        grossProfit: monthGross,
        expenses: monthExp,
        expenseCount: monthExpenses._count._all ?? 0,
        netProfit: monthNet,
        margin: monthRevenue > 0 ? (monthNet / monthRevenue) * 100 : 0,
        bills: monthSales._count._all ?? 0,
        purchases: Number(monthPurchases._sum.total ?? 0),
        purchasesPaid: Number(monthPurchases._sum.paidAmount ?? 0),
        purchaseCount: monthPurchases._count._all ?? 0,
        supplierPaid: Number(monthSupplierPaid._sum?.amount ?? 0),
        customerRecovered: Number(monthCustomerPaid._sum?.amount ?? 0),
      },
    };
  }

  /* ═══════════════════════════════════════════════════════════
     PAISA KAHAN SE AAYA, KAHAN GAYA
     ═══════════════════════════════════════════════════════════ */
  async flow(user: AuthenticatedUser, from?: string, to?: string) {
    const tenantId = user.tenantId;
    const { from: start, to: end } = this.range(from, to);

    const [sales, purchases, expenses, supplierPaid, customerPaid, expenseByCat] =
      await Promise.all([
        this.prisma.sale.aggregate({
          where: { tenantId, status: { not: 'VOIDED' }, soldAt: { gte: start, lte: end } },
          _sum: { total: true, paidAmount: true, creditAmount: true, costOfGoods: true, discount: true },
          _count: { _all: true },
        }),
        this.prisma.purchase.aggregate({
          where: { tenantId, purchasedAt: { gte: start, lte: end } },
          _sum: { total: true, paidAmount: true },
          _count: { _all: true },
        }),
        this.prisma.expense.aggregate({
          where: { tenantId, status: { not: 'CANCELLED' }, expenseDate: { gte: start, lte: end } },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.supplierLedger.aggregate({
          where: { tenantId, type: 'PAYMENT_MADE', entryDate: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.customerLedger.aggregate({
          where: { tenantId, type: 'PAYMENT_RECEIVED', createdAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.expense.groupBy({
          by: ['categoryId'],
          where: { tenantId, status: { not: 'CANCELLED' }, expenseDate: { gte: start, lte: end } },
          _sum: { amount: true },
          _count: { _all: true },
        }),
      ]);

    /* Kharch ki qismon ke naam */
    const catIds = expenseByCat.map((c) => c.categoryId).filter(Boolean) as string[];
    const cats = catIds.length
      ? await this.prisma.expenseCategory.findMany({
          where: { id: { in: catIds } },
          select: { id: true, name: true, color: true, icon: true },
        })
      : [];
    const catMap = new Map(cats.map((c) => [c.id, c]));

    const salesPaid = Number(sales._sum.paidAmount ?? 0);
    const recovered = Number(customerPaid._sum?.amount ?? 0);
    const purchasesPaid = Number(purchases._sum.paidAmount ?? 0);
    const supplierPayments = Number(supplierPaid._sum?.amount ?? 0);
    const expenseTotal = Number(expenses._sum.amount ?? 0);

    const moneyIn = salesPaid + recovered;
    const moneyOut = purchasesPaid + supplierPayments + expenseTotal;

    return {
      from: start,
      to: end,

      in: {
        /** Bikri par jo cash haath me aaya (udhaar shamil nahi) */
        salesPaid,
        /** Purane udhaar ki wasooli */
        recovered,
        total: moneyIn,
      },
      out: {
        /** Kharidari ke waqt jo turant diya */
        purchasesPaid,
        /** Supplier ko alag se ki gayi adaigi */
        supplierPayments,
        expenses: expenseTotal,
        total: moneyOut,
      },
      net: moneyIn - moneyOut,

      sales: {
        revenue: Number(sales._sum.total ?? 0),
        cogs: Number(sales._sum.costOfGoods ?? 0),
        discount: Number(sales._sum.discount ?? 0),
        credit: Number(sales._sum.creditAmount ?? 0),
        grossProfit: Number(sales._sum.total ?? 0) - Number(sales._sum.costOfGoods ?? 0),
        netProfit: Number(sales._sum.total ?? 0) - Number(sales._sum.costOfGoods ?? 0) - expenseTotal,
        count: sales._count._all ?? 0,
      },
      purchases: {
        total: Number(purchases._sum.total ?? 0),
        paid: purchasesPaid,
        credit: Number(purchases._sum.total ?? 0) - purchasesPaid,
        count: purchases._count._all ?? 0,
      },
      expenseBreakdown: expenseByCat
        .map((c) => ({
          categoryId: c.categoryId,
          name: c.categoryId ? catMap.get(c.categoryId)?.name ?? 'Doosra' : 'Bina qism',
          color: c.categoryId ? catMap.get(c.categoryId)?.color ?? '#64748b' : '#64748b',
          icon: c.categoryId ? catMap.get(c.categoryId)?.icon ?? null : null,
          amount: Number(c._sum.amount ?? 0),
          count: c._count._all,
        }))
        .sort((a, b) => b.amount - a.amount),
    };
  }

  /* ═══════════════════════════════════════════════════════════
     MAHINA BA MAHINA — rujhan
     ═══════════════════════════════════════════════════════════ */
  async trend(user: AuthenticatedUser, months = 12) {
    const tenantId = user.tenantId;
    const n = Math.max(1, Math.min(months, 36));
    const start = startOfMonth(subMonths(new Date(), n - 1));

    const [sales, purchases, expenses] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, status: { not: 'VOIDED' }, soldAt: { gte: start } },
        select: { soldAt: true, total: true, costOfGoods: true, paidAmount: true, creditAmount: true },
      }),
      this.prisma.purchase.findMany({
        where: { tenantId, purchasedAt: { gte: start } },
        select: { purchasedAt: true, total: true, paidAmount: true },
      }),
      this.prisma.expense.findMany({
        where: { tenantId, status: { not: 'CANCELLED' }, expenseDate: { gte: start } },
        select: { expenseDate: true, amount: true },
      }),
    ]);

    const buckets: Record<string, any> = {};
    for (let i = n - 1; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, 'yyyy-MM');
      buckets[key] = {
        month: key,
        label: format(d, 'MMM yy'),
        revenue: 0, cogs: 0, grossProfit: 0,
        expenses: 0, netProfit: 0,
        purchases: 0, purchasesPaid: 0,
        cashIn: 0, credit: 0, bills: 0,
      };
    }

    for (const s of sales) {
      const k = format(s.soldAt, 'yyyy-MM');
      const b = buckets[k];
      if (!b) continue;
      b.revenue += Number(s.total || 0);
      b.cogs += Number(s.costOfGoods || 0);
      b.cashIn += Number(s.paidAmount || 0);
      b.credit += Number(s.creditAmount || 0);
      b.bills += 1;
    }
    for (const p of purchases) {
      const k = format(p.purchasedAt, 'yyyy-MM');
      const b = buckets[k];
      if (!b) continue;
      b.purchases += Number(p.total || 0);
      b.purchasesPaid += Number(p.paidAmount || 0);
    }
    for (const e of expenses) {
      const k = format(e.expenseDate, 'yyyy-MM');
      const b = buckets[k];
      if (!b) continue;
      b.expenses += Number(e.amount || 0);
    }

    for (const b of Object.values(buckets) as any[]) {
      b.grossProfit = b.revenue - b.cogs;
      b.netProfit = b.grossProfit - b.expenses;
      b.margin = b.revenue > 0 ? (b.netProfit / b.revenue) * 100 : 0;
    }

    return Object.values(buckets);
  }

  /* ═══════════════════════════════════════════════════════════
     ROZANA — chune hue daire ka
     ═══════════════════════════════════════════════════════════ */
  async daily(user: AuthenticatedUser, from?: string, to?: string) {
    const tenantId = user.tenantId;
    const { from: start, to: end } = this.range(from, to);

    const [sales, purchases, expenses] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, status: { not: 'VOIDED' }, soldAt: { gte: start, lte: end } },
        select: { soldAt: true, total: true, costOfGoods: true, paidAmount: true },
      }),
      this.prisma.purchase.findMany({
        where: { tenantId, purchasedAt: { gte: start, lte: end } },
        select: { purchasedAt: true, paidAmount: true },
      }),
      this.prisma.expense.findMany({
        where: { tenantId, status: { not: 'CANCELLED' }, expenseDate: { gte: start, lte: end } },
        select: { expenseDate: true, amount: true },
      }),
    ]);

    const buckets: Record<string, any> = {};
    const days = Math.min(
      Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1,
      120,
    );
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(end, i);
      const key = format(d, 'yyyy-MM-dd');
      buckets[key] = {
        date: key,
        label: format(d, 'd MMM'),
        revenue: 0, cogs: 0, profit: 0, cashIn: 0, out: 0, bills: 0,
      };
    }

    for (const s of sales) {
      const b = buckets[format(s.soldAt, 'yyyy-MM-dd')];
      if (!b) continue;
      b.revenue += Number(s.total || 0);
      b.cogs += Number(s.costOfGoods || 0);
      b.cashIn += Number(s.paidAmount || 0);
      b.bills += 1;
    }
    for (const p of purchases) {
      const b = buckets[format(p.purchasedAt, 'yyyy-MM-dd')];
      if (b) b.out += Number(p.paidAmount || 0);
    }
    for (const e of expenses) {
      const b = buckets[format(e.expenseDate, 'yyyy-MM-dd')];
      if (b) b.out += Number(e.amount || 0);
    }
    for (const b of Object.values(buckets) as any[]) b.profit = b.revenue - b.cogs;

    return Object.values(buckets);
  }
}
