import { apiClient } from '@/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const jewelryDashboardApi = {
  overview: () => apiClient.get('/jewelry/dashboard/overview').then(unwrap<any>),
};
