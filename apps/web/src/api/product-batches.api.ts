import { apiClient } from './client';

export interface ProductBatch {
  id: string;
  tenantId: string;
  productId: string;
  variantId?: string | null;
  batchNumber: string;
  manufactureDate?: string | null;
  expiryDate?: string | null;
  quantity: number;
  costPrice: number;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; unit: string };
  variant?: { id: string; name: string } | null;
}

export interface UpsertBatchPayload {
  batchNumber: string;
  variantId?: string;
  manufactureDate?: string;
  expiryDate?: string;
  quantity: number;
  costPrice?: number;
  notes?: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const productBatchesApi = {
  list: (productId: string) =>
    apiClient
      .get<{ data: ProductBatch[] }>(`/products/${productId}/batches`)
      .then(unwrap),
  expiringSoon: (days = 30) =>
    apiClient
      .get<{ data: ProductBatch[] }>('/product-batches/expiring-soon', { params: { days } })
      .then(unwrap),
  expired: () =>
    apiClient
      .get<{ data: ProductBatch[] }>('/product-batches/expired')
      .then(unwrap),
  create: (productId: string, payload: UpsertBatchPayload) =>
    apiClient
      .post<{ data: ProductBatch }>(`/products/${productId}/batches`, payload)
      .then(unwrap),
  update: (productId: string, id: string, payload: UpsertBatchPayload) =>
    apiClient
      .patch<{ data: ProductBatch }>(`/products/${productId}/batches/${id}`, payload)
      .then(unwrap),
  remove: (productId: string, id: string) =>
    apiClient
      .delete<{ data: any }>(`/products/${productId}/batches/${id}`)
      .then(unwrap),
};
