import { apiClient } from './client';

export interface PlanUsage {
  plan: { id: string; name: string; slug: string };
  usage: {
    products: { current: number; limit: number };
    users: { current: number; limit: number };
    shops: { current: number; limit: number };
    salesThisMonth: { current: number; limit: number };
  };
  features: {
    pos: boolean;
    barcodeScanner: boolean;
    multiShop: boolean;
    reports: boolean;
    profitReport: boolean;
    loyalty: boolean;
    discounts: boolean;
    khata: boolean;
    exports: boolean;
    backup: boolean;
    notifications: boolean;
    cashRegister: boolean;
    stockTransfer: boolean;
    returns: boolean;
    support24x7: boolean;
    whatsappReceipt: boolean;
    customBranding: boolean;
  };
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const planUsageApi = {
  me: () => apiClient.get<{ data: PlanUsage }>('/plan-usage').then(unwrap),
};
