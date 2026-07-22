import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const clinicDashboardApi = {
  overview: () => apiClient.get('/clinic/dashboard/overview').then(unwrap<any>),
};
