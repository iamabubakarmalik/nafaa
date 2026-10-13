/**
 * Shop accounts API: the position (cash, stock, credit, dues), the account
 * cards for a period, the merged money ledger and analytics, and the money
 * accounts (safe, bank, wallet) with their movements. Plain cash in or out
 * of the drawer goes through the cash register endpoint.
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

export type MoneyAccountKind = 'CASH' | 'BANK' | 'WALLET';
export type MoneyEntryType = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT';
export type AutoSource = 'SALE' | 'KHATA' | 'BOOKING' | 'BOOKING_REFUND' | 'REFUND' | 'PURCHASE' | 'SUPPLIER' | 'EXPENSE';

/** A safe, bank account or mobile wallet with its live balance. */
export interface MoneyAccountRow {
  id: string;
  shopId: string | null;
  shop: { id: string; name: string } | null;
  name: string;
  kind: MoneyAccountKind;
  method: MoneyAccount | null;
  bankName: string | null;
  accountTitle: string | null;
  accountNumber: string | null;
  iban: string | null;
  openingBalance: number;
  openingDate: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  balance: number;
  todayIn: number;
  todayOut: number;
  /** True when sales and payments of its method land here by themselves. */
  auto: boolean;
  entryCount: number;
}

export interface MoneyAccountList { accounts: MoneyAccountRow[]; total: number }

export interface MoneyAccountInput {
  name: string;
  kind: MoneyAccountKind;
  method: MoneyAccount | null;
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  iban?: string;
  openingBalance?: number;
  openingDate?: string;
  isDefault?: boolean;
  scope?: 'SHOP' | 'BUSINESS';
}

export interface StatementLine {
  id: string;
  at: string;
  kind: AutoSource | MoneyEntryType;
  direction: MoneyDirection;
  amount: number;
  reference: string | null;
  party: string | null;
  note: string | null;
  by: string | null;
  balance: number;
}

export interface AccountStatement {
  account: Pick<MoneyAccountRow, 'id' | 'name' | 'kind' | 'method' | 'bankName' | 'accountTitle' | 'accountNumber' | 'iban' | 'auto'> & { shop: string | null };
  from: string;
  to: string;
  opening: number;
  in: number;
  out: number;
  closing: number;
  lines: StatementLine[];
}

interface MoveBase {
  amount: number;
  reason: string;
  note?: string;
  /** One key per movement; a retry with the same key is not posted twice. */
  requestId: string;
  allowNegative?: boolean;
}

export interface MoveResult { duplicate: boolean; entryId: string; transferGroupId: string | null }

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

  moneyAccounts: (inactive = false) =>
    apiClient.get<{ data: MoneyAccountList }>('/finance/money/money-accounts', { params: inactive ? { inactive: 'true' } : {} }).then(unwrap),

  createAccount: (body: MoneyAccountInput) =>
    apiClient.post<{ data: MoneyAccountRow }>('/finance/money/money-accounts', body).then(unwrap),

  updateAccount: (id: string, body: Partial<Omit<MoneyAccountInput, 'scope'>> & { isActive?: boolean }) =>
    apiClient.patch<{ data: MoneyAccountRow }>(`/finance/money/money-accounts/${id}`, body).then(unwrap),

  /** Removes an unused account, or turns off one with entries (balance must be zero). */
  removeAccount: (id: string) =>
    apiClient.delete<{ data: { removed: boolean; deactivated: boolean } }>(`/finance/money/money-accounts/${id}`).then(unwrap),

  importReceiptAccounts: () =>
    apiClient.post<{ data: { created: number; skipped: number } }>('/finance/money/money-accounts/import-receipt').then(unwrap),

  statement: (id: string, q: { from?: string; to?: string }) =>
    apiClient.get<{ data: AccountStatement }>(`/finance/money/money-accounts/${id}/statement`, { params: q }).then(unwrap),

  transfer: (body: MoveBase & { fromAccountId: string; toAccountId: string }) =>
    apiClient.post<{ data: MoveResult }>('/finance/money/transfer', body).then(unwrap),

  drawerToAccount: (body: MoveBase & { accountId: string; registerId?: string }) =>
    apiClient.post<{ data: MoveResult }>('/finance/money/drawer-to-account', body).then(unwrap),

  accountToDrawer: (body: MoveBase & { accountId: string; registerId?: string }) =>
    apiClient.post<{ data: MoveResult }>('/finance/money/account-to-drawer', body).then(unwrap),

  /** Deposit, withdraw or adjustment (an adjustment may be negative). */
  entry: (body: Omit<MoveBase, 'amount'> & { accountId: string; type: 'DEPOSIT' | 'WITHDRAW' | 'ADJUSTMENT'; amount: number; entryDate?: string }) =>
    apiClient.post<{ data: MoveResult }>('/finance/money/entry', body).then(unwrap),

  /** Cash into or out of the open drawer of the active branch. */
  drawerMove: (payload: DrawerMovePayload) =>
    apiClient.post('/cash-register/transaction', payload),
};
