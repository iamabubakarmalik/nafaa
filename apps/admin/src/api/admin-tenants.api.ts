import { apiClient } from './client';

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'EXPIRED';

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  phone?: string | null;
  status: TenantStatus;
  referralCode?: string | null;
  accountCredit: number;
  createdAt: string;
  _count: {
    users: number;
    products: number;
    sales: number;
    customers: number;
  };
  subscriptions: Array<{
    id: string;
    status: string;
    interval: string;
    amount: number;
    currentPeriodEnd: string;
    plan: { id: string; name: string; slug: string };
  }>;
}

export interface TenantsResponse {
  items: AdminTenant[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminTenantsApi = {
  list: (params?: { search?: string; status?: TenantStatus; page?: number; limit?: number }) =>
    apiClient
      .get<{ data: TenantsResponse }>('/admin/tenants', { params })
      .then(unwrap),
  getOne: (id: string) =>
    apiClient.get<{ data: any }>(`/admin/tenants/${id}`).then(unwrap),
  updateStatus: (id: string, status: TenantStatus, reason?: string) =>
    apiClient
      .patch<{ data: AdminTenant }>(`/admin/tenants/${id}/status`, { status, reason })
      .then(unwrap),
  remove: (id: string) =>
    apiClient
      .delete<{ data: { message: string } }>(`/admin/tenants/${id}`)
      .then(unwrap),
};
