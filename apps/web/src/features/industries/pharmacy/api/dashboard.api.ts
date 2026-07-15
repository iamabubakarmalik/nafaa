import { apiClient } from '@/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const pharmacyDashboardApi = {
  overview: (shopId?: string) =>
    apiClient.get('/pharmacy/dashboard/overview', { params: shopId ? { shopId } : {} }).then(unwrap<any>),
  expiring: (days = 90) =>
    apiClient.get('/pharmacy/dashboard/expiring', { params: { days } }).then(unwrap<any[]>),
};
