import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const retailDashboardApi = {
  overview: (shopId?: string) =>
    apiClient
      .get('/retail/dashboard/overview', { params: shopId ? { shopId } : {} })
      .then(unwrap<any>),

  salesByHour: (shopId?: string) =>
    apiClient
      .get('/retail/dashboard/sales-by-hour', { params: shopId ? { shopId } : {} })
      .then(unwrap<any[]>),

  slowMovers: (days = 30) =>
    apiClient
      .get('/retail/dashboard/slow-movers', { params: { days } })
      .then(unwrap<any[]>),
};
