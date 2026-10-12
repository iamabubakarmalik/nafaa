/**
 * The cash a drawer should hold. Every screen that shows drawer cash (the
 * cash register, Shop accounts, the closing count) reads it from here, so
 * the figures always agree.
 *
 *   expected = opening float
 *            + cash sales           paid − change on cash bills (booking bills excluded)
 *            + booking payments     cash advance and later payments, on the day received
 *            + khata collections    customer payments (no method stored; counted as cash)
 *            + cash in              manual entries on this register
 *            − cash out             manual entries on this register
 *            − cash refunds         returns paid back in cash
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
const NOT_BOOKING_LINE: Prisma.CustomerLedgerWhereInput = {
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
  const khataWhere: Prisma.CustomerLedgerWhereInput = {
    tenantId, type: 'PAYMENT_RECEIVED', createdAt: window, AND: [...loose, NOT_BOOKING_LINE],
  };
  const bookingWhere = (refund: boolean): Prisma.BookingPaymentWhereInput => ({
    booking: { tenantId, ...shop },
    paymentMethod: 'CASH',
    paidAt: window,
    type: refund ? 'REFUND' : { in: ['ADVANCE', 'ADDITIONAL'] },
  });

  const [
    sales, bookingIn, bookingOut, khataNeg, khataPos, manual,
    returns, expenses, purchases, suppliers,
  ] = await Promise.all([
    db.sale.aggregate({
      where: { tenantId, ...shop, status: { not: 'VOIDED' }, paymentMethod: 'CASH', bookingId: null, paidAmount: { gt: 0 }, soldAt: window },
      _sum: { paidAmount: true, changeAmount: true },
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
      where: { tenantId, refundMethod: 'CASH', refundAmount: { gt: 0 }, returnedAt: window, ...(register.shopId ? { sale: { shopId: register.shopId } } : {}) },
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
  ]);

  const manualOf = (type: 'CASH_IN' | 'CASH_OUT') => manual.find((m) => m.type === type);
  const out = {
    openingBalance: n(register.openingBalance),
    cashSales: r2(n(sales._sum.paidAmount) - n(sales._sum.changeAmount)),
    cashSalesCount: sales._count._all,
    bookingReceived: r2(n(bookingIn._sum.amount)),
    bookingReceivedCount: bookingIn._count._all,
    khataReceived: r2(-n(khataNeg._sum.amount) + n(khataPos._sum.amount)),
    khataCount: khataNeg._count._all + khataPos._count._all,
    cashIn: r2(n(manualOf('CASH_IN')?._sum.amount)),
    cashInCount: manualOf('CASH_IN')?._count._all ?? 0,
    cashOut: r2(n(manualOf('CASH_OUT')?._sum.amount)),
    cashOutCount: manualOf('CASH_OUT')?._count._all ?? 0,
    returns: r2(n(returns._sum.refundAmount)),
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
    out.openingBalance + out.cashSales + out.bookingReceived + out.khataReceived + out.cashIn
    - out.cashOut - out.returns - out.bookingRefunds - out.expenses - out.purchases - out.supplierPaid,
  );
  return { ...out, expected };
}
