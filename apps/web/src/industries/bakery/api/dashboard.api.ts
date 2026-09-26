import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const bakeryDashboardApi = {
  overview: (shopId?: string) =>
    apiClient
      .get('/bakery/dashboard/overview', { params: shopId ? { shopId } : {} })
      .then(unwrap<any>),

  /** `days=1` sirf aaj, `days=7` hafte ka rozana ausat. */
  salesByHour: (days = 1, shopId?: string) =>
    apiClient
      .get('/bakery/dashboard/sales-by-hour', {
        params: { days, ...(shopId ? { shopId } : {}) },
      })
      .then(unwrap<any>),

  /** Paisa kahan hai — maal, kharcha, lena, dena, cash. */
  moneyMap: (shopId?: string) =>
    apiClient
      .get('/bakery/dashboard/money-map', { params: shopId ? { shopId } : {} })
      .then(unwrap<any>),
};
