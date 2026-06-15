import { apiClient } from '@/api/client';

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
  saleItemId?: string | null;
  soldAt?: string | null;
  soldPrice?: number | null;
  warrantyMonths?: number | null;
  warrantyExpiry?: string | null;
  color?: string | null;
  notes?: string | null;
  purchasedAt?: string | null;
  createdAt: string;
  product?: { id: string; name: string };
  variant?: { id: string; name: string; color?: string | null };
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
  notes?: string;
}

export interface BulkImeiItem {
  imei1: string;
  imei2?: string;
  serialNumber?: string;
  color?: string;
}

export interface BulkCreateImeiPayload {
  productId: string;
  variantId?: string;
  costPrice?: number;
  warrantyMonths?: number;
  imeis: BulkImeiItem[];
}

export interface ImeiStats {
  total: number;
  inStock: number;
  sold: number;
  returned: number;
}

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const imeiApi = {
  stats: () =>
    apiClient.get('/industries/mobile/imei/stats').then(unwrap) as Promise<ImeiStats>,

  search: (q: string) =>
    apiClient.get('/industries/mobile/imei/search', { params: { q } }).then(unwrap) as Promise<ProductImei[]>,

  listByProduct: (productId: string, status?: ImeiStatus) =>
    apiClient
      .get(`/industries/mobile/imei/product/${productId}`, { params: { status } })
      .then(unwrap) as Promise<ProductImei[]>,

  listByVariant: (variantId: string, status?: ImeiStatus) =>
    apiClient
      .get(`/industries/mobile/imei/variant/${variantId}`, { params: { status } })
      .then(unwrap) as Promise<ProductImei[]>,

  available: (productId: string, variantId?: string) =>
    apiClient
      .get(`/industries/mobile/imei/product/${productId}/available`, { params: { variantId } })
      .then(unwrap) as Promise<ProductImei[]>,

  create: (payload: CreateImeiPayload) =>
    apiClient.post('/industries/mobile/imei', payload).then(unwrap) as Promise<ProductImei>,

  bulkCreate: (payload: BulkCreateImeiPayload) =>
    apiClient.post('/industries/mobile/imei/bulk', payload).then(unwrap) as Promise<{ count: number; message: string }>,

  update: (id: string, payload: Partial<CreateImeiPayload>) =>
    apiClient.patch(`/industries/mobile/imei/${id}`, payload).then(unwrap) as Promise<ProductImei>,

  remove: (id: string) =>
    apiClient.delete(`/industries/mobile/imei/${id}`).then(unwrap),

  getOne: (id: string) =>
    apiClient.get(`/industries/mobile/imei/${id}`).then(unwrap) as Promise<ProductImei>,
};
