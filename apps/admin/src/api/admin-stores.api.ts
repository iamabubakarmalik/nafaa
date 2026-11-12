/**
 * Nafaa Stores (merchant websites) across all shops: overview, store list and
 * detail, store actions, domains monitor, platform controls and the abuse
 * report queue. Server: `/api/admin/stores` (area `stores`).
 */

import { apiClient } from './client';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;
const get = <T>(url: string, params?: Record<string, unknown>) => apiClient.get<{ data: T }>(url, { params }).then(unwrap);
const post = <T>(url: string, body?: unknown) => apiClient.post<{ data: T }>(url, body).then(unwrap);
const put = <T>(url: string, body?: unknown) => apiClient.put<{ data: T }>(url, body).then(unwrap);
const patch = <T>(url: string, body?: unknown) => apiClient.patch<{ data: T }>(url, body).then(unwrap);

export type ThemeId = 'fashion' | 'electronics' | 'grocery' | 'beauty';
export const THEME_IDS: ThemeId[] = ['fashion', 'electronics', 'grocery', 'beauty'];
export type StoreStatus = 'DRAFT' | 'PASSWORD' | 'LIVE' | 'CLOSED';
export type DomainStatus = 'PENDING' | 'VERIFYING' | 'ACTIVE' | 'ERROR';
export type PolicyKind = 'refund' | 'privacy' | 'terms' | 'shipping';
export const POLICY_KINDS: PolicyKind[] = ['refund', 'privacy', 'terms', 'shipping'];
export type ReportStatus = 'OPEN' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED';
export const REPORT_STATUSES: ReportStatus[] = ['OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED'];
export type ReportReason = 'SCAM' | 'FAKE_PRODUCTS' | 'NOT_DELIVERED' | 'OFFENSIVE' | 'COPYRIGHT' | 'OTHER';
export type PaymentKey = 'COD' | 'SAFEPAY' | 'JAZZCASH' | 'EASYPAISA';

export interface ListPage<T> { items: T[]; total: number; page: number; pages: number }

export interface StoresOverview {
  days: number;
  counts: { total: number; DRAFT: number; PASSWORD: number; LIVE: number; CLOSED: number; suspended: number; withCustomDomain: number };
  totals: { orders: number; gmv: number; visitors: number; conversion: number; aov: number };
  daily: Array<{ date: string; orders: number; gmv: number; visitors: number }>;
  topStores: Array<{ id: string; name: string; slug: string; tenantId: string; tenantName: string | null; orders: number; gmv: number; visitors: number }>;
  domains: { active: number; pending: number; error: number };
  openReports: number;
}

export interface StoreDomainRow { id: string; hostname: string; status: DomainStatus; isPrimary: boolean; sslReady: boolean; error: string | null }

export interface AdminStoreRow {
  id: string; name: string; slug: string; status: StoreStatus; suspended: boolean; forcedPassword: boolean; themeId: ThemeId;
  tenant: { id: string; name: string | null; email: string | null; phone: string | null };
  subdomain: string;
  domains: StoreDomainRow[];
  entitled: boolean;
  lastPublishedAt: string | null; orders30d: number; gmv30d: number; createdAt: string; launchedAt: string | null;
}

export interface StoreSettingsView {
  logoUrl?: string | null; tagline?: string | null;
  contact?: { phone?: string | null; whatsapp?: string | null; email?: string | null; address?: string | null; hours?: string | null };
  languages?: { default: string; enabled: string[] };
  seo?: { title?: string | null; description?: string | null; noindex?: boolean };
  password?: { message?: string | null };
  catalogMode?: 'ALL' | 'CHOSEN';
  showOutOfStock?: boolean;
  tracking?: Record<string, string | null>;
  whatsappButton?: { enabled?: boolean; number?: string | null };
  [key: string]: unknown;
}

export interface CheckoutView {
  loginMode: 'guest' | 'optional' | 'required';
  payments: { cod: boolean; SAFEPAY: boolean; JAZZCASH: boolean; EASYPAISA: boolean };
  advance: { mode: 'off' | 'shop_rule' | 'always_cod'; percent: number; minOrder: number | null };
  minOrder: number | null; maxCodOrder: number | null; codConfirmWhatsApp: boolean;
  [key: string]: unknown;
}

export interface AdminStoreDetail extends AdminStoreRow {
  settings: StoreSettingsView | null;
  checkout: CheckoutView;
  suspendReason: string | null;
  integration: { id: string; status: string; isActive: boolean } | null;
  url: string;
  stats30d: { visitors: number; orders: number; gmv: number; conversion: number };
  recentOrders: Array<{ id: string; orderNumber: string; total: number; status: string; receivedAt: string }>;
  reports: Array<{ id: string; reason: ReportReason; status: ReportStatus; createdAt: string }>;
  impersonate: { tenantId: string; path: string };
  /** Last theme file import (Shopify theme zip or Nafaa theme file). */
  lastThemeImport?: { importedAt: string; source: 'shopify' | 'nafaa'; themeName: string; themeVersion: string | null; status: string; skipped: number; sections: number } | null;
}

