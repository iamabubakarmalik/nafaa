import { apiClient } from '@core/api/client';

export type ImeiStatus = 'IN_STOCK' | 'SOLD' | 'RETURNED' | 'DAMAGED' | 'RESERVED' | 'LOST';

export type PtaStatus = 'APPROVED' | 'NON_PTA' | 'PATCH' | 'PENDING' | 'EXEMPT';

export const PTA_STATUS_LABELS: Record<PtaStatus, string> = {
  APPROVED: 'PTA Approved',
  NON_PTA: 'Non-PTA',
  PATCH: 'Patched',
  PENDING: 'PTA baqi',
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
  shopId?: string | null;
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
  color?: string | null;
  notes?: string | null;
  purchasedAt?: string | null;
  createdAt: string;
  product?: { id: string; name: string; price?: number };
  variant?: { id: string; name: string; color?: string | null; price?: number | null };
}

interface ImeiWarranty { months: number; start: string | null; end: string | null; active: boolean; daysLeft: number | null }

/** One phone in the IMEI list, with its bill, shelf age and warranty. */
export interface ImeiRow extends Omit<ProductImei, 'product' | 'variant'> {
  product: { id: string; name: string; sku: string | null; price: number; brand: { name: string } | null };
  variant: { id: string; name: string; color: string | null; colorHex: string | null; price: number | null } | null;
  shop: { id: string; name: string } | null;
  salePrice: number;
  sale: { id: string; saleNumber: string; status: string; customer: { id: string; name: string; phone: string | null } | null } | null;
  daysInStock: number | null;
  warranty: ImeiWarranty;
}

export type ImeiSort = 'new' | 'old' | 'costHigh' | 'costLow' | 'sold';

export interface ImeiListParams {
  search?: string;
  status?: ImeiStatus;
  ptaStatus?: PtaStatus;
  productId?: string;
  variantId?: string;
  shopId?: string;
  agedDays?: number;
  from?: string;
  to?: string;
  sort?: ImeiSort;
  page?: number;
  limit?: number;
}

export interface ImeiListPage {
  items: ImeiRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Partial<Record<ImeiStatus, number>>;
  totals: { cost: number; sold: number };
}

export interface CreateImeiPayload {
  productId: string;
  variantId?: string;
  shopId?: string;
  imei1: string;
  imei2?: string;
  serialNumber?: string;
  ptaStatus?: PtaStatus;
  ptaTaxPaid?: number;
  costPrice?: number;
  warrantyMonths?: number;
  color?: string;
  notes?: string;
  status?: ImeiStatus;
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
  shopId?: string;
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
  retailValue?: number;
  aged60?: number;
  soldToday?: number;
  soldThisMonth?: number;
  soldThisMonthValue?: number;
  soldThisMonthCost?: number;
  byPta?: Array<{ ptaStatus: PtaStatus; count: number; taxPaid: number }>;
}

/** Everything known about one IMEI: new stock, buy-backs and repairs. */
interface ImeiLookup {
  code: string;
  luhnOk: boolean | null;
  newPhones: Array<{
    id: string; imei1: string; imei2: string | null; serialNumber: string | null; color: string | null; status: ImeiStatus;
    ptaStatus: PtaStatus; costPrice: number; soldPrice: number | null; purchasedAt: string | null; soldAt: string | null; notes: string | null;
    product: { id: string; name: string; price: number; brand: { name: string } | null }; variant: { id: string; name: string } | null;
    shop: { id: string; name: string } | null;
    sale: { id: string; saleNumber: string; status: string; createdAt: string; price: number; customer: { id: string; name: string; phone: string | null } | null } | null;
    warranty: ImeiWarranty;
  }>;
  usedPhones: Array<{
    id: string; usedPhoneCode: string; brand: string; model: string; storage: string | null; status: string; condition: string; source: string;
    buybackPrice: number; resalePrice: number; finalSoldPrice: number | null; receivedAt: string; soldAt: string | null;
    fromCustomerName: string | null; fromCustomerPhone: string | null; fromCustomerCnic: string | null; ptaStatus: PtaStatus;
    sale: { id: string; saleNumber: string; customer: { name: string; phone: string | null } | null } | null;
  }>;
  repairs: Array<{
    id: string; ticketNumber: string; status: string; deviceBrand: string; deviceModel: string; reportedIssue: string; diagnosedIssue: string | null;
    receivedAt: string; deliveredAt: string | null; warrantyEnds: string | null; warrantyActive: boolean; totalCost: number; customerName: string; customerPhone: string;
    warrantyOf: { id: string; ticketNumber: string } | null;
  }>;
}

