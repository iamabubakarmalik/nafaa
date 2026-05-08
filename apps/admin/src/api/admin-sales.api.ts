import { apiClient } from './client';

export interface AdminSale {
  id: string;
  saleNumber: string;
  total: number;
  paidAmount: number;
  creditAmount: number;
  paymentMethod: string;
  status: string;
  soldAt: string;
  tenant: { id: string; name: string };
  customer?: { id: string; name: string } | null;
  createdBy?: { id: string; fullName: string } | null;
}

export interface SalesStats {
  totalCount: number;
  todayCount: number;
  monthCount: number;
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  totalProfit: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminSalesApi = {
  stats: () => apiClient.get<{ data: SalesStats }>('/admin/sales/stats').then(unwrap),
  list: (params?: { search?: string; tenantId?: string; page?: number; limit?: number }) =>
    apiClient
      .get<{ data: { items: AdminSale[]; meta: any } }>('/admin/sales', { params })
      .then(unwrap),
};
