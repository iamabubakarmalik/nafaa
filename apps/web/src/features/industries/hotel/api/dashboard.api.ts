import { apiClient } from '@/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const hotelDashboardApi = {
  overview: () => apiClient.get('/hotel/dashboard/overview').then(unwrap<any>),
};
