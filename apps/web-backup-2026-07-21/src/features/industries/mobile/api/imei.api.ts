import { apiClient } from '@/api/client';

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
  APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  NON_PTA: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
  PATCH: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  PENDING: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  EXEMPT: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
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
  byPta?: Array<{
    ptaStatus: PtaStatus;
    count: number;
    taxPaid: number;
  }>;
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

  // ─── Global list with filters ─────────────────────────────
  listAll: (params?: {
    search?: string;
    status?: ImeiStatus;
    ptaStatus?: PtaStatus;
    productId?: string;
    variantId?: string;
    page?: number;
    limit?: number;
  }) =>
    apiClient.get('/industries/mobile/imei', { params }).then(unwrap) as Promise<{
      items: any[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>,

  // ─── Stock recalc (admin tool) ────────────────────────────
  recalcStocks: () =>
    apiClient.post('/industries/mobile/imei/recalc-stocks').then(unwrap) as Promise<{
      message: string;
      productsUpdated: number;
      variantsUpdated: number;
    }>,
};
