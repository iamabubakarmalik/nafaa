import { apiClient } from './client';

export interface TenantSettings {
  id: string;
  tenantId: string;
  shopName?: string | null;
  shopAddress?: string | null;
  shopPhone?: string | null;
  shopEmail?: string | null;
  logoUrl?: string | null;
  taxRate: number;
  taxNumber?: string | null;
  receiptFooter?: string | null;
  receiptHeader?: string | null;
  enableTax: boolean;
}

export interface UpdateSettingsPayload {
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  shopEmail?: string;
  logoUrl?: string;
  taxRate?: number;
  taxNumber?: string;
  receiptFooter?: string;
  receiptHeader?: string;
  enableTax?: boolean;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const settingsApi = {
  get: () =>
    apiClient.get<{ data: { settings: TenantSettings; tenant: any } }>('/settings').then(unwrap),
  update: (payload: UpdateSettingsPayload) =>
    apiClient.patch<{ data: TenantSettings }>('/settings', payload).then(unwrap),
};
