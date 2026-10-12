/**
 * Cash register API: the open till with its live count, all open tills in
 * scope, open / cash in-out / close, the shift record with period totals,
 * one shift's full report and analytics.
 */

import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

export type RegisterStatus = 'OPEN' | 'CLOSED';
export type CashTxType = 'OPENING' | 'SALE' | 'EXPENSE' | 'CASH_IN' | 'CASH_OUT' | 'CLOSING' | 'REFUND';
export type ShiftStatus = 'OPEN' | 'CLOSED' | 'SHORT' | 'OVER' | 'MATCHED';
/** Count per note/coin, e.g. { "1000": 4 }. */
export type Denominations = Record<string, number>;

interface Person { id: string; fullName: string }

export interface CashTransaction {
  id: string;
  type: CashTxType;
  amount: number;
  reason?: string | null;
  note?: string | null;
  reference?: string | null;
  createdAt: string;
  createdBy?: Person | null;
}

/** What came into and left the drawer during a shift. */
export interface CashBreakdown {
  openingBalance: number;
  cashSales: number;
  cashSalesCount: number;
  /** Booking advances and later payments taken in cash. */
  bookingReceived: number;
  bookingReceivedCount: number;
  /** Khata payments collected (counted as cash). */
  khataReceived: number;
  khataCount: number;
  cashIn: number;
  cashInCount: number;
  cashOut: number;
  cashOutCount: number;
  expenses: number;
  expenseCount: number;
  returns: number;
  returnCount: number;
  /** Cancelled booking advances given back in cash. */
  bookingRefunds: number;
  bookingRefundCount: number;
  /** Purchases paid in cash on the spot. */
  purchases: number;
  purchaseCount: number;
  /** Cash paid to suppliers against their khata. */
  supplierPaid: number;
  supplierPaidCount: number;
  expected: number;
  /** Money outside the drawer: card, wallet, credit. */
  allSalesTotal: number;
  allSalesPaid: number;
  creditGiven: number;
  billCount: number;
  nonCashCollected: number;
  byMethod: Array<{ method: PaymentMethod; total: number; paid: number; count: number }>;
  openedAt?: string;
  openHours?: number;
}

export interface CashRegister {
  id: string;
  registerNumber: string;
  status: RegisterStatus;
  shopId?: string | null;
  openingBalance: number;
  expectedBalance: number;
  closingBalance: number;
  difference: number;
  totalSales: number;
  totalCashIn: number;
  totalCashOut: number;
  totalExpenses: number;
  notes?: string | null;
  openedAt: string;
  closedAt?: string | null;
  openedBy?: Person | null;
  closedBy?: Person | null;
  shop?: { id: string; name: string } | null;
  transactions?: CashTransaction[];
  /** Live count; only on open registers. */
  live?: CashBreakdown;
  openingDenominations?: Denominations | null;
}

/** A row of the shift record; open shifts carry live figures. */
export type ShiftRow = CashRegister & { isLive: boolean };

export interface ShiftQuery {
  from?: string;
  to?: string;
  shopId?: string;
  staffId?: string;
  status?: ShiftStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ShiftList {
  items: ShiftRow[];
  total: number;
  page: number;
  pages: number;
  totals: {
    shifts: number; open: number; closed: number;
    short: number; shortAmount: number; over: number; overAmount: number; matched: number;
    /** Cash sales of closed shifts. */
    cashSales: number;
    avgFloat: number;
  };
  /** People who opened shifts in the period (for the staff filter). */
  staff: Array<Person & { shifts: number }>;
}

export interface ShiftDetail {
  register: CashRegister;
  cash: CashBreakdown;
  expected: number;
  counted: number | null;
  difference: number | null;
  /** Closed before snapshots were kept; the breakdown was counted again now. */
  recounted: boolean;
  openingDenominations: Denominations | null;
  closingDenominations: Denominations | null;
  entries: CashTransaction[];
}

export interface CashBucket {
  key: string; label: string; shifts: number;
  short: number; shortCount: number; over: number; overCount: number; net: number;
  cashSales: number; avgFloat: number;
}

export interface CashAnalytics {
  totals: CashBucket & { avgHours: number; open: number };
  byStaff: CashBucket[];
  byDay: CashBucket[];
  byShop: CashBucket[];
  capped: boolean;
}

export interface OpenRegisterPayload {
  openingBalance: number;
  shopId: string;
  notes?: string;
  denominations?: Denominations;
}

export interface CloseRegisterPayload {
  registerId: string;
  closingBalance: number;
  notes?: string;
  denominations?: Denominations;
}

export interface CashTransactionPayload {
  registerId: string;
  type: 'CASH_IN' | 'CASH_OUT';
  amount: number;
  reason: string;
  note?: string;
  /** Same key on a retry posts nothing new. */
  requestId: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const cashRegisterApi = {
  live: () =>
    apiClient.get<{ data: CashRegister[] }>('/cash-register/live').then(unwrap),
  open: (payload: OpenRegisterPayload) =>
    apiClient.post<{ data: CashRegister }>('/cash-register/open', payload).then(unwrap),
  transaction: (payload: CashTransactionPayload) =>
    apiClient.post<{ data: CashTransaction }>('/cash-register/transaction', payload).then(unwrap),
  close: (payload: CloseRegisterPayload) =>
    apiClient.post<{ data: CashRegister }>('/cash-register/close', payload).then(unwrap),
  shifts: (q: ShiftQuery) =>
    apiClient.get<{ data: ShiftList }>('/cash-register/shifts', { params: q }).then(unwrap),
  shift: (id: string) =>
    apiClient.get<{ data: ShiftDetail }>(`/cash-register/shifts/${id}`).then(unwrap),
  analytics: (q: Omit<ShiftQuery, 'page' | 'limit' | 'status'>) =>
    apiClient.get<{ data: CashAnalytics }>('/cash-register/analytics', { params: q }).then(unwrap),
};
