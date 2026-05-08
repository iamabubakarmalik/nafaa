import { apiClient } from './client';

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: { id: string; fullName: string } | null;
}

export interface UpsertSettingPayload {
  key: string;
  value: string;
  category?: string;
  description?: string;
  isPublic?: boolean;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminSettingsApi = {
  list: () => apiClient.get<{ data: SystemSetting[] }>('/admin/settings').then(unwrap),
  byCategory: (category: string) =>
    apiClient.get<{ data: SystemSetting[] }>(`/admin/settings/category/${category}`).then(unwrap),
  upsert: (payload: UpsertSettingPayload) =>
    apiClient.post<{ data: SystemSetting }>('/admin/settings', payload).then(unwrap),
  bulk: (settings: UpsertSettingPayload[]) =>
    apiClient.post<{ data: { count: number } }>('/admin/settings/bulk', { settings }).then(unwrap),
  seedDefaults: () =>
    apiClient.post<{ data: any }>('/admin/settings/seed-defaults').then(unwrap),
};
