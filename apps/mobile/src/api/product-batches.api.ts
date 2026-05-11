import { apiClient } from './client';

export interface ProductBatch {
  id: string;
  productId: string;
  variantId?: string | null;
  batchNumber: string;
  manufactureDate?: string | null;
  expiryDate?: string | null;
  quantity: number;
  costPrice: number;
  notes?: string | null;
  isActive: boolean;
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

export const productBatchesApi = {
  list: (productId: string) =>
    apiClient
      .get<ProductBatch[]>(`/products/${productId}/batches`)
      .then((r) => r.data),
  expiringSoon: (days = 30) =>
    apiClient
      .get<ProductBatch[]>('/product-batches/expiring-soon', { params: { days } })
      .then((r) => r.data),
  expired: () =>
    apiClient.get<ProductBatch[]>('/product-batches/expired').then((r) => r.data),
  create: (productId: string, payload: UpsertBatchPayload) =>
    apiClient
      .post<ProductBatch>(`/products/${productId}/batches`, payload)
      .then((r) => r.data),
  update: (productId: string, id: string, payload: UpsertBatchPayload) =>
    apiClient
      .patch<ProductBatch>(`/products/${productId}/batches/${id}`, payload)
      .then((r) => r.data),
  remove: (productId: string, id: string) =>
    apiClient.delete(`/products/${productId}/batches/${id}`).then((r) => r.data),
};
