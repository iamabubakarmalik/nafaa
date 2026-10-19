import { apiClient } from '@core/api/client';

export interface BulkPricing {
  id: string;
  productId: string;
  minQuantity: number;
  maxQuantity?: number;
  price: number;
  discount?: number;
  discountPct?: number;
  label?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** One active tier as the list endpoint returns it. */
export type Tier = Pick<BulkPricing, 'id' | 'productId' | 'minQuantity' | 'maxQuantity' | 'price' | 'label'>;

const unwrap = <T,>(res: { data: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const bulkPricingApi = {
  all: () => apiClient.get('/hardware/bulk-pricing').then(unwrap<Tier[]>),
  create: (data: Partial<BulkPricing>) => apiClient.post('/hardware/bulk-pricing', data).then(unwrap<BulkPricing>),
  listByProduct: (productId: string) => apiClient.get('/hardware/bulk-pricing/by-product/' + productId).then(unwrap<BulkPricing[]>),
  update: (id: string, data: Partial<BulkPricing>) => apiClient.patch('/hardware/bulk-pricing/' + id, data).then(unwrap<BulkPricing>),
  remove: (id: string) => apiClient.delete('/hardware/bulk-pricing/' + id).then(unwrap),
};
