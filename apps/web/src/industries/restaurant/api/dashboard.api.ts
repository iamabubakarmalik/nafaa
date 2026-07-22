import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const restaurantDashboardApi = {
  overview: (shopId?: string) =>
    apiClient.get('/restaurant/dashboard/overview', { params: shopId ? { shopId } : {} }).then(unwrap<any>),

  ordersByHour: (shopId?: string) =>
    apiClient.get('/restaurant/dashboard/orders-by-hour', { params: shopId ? { shopId } : {} }).then(unwrap<any[]>),

  kitchenPerformance: () =>
    apiClient.get('/restaurant/dashboard/kitchen-performance').then(unwrap<any>),
};
