import { apiClient } from './client';

export type ImeiStatus = 'IN_STOCK' | 'SOLD' | 'RETURNED' | 'DAMAGED' | 'RESERVED' | 'LOST';

export interface ProductImei {
  id: string;
  productId: string;
  variantId?: string | null;
  imei1: string;
  imei2?: string | null;
  serialNumber?: string | null;
  status: ImeiStatus;
  costPrice: number;
  soldPrice?: number | null;
  warrantyMonths?: number | null;
  warrantyExpiry?: string | null;
  color?: string | null;
  notes?: string | null;
  purchasedAt?: string | null;
  createdAt: string;
}

export interface CreateImeiPayload {
  productId: string;
  variantId?: string;
  imei1: string;
  imei2?: string;
  serialNumber?: string;
  costPrice?: number;
  warrantyMonths?: number;
  color?: string;
}

export interface BulkImeiItem {
  imei1: string;
  imei2?: string;
  serialNumber?: string;
  color?: string;
}

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const imeiApi = {
  stats: () => apiClient.get('/industries/mobile/imei/stats').then(unwrap) as Promise<{ total: number; inStock: number; sold: number; returned: number }>,
  listByProduct: (productId: string) => apiClient.get(`/industries/mobile/imei/product/${productId}`).then(unwrap) as Promise<ProductImei[]>,
  available: (productId: string, variantId?: string) =>
    apiClient.get(`/industries/mobile/imei/product/${productId}/available`, { params: { variantId } }).then(unwrap) as Promise<ProductImei[]>,
  create: (payload: CreateImeiPayload) => apiClient.post('/industries/mobile/imei', payload).then(unwrap) as Promise<ProductImei>,
  bulkCreate: (payload: { productId: string; variantId?: string; costPrice?: number; warrantyMonths?: number; imeis: BulkImeiItem[] }) =>
    apiClient.post('/industries/mobile/imei/bulk', payload).then(unwrap) as Promise<{ count: number; message: string }>,
  remove: (id: string) => apiClient.delete(`/industries/mobile/imei/${id}`).then(unwrap),
};
