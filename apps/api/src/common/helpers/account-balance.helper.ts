/**
 * Balance of a money account (safe, bank account, mobile wallet). Every
 * screen that shows an account balance reads it from here.
 *
 *   balance = opening balance (on the opening date)
 *           + automatic money since the opening date
 *           + manual entries
 *
 * Automatic money is counted only on the default account of a non-cash
 * payment method (bank transfer, card, JazzCash, Easypaisa). Cash belongs to
 * the drawer (live-cash.helper), so a safe moves only by manual entries.
 *
 *   in   SALE            payment rows of the method on bills (booking bills excluded);
 *                        a split bill sends each part to its own account
 *        KHATA           khata collections paid by the method (booking lines excluded)
 *        BOOKING         booking advances and later payments of the method
 *   out  BOOKING_REFUND  cancelled booking advances returned by the method
 *        REFUND          returns paid back by the method, payout only (the part
 *                        that just cleared the customer's udhaar is left out),
 *                        at the return's own branch (else the bill's branch)
 *        PURCHASE        paid by the method on the purchase itself
 *        SUPPLIER        later supplier payments made by the method
 *        EXPENSE         paid expenses of the method
 *
 * Khata collections without a method (older rows) are drawer cash and never
 * land here. TRADE_IN is goods, not money: no account takes it.
 *
 * Manual entries: DEPOSIT and TRANSFER_IN add, WITHDRAW and TRANSFER_OUT
 * subtract, ADJUSTMENT carries its own sign.
 *
 * Branches: a branch's default account takes that branch's money. A
 * business-wide default (no branch) takes the money of every branch that has
 * no default of its own for the method, plus rows with no branch.
 */

import { MoneyEntryType, PaymentMethod, Prisma } from '@prisma/client';
import { NOT_BOOKING_LINE } from './live-cash.helper';

type Db = Prisma.TransactionClient;

export const AUTO_SOURCES = ['SALE', 'KHATA', 'BOOKING', 'BOOKING_REFUND', 'REFUND', 'PURCHASE', 'SUPPLIER', 'EXPENSE'] as const;
export type AutoSource = (typeof AUTO_SOURCES)[number];
export const AUTO_DIRECTION: Record<AutoSource, 'in' | 'out'> = {
  SALE: 'in', KHATA: 'in', BOOKING: 'in', BOOKING_REFUND: 'out', REFUND: 'out', PURCHASE: 'out', SUPPLIER: 'out', EXPENSE: 'out',
};

/** Fields of an account the balance depends on. */
export interface BalanceAccount {
  id: string;
  tenantId: string;
  shopId: string | null;
  method: PaymentMethod | null;
  isDefault: boolean;
  isActive: boolean;
  openingBalance: number;
  openingDate: Date;
}

/** Which automatic rows an account receives. */
export interface AutoScope {
  tenantId: string;
  method: PaymentMethod;
  shopId: string | null;
  /** For a business-wide account: branches that keep their own default. */
  excludeShops: string[];
}

export interface Window { gte?: Date; lt?: Date }

export interface AccountFlows {
  auto: Record<AutoSource, number>;
  deposits: number;
  withdrawals: number;
  transfersIn: number;
  transfersOut: number;
  adjustIn: number;
  adjustOut: number;
  in: number;
  out: number;
}

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Entry types that add to the balance (ADJUSTMENT goes by its sign). */
export const ENTRY_IN: MoneyEntryType[] = ['DEPOSIT', 'TRANSFER_IN'];

/** Signed effect of one manual entry on the balance. */
export const entryEffect = (type: MoneyEntryType, amount: number) =>
  type === 'ADJUSTMENT' ? amount : ENTRY_IN.includes(type) ? Math.abs(amount) : -Math.abs(amount);

/** Branches with their own active default account for a method. */
async function ownDefaults(db: Db, tenantId: string, method: PaymentMethod): Promise<string[]> {
  const rows = await db.moneyAccount.findMany({
    where: { tenantId, method, isDefault: true, isActive: true, shopId: { not: null } },
    select: { shopId: true },
  });
  return rows.map((r) => r.shopId).filter((x): x is string => !!x);
}

