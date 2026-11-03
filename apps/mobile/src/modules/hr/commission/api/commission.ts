/**
 * Commission API (same endpoints and shapes as the web). Every figure is
 * worked out on the server from the bills; this file only fetches it.
 * Months are "YYYY-MM" business months.
 */

import { apiClient } from '@/core/api/client';

export type CommissionBasis = 'SALE' | 'PROFIT' | 'PER_BILL';
export type CommissionValueType = 'PERCENT' | 'FIXED';
export type PayStatus = 'none' | 'partial' | 'full' | 'over';

export interface CommissionRule {
  id: string;
  name?: string | null;
  userId?: string | null;
  basis: CommissionBasis;
  valueType: CommissionValueType;
  value: number;
  categoryIds: string[];
  /** Only these brands / brands of these principals (distribution); empty = no limit. */
  brandIds?: string[];
  supplierIds?: string[];
  minMonthlySale?: number | null;
  targetAmount?: number | null;
  targetBonus?: number | null;
  isActive: boolean;
  note?: string | null;
  user?: { id: string; fullName: string } | null;
  createdAt: string;
}

export interface RulePayload {
  name: string | null;
  userId: string | null;
  basis: CommissionBasis;
  valueType: CommissionValueType;
  value: number;
  categoryIds: string[];
  brandIds?: string[];
  supplierIds?: string[];
  minMonthlySale: number | null;
  targetAmount: number | null;
  targetBonus: number | null;
  isActive: boolean;
  note: string | null;
}

export interface CommissionLine {
  ruleId: string;
  label: string;
  /** SALE, PROFIT, PER_BILL, or TARGET for a target bonus. */
  basis: string;
  base: number;
  rate: number;
  valueType: CommissionValueType;
  /** Net: commission on sales less commission taken back on returns. */
  amount: number;
  returnBase: number;
  returnAmount: number;
}

export interface CommissionTarget { ruleId: string; amount: number; bonus: number; pct: number; reached: boolean }

export interface CommissionRow {
  userId: string;
  name: string;
  enrolled: boolean;
  active: boolean;
  shopId: string | null;
  staff?: { id: string; staffNumber?: string; designation?: string | null; salaryType?: string; baseSalary?: number; status?: string } | null;
  /** Fixed monthly salary from the HR record; 0 for commission-only staff. */
  baseSalary: number;
  totalPay: number;
  bills: number;
  fullReturns: number;
  reassigned: number;
  grossSale: number;
  returnSale: number;
  /** Goods sold less goods returned in the month. */
  sale: number;
  /** Null when the viewer may not see cost. */
  profit: number | null;
  qty: number;
  noCost: number;
  earned: number;
  bonus: number;
  blockedByMin?: { need: number; short: number };
  targetPct?: number;
  targets: CommissionTarget[];
  lines: CommissionLine[];
  paid: boolean;
  payStatus: PayStatus;
  paidAt?: string | null;
  paidAmount?: number | null;
  /** Paid inside a salary by payroll; change it from payroll only. */
  paidInSalary: boolean;
  due: number;
  shops?: Array<{ shopId: string | null; name: string; sale: number; bills: number }>;
}

export interface CommissionSummary {
  period: string;
  timezone: string;
  dayStartHour: number;
  /** `own` = only the viewer's row, `all` = everyone. */
  scope: 'own' | 'all';
  from: string;
  to: string;
  isCurrent: boolean;
  rows: CommissionRow[];
  total: number;
  previousTotal: number;
  paidTotal: number;
  pendingTotal: number;
  overpaidTotal: number;
  saleTotal: number;
  returnTotal: number;
  enabledCount: number;
  notEnrolled: Array<{ userId: string; name: string; bills: number; sale: number }>;
  partialReturnCount: number;
  orphanBills: number;
  orphanSale: number;
  reassignedBills: number;
  noCostLines: number;
  baseTotal: number;
  payTotal: number;
  ruleCount: number;
}

