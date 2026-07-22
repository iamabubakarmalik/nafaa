import { apiClient } from '@/api/client';

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
  createdAt: string;
  product?: { id: string; name: string; unit: string };
  variant?: { id: string; name: string };
}

export interface CreateBatchPayload {
  productId: string;
  variantId?: string;
  batchNumber: string;
  manufactureDate?: string;
  expiryDate?: string;
  quantity: number;
  costPrice?: number;
  notes?: string;
}

export interface BatchStats {
  total: number;
  expiringSoon: number;
  expired: number;
  totalQuantity: number;
}

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const batchesApi = {
  stats: () =>
    apiClient.get('/industries/pharmacy/batches/stats').then(unwrap) as Promise<BatchStats>,

  expiringSoon: (days: number = 30) =>
    apiClient.get('/industries/pharmacy/batches/expiring-soon', { params: { days } }).then(unwrap) as Promise<ProductBatch[]>,

  expired: () =>
    apiClient.get('/industries/pharmacy/batches/expired').then(unwrap) as Promise<ProductBatch[]>,

  listByProduct: (productId: string) =>
    apiClient.get(`/industries/pharmacy/batches/product/${productId}`).then(unwrap) as Promise<ProductBatch[]>,

  available: (productId: string, variantId?: string) =>
    apiClient.get(`/industries/pharmacy/batches/product/${productId}/available`, { params: { variantId } })
      .then(unwrap) as Promise<ProductBatch[]>,

  create: (payload: CreateBatchPayload) =>
    apiClient.post('/industries/pharmacy/batches', payload).then(unwrap) as Promise<ProductBatch>,

  update: (id: string, payload: Partial<CreateBatchPayload>) =>
    apiClient.patch(`/industries/pharmacy/batches/${id}`, payload).then(unwrap) as Promise<ProductBatch>,

  remove: (id: string) =>
    apiClient.delete(`/industries/pharmacy/batches/${id}`).then(unwrap),
};
