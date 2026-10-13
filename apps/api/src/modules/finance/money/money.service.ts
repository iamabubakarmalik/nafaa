/**
 * Shop accounts: where the shop's money is and how it moved.
 *
 * Accounts are the payment methods (cash, bank transfer, card, JazzCash,
 * Easypaisa). Every movement is read from the record that caused it, so the
 * figures always agree with Sales, Returns, Khata, Purchases, Suppliers,
 * Expenses and the cash register:
 *
 *   in   SALE      money taken on a bill (paid minus change)
 *        KHATA     customer credit collected (no method is stored; counted as cash)
 *        CASH_IN   cash put into the drawer
 *   out  REFUND    money given back on a return
 *        PURCHASE  paid to a supplier on the purchase itself
 *        SUPPLIER  later supplier payment (no method on old rows; counted as cash)
 *        EXPENSE   paid expenses
 *        CASH_OUT  cash taken out of the drawer
 *
 * Every read is tenant- and branch-scoped, and periods are business days in
 * the shop's own timezone.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { netProfit, paidExpenses, saleFigures, writeOffs } from '../../../common/helpers/business-math.helper';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import {
  businessDayKey, startOfBusinessDayTz, startOfBusinessMonthTz,
} from '../../../common/helpers/business-time.helper';
import { periodRange } from '../../inventory/taxonomy/taxonomy.helper';
import { computeLiveCash } from '../../../common/helpers/live-cash.helper';
import { MONEY_SOURCES, MoneyLedgerDto, MoneyPeriodDto, MoneySource } from './dto/money-query.dto';

type Range = { gte: Date; lt: Date };
type Dir = 'in' | 'out';

const METHODS: PaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'CARD', 'JAZZCASH', 'EASYPAISA'];
const DIRECTION: Record<MoneySource, Dir> = {
  SALE: 'in', KHATA: 'in', CASH_IN: 'in',
  REFUND: 'out', PURCHASE: 'out', SUPPLIER: 'out', EXPENSE: 'out', CASH_OUT: 'out',
};
/** Sources with no payment method of their own; they belong to the cash account. */
const CASH_ONLY: MoneySource[] = ['KHATA', 'CASH_IN', 'CASH_OUT'];
/** Statements and the ledger merge sources page by page; this caps how deep one can go. */
const MAX_DEPTH = 2000;
const DAY = 86_400_000;

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const like = (q: string) => ({ contains: q, mode: 'insensitive' as const });

interface Ctx {
  tenantId: string;
  shop: ShopScope;
  range?: Range;
  account?: PaymentMethod;
  search?: string;
}

export interface MoneyEntry {
  id: string;
  source: MoneySource;
  direction: Dir;
  method: PaymentMethod;
  amount: number;
  at: Date;
  reference: string | null;
  party: string | null;
  note: string | null;
  shopId: string | null;
  by: string | null;
  /** Id of the bill, purchase, customer or supplier the row opens. */
  linkId: string | null;
}

interface Totals { amount: number; count: number }
type MethodTotals = Map<PaymentMethod, Totals>;