export interface CommissionDetail extends CommissionRow {
  period: string;
  timezone: string;
  rules: Array<{
    id: string; label: string; basis: CommissionBasis; valueType: CommissionValueType; value: number; categoryIds: string[];
    minMonthlySale?: number | null; targetAmount?: number | null; targetBonus?: number | null; own: boolean;
  }>;
  history: Array<{ period: string; sale: number; bills: number; earned: number; paid: number | null; payStatus: PayStatus }>;
  byProduct: Array<{
    productId: string; name: string; unit: string; categoryId?: string | null; categoryName?: string | null;
    qty: number; sale: number; cost: number | null; profit: number | null; returnedQty: number; returnedSale: number; bills: number; commission: number;
  }>;
  byCategory: Array<{ categoryId?: string | null; name: string; qty: number; sale: number; returnedSale: number; commission: number; items: number }>;
  billList: Array<{
    id: string; saleNumber: string; soldAt: string; status: string; customer?: string | null; shop?: string | null;
    total: number; goods: number; profit: number | null; discount: number; items: number; cashier: string | null;
  }>;
  billCount: number;
  returnList: Array<{ id: string; returnNumber: string; returnedAt: string; saleNumber: string; soldAt: string; value: number; items: number }>;
}

export interface CommissionPerson {
  userId: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  shopId?: string | null;
  /** false = no login of their own, so no sale is recorded against them. */
  canSell: boolean;
  staff?: {
    id: string; staffNumber?: string; designation?: string | null; salaryType?: string; baseSalary?: number;
    status?: string; avatarUrl?: string | null; linkedByGuess?: boolean;
  } | null;
  enrolled: boolean;
  since?: string | null;
}

export interface CommissionAnalytics {
  from: string;
  to: string;
  months: string[];
  scope: 'own' | 'all';
  series: Array<{ period: string; earned: number; sale: number; returns: number; bills: number; paid: number; people: Record<string, number> }>;
  people: Array<{ userId: string; name: string; earned: number; sale: number; bills: number; paid: number; rate: number }>;
  byRule: Array<{ label: string; amount: number }>;
  totals: { earned: number; sale: number; paid: number; rate: number; best: { period: string; earned: number } | null };
}

export interface CommissionPayout {
  id: string; userId: string; name: string; period: string; amount: number; note?: string | null; paidAt: string; paidBy: string | null;
}

const data = <T,>(r: { data: T }) => r.data;

export const commissionApi = {
  listRules: () => apiClient.get<CommissionRule[]>('/commission/rules').then(data),
  createRule: (body: RulePayload) => apiClient.post<CommissionRule>('/commission/rules', body).then(data),
  updateRule: (id: string, body: RulePayload) => apiClient.patch<CommissionRule>(`/commission/rules/${id}`, body).then(data),
  removeRule: (id: string) => apiClient.delete<{ ok: boolean }>(`/commission/rules/${id}`).then(data),

  people: () => apiClient.get<{ people: CommissionPerson[]; withoutLogin: CommissionPerson[] }>('/commission/people').then(data),
  enroll: (body: { userId: string; isActive: boolean; staffId?: string; note?: string }) =>
    apiClient.post<{ ok: boolean; enrolled: boolean }>('/commission/enroll', body).then(data),

  summary: (period: string) => apiClient.get<CommissionSummary>('/commission/summary', { params: { period } }).then(data),
  detail: (userId: string, period: string) => apiClient.get<CommissionDetail>(`/commission/detail/${userId}`, { params: { period } }).then(data),
  analytics: (period: string, months = 12) => apiClient.get<CommissionAnalytics>('/commission/analytics', { params: { period, months } }).then(data),
  payouts: (from?: string, to?: string) => apiClient.get<CommissionPayout[]>('/commission/payouts', { params: { from, to } }).then(data),

  /** `amount` is the month's total paid; `expectedPaid` is what the screen showed as already paid. */
  pay: (body: { userId: string; period: string; amount: number; expectedPaid: number; note?: string }) =>
    apiClient.post<{ id: string }>('/commission/pay', body).then(data),
  undoPay: (userId: string, period: string) => apiClient.delete<{ ok: boolean }>(`/commission/pay/${userId}`, { params: { period } }).then(data),

  /** Pickers for rule scope. Principals exist only with distribution on; the call is refused otherwise. */
  categories: () => apiClient.get<Array<{ id: string; name: string }>>('/categories').then((r) => (Array.isArray(r.data) ? r.data : (r.data as { data?: Array<{ id: string; name: string }> })?.data ?? [])),
  brands: () => apiClient.get<Array<{ id: string; name: string }>>('/brands').then((r) => (Array.isArray(r.data) ? r.data : (r.data as { data?: Array<{ id: string; name: string }> })?.data ?? [])),
  principals: () => apiClient.get<{ suppliers: Array<{ id: string; name: string; isPrincipal?: boolean }> }>('/distribution/principals').then(data),
  linkUser: (userId: string) => apiClient.post(`/staff/link-user/${userId}`, {}).then(data),
};
