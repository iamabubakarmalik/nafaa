/**
 * Profit and loss API: the statement for a period with its comparison, the
 * monthly columns, the branch columns, cash flow and the records behind a
 * line. Cost-based figures are null when the user may not see cost.
 */

import { apiClient } from '@core/api/client';
import type { MoneyAnalytics } from '@modules/finance/money/api/money.api';

export interface PnlScope {
  /** Branch picked on the all-branches view. */
  shopId?: string;
  /** Count salaries and commission as expenses. */
  staff?: boolean;
}

export interface PnlQuery extends PnlScope {
  from: string;
  to: string;
  compare?: 'prev' | 'year';
}

export interface ExpenseCategoryRef { id: string; name: string; color: string }

export interface PnlStatement {
  revenue: {
    gross: number; discount: number; manualDiscount: number; codeDiscount: number; loyaltyDiscount: number;
    serviceCharges: number; sales: number; returns: number; net: number;
    bills: number; returnCount: number; credit: number; avgBill: number;
  };
  cogs: { saved: number; estimated: number; returned: number; total: number; estimatedLines: number; unknownLines: number; unknownRevenue: number } | null;
  grossProfit: number | null;
  grossMargin: number | null;
  expenses: {
    paid: number; count: number;
    categories: Array<ExpenseCategoryRef & { amount: number; count: number }>;
    salaries: number; salaryCount: number; commission: number; commissionCount: number;
    total: number;
  };
  writeOffs: { damage: number; loss: number; countedShort: number; found: number; net: number; count: number } | null;
  otherIncome: { bookingKept: number; bookingCount: number; total: number };
  operatingProfit: number | null;
  netProfit: number | null;
  netMargin: number | null;
}

export interface PnlChannel {
  source: string; bills: number; sales: number; returns: number; net: number;
  cost: number | null; profit: number | null; margin: number | null;
}

export interface PnlCategory {
  id: string; name: string; color: string; bills: number; qty: number; revenue: number; returns: number; net: number;
  cost: number | null; profit: number | null; margin: number | null;
}

export interface PnlReport {
  period: { from: string; to: string; days: number; compare: 'prev' | 'year'; prevFrom: string; prevTo: string };
  branch: { id: string; name: string } | null;
  costVisible: boolean;
  staffIncluded: boolean;
  current: PnlStatement;
  previous: PnlStatement;
  channels: PnlChannel[];
  categories: PnlCategory[];
  pendingExpenses: { amount: number; count: number };
}

export interface PnlMonthly {
  branch: { id: string; name: string } | null;
  costVisible: boolean;
  staffIncluded: boolean;
  today: string;
  months: Array<{ key: string; partial: boolean; statement: PnlStatement }>;
  expenseCategories: ExpenseCategoryRef[];
}

export interface PnlBranches {
  period: { from: string; to: string; days: number };
  costVisible: boolean;
  staffIncluded: boolean;
  branches: Array<{ id: string; name: string; isMain: boolean; statement: PnlStatement }>;
  total: PnlStatement;
}

export type PnlDetailKind = 'expense' | 'staff' | 'writeoff' | 'booking';

export interface PnlDetailRow {
  id: string; at: string; title: string; ref: string | null; note: string | null; kind?: string;
  branch: string | null; by: string | null; amount: number; link?: string | null;
}

export interface PnlDetail { rows: PnlDetailRow[]; count: number; total: number; truncated: boolean }

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;
const scope = (q: PnlScope) => ({ ...(q.shopId && { shopId: q.shopId }), ...(q.staff === false && { staff: 'false' }) });
const params = (q: PnlQuery) => ({ from: q.from, to: q.to, ...(q.compare && { compare: q.compare }), ...scope(q) });

export const pnlApi = {
  report: (q: PnlQuery) => apiClient.get<{ data: PnlReport }>('/reports/pnl', { params: params(q) }).then(unwrap),
  monthly: (q: PnlScope & { months?: number }) =>
    apiClient.get<{ data: PnlMonthly }>('/reports/pnl/monthly', { params: { ...scope(q), ...(q.months && { months: q.months }) } }).then(unwrap),
  branches: (q: PnlQuery) => apiClient.get<{ data: PnlBranches }>('/reports/pnl/branches', { params: params(q) }).then(unwrap),
  cashFlow: (q: PnlQuery) => apiClient.get<{ data: MoneyAnalytics }>('/reports/pnl/cash-flow', { params: params(q) }).then(unwrap),
  detail: (q: PnlQuery & { kind: PnlDetailKind; categoryId?: string }) =>
    apiClient.get<{ data: PnlDetail }>('/reports/pnl/detail', { params: { ...params(q), kind: q.kind, ...(q.categoryId && { categoryId: q.categoryId }) } }).then(unwrap),
};
