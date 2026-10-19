import { apiClient } from '@core/api/client';

export interface ProductionLine { productId: string; name: string; unit: string; quantity: number; unitCost: number }
export interface ProductionBatch {
  reference: string;
  date: string;
  shopId: string | null;
  shopName: string | null;
  note: string | null;
  source: ProductionLine | null;
  outputs: ProductionLine[];
  yieldPct: number | null;
  cost: number;
  cancelled: boolean;
}
export interface ProductionList {
  items: ProductionBatch[];
  totals: { batches: number; milkUsed: number; cost: number; made: Array<{ name: string; unit: string; quantity: number }> };
}

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const dairyProductionApi = {
  list: (params: { from?: string; to?: string }) => apiClient.get('/dairy/production', { params }).then(unwrap<ProductionList>),
  create: (data: { sourceProductId?: string; sourceQty: number; outputs: Array<{ productId: string; quantity: number }>; notes?: string }) =>
    apiClient.post('/dairy/production', data).then(unwrap<ProductionBatch & { warnings: string[] }>),
  cancel: (ref: string, reason?: string) => apiClient.post(`/dairy/production/${ref}/cancel`, { reason }).then(unwrap<ProductionBatch>),
};
