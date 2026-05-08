import { apiClient } from './client';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminImpersonateApi = {
  impersonate: (tenantId: string) =>
    apiClient.post<{ data: any }>(`/admin/impersonate/${tenantId}`).then(unwrap),
};