/** Phones on the shelf per product next to the branch stock. */
interface ImeiShelfCount { productId: string; name: string; total: number; inStock: number; stock: number }

/** What left with each bill: IMEIs, used phones, trade-ins and EMI plans. */
export interface ImeiForSales {
  imeis: Array<{ saleId: string; saleItemId: string; imei1: string; imei2: string | null; ptaStatus: PtaStatus; warrantyMonths: number | null; status: ImeiStatus }>;
  used: Array<{ saleId: string; saleItemId: string; usedPhoneCode: string; imei1: string; condition: string; ptaStatus: PtaStatus }>;
  tradeIns: Array<{ saleId: string; amount: number; reference: string | null; note: string | null }>;
  plans: Array<{ id: string; saleId: string | null; planNumber: string; status: string; remainingAmount: number }>;
}

const unwrap = (res: { data?: unknown }) => {
  const body = res?.data as { data?: unknown } | undefined;
  return body?.data !== undefined ? body.data : body;
};

export const imeiApi = {
  stats: (shopId?: string) =>
    apiClient.get('/industries/mobile/imei/stats', { params: { shopId } }).then(unwrap) as Promise<ImeiStats>,

  listByProduct: (productId: string, status?: ImeiStatus) =>
    apiClient.get(`/industries/mobile/imei/product/${productId}`, { params: { status } }).then(unwrap) as Promise<ProductImei[]>,

  listByVariant: (variantId: string, status?: ImeiStatus) =>
    apiClient.get(`/industries/mobile/imei/variant/${variantId}`, { params: { status } }).then(unwrap) as Promise<ProductImei[]>,

  available: (productId: string, variantId?: string) =>
    apiClient
      .get(`/industries/mobile/imei/product/${productId}/available`, { params: { variantId } })
      .then(unwrap) as Promise<ProductImei[]>,

  bulkCreate: (payload: BulkCreateImeiPayload) =>
    apiClient.post('/industries/mobile/imei/bulk', payload).then(unwrap) as Promise<{ count: number; message: string; badChecksum: string[] }>,

  update: (id: string, payload: Partial<CreateImeiPayload>) =>
    apiClient.patch(`/industries/mobile/imei/${id}`, payload).then(unwrap) as Promise<ProductImei>,

  remove: (id: string) =>
    apiClient.delete(`/industries/mobile/imei/${id}`).then(unwrap),

  listAll: (params?: ImeiListParams) =>
    apiClient.get('/industries/mobile/imei', { params }).then(unwrap) as Promise<ImeiListPage>,

  lookup: (code: string) =>
    apiClient.get('/industries/mobile/imei/lookup', { params: { code } }).then(unwrap) as Promise<ImeiLookup>,

  shelfCounts: (shopId?: string) =>
    apiClient.get('/industries/mobile/imei/shelf-counts', { params: { shopId } }).then(unwrap) as Promise<ImeiShelfCount[]>,

  forSales: (saleIds: string[]) =>
    apiClient.get('/industries/mobile/imei/for-sales', { params: { ids: saleIds.join(',') } }).then(unwrap) as Promise<ImeiForSales>,

  recalcStocks: () =>
    apiClient.post('/industries/mobile/imei/recalc-stocks').then(unwrap) as Promise<{ message: string; productsUpdated: number; variantsUpdated: number }>,
};
