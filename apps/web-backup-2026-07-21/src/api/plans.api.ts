import { apiClient } from './client';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  priceMonthly: number;
  priceQuarterly: number;
  priceYearly: number;
  trialDays: number;
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
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const plansApi = {
  list: () => apiClient.get<{ data: Plan[] }>('/plans').then(unwrap),
};
