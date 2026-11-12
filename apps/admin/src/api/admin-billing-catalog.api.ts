import { apiClient } from './client';

export type FeatureGroup = 'Core' | 'Business' | 'Growth' | 'Advanced' | 'Add-on';
export interface FeatureDef { key: string; label: string; group: FeatureGroup; hint?: string }
export type LimitKey = 'users' | 'shops' | 'products' | 'salesPerMonth' | 'bookers';
export type AddOnKind = 'FLAT' | 'PER_UNIT' | 'ONE_TIME';
export type TenantAddOnStatus = 'ACTIVE' | 'PENDING_PAYMENT' | 'PAST_DUE' | 'CANCELLED';
export type BillingState = 'trial' | 'active' | 'free' | 'grace' | 'expired';

export interface FeatureCatalog { features: FeatureDef[]; limitKeys: LimitKey[]; unlimited: number }

export interface AdminAddOn {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  kind: AddOnKind;
  priceMonthly: number;
  unitLabel: string | null;
  grantsFeatures: string[];
  grantsLimits: Partial<Record<LimitKey, number>> | null;
  bundleKeys: string[];
  availableOnPlans: string[];
  isPublic: boolean;
  isActive: boolean;
  comingSoon: boolean;
  sortOrder: number;
  shops: { total: number; paying: number; free: number; pendingPayment: number; pastDue: number; units: number };
}

export type AddOnInput = Omit<AdminAddOn, 'id' | 'shops' | 'key'> & { key?: string };

export interface BillingSettings {
  trialDays: number;
  graceDays: number;
  addOnPayDays: number;
  renewalLeadDays: number;
  reminderDays: number[];
  grandfatherNoticeDays: number[];
  /** Yearly plans get Assisted setup free and its price off Full activation. */
  yearlyFreeSetup: boolean;
}

export interface SetupRequest {
  id: string;
  service: { key: string; name: string; priceMonthly: number };
  shop: { id: string; name: string; phone: string | null; businessType: string | null; owner: { fullName: string; email: string; phone: string | null } | null };
  paidAmount: number | null;
  invoiceNumber: string | null;
  boughtAt: string;
  status: 'pending' | 'done';
  doneNote: string | null;
  updatedAt: string;
}

export interface RevenueSummary {
  mrr: number;
  planMrr: number;
  addOnMrr: number;
  payingShops: number;
  states: Record<BillingState, number>;
  graceAtRisk: number;
  graceDays: number;
  byPlan: Array<{ planId: string; name: string; slug: string; isFree: boolean; isActive: boolean; active: number; paying: number; trial: number; grace: number; free: number; mrr: number }>;
  addOns: Array<{ key: string; name: string; category: string; kind: AddOnKind; paying: number; free: number; pendingPayment: number; pastDue: number; mrr: number }>;
  grandfathered: { count: number; byDay: Array<{ date: string; count: number }> };
  payments30: { total: number; count: number; daily: Array<{ date: string; amount: number; count: number }> };
}

export interface InvoiceItem { id: string; kind: string; description: string; quantity: number; unitPrice: number; amount: number }

export interface ShopBilling {
  entitlements: {
    state: BillingState;
    plan: { id: string; slug: string; name: string; isFree: boolean } | null;
    subscriptionId: string | null;
    interval: string | null;
    trialEndsAt: string | null;
    periodEnd: string | null;
    blocksAt: string | null;
    graceDaysLeft: number | null;
    grandfatheredUntil: string | null;
    features: string[];
    limits: Record<LimitKey, number>;
    apps: string[];
    /** Paused by an admin (older APIs leave these out). */
    paused?: boolean;
    pausedUntil?: string | null;
    pauseReason?: string | null;
  };
  usage: Record<LimitKey, number>;
  plan: { id: string; name: string; slug: string; isFree: boolean; features: string[]; limits: Record<'users' | 'shops' | 'products' | 'salesPerMonth', number>; priceMonthly: number } | null;
  subscriptions: Array<{
    id: string; status: string; interval: string; amount: number; trialEndsAt: string | null; currentPeriodStart: string; currentPeriodEnd: string; createdAt: string;
    plan: { id: string; name: string; slug: string; isFree: boolean };
  }>;
  addOns: Array<{
    id: string; quantity: number; status: TenantAddOnStatus; unitPrice: number | null; source: string; startedAt: string;
    currentPeriodEnd: string | null; paymentDueAt: string | null; freeUntil: string | null; cancelAtPeriodEnd: boolean; cancelledAt: string | null; note: string | null;
    addOn: { id: string; key: string; name: string; category: string; kind: AddOnKind; priceMonthly: number; unitLabel: string | null; isActive: boolean; comingSoon: boolean };
  }>;
  invoices: Array<{
    id: string; invoiceNumber: string; status: string; total: number; amountDue: number; description: string | null; dueDate: string; paidAt: string | null; createdAt: string;
    items: InvoiceItem[];
    payments: Array<{ id: string; status: string; amount: number; provider: string; createdAt: string }>;
  }>;
  deals: { extraFeatures: string[]; limitOverrides: Partial<Record<LimitKey, number>>; billingGrandfatherUntil: string | null };
  catalog: {
    addOns: Array<{ id: string; key: string; name: string; category: string; kind: AddOnKind; priceMonthly: number; unitLabel: string | null; isActive: boolean; comingSoon: boolean; bundleKeys: string[] }>;
    features: FeatureDef[];
    limitKeys: LimitKey[];
    unlimited: number;
  };
}