export interface ThemeVersionRow { id: string; version: number; status: string; note: string | null; themeId: ThemeId; publishedAt: string | null; publishedBy: string | null; updatedAt: string }

export interface DnsRecord { type: 'A' | 'CNAME' | 'TXT'; name: string; value: string; ok: boolean | null }

export interface StoreDomain {
  id: string; hostname: string; isPrimary: boolean; kind: 'apex' | 'www' | 'sub'; status: DomainStatus; redirectTo: string | null;
  records: DnsRecord[]; error: string | null; lastCheckedAt: string | null; sslReady: boolean;
  /** Detached by the Nafaa admin; only Retry puts it back on hosting. */
  removedByNafaa?: boolean;
}

/** Result of attaching every store's free `<slug>.<root>` address to hosting. */
export interface AttachSubdomainsResult { ready: boolean; total: number; alreadyLive: number; live: number; waiting: number; failed: number }

export interface DomainMonitorRow extends StoreDomain {
  createdAt: string;
  store: { id: string; name: string; slug: string; tenantId: string };
}

export interface StoreControls {
  themes: Record<ThemeId, { enabled: boolean; featured: boolean }>;
  policyTemplates: Partial<Record<PolicyKind, { title: string; bodyHtml: string }>>;
  payments: Record<PaymentKey, boolean>;
  maxCustomDomains: number;
  maxStoresPerShop: number;
  blockedKeywords: string[];
  blockedDomains: string[];
  checkout: { paused: boolean; message: string | null };
  banner: { enabled: boolean; message: string | null; tone: 'info' | 'warning' };
}

export type StoreControlsView = StoreControls & { rootDomain: string; vercelReady: boolean; storefrontUrl: string };

export interface AbuseReportRow {
  id: string; reason: ReportReason; details: string | null; reporterName: string | null; contact: string | null; pageUrl: string | null;
  status: ReportStatus; adminNote: string | null; createdAt: string; resolvedAt: string | null;
  store: { id: string; name: string; slug: string; status: StoreStatus; suspended: boolean };
}

export interface StoresListQuery {
  search?: string; status?: StoreStatus | 'SUSPENDED'; domain?: 'custom' | 'none' | 'error'; theme?: ThemeId;
  sort?: 'newest' | 'orders' | 'gmv' | 'name'; page?: number; limit?: number;
}

export const adminStoresApi = {
  overview: (days = 30) => get<StoresOverview>('/admin/stores/overview', { days }),
  list: (q: StoresListQuery) => get<ListPage<AdminStoreRow>>('/admin/stores', q as Record<string, unknown>),
  detail: (id: string) => get<AdminStoreDetail>(`/admin/stores/${id}`),
  themeHistory: (id: string) => get<{ items: ThemeVersionRow[] }>(`/admin/stores/${id}/theme-history`),

  suspend: (id: string, reason: string) => post<{ ok: true }>(`/admin/stores/${id}/suspend`, { reason }),
  unsuspend: (id: string) => post<{ ok: true }>(`/admin/stores/${id}/unsuspend`),
  forcePassword: (id: string, on: boolean, message?: string) => post<{ ok: true }>(`/admin/stores/${id}/force-password`, { on, ...(message ? { message } : {}) }),
  revalidate: (id: string) => post<{ ok: true; sent: boolean }>(`/admin/stores/${id}/revalidate`),
  verifyDomain: (id: string, domainId: string) => post<StoreDomain>(`/admin/stores/${id}/domains/${domainId}/verify`),
  removeFromVercel: (id: string, domainId: string) => post<{ ok: true }>(`/admin/stores/${id}/domains/${domainId}/remove-vercel`),

  domains: (q: { status?: DomainStatus; search?: string; page?: number }) =>
    get<ListPage<DomainMonitorRow> & { ready: boolean }>('/admin/stores/domains', q as Record<string, unknown>),
  retryDomain: (domainId: string) => post<StoreDomain>(`/admin/stores/domains/${domainId}/retry`),
  attachAllSubdomains: () => post<AttachSubdomainsResult>('/admin/stores/subdomains/attach-all'),

  controls: () => get<StoreControlsView>('/admin/stores/controls'),
  saveControls: (body: Partial<StoreControls>) => put<StoreControls>('/admin/stores/controls', body),

  reports: (q: { status?: ReportStatus; storeId?: string; page?: number }) =>
    get<ListPage<AbuseReportRow> & { counts: Record<ReportStatus, number> }>('/admin/stores/reports', q as Record<string, unknown>),
  updateReport: (reportId: string, body: { status: ReportStatus; adminNote?: string }) => patch<AbuseReportRow>(`/admin/stores/reports/${reportId}`, body),
};
