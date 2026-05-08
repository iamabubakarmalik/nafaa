import { apiClient } from './client';

export interface AdminCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  balance: number;
  loyaltyPoints: number;
  totalSpent: number;
  isActive: boolean;
  createdAt: string;
  tenant: { id: string; name: string };
}

export interface CustomersStats {
  total: number;
  withCredit: number;
  totalSpentPlatform: number;
  totalOutstandingCredit: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminCustomersApi = {
  stats: () => apiClient.get<{ data: CustomersStats }>('/admin/customers/stats').then(unwrap),
  list: (params?: { search?: string; tenantId?: string; hasCredit?: boolean; page?: number; limit?: number }) =>
    apiClient
      .get<{ data: { items: AdminCustomer[]; meta: any } }>('/admin/customers', { params })
      .then(unwrap),
};
