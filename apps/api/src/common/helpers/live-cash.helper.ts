/**
 * The cash a drawer should hold. Every screen that shows drawer cash (the
 * cash register, Shop accounts, the closing count) reads it from here, so
 * the figures always agree.
 *
 *   expected = opening float
 *            + cash sales           cash payment rows of bills, net of change (booking bills excluded);
 *                                   the card or wallet part of a split bill is not drawer cash
 *            + booking payments     cash advance and later payments, on the day received
 *            + khata collections    customer payments by cash (older rows with no method count as cash)
 *            + other income         incentives, claims, rent and the like received in the drawer
 *            + cash in              manual entries on this register
 *            − cash out             manual entries on this register
 *            − cash refunds         returns paid back in cash (minus any part that only cleared udhaar)
 *            − booking refunds      cancelled booking advances returned in cash
 *            − cash expenses        paid expenses with method CASH
 *            − cash purchases       amount paid in cash on the purchase itself
 *            − supplier payments    later cash payments (no method on old rows; counted as cash)
 *
 * A bill made from a booking carries every booking payment in its paidAmount.
 * Those payments are already counted when received, so the bill adds nothing.
 */

import { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

/** The register a count is made for. */
export interface CashWindow {
  id: string;
  shopId: string | null;
  openedAt: Date;
  openingBalance: number;
}

export interface LiveCash {
  openingBalance: number;
  cashSales: number;
  cashSalesCount: number;
  bookingReceived: number;
  bookingReceivedCount: number;
  khataReceived: number;
  khataCount: number;
  otherIncome: number;
  otherIncomeCount: number;
  cashIn: number;
  cashInCount: number;
  cashOut: number;
  cashOutCount: number;
  returns: number;
  returnCount: number;
  bookingRefunds: number;
  bookingRefundCount: number;
  expenses: number;
  expenseCount: number;
  purchases: number;
  purchaseCount: number;
  supplierPaid: number;
  supplierPaidCount: number;
  expected: number;
}

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Khata lines written by bookings; their cash is counted from the booking payment. */
export const NOT_BOOKING_LINE: Prisma.CustomerLedgerWhereInput = {
  OR: [
    { reference: null },
    { note: null },
    { NOT: { AND: [{ reference: { startsWith: 'BK-' } }, { note: { startsWith: 'Booking ' } }] } },
  ],
};

/** Cash that should be in the register's drawer from `openedAt` up to `until` (now when left out). */
export async function computeLiveCash(db: Db, tenantId: string, register: CashWindow, until?: Date): Promise<LiveCash> {
  const window = { gte: register.openedAt, ...(until && { lte: until }) };
  const shop = register.shopId ? { shopId: register.shopId } : {};
  // Ledger rows from before branches were tagged count in every branch.
  const loose = register.shopId ? [{ OR: [{ shopId: register.shopId }, { shopId: null }] }] : [];
  // A return belongs to the branch it was made at; older rows without one fall back to the bill's branch.
  const returnWhere: Prisma.SaleReturnWhereInput = {
    tenantId, refundMethod: 'CASH', refundAmount: { gt: 0 }, returnedAt: window,
    ...(register.shopId && { OR: [{ shopId: register.shopId }, { shopId: null, sale: { shopId: register.shopId } }] }),
  };
  const khataWhere: Prisma.CustomerLedgerWhereInput = {
    tenantId, type: 'PAYMENT_RECEIVED', createdAt: window,
    AND: [...loose, NOT_BOOKING_LINE, { OR: [{ paymentMethod: 'CASH' }, { paymentMethod: null }] }],
  };
  const bookingWhere = (refund: boolean): Prisma.BookingPaymentWhereInput => ({
    booking: { tenantId, ...shop },
    paymentMethod: 'CASH',
    paidAt: window,
    type: refund ? 'REFUND' : { in: ['ADVANCE', 'ADDITIONAL'] },
  });

  const [
    sales, bookingIn, bookingOut, khataNeg, khataPos, manual,
    returns, expenses, purchases, suppliers, income,
  ] = await Promise.all([
    db.salePayment.aggregate({
      where: { tenantId, method: 'CASH', sale: { tenantId, ...shop, status: { not: 'VOIDED' }, bookingId: null, soldAt: window } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.bookingPayment.aggregate({ where: bookingWhere(false), _sum: { amount: true }, _count: { _all: true } }),
    db.bookingPayment.aggregate({ where: bookingWhere(true), _sum: { amount: true }, _count: { _all: true } }),
    // Collections are stored as negative amounts; EMI installments as positive ones.
    db.customerLedger.aggregate({ where: { ...khataWhere, amount: { lt: 0 } }, _sum: { amount: true }, _count: { _all: true } }),
    db.customerLedger.aggregate({ where: { ...khataWhere, amount: { gt: 0 } }, _sum: { amount: true }, _count: { _all: true } }),
    db.cashTransaction.groupBy({
      by: ['type'],
      where: { tenantId, cashRegisterId: register.id, type: { in: ['CASH_IN', 'CASH_OUT'] } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.saleReturn.aggregate({
      where: returnWhere,
      _sum: { refundAmount: true },
      _count: { _all: true },
    }),
    db.expense.aggregate({
      where: { tenantId, ...shop, paymentMethod: 'CASH', status: 'PAID', expenseDate: window },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.purchase.aggregate({
      where: { tenantId, ...shop, paymentMethod: 'CASH', status: { not: 'CANCELLED' }, paidAmount: { gt: 0 }, purchasedAt: window },
      _sum: { paidAmount: true },
      _count: { _all: true },
    }),
    db.supplierLedger.aggregate({
      where: {
        tenantId, type: 'PAYMENT_MADE', entryDate: window,
        AND: [...loose, { OR: [{ paymentMethod: 'CASH' }, { paymentMethod: null }] }],
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.otherIncome.aggregate({
      where: { tenantId, ...shop, receivedVia: 'CASH_DRAWER', incomeDate: window },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  // Part of a cash refund may only clear the customer's udhaar; only the rest leaves the drawer.
  const cashReturns = returns._count._all
    ? await db.saleReturn.findMany({ where: returnWhere, select: { returnNumber: true } })
    : [];
  const khataPart = cashReturns.length
    ? await db.customerLedger.aggregate({
      where: { tenantId, type: 'REFUND', reference: { in: cashReturns.map((r) => r.returnNumber) } },
      _sum: { amount: true },
    })
    : null;

  const manualOf = (type: 'CASH_IN' | 'CASH_OUT') => manual.find((m) => m.type === type);
  const out = {
    openingBalance: n(register.openingBalance),
    cashSales: r2(n(sales._sum.amount)),
    cashSalesCount: sales._count._all,
    bookingReceived: r2(n(bookingIn._sum.amount)),
    bookingReceivedCount: bookingIn._count._all,
    khataReceived: r2(-n(khataNeg._sum.amount) + n(khataPos._sum.amount)),
    khataCount: khataNeg._count._all + khataPos._count._all,
    otherIncome: r2(n(income._sum.amount)),
    otherIncomeCount: income._count._all,
    cashIn: r2(n(manualOf('CASH_IN')?._sum.amount)),
    cashInCount: manualOf('CASH_IN')?._count._all ?? 0,
    cashOut: r2(n(manualOf('CASH_OUT')?._sum.amount)),
    cashOutCount: manualOf('CASH_OUT')?._count._all ?? 0,
    returns: r2(n(returns._sum.refundAmount) + n(khataPart?._sum.amount)),
    returnCount: returns._count._all,
    bookingRefunds: r2(n(bookingOut._sum.amount)),
    bookingRefundCount: bookingOut._count._all,
    expenses: r2(n(expenses._sum.amount)),
    expenseCount: expenses._count._all,
    purchases: r2(n(purchases._sum.paidAmount)),
    purchaseCount: purchases._count._all,
    supplierPaid: r2(n(suppliers._sum.amount)),
    supplierPaidCount: suppliers._count._all,
  };
  const expected = r2(
    out.openingBalance + out.cashSales + out.bookingReceived + out.khataReceived + out.otherIncome + out.cashIn
    - out.cashOut - out.returns - out.bookingRefunds - out.expenses - out.purchases - out.supplierPaid,
  );
  return { ...out, expected };
}
