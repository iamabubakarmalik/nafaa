import { apiClient } from '@core/api/client';

/* ═════════════════════════════════════════════════════════════
   DUKAAN KA HISAB — "mera paisa kahan hai?"
   ─────────────────────────────────────────────────────────────
   Nafaa har cheez alag safhe par batata tha. Ye woh ek jagah hai
   jahan sab jama ho kar poori tasveer banti hai.
   ═════════════════════════════════════════════════════════════ */

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
  /** Golak me se wo hissa jo supplier ka nahi — isi se kharidari karein */
  spendable: number;
  /** Supplier ka paisa golak se zyada ho to kitna kam par raha hai */
  shortfall: number;

  registers: Array<{
    id: string; registerNumber: string; shop: string | null;
    openingBalance: number; expectedBalance: number;
    totalSales: number; totalCashIn: number; totalCashOut: number; totalExpenses: number;
    openedAt: string;
  }>;

  today: {
    revenue: number; paid: number; credit: number;
    cogs: number; profit: number; bills: number;
  };

  month: {
    revenue: number; paid: number; credit: number; cogs: number;
    grossProfit: number; expenses: number; expenseCount: number;
    netProfit: number; margin: number; bills: number;
    purchases: number; purchasesPaid: number; purchaseCount: number;
    supplierPaid: number; customerRecovered: number;
  };
}

export interface MoneyFlow {
  from: string;
  to: string;
  in: { salesPaid: number; recovered: number; total: number };
  out: { purchasesPaid: number; supplierPayments: number; expenses: number; total: number };
  net: number;
  sales: {
    revenue: number; cogs: number; discount: number; credit: number;
    grossProfit: number; netProfit: number; count: number;
  };
  purchases: { total: number; paid: number; credit: number; count: number };
  expenseBreakdown: Array<{
    categoryId: string | null; name: string; color: string;
    icon: string | null; amount: number; count: number;
  }>;
}

export interface MoneyTrendRow {
  month: string; label: string;
  revenue: number; cogs: number; grossProfit: number;
  expenses: number; netProfit: number; margin: number;
  purchases: number; purchasesPaid: number;
  cashIn: number; credit: number; bills: number;
}

export interface MoneyDailyRow {
  date: string; label: string;
  revenue: number; cogs: number; profit: number;
  cashIn: number; out: number; bills: number;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const moneyApi = {
  position: () =>
    apiClient.get('/finance/money/position').then(unwrap<MoneyPosition>),

  flow: (from?: string, to?: string) =>
    apiClient.get('/finance/money/flow', { params: { from, to } }).then(unwrap<MoneyFlow>),

  trend: (months = 12) =>
    apiClient.get('/finance/money/trend', { params: { months } }).then(unwrap<MoneyTrendRow[]>),

  daily: (from?: string, to?: string) =>
    apiClient.get('/finance/money/daily', { params: { from, to } }).then(unwrap<MoneyDailyRow[]>),
};
