import { apiClient } from '@/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const gymDashboardApi = {
  overview: () => apiClient.get('/gym/dashboard/overview').then(unwrap<any>),
};