/** The automatic rows an account receives, or null when it receives none. */
export async function autoScopeOf(db: Db, a: BalanceAccount): Promise<AutoScope | null> {
  if (!a.isDefault || !a.isActive || !a.method || a.method === 'CASH' || a.method === 'TRADE_IN') return null;
  return {
    tenantId: a.tenantId,
    method: a.method,
    shopId: a.shopId,
    excludeShops: a.shopId ? [] : await ownDefaults(db, a.tenantId, a.method),
  };
}

/** Branch filter on a model with a nullable shopId column. */
function branch(s: AutoScope): { shopId?: string | null | Prisma.StringNullableFilter; OR?: Array<Record<string, unknown>> } {
  if (s.shopId) return { shopId: s.shopId };
  if (!s.excludeShops.length) return {};
  return { OR: [{ shopId: null }, { shopId: { notIn: s.excludeShops } }] };
}

/** Refund branch: the return's own shop, falling back to the bill's shop (as live-cash.helper). */
function returnBranch(s: AutoScope): Prisma.SaleReturnWhereInput {
  if (s.shopId) return { OR: [{ shopId: s.shopId }, { shopId: null, sale: { shopId: s.shopId } }] };
  if (!s.excludeShops.length) return {};
  return {
    OR: [
      { shopId: { notIn: s.excludeShops } },
      { shopId: null, sale: { OR: [{ shopId: null }, { shopId: { notIn: s.excludeShops } }] } },
    ],
  };
}

/**
 * Part of each refund that only cleared udhaar (khata REFUND lines, stored
 * negative), by return number. Payout = refundAmount + this part.
 */
export async function refundKhataParts(db: Db, tenantId: string, returnNumbers: string[]): Promise<Map<string, number>> {
  if (!returnNumbers.length) return new Map();
  const rows = await db.customerLedger.groupBy({
    by: ['reference'],
    where: { tenantId, type: 'REFUND', reference: { in: returnNumbers } },
    _sum: { amount: true },
  });
  return new Map(rows.map((r) => [r.reference ?? '', n(r._sum.amount)]));
}

/** The window clamped to the account's opening date. */
export function clampWindow(a: Pick<BalanceAccount, 'openingDate'>, w: Window): { gte: Date; lt?: Date } {
  const gte = w.gte && w.gte > a.openingDate ? w.gte : a.openingDate;
  return { gte, ...(w.lt && { lt: w.lt }) };
}

/** Where clauses of the automatic sources, shared by balances and statements. */
export function autoWhere(s: AutoScope, w: { gte: Date; lt?: Date }) {
  const b = branch(s);
  const booking = (refund: boolean): Prisma.BookingPaymentWhereInput => ({
    booking: { tenantId: s.tenantId, AND: [b as Prisma.BookingWhereInput] },
    paymentMethod: s.method,
    paidAt: w,
    type: refund ? 'REFUND' : { in: ['ADVANCE', 'ADDITIONAL'] },
  });
  return {
    sale: {
      tenantId: s.tenantId, method: s.method,
      sale: { tenantId: s.tenantId, AND: [b as Prisma.SaleWhereInput], status: { not: 'VOIDED' }, bookingId: null, soldAt: w },
    } satisfies Prisma.SalePaymentWhereInput,
    khata: {
      tenantId: s.tenantId, type: 'PAYMENT_RECEIVED', paymentMethod: s.method, createdAt: w,
      AND: [b as Prisma.CustomerLedgerWhereInput, NOT_BOOKING_LINE],
    } satisfies Prisma.CustomerLedgerWhereInput,
    booking: booking(false),
    bookingRefund: booking(true),
    refund: {
      tenantId: s.tenantId, refundMethod: s.method, refundAmount: { gt: 0 }, returnedAt: w,
      AND: [returnBranch(s)],
    } satisfies Prisma.SaleReturnWhereInput,
    purchase: {
      tenantId: s.tenantId, AND: [b as Prisma.PurchaseWhereInput], paymentMethod: s.method,
      status: { not: 'CANCELLED' }, paidAmount: { gt: 0 }, purchasedAt: w,
    } satisfies Prisma.PurchaseWhereInput,
    supplier: {
      tenantId: s.tenantId, AND: [b as Prisma.SupplierLedgerWhereInput], type: 'PAYMENT_MADE', paymentMethod: s.method, entryDate: w,
    } satisfies Prisma.SupplierLedgerWhereInput,
    expense: {
      tenantId: s.tenantId, AND: [b as Prisma.ExpenseWhereInput], paymentMethod: s.method, status: 'PAID', expenseDate: w,
    } satisfies Prisma.ExpenseWhereInput,
  };
}

