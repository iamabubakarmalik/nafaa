import { apiClient } from './client';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminActivityApi = {
  list: (params?: { tenantId?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: any[] }>('/admin/activity', { params }).then(unwrap),
};
