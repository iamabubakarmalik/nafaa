/** Profit and loss API: the statement for a period with its comparison, monthly and branch columns, cash flow and the records behind a line. */

import type { ExpenseCategoryRef, PnlStatement } from '@nafaa/core/finance';
import { apiClient } from '@/core/api/client';
import type { MoneyAnalytics } from './money';

export type { PnlStatement, ExpenseCategoryRef };

export interface PnlScope { shopId?: string; staff?: boolean }
export interface PnlQuery extends PnlScope { from: string; to: string; compare?: 'prev' | 'year' }

export interface PnlChannel { source: string; bills: number; sales: number; returns: number; net: number; cost: number | null; profit: number | null; margin: number | null }
export interface PnlCategory { id: string; name: string; color: string; bills: number; qty: number; revenue: number; returns: number; net: number; cost: number | null; profit: number | null; margin: number | null }

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
export interface PnlMonthly { branch: { id: string; name: string } | null; costVisible: boolean; staffIncluded: boolean; today: string; months: Array<{ key: string; partial: boolean; statement: PnlStatement }>; expenseCategories: ExpenseCategoryRef[] }
export interface PnlBranches { period: { from: string; to: string; days: number }; costVisible: boolean; staffIncluded: boolean; branches: Array<{ id: string; name: string; isMain: boolean; statement: PnlStatement }>; total: PnlStatement }

export type PnlDetailKind = 'expense' | 'staff' | 'writeoff' | 'booking' | 'income' | 'credit';
export interface PnlDetailRow { id: string; at: string; title: string; ref: string | null; note: string | null; kind?: string; branch: string | null; by: string | null; amount: number; link?: string | null }
export interface PnlDetail { rows: PnlDetailRow[]; count: number; total: number; truncated: boolean }

const d = <T,>(r: { data: T }) => r.data;
const scope = (q: PnlScope) => ({ ...(q.shopId && { shopId: q.shopId }), ...(q.staff === false && { staff: 'false' }) });
const params = (q: PnlQuery) => ({ from: q.from, to: q.to, ...(q.compare && { compare: q.compare }), ...scope(q) });

export const pnlApi = {
  report: (q: PnlQuery) => apiClient.get<PnlReport>('/reports/pnl', { params: params(q) }).then(d),
  monthly: (q: PnlScope & { months?: number }) => apiClient.get<PnlMonthly>('/reports/pnl/monthly', { params: { ...scope(q), ...(q.months && { months: q.months }) } }).then(d),
  branches: (q: PnlQuery) => apiClient.get<PnlBranches>('/reports/pnl/branches', { params: params(q) }).then(d),
  cashFlow: (q: PnlQuery) => apiClient.get<MoneyAnalytics>('/reports/pnl/cash-flow', { params: params(q) }).then(d),
  detail: (q: PnlQuery & { kind: PnlDetailKind; categoryId?: string }) =>
    apiClient.get<PnlDetail>('/reports/pnl/detail', { params: { ...params(q), kind: q.kind, ...(q.categoryId && { categoryId: q.categoryId }) } }).then(d),
};
