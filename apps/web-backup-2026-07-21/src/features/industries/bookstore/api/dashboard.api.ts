import { apiClient } from '@/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const bookstoreDashboardApi = {
  overview: () => apiClient.get('/bookstore/dashboard/overview').then(unwrap<any>),
};
