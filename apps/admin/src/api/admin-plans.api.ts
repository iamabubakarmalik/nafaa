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
  _count?: { subscriptions: number };
}

export type UpsertPlanPayload = Omit<AdminPlan, 'id' | '_count'>;

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
