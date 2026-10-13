/**
 * Tax section API: overview figures, the invoice list and one invoice,
 * retries, the monthly return report and per-authority settings. POS-side
 * calls (submit a sale, fiscal number on the bill) stay in
 * @integrations/tax-authority/taxAuthority.api.
 */

import { apiClient } from '@core/api/client';
import type { Fiscal } from '@integrations/tax-authority/taxAuthority.api';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export const TAX_KEY = 'tax';

export type Authority = 'PRA' | 'SRB' | 'KPRA' | 'FBR';
export type TaxStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'SKIPPED';
export type Env = 'sandbox' | 'live';

export interface Totals {
  bills: number; returns: number; saleValue: number; tax: number; total: number;
  grossValue: number; grossTax: number; returnValue: number; returnTax: number; returnTotal: number;
}
export interface DayTotals { day: string; bills: number; returns: number; saleValue: number; tax: number; total: number }
export interface Health { success: number; failed: number; pending: number; skipped: number; successRate: number | null; avgSeconds: number | null }
export interface NotSent { bills: number; value: number; tax: number }
export interface RateRow { rate: number; bills: number; saleValue: number; tax: number }
export interface AuthorityFigures { authority: Authority; totals: Totals; byRate: RateRow[]; health: Health; notSent: NotSent }

export interface TaxAnalytics {
  enabled: boolean; migrationPending: boolean;
  profiles: Array<{ authority: Authority; enabled: boolean; env: Env; startAt: string | null; terminals: number }>;
  period: { from: string; to: string }; bucket: 'day' | 'month';
  totals: Totals; notSent: NotSent; health: Health;
  byAuthority: Array<AuthorityFigures & { enabled: boolean; env: Env | null }>;
  series: DayTotals[];
  thisMonth: Totals & { month: string }; lastMonth: Totals & { month: string }; lastMonthToDate: Totals & { month: string };
  missing: number;
  recentFails: Array<{ id: string; authority: Authority; usin: string; error: string | null; attempts: number; nextAttemptAt: string | null }>;
}

export interface TaxInvoiceRow {
  id: string; authority: Authority; kind: 'SALE' | 'RETURN'; saleId: string; usin: string; posId: string; status: TaxStatus;
  fiscalNumber: string | null; qrText: string | null; saleValue: number; taxAmount: number; totalAmount: number; taxRate: number;
  error: string | null; attempts: number; createdAt: string; submittedAt: string | null; nextAttemptAt: string | null; shopId: string | null;
}
export interface InvoicePage {
  rows: TaxInvoiceRow[]; total: number; page: number; pages: number;
  counts: Partial<Record<TaxStatus, number>>; migrationPending?: boolean;
}
export interface InvoiceDetail extends TaxInvoiceRow {
  returnId: string; updatedAt: string; label: string; request: unknown; response: unknown; canRetry: boolean;
  sale: { id: string; saleNumber: string; soldAt: string; total: number; paymentMethod: string; status: string; source: string; customer: { name: string; phone: string | null } | null } | null;
  return: { id: string; returnNumber: string; returnedAt: string; refundAmount: number; reason: string | null } | null;
  shop: { id: string; name: string } | null;
  related: Array<{ id: string; authority: Authority; kind: 'SALE' | 'RETURN'; usin: string; status: TaxStatus; fiscalNumber: string | null; totalAmount: number; createdAt: string }>;
}

export interface ReportAuthority extends AuthorityFigures {
  name: string; businessName: string; ntn: string[]; posIds: Array<{ posId: string; branch: string }>;
}
export interface TaxReport {
  month: string; authority: Authority | null; business: string; period: { from: string; to: string };
  daily: DayTotals[]; totals: Totals; byRate: RateRow[];
  byShop: Array<{ shopId: string | null; name: string; bills: number; saleValue: number; tax: number }>;
  byAuthority: ReportAuthority[]; health: Health; notSent: NotSent;
  shopId: string | null; shopName: string | null; migrationPending: boolean; generatedAt: string;
}

export interface TerminalView { shopId: string | null; posId: string; ntn: string; user: string; hasSecret: boolean }
export interface ProfileView {
  authority: Authority; enabled: boolean; env: Env; businessName: string; pctCode: string; cashRate: number; cardRate: number;
  onlyPos: boolean; terminals: TerminalView[]; startAt: string | null;
}
export interface AuthorityInfo { name: string; province: string; portal: string; docs: string; fields: Array<{ key: string; label: string; secret?: boolean }> }
export interface TaxSettings {
  profiles: ProfileView[];
  authorities: Record<Authority, AuthorityInfo>;
  defaults: Record<Authority, { cash: number; card: number }>;
  shops: Array<{ id: string; name: string }>;
  activity: Partial<Record<Authority, { success: number; failed: number; pending: number; lastSentAt: string | null }>>;
  migrationPending: boolean;
  legacyFbr: { ntn: string | null; posId: string | null; businessName: string | null } | null;
}
export interface TerminalInput { shopId: string | null; posId: string; ntn: string; token?: string; user?: string; pass?: string; key?: string }
export interface ProfileInput {
  authority: Authority; enabled?: boolean; env: Env; businessName: string; pctCode: string; cashRate: number; cardRate: number; onlyPos: boolean; terminals: TerminalInput[];
}
export interface TestResult { ok: boolean; authority: Authority; posId: string; fiscalNumber: string | null; error: string | null; response: unknown }

export interface TaxFilter { from?: string; to?: string; authority?: Authority | ''; shopId?: string }
export interface InvoiceQuery extends TaxFilter { status?: TaxStatus | ''; kind?: 'SALE' | 'RETURN' | ''; search?: string; page?: number; limit?: number }
export interface ReportQuery { month: string; authority?: Authority | ''; shopId?: string }

/** Drops empty values so the URL stays short and the cache key stable. */
const clean = (q: object) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== null));

export const taxApi = {
  analytics: (q: TaxFilter) => apiClient.get('/tax-authority/analytics', { params: clean(q) }).then((r) => unwrap<TaxAnalytics>(r)),
  invoices: (q: InvoiceQuery) => apiClient.get('/tax-authority/invoices', { params: clean(q) }).then((r) => unwrap<InvoicePage>(r)),
  invoice: (id: string) => apiClient.get(`/tax-authority/invoices/${id}`).then((r) => unwrap<InvoiceDetail>(r)),
  retry: (id: string) => apiClient.post(`/tax-authority/invoices/${id}/retry`).then((r) => unwrap<Fiscal | { skipped: true; reason: string }>(r)),
  retryFailed: (authority?: Authority | '') => apiClient.post('/tax-authority/invoices/retry-failed', clean({ authority })).then((r) => unwrap<{ queued: number; running: boolean }>(r)),
  report: (q: ReportQuery) => apiClient.get('/tax-authority/report', { params: clean(q) }).then((r) => unwrap<TaxReport>(r)),
  reportCsv: async (q: ReportQuery) => {
    const r = await apiClient.get('/tax-authority/report.csv', { params: clean(q), responseType: 'blob' });
    const url = URL.createObjectURL(r.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-${q.authority || 'sab'}-${q.month}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },
  settings: () => apiClient.get('/tax-authority').then((r) => unwrap<TaxSettings>(r)),
  save: (b: ProfileInput) => apiClient.put('/tax-authority', b).then((r) => unwrap<TaxSettings>(r)),
  test: (b: { authority: Authority; shopId: string | null }) => apiClient.post('/tax-authority/test', b, { timeout: 20_000 }).then((r) => unwrap<TestResult>(r)),
};
