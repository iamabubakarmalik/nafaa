import { apiClient } from '@core/api/client';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export interface FoodpandaVendor { remoteId: string; vendorCode: string; shopId: string | null; name?: string }
export interface FoodpandaChannel {
  id: string; displayName: string; isActive: boolean; chainCode: string; prepMinutes: number; autoAccept: boolean;
  vendors: FoodpandaVendor[];
  availability?: Record<string, { timestamp: string; closures: Array<{ reason?: string; start?: string; end?: string }> }>;
  lastMenuImportRequest?: { remoteId: string; at: string } | null;
}
export interface FoodpandaOverview {
  configured: boolean; environment: 'staging' | 'production'; pluginBaseUrl: string;
  shops: { id: string; name: string }[]; channels: FoodpandaChannel[];
}

export const foodpandaApi = {
  overview: () => apiClient.get('/online-store/foodpanda').then((r) => unwrap<FoodpandaOverview>(r)),
  save: (b: { channelId?: string; displayName?: string; chainCode: string; prepMinutes: number; autoAccept: boolean; vendors: Array<Partial<FoodpandaVendor>> }) =>
    apiClient.post('/online-store/foodpanda', b).then((r) => unwrap<FoodpandaOverview>(r)),
  setActive: (id: string, active: boolean) => apiClient.patch(`/online-store/foodpanda/${id}/active`, { active }).then((r) => unwrap<FoodpandaOverview>(r)),
};
