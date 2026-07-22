import { apiClient } from '@/api/client';

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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const bulkPricingApi = {
  create: (data: Partial<BulkPricing>) => apiClient.post('/hardware/bulk-pricing', data).then(unwrap<BulkPricing>),
  listByProduct: (productId: string) => apiClient.get('/hardware/bulk-pricing/by-product/' + productId).then(unwrap<BulkPricing[]>),
  update: (id: string, data: Partial<BulkPricing>) => apiClient.patch('/hardware/bulk-pricing/' + id, data).then(unwrap<BulkPricing>),
  remove: (id: string) => apiClient.delete('/hardware/bulk-pricing/' + id).then(unwrap),
  calculate: (productId: string, quantity: number) =>
    apiClient.get('/hardware/bulk-pricing/calculate', { params: { productId, quantity } }).then(unwrap<any>),
};
