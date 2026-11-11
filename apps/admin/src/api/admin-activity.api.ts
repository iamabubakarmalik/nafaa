import { apiClient } from './client';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export interface ActivityRow {
  id: string;
  tenantId: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  description: string;
  createdAt: string;
  user?: { id: string; fullName: string; role: string } | null;
  tenant?: { id: string; name: string } | null;
}

export interface ActivityParams {
  tenantId?: string; search?: string; entityType?: string; adminOnly?: boolean; from?: string; to?: string; page?: number; limit?: number;
}

export interface ActivityPage {
  items: ActivityRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  stats: { total: number; today: number; last7d: number; entityTypes: Array<{ type: string; count: number }> };
}

export const adminActivityApi = {
  list: (params?: { tenantId?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: ActivityRow[] }>('/admin/activity', { params }).then(unwrap),
  paged: (params: ActivityParams) =>
    apiClient.get<{ data: ActivityPage }>('/admin/activity', { params: { ...params, adminOnly: params.adminOnly ? 1 : undefined, paged: 1 } }).then(unwrap),
};
