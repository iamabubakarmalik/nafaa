import { apiClient } from './client';

export interface AdminPlan {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  priceMonthly: number;
  priceQuarterly: number;
  priceYearly: number;
  trialDays: number;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  maxProducts: number;
  maxUsers: number;
  maxShops: number;
  maxSalesPerMonth: number;
  featurePos: boolean;
  featureBarcodeScanner: boolean;
  featureMultiShop: boolean;
  featureReports: boolean;
  featureProfitReport: boolean;
  featureLoyalty: boolean;
  featureDiscounts: boolean;
  featureKhata: boolean;
  featureExports: boolean;
  featureBackup: boolean;
  featureNotifications: boolean;
  featureCashRegister: boolean;
  featureStockTransfer: boolean;
  featureReturns: boolean;
  featureSupport24x7: boolean;
  featureWhatsappReceipt: boolean;
  featureCustomBranding: boolean;
  /** Wholesale & distribution (booker app, routes, load sheets); priced per booker login. */
  featureDistribution?: boolean;
  /** Feature keys the plan includes (see the billing feature catalog). */
  features: string[];
  /** The always-free plan for very small shops. */
  isFree: boolean;
  _count?: { subscriptions: number };
  /** Shops on the plan right now. */
  subscribers?: { active: number; trial: number; pastDue: number };
}

/** What the plan editor sends; the server keeps the old feature columns in step with `features`. */
export type UpsertPlanPayload = Pick<AdminPlan,
  'name' | 'slug' | 'priceMonthly' | 'priceQuarterly' | 'priceYearly' | 'trialDays' | 'isActive' | 'isPublic' | 'sortOrder'
  | 'maxProducts' | 'maxUsers' | 'maxShops' | 'maxSalesPerMonth' | 'features' | 'isFree'> & { description?: string };

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminPlansApi = {
  list: () => apiClient.get<{ data: AdminPlan[] }>('/admin/plans').then(unwrap),
  create: (payload: UpsertPlanPayload) =>
    apiClient.post<{ data: AdminPlan }>('/admin/plans', payload).then(unwrap),
  update: (id: string, payload: UpsertPlanPayload) =>
    apiClient.patch<{ data: AdminPlan }>(`/admin/plans/${id}`, payload).then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/admin/plans/${id}`).then(unwrap),
};
