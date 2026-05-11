import { apiClient } from './client';

export type PaymentMethod =
  | 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';

export interface CreateSalePayload {
  customerId?: string;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  discount?: number;
  allowCredit?: boolean;
  items: Array<{ productId: string; quantity: number }>;
}

export interface SaleItem {
  id: string;
  quantity: number;
  price: number;
  total: number;
  product: {
    id: string;
    name: string;
    unit: string;
    sku?: string | null;
    barcode?: string | null;
  };
}

export interface Sale {
  id: string;
  saleNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  creditAmount: number;
  paymentMethod: PaymentMethod;
  status: 'COMPLETED' | 'PARTIALLY_RETURNED' | 'FULLY_RETURNED' | 'VOIDED';
  soldAt: string;
  customer?: { id: string; name: string; phone?: string | null } | null;
  createdBy?: { id: string; fullName: string } | null;
  tenant?: { id: string; name: string };
  items: SaleItem[];
}

export interface SalesListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface SalesListResponse {
  items: Sale[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data) return body.data as T;
  return body as T;
}

function unwrapSalesList(res: any, params?: SalesListParams): SalesListResponse {
  const body = res?.data;
  let arr: Sale[] = [];

  if (Array.isArray(body)) arr = body;
  else if (Array.isArray(body?.data)) arr = body.data;
  else if (Array.isArray(body?.data?.items)) {
    return body.data;
  } else if (Array.isArray(body?.items)) {
    return body;
  }

  const filtered = params?.search
    ? arr.filter((s) =>
        s.saleNumber.toLowerCase().includes(params.search!.toLowerCase()),
      )
    : arr;

  const limit = params?.limit ?? 50;
  return {
    items: filtered.slice(0, limit),
    meta: { page: 1, limit, total: filtered.length, totalPages: 1 },
  };
}

export const salesApi = {
  create: (payload: CreateSalePayload): Promise<Sale> =>
    apiClient.post('/sales', payload).then((r) => unwrapOne<Sale>(r)),

  list: (params?: SalesListParams): Promise<SalesListResponse> =>
    apiClient
      .get('/sales', { params })
      .then((r) => unwrapSalesList(r, params)),

  summary: (): Promise<any> =>
    apiClient.get('/sales/summary').then((r) => unwrapOne<any>(r)),

  byId: (id: string): Promise<Sale> =>
    apiClient.get(`/sales/${id}`).then((r) => unwrapOne<Sale>(r)),

  voidSale: (id: string, reason?: string): Promise<Sale> =>
    apiClient
      .post(`/sales/${id}/void`, { reason })
      .then((r) => unwrapOne<Sale>(r)),
};
