import { apiClient } from '@core/api/client';

export interface CosmeticsBatch {
  id: string;
  productId: string;
  batchNumber: string;
  manufactureDate?: string;
  expiryDate?: string;
  quantity: number;
  currentStock: number;
  costPrice?: number;
  supplierRef?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const cosmeticsBatchesApi = {
  create: (data: Partial<CosmeticsBatch>) =>
    apiClient.post('/cosmetics/batches', data).then(unwrap<CosmeticsBatch>),

  list: (params?: {
    productId?: string; status?: string;
    expiringInDays?: number; expired?: boolean; search?: string;
  }) => apiClient.get('/cosmetics/batches', { params }).then(unwrap<CosmeticsBatch[]>),

  expiryAlerts: () => apiClient.get('/cosmetics/batches/expiry-alerts').then(unwrap<any>),

  markExpired: () => apiClient.post('/cosmetics/batches/mark-expired').then(unwrap<any>),

  byProduct: (productId: string) =>
    apiClient.get('/cosmetics/batches/by-product/' + productId).then(unwrap<CosmeticsBatch[]>),

  getOne: (id: string) => apiClient.get('/cosmetics/batches/' + id).then(unwrap<CosmeticsBatch>),

  update: (id: string, data: Partial<CosmeticsBatch>) =>
    apiClient.patch('/cosmetics/batches/' + id, data).then(unwrap<CosmeticsBatch>),

  remove: (id: string) => apiClient.delete('/cosmetics/batches/' + id).then(unwrap),
};
