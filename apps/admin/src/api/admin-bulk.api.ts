import { apiClient } from './client';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminBulkApi = {
  updateStatus: (tenantIds: string[], status: string, reason?: string) =>
    apiClient
      .post<{ data: { updatedCount: number } }>('/admin/bulk/tenants/status', {
        tenantIds, status, reason,
      })
      .then(unwrap),
  broadcast: (tenantIds: string[], title: string, message: string) =>
    apiClient
      .post<{ data: { sentCount: number } }>('/admin/bulk/broadcast', {
        tenantIds, title, message,
      })
      .then(unwrap),
};
