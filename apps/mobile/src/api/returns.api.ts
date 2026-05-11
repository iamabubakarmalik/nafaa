import { apiClient } from './client';
import type { PaymentMethod } from './sales.api';

export interface ReturnItem {
  id: string;
  quantity: number;
  refundPrice: number;
  total: number;
  product: {
    id: string;
    name: string;
    unit: string;
    sku?: string | null;
  };
}

export interface SaleReturn {
  id: string;
  returnNumber: string;
  reason?: string | null;
  notes?: string | null;
  refundAmount: number;
  refundMethod: PaymentMethod;
  returnedAt: string;
  sale: {
    id: string;
    saleNumber: string;
    total: number;
    customer?: { id: string; name: string; phone?: string | null } | null;
  };
  createdBy?: { id: string; fullName: string } | null;
  items: ReturnItem[];
}

export interface CreateReturnPayload {
  saleId: string;
  reason?: string;
  refundMethod: PaymentMethod;
  notes?: string;
  items: Array<{
    saleItemId: string;
    quantity: number;
  }>;
}

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

function unwrapArr<T>(res: any): T[] {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

export const returnsApi = {
  list: (): Promise<SaleReturn[]> =>
    apiClient.get('/returns').then((r) => unwrapArr<SaleReturn>(r)),
  getOne: (id: string): Promise<SaleReturn> =>
    apiClient.get(`/returns/${id}`).then((r) => unwrapOne<SaleReturn>(r)),
  create: (payload: CreateReturnPayload): Promise<SaleReturn> =>
    apiClient.post('/returns', payload).then((r) => unwrapOne<SaleReturn>(r)),
};