/** Money in and out of an account inside a window (clamped to its opening date). */
export async function accountFlows(db: Db, a: BalanceAccount, w: Window = {}, scope?: AutoScope | null): Promise<AccountFlows> {
  const win = clampWindow(a, w);
  const s = scope === undefined ? await autoScopeOf(db, a) : scope;
  const auto: Record<AutoSource, number> = { SALE: 0, KHATA: 0, BOOKING: 0, BOOKING_REFUND: 0, REFUND: 0, PURCHASE: 0, SUPPLIER: 0, EXPENSE: 0 };

  const entryWhere: Prisma.MoneyAccountEntryWhereInput = { tenantId: a.tenantId, accountId: a.id, entryDate: win };
  const [byType, adjustNeg] = await Promise.all([
    db.moneyAccountEntry.groupBy({ by: ['type'], where: entryWhere, _sum: { amount: true } }),
    db.moneyAccountEntry.aggregate({ where: { ...entryWhere, type: 'ADJUSTMENT', amount: { lt: 0 } }, _sum: { amount: true } }),
  ]);

  if (s) {
    const q = autoWhere(s, win);
    const [sale, khata, bookingIn, bookingOut, refund, purchase, supplier, expense] = await Promise.all([
      db.salePayment.aggregate({ where: q.sale, _sum: { amount: true } }),
      // Collections are stored as negative amounts.
      db.customerLedger.aggregate({ where: q.khata, _sum: { amount: true } }),
      db.bookingPayment.aggregate({ where: q.booking, _sum: { amount: true } }),
      db.bookingPayment.aggregate({ where: q.bookingRefund, _sum: { amount: true } }),
      db.saleReturn.aggregate({ where: q.refund, _sum: { refundAmount: true }, _count: { _all: true } }),
      db.purchase.aggregate({ where: q.purchase, _sum: { paidAmount: true } }),
      db.supplierLedger.aggregate({ where: q.supplier, _sum: { amount: true } }),
      db.expense.aggregate({ where: q.expense, _sum: { amount: true } }),
    ]);
    auto.SALE = r2(n(sale._sum.amount));
    auto.KHATA = r2(-n(khata._sum.amount));
    auto.BOOKING = r2(n(bookingIn._sum.amount));
    auto.BOOKING_REFUND = r2(n(bookingOut._sum.amount));
    const returnNumbers = refund._count._all
      ? (await db.saleReturn.findMany({ where: q.refund, select: { returnNumber: true } })).map((r) => r.returnNumber)
      : [];
    const khataPart = [...(await refundKhataParts(db, a.tenantId, returnNumbers)).values()].reduce((x, v) => x + v, 0);
    auto.REFUND = r2(n(refund._sum.refundAmount) + khataPart);
    auto.PURCHASE = r2(n(purchase._sum.paidAmount));
    auto.SUPPLIER = r2(n(supplier._sum.amount));
    auto.EXPENSE = r2(n(expense._sum.amount));
  }

  const sum = (t: MoneyEntryType) => n(byType.find((x) => x.type === t)?._sum.amount);
  const adjustOut = -n(adjustNeg._sum.amount);
  const flows = {
    deposits: r2(sum('DEPOSIT')),
    withdrawals: r2(sum('WITHDRAW')),
    transfersIn: r2(sum('TRANSFER_IN')),
    transfersOut: r2(sum('TRANSFER_OUT')),
    adjustIn: r2(sum('ADJUSTMENT') + adjustOut),
    adjustOut: r2(adjustOut),
  };
  let moneyIn = flows.deposits + flows.transfersIn + flows.adjustIn;
  let moneyOut = flows.withdrawals + flows.transfersOut + flows.adjustOut;
  for (const k of AUTO_SOURCES) {
    if (AUTO_DIRECTION[k] === 'in') moneyIn += auto[k]; else moneyOut += auto[k];
  }
  return { auto, ...flows, in: r2(moneyIn), out: r2(moneyOut) };
}

/** Balance at `until` (now when left out). */
export async function accountBalance(db: Db, a: BalanceAccount, until?: Date, scope?: AutoScope | null): Promise<number> {
  const f = await accountFlows(db, a, { lt: until }, scope);
  return r2(n(a.openingBalance) + f.in - f.out);
}
