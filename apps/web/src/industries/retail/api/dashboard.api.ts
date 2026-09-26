import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const retailDashboardApi = {
  overview: (shopId?: string) =>
    apiClient
      .get('/retail/dashboard/overview', { params: shopId ? { shopId } : {} })
      .then(unwrap<any>),

  /** `days=1` sirf aaj, `days=7` hafte ka rozana ausat. */
  salesByHour: (days = 1, shopId?: string) =>
    apiClient
      .get('/retail/dashboard/sales-by-hour', {
        params: { days, ...(shopId ? { shopId } : {}) },
      })
      .then(unwrap<any>),

  /** Paisa kahan hai — stock, kharcha, lena-dena, cash. */
  moneyMap: (shopId?: string) =>
    apiClient
      .get('/retail/dashboard/money-map', { params: shopId ? { shopId } : {} })
      .then(unwrap<any>),

  slowMovers: (days = 30) =>
    apiClient
      .get('/retail/dashboard/slow-movers', { params: { days } })
      .then(unwrap<any[]>),
};
