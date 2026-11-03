/**
 * Settings API (same endpoints and shapes as the web organization/settings
 * module): the business settings record, receipt design, notification
 * preferences, reports config and daily summary, business type and features,
 * backup, activity log and the danger zone. All of it needs internet.
 */

import { apiClient } from '@/core/api/client';
import type { ReceiptDesign } from '@/core/receipt';

export interface TenantSettings {
  id: string;
  shopName?: string | null;
  legalName?: string | null;
  shopAddress?: string | null;
  shopCity?: string | null;
  shopProvince?: string | null;
  shopPostalCode?: string | null;
  shopPhone?: string | null;
  shopWhatsapp?: string | null;
  shopEmail?: string | null;
  shopWebsite?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  businessType?: string | null;
  establishedDate?: string | null;
  language: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  /** Hour the business day starts (0-23). */
  businessDayStartHour?: number;
  firstDayOfWeek: string;
  openTime?: string | null;
  closeTime?: string | null;
  workingDays: string[];
  enableTax: boolean;
  taxRate: number;
  taxInclusive: boolean;
  taxNumber?: string | null;
  taxLabel: string;
  allowNegativeStock: boolean;
  manufacturingEnabled?: boolean;
  defaultLowStockAlert: number;
  allowCredit: boolean;
  defaultCreditLimit: number;
  enableLoyalty: boolean;
  loyaltyPointsPerRupee: number;
  loyaltyRedemptionRate: number;
  loyaltyMinRedeem?: number;
  loyaltyMaxRedeemPercent?: number;
  loyaltyExpiryDays?: number;
  emailNotifications: boolean;
  notifyLowStock: boolean;
  notifyDailySummary: boolean;
  dailySummaryTime: string;
  shopWhatsappTemplates?: unknown;
  whatsappTemplates?: Record<string, string> | null;
  hasManagerPin?: boolean;
  [key: string]: unknown;
}

const data = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const settingsApi = {
  get: () => data(apiClient.get<{ settings: TenantSettings; tenant: Record<string, unknown> }>('/settings')),
  update: (patch: Partial<TenantSettings>) => data(apiClient.patch<TenantSettings>('/settings', patch)),
  saveReceiptDesign: (patch: Partial<ReceiptDesign>) => data(apiClient.patch<ReceiptDesign>('/settings/receipt-config', patch)),
  testPush: () => apiClient.post('/settings/notifications/test', { channel: 'push' }).then((r) => r.data),
  backupStats: () => data(apiClient.get<Record<string, number>>('/settings/backup/stats')),
  exportData: (entities: string[], format: 'json' | 'csv' | 'excel') => data(apiClient.post<Record<string, unknown>>('/settings/backup/export', { entities, format })),
  deleteTenant: (confirmation: string, currentPassword: string) => data(apiClient.post<{ message?: string }>('/settings/danger/delete-tenant', { confirmation, currentPassword })),
  cancelDeletion: () => data(apiClient.post('/settings/danger/cancel-deletion')),
};

/* ───────── Business type and features ───────── */

export type BusinessFeatures = Record<string, boolean>;

export interface BusinessConfig {
  businessType: string;
  defaultUnit: string;
  currency?: string;
  features: BusinessFeatures;
  template: { label: string; labelUrdu?: string; emoji: string; description: string; quickUnits: string[]; suggestedCategories: string[] };
}

export const businessConfigApi = {
  get: () => data(apiClient.get<Partial<BusinessConfig>>('/onboarding/business-config')).then((c): BusinessConfig => ({
    businessType: c.businessType || 'GENERAL',
    defaultUnit: c.defaultUnit || 'pcs',
    currency: c.currency,
    features: { ...(c.features ?? {}) },
    template: { label: '', emoji: '', description: '', quickUnits: [], suggestedCategories: [], ...(c.template ?? {}) },
  })),
  updateFeatures: (features: BusinessFeatures) => data(apiClient.patch<{ features: BusinessFeatures }>('/onboarding/business-features', { features })),
  changeType: (businessType: string) => data(apiClient.post<Partial<BusinessConfig>>('/onboarding/change-business-type', { businessType })),
  options: () => data(apiClient.get<{ businessTypes: Array<{ value: string; label: string }> }>('/onboarding/options')),
  setModels: (businessModels: string[]) => data(apiClient.put<{ businessModels: string[]; distributionMode?: string | null }>('/onboarding/business-models', { businessModels })),
};

