import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const garmentsDashboardApi = {
  overview: (shopId?: string) =>
    apiClient.get('/garments/dashboard/overview', { params: shopId ? { shopId } : {} }).then(unwrap<any>),
};
