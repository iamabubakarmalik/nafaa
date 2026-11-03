/** Shop accounts: the position (cash, stock, credit, dues), account cards, the merged ledger, analytics, and the safe / bank / wallet accounts. */

import { apiClient } from '@/core/api/client';

export type MoneyAccount = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'JAZZCASH' | 'EASYPAISA';
export type MoneySource = 'SALE' | 'KHATA' | 'CASH_IN' | 'REFUND' | 'PURCHASE' | 'SUPPLIER' | 'EXPENSE' | 'CASH_OUT';
export type MoneyDirection = 'in' | 'out';

export interface MoneyPosition {
  cashInHand: number; stockCost: number; stockRetail: number; stockUnits: number; stockPotentialProfit: number;
  receivables: number; receivableCount: number; payables: number; payableCount: number; netWorth: number; spendable: number; shortfall: number;
  month: { revenue: number; paid: number; credit: number; cogs: number; grossProfit: number; expenses: number; expenseCount: number; netProfit: number; margin: number; bills: number; purchases: number; purchasesPaid: number; purchaseCount: number; supplierPaid: number; customerRecovered: number };
}

export interface MoneyDrawer {
  id: string; registerNumber: string; shop: { id: string; name: string } | null; openedAt: string; openedBy: string | null; opening: number;
  sales: number; khata: number; cashIn: number; cashOut: number; refunds: number; purchases: number; suppliers: number; expenses: number; bookings: number; expected: number;
}
export interface AccountRow { method: MoneyAccount; in: number; out: number; net: number; count: number }
export interface SourceRow { source: MoneySource; direction: MoneyDirection; amount: number; count: number }

export interface MoneyAccounts {
  from: string; to: string;
  accounts: Array<AccountRow & { todayIn: number; todayOut: number }>;
  bySource: SourceRow[];
  totals: { in: number; out: number; net: number; todayIn: number; todayOut: number };
  cash: { inHand: number; drawers: MoneyDrawer[] };
}

export interface MoneyEntry {
  id: string; source: MoneySource; direction: MoneyDirection; method: MoneyAccount; amount: number; at: string;
  reference: string | null; party: string | null; note: string | null; by: string | null; linkId: string | null; shop: { id: string; name: string } | null;
}
export interface MoneyLedger { items: MoneyEntry[]; total: number; page: number; pages: number; totals: { in: number; out: number; net: number } }

export interface MoneyAnalytics {
  from: string; to: string; grouping: 'day' | 'month';
  trend: Array<{ key: string; in: number; out: number; net: number }>;
  bySource: SourceRow[]; byAccount: AccountRow[];
  totals: { in: number; out: number; net: number };
  expenseCategories: Array<{ id: string | null; name: string; color: string; amount: number; count: number }>;
}

export interface MoneyPeriod { from?: string; to?: string; account?: MoneyAccount }
export interface MoneyLedgerQuery extends MoneyPeriod { source?: MoneySource; direction?: MoneyDirection; search?: string; page?: number; limit?: number }

export type MoneyAccountKind = 'CASH' | 'BANK' | 'WALLET';
export interface MoneyAccountRow {
  id: string; shopId: string | null; shop: { id: string; name: string } | null; name: string; kind: MoneyAccountKind; method: MoneyAccount | null;
  bankName: string | null; accountTitle: string | null; accountNumber: string | null; iban: string | null; openingBalance: number; openingDate: string;
  isDefault: boolean; isActive: boolean; sortOrder: number; balance: number; todayIn: number; todayOut: number; auto: boolean; entryCount: number;
}
export interface MoneyAccountList { accounts: MoneyAccountRow[]; total: number }
export interface MoneyAccountInput {
  name: string; kind: MoneyAccountKind; method: MoneyAccount | null; bankName?: string; accountTitle?: string; accountNumber?: string; iban?: string;
  openingBalance?: number; openingDate?: string; isDefault?: boolean; scope?: 'SHOP' | 'BUSINESS';
}

interface MoveBase { amount: number; reason: string; note?: string; requestId: string; allowNegative?: boolean }
export interface MoveResult { duplicate: boolean; entryId: string; transferGroupId: string | null }

const d = <T,>(r: { data: T }) => r.data;

export const moneyApi = {
  position: () => apiClient.get<MoneyPosition>('/finance/money/position').then(d),
  accounts: (q: MoneyPeriod) => apiClient.get<MoneyAccounts>('/finance/money/accounts', { params: q }).then(d),
  ledger: (q: MoneyLedgerQuery) => apiClient.get<MoneyLedger>('/finance/money/ledger', { params: q }).then(d),
  analytics: (q: MoneyPeriod) => apiClient.get<MoneyAnalytics>('/finance/money/analytics', { params: q }).then(d),
  moneyAccounts: (inactive = false) => apiClient.get<MoneyAccountList>('/finance/money/money-accounts', { params: inactive ? { inactive: 'true' } : {} }).then(d),
  createAccount: (b: MoneyAccountInput) => apiClient.post<MoneyAccountRow>('/finance/money/money-accounts', b).then(d),
  updateAccount: (id: string, b: Partial<Omit<MoneyAccountInput, 'scope'>> & { isActive?: boolean }) => apiClient.patch<MoneyAccountRow>(`/finance/money/money-accounts/${id}`, b).then(d),
  removeAccount: (id: string) => apiClient.delete<{ removed: boolean; deactivated: boolean }>(`/finance/money/money-accounts/${id}`).then(d),
  transfer: (b: MoveBase & { fromAccountId: string; toAccountId: string }) => apiClient.post<MoveResult>('/finance/money/transfer', b).then(d),
  drawerToAccount: (b: MoveBase & { accountId: string; registerId?: string }) => apiClient.post<MoveResult>('/finance/money/drawer-to-account', b).then(d),
  accountToDrawer: (b: MoveBase & { accountId: string; registerId?: string }) => apiClient.post<MoveResult>('/finance/money/account-to-drawer', b).then(d),
  entry: (b: Omit<MoveBase, 'amount'> & { accountId: string; type: 'DEPOSIT' | 'WITHDRAW' | 'ADJUSTMENT'; amount: number; entryDate?: string }) => apiClient.post<MoveResult>('/finance/money/entry', b).then(d),
  drawerMove: (p: { type: 'CASH_IN' | 'CASH_OUT'; amount: number; reason: string; note?: string; registerId?: string; requestId?: string }) => apiClient.post('/cash-register/transaction', p).then(d),
};