@Injectable()
export class MoneyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /* ═════════════════════════ where clauses ═════════════════════════ */

  /** Supplier and customer ledger rows from before branches were tagged count everywhere. */
  private loose(shop: ShopScope) {
    return shop.shopId ? { OR: [{ shopId: shop.shopId }, { shopId: null }] } : {};
  }

  private saleWhere(c: Ctx): Prisma.SaleWhereInput {
    return {
      tenantId: c.tenantId, ...c.shop.where, status: { not: 'VOIDED' }, paidAmount: { gt: 0 },
      ...(c.range && { soldAt: c.range }),
      ...(c.account && { paymentMethod: c.account }),
      ...(c.search && { OR: [{ saleNumber: like(c.search) }, { customer: { name: like(c.search) } }, { customer: { phone: like(c.search) } }] }),
    };
  }

  private refundWhere(c: Ctx): Prisma.SaleReturnWhereInput {
    return {
      tenantId: c.tenantId, refundAmount: { gt: 0 },
      ...(c.shop.shopId && { sale: { shopId: c.shop.shopId } }),
      ...(c.range && { returnedAt: c.range }),
      ...(c.account && { refundMethod: c.account }),
      ...(c.search && { OR: [{ returnNumber: like(c.search) }, { sale: { saleNumber: like(c.search) } }, { sale: { customer: { name: like(c.search) } } }, { reason: like(c.search) }] }),
    };
  }

  private khataWhere(c: Ctx): Prisma.CustomerLedgerWhereInput {
    return {
      tenantId: c.tenantId, type: 'PAYMENT_RECEIVED', ...this.loose(c.shop),
      ...(c.range && { createdAt: c.range }),
      ...(c.search && { AND: [{ OR: [{ customer: { name: like(c.search) } }, { customer: { phone: like(c.search) } }, { reference: like(c.search) }, { note: like(c.search) }] }] }),
    };
  }

  private drawerWhere(c: Ctx, type: 'CASH_IN' | 'CASH_OUT'): Prisma.CashTransactionWhereInput {
    return {
      tenantId: c.tenantId, type,
      ...(c.shop.shopId && { cashRegister: { shopId: c.shop.shopId } }),
      ...(c.range && { createdAt: c.range }),
      ...(c.search && { OR: [{ reason: like(c.search) }, { note: like(c.search) }, { reference: like(c.search) }] }),
    };
  }

  private purchaseWhere(c: Ctx): Prisma.PurchaseWhereInput {
    return {
      tenantId: c.tenantId, ...c.shop.where, status: { not: 'CANCELLED' }, paidAmount: { gt: 0 },
      ...(c.range && { purchasedAt: c.range }),
      ...(c.account && { paymentMethod: c.account }),
      ...(c.search && { OR: [{ purchaseNumber: like(c.search) }, { supplierInvoiceNo: like(c.search) }, { supplier: { name: like(c.search) } }] }),
    };
  }

  private supplierWhere(c: Ctx): Prisma.SupplierLedgerWhereInput {
    const and: Prisma.SupplierLedgerWhereInput[] = [];
    if (c.shop.shopId) and.push(this.loose(c.shop));
    // Old payments carry no method; the cash register counts them as cash.
    if (c.account === 'CASH') and.push({ OR: [{ paymentMethod: 'CASH' }, { paymentMethod: null }] });
    else if (c.account) and.push({ paymentMethod: c.account });
    if (c.search) and.push({ OR: [{ supplier: { name: like(c.search) } }, { reference: like(c.search) }, { note: like(c.search) }] });
    return {
      tenantId: c.tenantId, type: 'PAYMENT_MADE',
      ...(c.range && { entryDate: c.range }),
      ...(and.length && { AND: and }),
    };
  }

  private expenseWhere(c: Ctx): Prisma.ExpenseWhereInput {
    return {
      tenantId: c.tenantId, ...c.shop.where, status: 'PAID',
      ...(c.range && { expenseDate: c.range }),
      ...(c.account && { paymentMethod: c.account }),
      ...(c.search && { OR: [{ title: like(c.search) }, { expenseNumber: like(c.search) }, { description: like(c.search) }, { category: { name: like(c.search) } }] }),
    };
  }

  /** Sources that can hold rows for the chosen account. */
  private sourcesFor(account?: PaymentMethod, only?: MoneySource, direction?: Dir): MoneySource[] {
    return MONEY_SOURCES.filter((s) =>
      (!only || s === only) && (!direction || DIRECTION[s] === direction) && (!account || account === 'CASH' || !CASH_ONLY.includes(s)));
  }

  /* ═════════════════════════ totals ═════════════════════════ */

  /** Sum and count of one source, split by account. */
  private async sourceTotals(c: Ctx, s: MoneySource): Promise<MethodTotals> {
    const out: MethodTotals = new Map();
    const add = (m: PaymentMethod | null, amount: number, count: number) => {
      const k = m ?? 'CASH';
      const cur = out.get(k) ?? { amount: 0, count: 0 };
      cur.amount += amount; cur.count += count;
      out.set(k, cur);
    };
    switch (s) {
      case 'SALE':
        for (const g of await this.prisma.sale.groupBy({ by: ['paymentMethod'], where: this.saleWhere(c), _sum: { paidAmount: true, changeAmount: true }, _count: { _all: true } }))
          add(g.paymentMethod, n(g._sum.paidAmount) - n(g._sum.changeAmount), g._count._all);
        break;
      case 'REFUND':
        for (const g of await this.prisma.saleReturn.groupBy({ by: ['refundMethod'], where: this.refundWhere(c), _sum: { refundAmount: true }, _count: { _all: true } }))
          add(g.refundMethod, n(g._sum.refundAmount), g._count._all);
        break;
      case 'PURCHASE':
        for (const g of await this.prisma.purchase.groupBy({ by: ['paymentMethod'], where: this.purchaseWhere(c), _sum: { paidAmount: true }, _count: { _all: true } }))
          add(g.paymentMethod, n(g._sum.paidAmount), g._count._all);
        break;
      case 'SUPPLIER':
        for (const g of await this.prisma.supplierLedger.groupBy({ by: ['paymentMethod'], where: this.supplierWhere(c), _sum: { amount: true }, _count: { _all: true } }))
          add(g.paymentMethod, n(g._sum.amount), g._count._all);
        break;
      case 'EXPENSE':
        for (const g of await this.prisma.expense.groupBy({ by: ['paymentMethod'], where: this.expenseWhere(c), _sum: { amount: true }, _count: { _all: true } }))
          add(g.paymentMethod, n(g._sum.amount), g._count._all);
        break;
      case 'KHATA': {
        const a = await this.prisma.customerLedger.aggregate({ where: this.khataWhere(c), _sum: { amount: true }, _count: { _all: true } });
        // Collections are stored as negative amounts (they lower the balance).
        if (a._count._all) add('CASH', Math.abs(n(a._sum.amount)), a._count._all);
        break;
      }
      case 'CASH_IN':
      case 'CASH_OUT': {
        const a = await this.prisma.cashTransaction.aggregate({ where: this.drawerWhere(c, s), _sum: { amount: true }, _count: { _all: true } });
        if (a._count._all) add('CASH', n(a._sum.amount), a._count._all);
        break;
      }
    }
    return out;
  }

  /** In and out per account and per source for one period. */
  private async totals(c: Ctx) {
    const sources = this.sourcesFor(c.account);
    const all = await Promise.all(sources.map(async (s) => [s, await this.sourceTotals(c, s)] as const));
    const accounts = new Map(METHODS.map((m) => [m, { in: 0, out: 0, count: 0 }]));
    const bySource = all.map(([source, map]) => {
      let amount = 0; let count = 0;
      for (const [m, t] of map) {
        if (c.account && m !== c.account) continue;
        const a = accounts.get(m)!;
        a[DIRECTION[source]] += t.amount; a.count += t.count;
        amount += t.amount; count += t.count;
      }
      return { source, direction: DIRECTION[source], amount: r2(amount), count };
    });
    const list = METHODS.filter((m) => !c.account || m === c.account).map((method) => {
      const a = accounts.get(method)!;
      return { method, in: r2(a.in), out: r2(a.out), net: r2(a.in - a.out), count: a.count };
    });
    const moneyIn = list.reduce((s, a) => s + a.in, 0);
    const moneyOut = list.reduce((s, a) => s + a.out, 0);
    return { accounts: list, bySource, in: r2(moneyIn), out: r2(moneyOut), net: r2(moneyIn - moneyOut) };
  }

  private async period(tenantId: string, q: { from?: string; to?: string }): Promise<Range> {
    const r = await periodRange(this.tz, tenantId, q.from, q.to);
    if (r.gte >= r.lt) throw new BadRequestException('"Se" ki tareekh "Tak" se pehle honi chahiye');
    return r;
  }

  private async today(tenantId: string): Promise<Range> {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const gte = startOfBusinessDayTz(new Date(), tz, dayStartHour);
    return { gte, lt: new Date(gte.getTime() + DAY) };
  }

  /* ═════════════════════════ cash in the drawer ═════════════════════════ */

  /**
   * Cash that should be in each open drawer of the branch right now: the
   * opening float plus every cash movement since it was opened (live-cash.helper).
   */
  private async drawers(tenantId: string, shop: ShopScope) {
    const registers = await this.prisma.cashRegister.findMany({
      where: { tenantId, status: 'OPEN', ...shop.where },
      select: {
        id: true, shopId: true, registerNumber: true, openingBalance: true, openedAt: true,
        shop: { select: { id: true, name: true } }, openedBy: { select: { fullName: true } },
      },
      orderBy: { openedAt: 'asc' },
    });
    return Promise.all(registers.map(async (r) => {
      const live = await computeLiveCash(this.prisma, tenantId, r);
      return {
        id: r.id, registerNumber: r.registerNumber, shop: r.shop ? { id: r.shop.id, name: r.shop.name } : null,
        openedAt: r.openedAt, openedBy: r.openedBy?.fullName ?? null,
        opening: live.openingBalance, sales: live.cashSales, khata: live.khataReceived, cashIn: live.cashIn, cashOut: live.cashOut,
        refunds: live.returns, purchases: live.purchases, suppliers: live.supplierPaid, expenses: live.expenses,
        bookings: r2(live.bookingReceived - live.bookingRefunds),
        expected: live.expected,
      };
    }));
  }

  /* ═════════════════════════ endpoints ═════════════════════════ */

  /**
   * The account cards: in, out and net per account for the period and for
   * today, plus the cash that should be in the open drawers.
   */
  async accounts(user: AuthenticatedUser, shop: ShopScope, q: MoneyPeriodDto) {
    const tenantId = user.tenantId;
    const [range, todayRange] = await Promise.all([this.period(tenantId, q), this.today(tenantId)]);
    const [period, today, drawers] = await Promise.all([
      this.totals({ tenantId, shop, range, account: q.account }),
      this.totals({ tenantId, shop, range: todayRange, account: q.account }),
      this.drawers(tenantId, shop),
    ]);
    const todayBy = new Map(today.accounts.map((a) => [a.method, a]));
    return {
      from: range.gte,
      to: new Date(range.lt.getTime() - 1),
      accounts: period.accounts.map((a) => ({ ...a, todayIn: todayBy.get(a.method)?.in ?? 0, todayOut: todayBy.get(a.method)?.out ?? 0 })),
      bySource: period.bySource,
      totals: { in: period.in, out: period.out, net: period.net, todayIn: today.in, todayOut: today.out },
      cash: { inHand: r2(drawers.reduce((s, d) => s + d.expected, 0)), drawers },
    };
  }

  /** Every movement in the period, newest first, across all sources. */
  async ledger(user: AuthenticatedUser, shop: ShopScope, q: MoneyLedgerDto) {
    const tenantId = user.tenantId;
    const range = await this.period(tenantId, q);
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const depth = page * limit;
    if (depth > MAX_DEPTH) throw new BadRequestException('Itna peeche jane ke liye muddat chhoti karein ya filter lagayein');

    const c: Ctx = { tenantId, shop, range, account: q.account, search: q.search?.trim() || undefined };
    const sources = this.sourcesFor(q.account, q.source, q.direction);
    const [lists, sums, shops] = await Promise.all([
      Promise.all(sources.map((s) => this.entries(c, s, depth))),
      Promise.all(sources.map(async (s) => [s, await this.sourceTotals(c, s)] as const)),
      this.prisma.shop.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    ]);
    const shopName = new Map(shops.map((s) => [s.id, s.name]));

    let moneyIn = 0; let moneyOut = 0; let total = 0;
    for (const [s, map] of sums) {
      for (const [m, t] of map) {
        if (q.account && m !== q.account) continue;
        if (DIRECTION[s] === 'in') moneyIn += t.amount; else moneyOut += t.amount;
        total += t.count;
      }
    }

    const items = lists.flat()
      .sort((a, b) => b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id))
      .slice((page - 1) * limit, depth)
      .map((e) => ({ ...e, shop: e.shopId ? { id: e.shopId, name: shopName.get(e.shopId) ?? '' } : null }));

    return {
      items,
      total,
      page,
      pages: Math.max(1, Math.ceil(Math.min(total, MAX_DEPTH) / limit)),
      totals: { in: r2(moneyIn), out: r2(moneyOut), net: r2(moneyIn - moneyOut) },
    };
  }

  /** Newest `take` rows of one source as ledger entries. */
  private async entries(c: Ctx, s: MoneySource, take: number): Promise<MoneyEntry[]> {
    const dir = DIRECTION[s];
    const e = (x: Omit<MoneyEntry, 'source' | 'direction'>): MoneyEntry => ({ ...x, source: s, direction: dir, amount: r2(x.amount) });
    switch (s) {
      case 'SALE':
        return (await this.prisma.sale.findMany({
          where: this.saleWhere(c), orderBy: { soldAt: 'desc' }, take,
          select: {
            id: true, saleNumber: true, paidAmount: true, changeAmount: true, paymentMethod: true, soldAt: true, shopId: true,
            customer: { select: { name: true } }, soldBy: { select: { fullName: true } }, createdBy: { select: { fullName: true } },
          },
        })).map((r) => e({
          id: `SALE:${r.id}`, method: r.paymentMethod, amount: n(r.paidAmount) - n(r.changeAmount), at: r.soldAt,
          reference: r.saleNumber, party: r.customer?.name ?? null, note: null, shopId: r.shopId,
          by: r.soldBy?.fullName ?? r.createdBy?.fullName ?? null, linkId: r.id,
        }));
      case 'REFUND':
        return (await this.prisma.saleReturn.findMany({
          where: this.refundWhere(c), orderBy: { returnedAt: 'desc' }, take,
          select: {
            id: true, returnNumber: true, refundAmount: true, refundMethod: true, reason: true, returnedAt: true, shopId: true, saleId: true,
            sale: { select: { saleNumber: true, shopId: true, customer: { select: { name: true } } } }, createdBy: { select: { fullName: true } },
          },
        })).map((r) => e({
          id: `REFUND:${r.id}`, method: r.refundMethod, amount: n(r.refundAmount), at: r.returnedAt,
          reference: `${r.returnNumber} · ${r.sale.saleNumber}`, party: r.sale.customer?.name ?? null, note: r.reason,
          shopId: r.shopId ?? r.sale.shopId, by: r.createdBy?.fullName ?? null, linkId: r.saleId,
        }));
      case 'KHATA':
        return (await this.prisma.customerLedger.findMany({
          where: this.khataWhere(c), orderBy: { createdAt: 'desc' }, take,
          select: {
            id: true, amount: true, reference: true, note: true, createdAt: true, shopId: true, customerId: true,
            customer: { select: { name: true } }, createdBy: { select: { fullName: true } },
          },
        })).map((r) => e({
          id: `KHATA:${r.id}`, method: 'CASH', amount: Math.abs(n(r.amount)), at: r.createdAt,
          reference: r.reference, party: r.customer.name, note: r.note, shopId: r.shopId, by: r.createdBy?.fullName ?? null, linkId: r.customerId,
        }));
      case 'CASH_IN':
      case 'CASH_OUT':
        return (await this.prisma.cashTransaction.findMany({
          where: this.drawerWhere(c, s), orderBy: { createdAt: 'desc' }, take,
          select: {
            id: true, amount: true, reason: true, note: true, reference: true, createdAt: true,
            cashRegister: { select: { registerNumber: true, shopId: true } }, createdBy: { select: { fullName: true } },
          },
        })).map((r) => e({
          id: `${s}:${r.id}`, method: 'CASH', amount: n(r.amount), at: r.createdAt,
          reference: r.reference ?? r.cashRegister.registerNumber, party: r.reason, note: r.note,
          shopId: r.cashRegister.shopId, by: r.createdBy?.fullName ?? null, linkId: null,
        }));
      case 'PURCHASE':
        return (await this.prisma.purchase.findMany({
          where: this.purchaseWhere(c), orderBy: { purchasedAt: 'desc' }, take,
          select: {
            id: true, purchaseNumber: true, supplierInvoiceNo: true, paidAmount: true, paymentMethod: true, purchasedAt: true, shopId: true,
            supplier: { select: { name: true } }, createdBy: { select: { fullName: true } },
          },
        })).map((r) => e({
          id: `PURCHASE:${r.id}`, method: r.paymentMethod, amount: n(r.paidAmount), at: r.purchasedAt,
          reference: r.supplierInvoiceNo ? `${r.purchaseNumber} · ${r.supplierInvoiceNo}` : r.purchaseNumber,
          party: r.supplier.name, note: null, shopId: r.shopId, by: r.createdBy?.fullName ?? null, linkId: r.id,
        }));
      case 'SUPPLIER':
        return (await this.prisma.supplierLedger.findMany({
          where: this.supplierWhere(c), orderBy: { entryDate: 'desc' }, take,
          select: { id: true, amount: true, paymentMethod: true, reference: true, note: true, entryDate: true, shopId: true, supplierId: true, supplier: { select: { name: true } } },
        })).map((r) => e({
          id: `SUPPLIER:${r.id}`, method: r.paymentMethod ?? 'CASH', amount: n(r.amount), at: r.entryDate,
          reference: r.reference, party: r.supplier.name, note: r.note, shopId: r.shopId, by: null, linkId: r.supplierId,
        }));
      case 'EXPENSE':
        return (await this.prisma.expense.findMany({
          where: this.expenseWhere(c), orderBy: { expenseDate: 'desc' }, take,
          select: {
            id: true, expenseNumber: true, title: true, amount: true, paymentMethod: true, expenseDate: true, shopId: true, description: true,
            category: { select: { name: true } }, createdBy: { select: { fullName: true } },
          },
        })).map((r) => e({
          id: `EXPENSE:${r.id}`, method: r.paymentMethod, amount: n(r.amount), at: r.expenseDate,
          reference: r.expenseNumber, party: r.category ? `${r.title} · ${r.category.name}` : r.title, note: r.description,
          shopId: r.shopId, by: r.createdBy?.fullName ?? null, linkId: r.id,
        }));
    }
  }

  /**
   * In and out by business day (by month past 92 days), by source and by
   * account, and paid expenses by category.
   */
  async analytics(user: AuthenticatedUser, shop: ShopScope, q: MoneyPeriodDto) {
    const tenantId = user.tenantId;
    const range = await this.period(tenantId, q);
    if (range.lt.getTime() - range.gte.getTime() > 366 * DAY) throw new BadRequestException('Analytics ek saal tak ki muddat ke liye hai');
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const monthly = range.lt.getTime() - range.gte.getTime() > 92 * DAY;
    const keyOf = (d: Date) => {
      const k = businessDayKey(d, tz, dayStartHour);
      return monthly ? k.slice(0, 7) : k;
    };

    const c: Ctx = { tenantId, shop, range, account: q.account };
    const sources = this.sourcesFor(q.account);
    const [summary, rows, cats] = await Promise.all([
      this.totals(c),
      Promise.all(sources.map((s) => this.points(c, s))),
      sources.includes('EXPENSE')
        ? this.prisma.expense.groupBy({ by: ['categoryId'], where: this.expenseWhere(c), _sum: { amount: true }, _count: { _all: true } })
        : Promise.resolve([]),
    ]);

    // Every bucket in the range, so quiet days show as zero.
    const buckets = new Map<string, { key: string; in: number; out: number }>();
    for (let t = range.gte.getTime(); t < range.lt.getTime(); t += DAY) {
      const k = keyOf(new Date(t + 3_600_000));
      if (!buckets.has(k)) buckets.set(k, { key: k, in: 0, out: 0 });
    }
    sources.forEach((s, i) => {
      for (const p of rows[i]) {
        const k = keyOf(p.at);
        const b = buckets.get(k) ?? { key: k, in: 0, out: 0 };
        b[DIRECTION[s]] += p.amount;
        buckets.set(k, b);
      }
    });

    const catIds = cats.map((x) => x.categoryId).filter((x): x is string => !!x);
    const catRows = catIds.length
      ? await this.prisma.expenseCategory.findMany({ where: { id: { in: catIds }, tenantId }, select: { id: true, name: true, color: true } })
      : [];
    const catMap = new Map(catRows.map((x) => [x.id, x]));

    return {
      from: range.gte,
      to: new Date(range.lt.getTime() - 1),
      grouping: monthly ? 'month' : 'day',
      trend: [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key)).map((b) => ({ key: b.key, in: r2(b.in), out: r2(b.out), net: r2(b.in - b.out) })),
      bySource: summary.bySource,
      byAccount: summary.accounts,
      totals: { in: summary.in, out: summary.out, net: summary.net },
      expenseCategories: cats
        .map((x) => ({
          id: x.categoryId,
          name: x.categoryId ? catMap.get(x.categoryId)?.name ?? 'Doosra' : 'Bina qism',
          color: (x.categoryId && catMap.get(x.categoryId)?.color) || '#64748b',
          amount: r2(n(x._sum.amount)),
          count: x._count._all,
        }))
        .sort((a, b) => b.amount - a.amount),
    };
  }

  /** Date and amount of every row of one source, for the trend. */
  private async points(c: Ctx, s: MoneySource): Promise<Array<{ at: Date; amount: number }>> {
    switch (s) {
      case 'SALE':
        return (await this.prisma.sale.findMany({ where: this.saleWhere(c), select: { soldAt: true, paidAmount: true, changeAmount: true } }))
          .map((r) => ({ at: r.soldAt, amount: n(r.paidAmount) - n(r.changeAmount) }));
      case 'REFUND':
        return (await this.prisma.saleReturn.findMany({ where: this.refundWhere(c), select: { returnedAt: true, refundAmount: true } }))
          .map((r) => ({ at: r.returnedAt, amount: n(r.refundAmount) }));
      case 'KHATA':
        return (await this.prisma.customerLedger.findMany({ where: this.khataWhere(c), select: { createdAt: true, amount: true } }))
          .map((r) => ({ at: r.createdAt, amount: Math.abs(n(r.amount)) }));
      case 'CASH_IN':
      case 'CASH_OUT':
        return (await this.prisma.cashTransaction.findMany({ where: this.drawerWhere(c, s), select: { createdAt: true, amount: true } }))
          .map((r) => ({ at: r.createdAt, amount: n(r.amount) }));
      case 'PURCHASE':
        return (await this.prisma.purchase.findMany({ where: this.purchaseWhere(c), select: { purchasedAt: true, paidAmount: true } }))
          .map((r) => ({ at: r.purchasedAt, amount: n(r.paidAmount) }));
      case 'SUPPLIER':
        return (await this.prisma.supplierLedger.findMany({ where: this.supplierWhere(c), select: { entryDate: true, amount: true } }))
          .map((r) => ({ at: r.entryDate, amount: n(r.amount) }));
      case 'EXPENSE':
        return (await this.prisma.expense.findMany({ where: this.expenseWhere(c), select: { expenseDate: true, amount: true } }))
          .map((r) => ({ at: r.expenseDate, amount: n(r.amount) }));
    }
  }

  /**
   * What the shop owns and owes right now: cash in the drawers, stock at
   * cost, customer credit and supplier dues, plus today and this month.
   */
  async position(user: AuthenticatedUser, shop: ShopScope) {
    const tenantId = user.tenantId;
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const now = new Date();
    const todayStart = startOfBusinessDayTz(now, tz, dayStartHour);
    const dayKey = businessDayKey(now, tz, dayStartHour);
    const [y, m] = dayKey.split('-').map(Number);
    const monthStart = startOfBusinessMonthTz(y, m, tz, dayStartHour);
    const month: Range = { gte: monthStart, lt: new Date(now.getTime() + 60_000) };
    const today: Range = { gte: todayStart, lt: new Date(now.getTime() + 60_000) };
    const math = { tenantId, shopId: shop.shopId };

    const [drawers, stock, receivable, payable, todaySales, monthSales, monthPurchases, monthExpenses, monthOut, monthIn, monthLost] = await Promise.all([
      this.drawers(tenantId, shop),
      this.prisma.shopStock.findMany({
        where: { tenantId, ...shop.where, stock: { gt: 0 }, product: { isActive: true } },
        select: { stock: true, shopCostPrice: true, shopPrice: true, product: { select: { costPrice: true, price: true } }, variant: { select: { costPrice: true, price: true } } },
      }),
      this.receivables(tenantId, shop),
      this.payables(tenantId, shop),
      saleFigures(this.prisma, math, today),
      saleFigures(this.prisma, math, month),
      this.prisma.purchase.aggregate({
        where: { tenantId, ...shop.where, status: { in: ['RECEIVED', 'PARTIAL'] }, purchasedAt: month },
        _sum: { receivedValue: true, paidAmount: true }, _count: { _all: true },
      }),
      paidExpenses(this.prisma, math, month),
      this.sourceTotals({ tenantId, shop, range: month }, 'SUPPLIER'),
      this.sourceTotals({ tenantId, shop, range: month }, 'KHATA'),
      writeOffs(this.prisma, math, month),
    ]);

    let stockCost = 0; let stockRetail = 0; let stockUnits = 0;
    for (const s of stock) {
      const q = n(s.stock);
      stockUnits += q;
      stockCost += q * n(s.shopCostPrice ?? s.variant?.costPrice ?? s.product.costPrice);
      stockRetail += q * n(s.shopPrice ?? s.variant?.price ?? s.product.price);
    }

    const cashInHand = drawers.reduce((s, d) => s + d.expected, 0);
    const netWorth = cashInHand + stockCost + receivable.amount - payable.amount;
    const sum = (map: MethodTotals) => [...map.values()].reduce((s, t) => s + t.amount, 0);

    // Sales net of returns on the bill's own day; profit by business-math.helper.
    const mRevenue = monthSales.net;
    const mExpenses = monthExpenses.amount;
    const mNet = netProfit(monthSales.grossProfit, mExpenses, monthLost.net);

    return {
      cashInHand: r2(cashInHand),
      stockCost: r2(stockCost),
      stockRetail: r2(stockRetail),
      stockUnits,
      stockPotentialProfit: r2(stockRetail - stockCost),
      receivables: r2(receivable.amount),
      receivableCount: receivable.count,
      payables: r2(payable.amount),
      payableCount: payable.count,
      netWorth: r2(netWorth),
      /** Drawer cash that is not owed to suppliers. */
      spendable: r2(Math.max(cashInHand - payable.amount, 0)),
      shortfall: r2(Math.max(payable.amount - cashInHand, 0)),
      registers: drawers.map((d) => ({
        id: d.id, registerNumber: d.registerNumber, shop: d.shop?.name ?? null,
        openingBalance: d.opening, expectedBalance: d.expected,
        totalSales: d.sales, totalCashIn: d.cashIn, totalCashOut: d.cashOut, totalExpenses: d.expenses,
        openedAt: d.openedAt,
      })),
      today: {
        revenue: todaySales.net,
        paid: todaySales.cashIn,
        credit: todaySales.credit,
        cogs: todaySales.cost,
        profit: todaySales.grossProfit,
        bills: todaySales.bills,
      },
      month: {
        revenue: mRevenue,
        paid: monthSales.cashIn,
        credit: monthSales.credit,
        cogs: monthSales.cost,
        grossProfit: monthSales.grossProfit,
        expenses: mExpenses,
        expenseCount: monthExpenses.count,
        netProfit: mNet,
        margin: mRevenue > 0 ? r2((mNet / mRevenue) * 100) : 0,
        bills: monthSales.bills,
        purchases: r2(n(monthPurchases._sum.receivedValue)),
        purchasesPaid: r2(n(monthPurchases._sum.paidAmount)),
        purchaseCount: monthPurchases._count._all,
        supplierPaid: r2(sum(monthOut)),
        customerRecovered: r2(sum(monthIn)),
      },
    };
  }

  /** Customer credit still to collect, for the branch (from its ledger) or the whole business. */
  private async receivables(tenantId: string, shop: ShopScope): Promise<Totals> {
    if (!shop.shopId) {
      const a = await this.prisma.customer.aggregate({ where: { tenantId, balance: { gt: 0 } }, _sum: { balance: true }, _count: { _all: true } });
      return { amount: n(a._sum.balance), count: a._count._all };
    }
    const rows = await this.prisma.customerLedger.groupBy({ by: ['customerId'], where: { tenantId, shopId: shop.shopId }, _sum: { amount: true } });
    const owing = rows.map((r) => n(r._sum.amount)).filter((v) => v > 0.005);
    return { amount: owing.reduce((s, v) => s + v, 0), count: owing.length };
  }

  /** Supplier dues, for the branch (from its ledger) or the whole business. */
  private async payables(tenantId: string, shop: ShopScope): Promise<Totals> {
    if (!shop.shopId) {
      const a = await this.prisma.supplier.aggregate({ where: { tenantId, outstandingDue: { gt: 0 } }, _sum: { outstandingDue: true }, _count: { _all: true } });
      return { amount: n(a._sum.outstandingDue), count: a._count._all };
    }
    const rows = await this.prisma.supplierLedger.groupBy({ by: ['supplierId', 'type'], where: { tenantId, shopId: shop.shopId }, _sum: { amount: true } });
    const due = new Map<string, number>();
    for (const r of rows) {
      const v = n(r._sum.amount);
      const signed = r.type === 'PAYMENT_MADE' || r.type === 'PURCHASE_RETURN' ? -v : v;
      due.set(r.supplierId, (due.get(r.supplierId) ?? 0) + signed);
    }
    const owing = [...due.values()].filter((v) => v > 0.005);
    return { amount: owing.reduce((s, v) => s + v, 0), count: owing.length };
  }
}
