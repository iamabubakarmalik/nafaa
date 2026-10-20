import { apiClient } from '@core/api/client';

/** Counter exchanges (size / colour) of the last 30 days in the selected branch. */
export interface ShoeExchangeSummary {
  last30Days?: { count: number; value: number };
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const shoeExchangesApi = {
  summary: () => apiClient.get('/shoe/exchanges/summary').then(unwrap<ShoeExchangeSummary>),
};
