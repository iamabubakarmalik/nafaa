import { apiClient } from './client';

export type ImeiStatus = 'IN_STOCK' | 'SOLD' | 'RETURNED' | 'DAMAGED' | 'RESERVED' | 'LOST';
export type PtaStatus = 'APPROVED' | 'NON_PTA' | 'PATCH' | 'PENDING' | 'EXEMPT';

export const PTA_STATUS_LABELS: Record<PtaStatus, string> = {
  APPROVED: 'PTA Approved',
  NON_PTA: 'Non-PTA',
  PATCH: 'Patched',
  PENDING: 'Pending',
  EXEMPT: 'Exempt',
};

export const PTA_STATUS_COLORS: Record<PtaStatus, { bg: string; text: string; border: string }> = {
  APPROVED: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  NON_PTA: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  PATCH: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  PENDING: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  EXEMPT: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
};

export interface ProductImei {
  id: string;
  productId: string;
  variantId?: string | null;
  imei1: string;
  imei2?: string | null;
  serialNumber?: string | null;
  ptaStatus: PtaStatus;
  ptaTaxPaid: number;
  ptaTaxDueAt?: string | null;
  ptaVerifiedAt?: string | null;
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
  ptaStatus?: PtaStatus;
  ptaTaxPaid?: number;
  ptaTaxDueAt?: string;
  ptaVerifiedAt?: string;
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
  ptaStatus?: PtaStatus;
  ptaTaxPaid?: number;
  notes?: string;
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
  damaged?: number;
  reserved?: number;
  lost?: number;
  stockValue?: number;
  byPta?: Array<{ ptaStatus: PtaStatus; count: number; taxPaid: number }>;
}

const unwrap = <T = any>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data) as T;

export const imeiApi = {
  stats: (): Promise<ImeiStats> =>
    apiClient.get('/industries/mobile/imei/stats').then(unwrap) as any,

  search: (q: string): Promise<ProductImei[]> =>
    apiClient.get('/industries/mobile/imei/search', { params: { q } }).then(unwrap) as any,

  listByProduct: (productId: string, status?: ImeiStatus): Promise<ProductImei[]> =>
    apiClient
      .get(`/industries/mobile/imei/product/${productId}`, { params: { status } })
      .then(unwrap) as any,

  listByVariant: (variantId: string, status?: ImeiStatus): Promise<ProductImei[]> =>
    apiClient
      .get(`/industries/mobile/imei/variant/${variantId}`, { params: { status } })
      .then(unwrap) as any,

  available: (productId: string, variantId?: string): Promise<ProductImei[]> =>
    apiClient
      .get(`/industries/mobile/imei/product/${productId}/available`, { params: { variantId } })
      .then(unwrap) as any,

  create: (payload: CreateImeiPayload): Promise<ProductImei> =>
    apiClient.post('/industries/mobile/imei', payload).then(unwrap) as any,

  bulkCreate: (payload: BulkCreateImeiPayload): Promise<{ count: number; message: string }> =>
    apiClient.post('/industries/mobile/imei/bulk', payload).then(unwrap) as any,

  update: (id: string, payload: Partial<CreateImeiPayload>): Promise<ProductImei> =>
    apiClient.patch(`/industries/mobile/imei/${id}`, payload).then(unwrap) as any,

  remove: (id: string): Promise<any> =>
    apiClient.delete(`/industries/mobile/imei/${id}`).then(unwrap) as any,

  getOne: (id: string): Promise<ProductImei> =>
    apiClient.get(`/industries/mobile/imei/${id}`).then(unwrap) as any,

  listAll: (params?: {
    search?: string;
    status?: ImeiStatus;
    ptaStatus?: PtaStatus;
    productId?: string;
    variantId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; total: number; page: number; limit: number; totalPages: number }> =>
    apiClient.get('/industries/mobile/imei', { params }).then(unwrap) as any,

  recalcStocks: (): Promise<{ message: string; productsUpdated: number; variantsUpdated: number }> =>
    apiClient.post('/industries/mobile/imei/recalc-stocks').then(unwrap) as any,
};
