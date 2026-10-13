/**
 * Audit report API: the overview (totals, charts, staff risk, watch list),
 * the paged event timeline and the login history. Cost fields are missing
 * for users without cost access, so they are optional.
 */

import { apiClient } from '@core/api/client';

export type AuditType =
  | 'void' | 'refund' | 'discount' | 'below_cost' | 'pin' | 'drawer' | 'cash_out'
  | 'stock_loss' | 'damage' | 'transfer_short' | 'expense_deleted' | 'settings' | 'login';
export type Severity = 'high' | 'medium' | 'low';
export type EventSort = 'new' | 'old' | 'amount' | 'severity';
export type LoginStatus = 'all' | 'failed' | 'new' | 'after';

/** Period, branch, staff and the limits that decide what counts as unusual. */
export interface AuditFilters {
  from: string;
  to: string;
  branch?: string;
  staffId?: string;
  discountPct?: number;
  big?: number;
  open?: string;
  close?: string;
}

export interface AuditSummary {
  events: number; high: number; medium: number; low: number; afterHours: number;
  voids: number; voidValue: number; refunds: number; refundValue: number; cashRefunds: number; cashRefundValue: number;
  discounts: number; discountValue: number; belowCost: number;
  drawerShort: number; drawerOver: number; shortCount: number; overCount: number;
  cashOuts: number; cashOutValue: number; losses: number; pinFailed: number; pinApproved: number;
  settings: number; failedLogins: number; newDevices: number;
  /** Stock written off, damaged or short in transfers, at cost. */
  cost?: number;
}

export interface StaffRisk {
  id: string | null; name: string; role: string | null; shop: string | null;
  bills: number; sales: number;
  voids: number; voidValue: number; refunds: number; refundValue: number; cashRefunds: number;
  discounts: number; discountValue: number; belowCost: number;
  drawerShort: number; drawerOver: number; shortCount: number; cashOut: number;
  /** Stock loss at cost. */
  cost?: number;
  pinFailed: number; afterHours: number; events: number; high: number;
  points: number; score: number; level: Severity; topType: AuditType | null;
}

export interface Insight { tone: 'bad' | 'warn'; title: string; text: string; userId?: string | null; type?: AuditType; eventId?: string }

export interface AuditOverview {
  range: { from: string; to: string; grouping: 'day' | 'month' };
  settings: { discountPct: number; big: number; hours: string; maxDiscountPct: number; branch: string | null };
  totals: AuditSummary & { bills: number; sales: number; voidRate: number; refundRate: number };
  previous: AuditSummary | null;
  byType: Array<{ type: AuditType; count: number; amount: number; cost?: number; high: number }>;
  trend: Array<{ key: string; high: number; medium: number; low: number }>;
  hours: Array<{ hour: number; high: number; medium: number; low: number }>;
  staff: StaffRisk[];
  shops: Array<{ id: string; name: string; events: number; high: number; voids: number; refundValue: number; drawerShort: number }>;
  watch: Insight[];
  people: Array<{ id: string; name: string; role: string }>;
  failed: string[];
  capped: boolean;
}

export interface AuditEvent {
  id: string;
  type: AuditType;
  at: string;
  userId: string | null;
  userName: string | null;
  shopId: string | null;
  shopName: string | null;
  title: string;
  detail: string | null;
  amount: number;
  cost?: number;
  flags: string[];
  severity: Severity;
  afterHours: boolean;
  ref: { kind: string; id: string | null; code: string | null };
}

export interface EventQuery extends AuditFilters {
  type?: AuditType;
  severity?: Severity;
  search?: string;
  sort?: EventSort;
  page?: number;
  limit?: number;
}

export interface EventPage {
  items: AuditEvent[];
  total: number;
  page: number;
  hasMore: boolean;
  counts: Partial<Record<AuditType, number>>;
  severities: Record<Severity, number>;
  failed: string[];
  capped: boolean;
}

export interface LoginRow {
  id: string; userId: string; userName: string; email: string; success: boolean; failureReason: string | null;
  deviceName: string | null; location: string | null; ipAddress: string | null; isNewDevice: boolean; afterHours: boolean; createdAt: string;
}

export interface LoginReport {
  totals: { logins: number; failed: number; newDevices: number; afterHours: number; devices: number; people: number; hours: string };
  people: Array<{ id: string; name: string; logins: number; failed: number; newDevices: number; afterHours: number; devices: number; last: string | null }>;
  hours: Array<{ hour: number; ok: number; failed: number }>;
  items: LoginRow[];
  total: number;
  page: number;
  hasMore: boolean;
  capped: boolean;
}

export const AUDIT_KEY = 'audit-report';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;
const clean = (q: object) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== ''));

export const auditApi = {
  overview: (q: AuditFilters) => apiClient.get<{ data: AuditOverview }>('/reports/audit', { params: clean(q) }).then(unwrap),
  events: (q: EventQuery) => apiClient.get<{ data: EventPage }>('/reports/audit/events', { params: clean(q) }).then(unwrap),
  logins: (q: AuditFilters & { status?: LoginStatus; page?: number; limit?: number }) =>
    apiClient.get<{ data: LoginReport }>('/reports/audit/logins', { params: clean(q) }).then(unwrap),
};