/* ───────── Reports config and daily summary ───────── */

export type SummaryChannel = 'app' | 'email' | 'whatsapp';
export type SummaryPart = 'returns' | 'voids' | 'discount' | 'payments' | 'drawer' | 'profit' | 'expenses' | 'khata' | 'lowStock' | 'topItems' | 'topStaff' | 'branches' | 'trend';
export type ReportFigure = 'profit' | 'drawer';

export interface ReportsConfig {
  fiscalYearStartMonth: number;
  defaultPeriod: string;
  compareDefault: 'prev' | 'year' | 'off';
  roundOff: 'paisa' | 'rupee';
  staffFigures: ReportFigure[];
  creditProfit: 'paid' | 'bill';
  summary: { channels: SummaryChannel[]; recipientIds: string[] | null; include: SummaryPart[] };
}
export type ReportsConfigPatch = Partial<Omit<ReportsConfig, 'summary'>> & { summary?: Partial<ReportsConfig['summary']> };

export interface DailySummaryStatus {
  enabled: boolean;
  time: string;
  timezone: string;
  nextRunAt: string | null;
  nextDay: string;
  today: string;
  emailOn: boolean;
  recipients: Array<{ id: string; name: string; role: string; branch: string | null; selected: boolean; hasEmail: boolean; seesProfit: boolean; seesDrawer: boolean }>;
  recent: Array<{ day: string; at: string; auto: boolean; people: number }>;
}

export const reportsConfigApi = {
  get: () => data(apiClient.get<ReportsConfig>('/settings/reports-config')),
  update: (patch: ReportsConfigPatch) => data(apiClient.patch<ReportsConfig>('/settings/reports-config', patch)),
  status: () => data(apiClient.get<DailySummaryStatus>('/reports/daily-summary')),
  preview: (date?: string) => data(apiClient.get<{ message: { title: string; body: string } }>('/reports/daily-summary/preview', { params: date ? { date } : {} })),
  send: (date?: string) => data(apiClient.post<{ day: string; sent: number; emailed: number }>('/reports/daily-summary/send', date ? { date } : {})),
};

/* ───────── Backup and activity log ───────── */

export interface BackupSummary {
  meta: { exportedAt: string; tenantName?: string };
  counts: Record<string, number>;
  lastBackup?: { at: string; by: string | null } | null;
}
export interface ExportLogEntry { id: string; action?: string; description: string; metadata?: { bytes?: number } | null; createdAt: string; user?: { fullName: string } | null }

export const backupApi = {
  summary: () => data(apiClient.get<BackupSummary>('/backup/summary')),
  history: () => data(apiClient.get<ExportLogEntry[]>('/backup/history')),
};

export interface ActivityEntry {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  description: string;
  createdAt: string;
  user?: { id: string; fullName: string; role: string } | null;
}
export interface ActivityFeed {
  items: ActivityEntry[];
  nextCursor: string | null;
  total: number;
  facets: { users: Array<{ id: string; name: string; role: string | null; count: number }>; actions: Array<{ key: string; count: number }>; entities: Array<{ key: string; count: number }> };
}
export interface ActivityFilters { from?: string; to?: string; userId?: string; action?: string; entity?: string; search?: string }

export const activityApi = {
  feed: (f: ActivityFilters, cursor?: string, limit = 40) => data(apiClient.get<ActivityFeed>('/activity-log/feed', { params: { ...f, ...(cursor && { cursor }), limit } })),
};

/** Wholesale / distribution mode that follows the business models (same call the web makes). */
export const setDistributionMode = (mode: string) => apiClient.put('/distribution/settings', { mode }).then((r) => r.data);

/* ───────── File exports ───────── */

export type ExportKind = 'sales' | 'products' | 'customers' | 'suppliers' | 'expenses' | 'purchases' | 'ledger' | 'stock-movements';
export interface ExportHistoryEntry { id: string; description: string; createdAt: string; user?: { fullName: string } | null }
export const exportsApi = { history: () => data(apiClient.get<ExportHistoryEntry[]>('/exports/history')) };