export type GiveAddOnPayload =
  | { key: string; quantity: number; mode: 'forever'; note?: string }
  | { key: string; quantity: number; mode: 'free_until'; freeUntil: string; note?: string }
  | { key: string; quantity: number; mode: 'custom_price'; unitPrice: number; note?: string };

export interface ShopDealsPayload {
  extraFeatures?: string[];
  limitOverrides?: Partial<Record<LimitKey, number | null>> | null;
  billingGrandfatherUntil?: string | null;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const ADDON_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'integrations', label: 'Integrations' },
  { value: 'sales', label: 'Sales channels' },
  { value: 'operations', label: 'Operations' },
  { value: 'capacity', label: 'Capacity' },
  { value: 'services', label: 'Services' },
];

export const LIMIT_LABELS: Record<LimitKey, string> = {
  users: 'Users', shops: 'Shops', products: 'Products', salesPerMonth: 'Bills a month', bookers: 'Bookers',
};

export const adminBillingCatalogApi = {
  features: () => apiClient.get<{ data: FeatureCatalog }>('/admin/billing-catalog/features').then(unwrap),
  addOns: () => apiClient.get<{ data: AdminAddOn[] }>('/admin/billing-catalog/addons').then(unwrap),
  createAddOn: (payload: AddOnInput) => apiClient.post<{ data: AdminAddOn }>('/admin/billing-catalog/addons', payload).then(unwrap),
  updateAddOn: (id: string, payload: Omit<AddOnInput, 'key'>) => apiClient.patch<{ data: AdminAddOn }>(`/admin/billing-catalog/addons/${id}`, payload).then(unwrap),
  setups: (params: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: { items: SetupRequest[]; meta: { page: number; limit: number; total: number; totalPages: number }; stats: { open: number } } }>('/admin/setups', { params }).then(unwrap),
  markSetupDone: (id: string, note?: string) => apiClient.post(`/admin/setups/${id}/done`, { note }).then(unwrap),
  settings: () => apiClient.get<{ data: BillingSettings }>('/admin/billing-catalog/settings').then(unwrap),
  saveSettings: (payload: BillingSettings) => apiClient.put<{ data: BillingSettings }>('/admin/billing-catalog/settings', payload).then(unwrap),
  runLifecycle: () => apiClient.post<{ data: { ran: boolean; result: Record<string, number> } }>('/admin/billing-catalog/run-lifecycle').then(unwrap),
  revenue: () => apiClient.get<{ data: RevenueSummary }>('/admin/billing-catalog/revenue').then(unwrap),
};

export const adminShopBillingApi = {
  get: (tenantId: string) => apiClient.get<{ data: ShopBilling }>(`/admin/tenants/${tenantId}/billing`).then(unwrap),
  updateDeals: (tenantId: string, payload: ShopDealsPayload) => apiClient.patch<{ data: ShopBilling }>(`/admin/tenants/${tenantId}/billing`, payload).then(unwrap),
  giveAddOn: (tenantId: string, payload: GiveAddOnPayload) => apiClient.post<{ data: ShopBilling }>(`/admin/tenants/${tenantId}/addons`, payload).then(unwrap),
  removeAddOn: (tenantId: string, key: string) => apiClient.delete<{ data: ShopBilling }>(`/admin/tenants/${tenantId}/addons/${encodeURIComponent(key)}`).then(unwrap),
};
