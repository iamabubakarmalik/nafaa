/**
 * Shop accounts API: the position (cash, stock, credit, dues), the account
 * cards for a period, the merged money ledger and analytics. Cash put into
 * or taken out of the drawer goes through the cash register endpoint.
 */

import { apiClient } from '@core/api/client';
import type { ShopStamp } from '@core/lib/shopScope';

export type MoneyAccount = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'JAZZCASH' | 'EASYPAISA';
export type MoneySource = 'SALE' | 'KHATA' | 'CASH_IN' | 'REFUND' | 'PURCHASE' | 'SUPPLIER' | 'EXPENSE' | 'CASH_OUT';
export type MoneyDirection = 'in' | 'out';

export interface MoneyPosition {
  cashInHand: number;
  stockCost: number;
  stockRetail: number;
  stockUnits: number;
  stockPotentialProfit: number;
  receivables: number;
  receivableCount: number;
  payables: number;
  payableCount: number;
  netWorth: number;
  /** Drawer cash that is not owed to suppliers. */
  spendable: number;
  shortfall: number;
  month: {
    revenue: number; paid: number; credit: number; cogs: number;
    grossProfit: number; expenses: number; expenseCount: number;
    netProfit: number; margin: number; bills: number;
    purchases: number; purchasesPaid: number; purchaseCount: number;
    supplierPaid: number; customerRecovered: number;
  };
}

export interface MoneyDrawer {
  id: string;
  registerNumber: string;
  shop: { id: string; name: string } | null;
  openedAt: string;
  openedBy: string | null;
  opening: number;
  sales: number;
  khata: number;
  cashIn: number;
  cashOut: number;
  refunds: number;
  purchases: number;
  suppliers: number;
  expenses: number;
  /** Booking payments taken in cash, less booking refunds paid in cash. */
  bookings: number;
  expected: number;
}

export interface AccountRow { method: MoneyAccount; in: number; out: number; net: number; count: number }
export interface SourceRow { source: MoneySource; direction: MoneyDirection; amount: number; count: number }

export interface MoneyAccounts {
  from: string;
  to: string;
  accounts: Array<AccountRow & { todayIn: number; todayOut: number }>;
  bySource: SourceRow[];
  totals: { in: number; out: number; net: number; todayIn: number; todayOut: number };
  cash: { inHand: number; drawers: MoneyDrawer[] };
}

export interface MoneyEntry {
  id: string;
  source: MoneySource;
  direction: MoneyDirection;
  method: MoneyAccount;
  amount: number;
  at: string;
  reference: string | null;
  party: string | null;
  note: string | null;
  by: string | null;
  linkId: string | null;
  shop: ShopStamp | null;
}

export interface MoneyLedger {
  items: MoneyEntry[];
  total: number;
  page: number;
  pages: number;
  totals: { in: number; out: number; net: number };
}

export interface MoneyAnalytics {
  from: string;
  to: string;
  grouping: 'day' | 'month';
  trend: Array<{ key: string; in: number; out: number; net: number }>;
  bySource: SourceRow[];
  byAccount: AccountRow[];
  totals: { in: number; out: number; net: number };
  expenseCategories: Array<{ id: string | null; name: string; color: string; amount: number; count: number }>;
}

export interface MoneyPeriod { from?: string; to?: string; account?: MoneyAccount }
export interface MoneyLedgerQuery extends MoneyPeriod {
  source?: MoneySource;
  direction?: MoneyDirection;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DrawerMovePayload {
  type: 'CASH_IN' | 'CASH_OUT';
  amount: number;
  reason: string;
  note?: string;
  registerId?: string;
  /** One key per entry; a retry with the same key is not posted twice. */
  requestId?: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const moneyApi = {
  position: () =>
    apiClient.get<{ data: MoneyPosition }>('/finance/money/position').then(unwrap),

  accounts: (q: MoneyPeriod) =>
    apiClient.get<{ data: MoneyAccounts }>('/finance/money/accounts', { params: q }).then(unwrap),

  ledger: (q: MoneyLedgerQuery) =>
    apiClient.get<{ data: MoneyLedger }>('/finance/money/ledger', { params: q }).then(unwrap),

  analytics: (q: MoneyPeriod) =>
    apiClient.get<{ data: MoneyAnalytics }>('/finance/money/analytics', { params: q }).then(unwrap),

  /** Cash into or out of the open drawer of the active branch. */
  drawerMove: (payload: DrawerMovePayload) =>
    apiClient.post('/cash-register/transaction', payload),
};
