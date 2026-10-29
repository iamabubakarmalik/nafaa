/**
 * Day book API: the end-of-day (Z) report for one business day.
 * Cost and profit fields are left out by the server for users without
 * `cost.view`, so they are optional here.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { useActiveShopId } from '@core/stores/auth.store';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

interface DaySnapshot { date: string; bills: number; net: number; avgBill: number; itemsSold: number; profit?: number }

export interface CashFlow {
  cashSales: number; bookingReceived: number; khataReceived: number; otherIncome?: number; cashIn: number; cashOut: number;
  returns: number; bookingRefunds: number; expenses: number; purchases: number; supplierPaid: number;
}

export interface DrawerRow {
  id: string; number: string; shop: string | null; status: 'OPEN' | 'CLOSED'; openedAt: string; closedAt: string | null;
  openedBy: string; closedBy: string | null; startedEarlier: boolean; notes: string | null;
  opening: number; expected: number; counted: number | null; difference: number | null; flow: CashFlow;
}

interface DayItem {
  productId: string | null; name: string; sku: string | null; unit: string; categoryId: string | null; category: string;
  color: string | null; soldQty: number; returnedQty: number; qty: number; bills: number; revenue: number;
  cost?: number; profit?: number;
}

export interface DayBook {
  date: string; isToday: boolean; from: string; to: string; tz: string; dayStartHour: number; generatedAt: string;
  shopId: string | null;
  summary: {
    bills: number; voidedBills: number; subtotal: number; discount: number; charges: number; billed: number;
    returns: number; returnCount: number; net: number; avgBill: number; biggestBill: number; itemsSold: number;
    uniqueItems: number; customers: number; walkIns: number; collected: number; credit: number;
    firstBillAt: string | null; lastBillAt: string | null; cogs?: number; grossProfit?: number; margin?: number;
  };
  compare: { yesterday: DaySnapshot; lastWeek: DaySnapshot };
  payments: Array<{ method: PaymentMethod; bills: number; billed: number; collected: number; credit: number; bookingBills: number; bookings: number; total: number }>;
  sources: Array<{ source: string; bills: number; total: number }>;
  charges: Array<{ label: string; amount: number; bills: number }>;
  hourly: Array<{ hour: number; sales: number; bills: number; yesterday: number; lastWeek: number }>;
  /** null when Settings → Reports hides drawer money from this user (cash in/out then comes back empty). */
  drawer: {
    registers: DrawerRow[]; allClosed: boolean; openNow: number; opening: number; expected: number;
    counted: number | null; difference: number | null;
    previousClosing: { number: string; amount: number; at: string; nextOpening: number } | null;
    flow: CashFlow & { net: number };
  } | null;
  cashMoves: Array<{ id: string; type: 'CASH_IN' | 'CASH_OUT'; amount: number; reason: string | null; note: string | null; at: string; by: string | null; register: string }>;
  expenses: {
    total: number; cash: number; count: number;
    byCategory: Array<{ name: string; amount: number; count: number }>;
    list: Array<{ id: string; number: string; title: string; category: string | null; amount: number; method: PaymentMethod; by: string | null; at: string }>;
  };
  purchases: {
    count: number; total: number; paid: number;
    list: Array<{ id: string; number: string; supplierId: string; supplier: string; total: number; paid: number; method: PaymentMethod; status: string; at: string }>;
  };
  supplierPayments: {
    total: number; cash: number;
    list: Array<{ id: string; supplierId: string; supplier: string; amount: number; method: PaymentMethod; reference: string | null; note: string | null; at: string }>;
  };
  khata: {
    given: number; givenCount: number; collected: number; collectedCount: number;
    list: Array<{ id: string; kind: 'given' | 'collected'; amount: number; reference: string | null; method: string | null; at: string; customerId: string; customer: string; phone: string | null }>;
  };
  bookings: {
    advances: number; advanceCount: number; refunds: number; refundCount: number; converted: number;
    list: Array<{ id: string; bookingId: string; number: string; customer: string | null; type: 'ADVANCE' | 'ADDITIONAL' | 'REFUND'; amount: number; method: PaymentMethod; at: string }>;
  };
  items: DayItem[];
  categories: Array<{ id: string | null; name: string; color: string | null; qty: number; revenue: number; profit?: number; items: number }>;
  staff: Array<{
    userId: string; name: string; role: string | null; bills: number; total: number; avgBill: number; discount: number;
    credit: number; profit?: number; voids: number; returns: number; returnAmount: number;
  }>;
  voids: Array<{ id: string; saleNumber: string; soldAt: string; voidedAt: string; total: number; method: PaymentMethod; customer: string | null; by: string | null; earlierBill: boolean; reason: string | null }>;
  returns: Array<{ id: string; number: string; saleId: string; saleNumber: string; amount: number; method: PaymentMethod; reason: string | null; at: string; by: string | null; customer: string | null; qty: number }>;
  discounts: {
    total: number; bills: number; code: number; loyalty: number;
    list: Array<{ id: string; saleNumber: string; soldAt: string; subtotal: number; discount: number; code: string | null; codeAmount: number; loyaltyAmount: number; total: number; customer: string | null; by: string | null }>;
  };
  lowStock: Array<{ productId: string; name: string; unit: string; stock: number; alert: number; shop: string }>;
  branches: Array<{ shopId: string; name: string; bills: number; net: number; cash: number; expenses: number; registers: number; openRegisters: number; difference: number | null }>;
}

const DAY_BOOK_KEY = 'day-book';

const fetchDayBook = (date?: string, shopId?: string) =>
  apiClient.get<{ data: DayBook }>('/day-book', { params: { date, shopId: shopId || undefined } }).then((r) => r.data.data);

/** `date` is YYYY-MM-DD (undefined = today); `shopId` narrows the all-branches view. */
export function useDayBook(date: string | undefined, shopId: string) {
  const active = useActiveShopId();
  return useQuery({
    queryKey: [DAY_BOOK_KEY, date ?? 'today', shopId, active],
    queryFn: () => fetchDayBook(date, shopId),
    placeholderData: (prev) => prev,
    refetchInterval: date ? false : 60_000,
  });
}
