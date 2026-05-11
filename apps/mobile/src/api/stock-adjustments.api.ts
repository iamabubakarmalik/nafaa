import { apiClient } from './client';

export type AdjustmentType = 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'LOSS';

export interface StockAdjustment {
  id: string;
  type: AdjustmentType;
  quantity: number;
  reason: string;
  note?: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku?: string | null;
    unit: string;
  };
  createdBy?: { id: string; fullName: string } | null;
}

export interface CreateAdjustmentPayload {
  productId: string;
  type: AdjustmentType;
  quantity: number;
  reason: string;
  note?: string;
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

export const stockAdjustmentsApi = {
  list: (): Promise<StockAdjustment[]> =>
    apiClient.get('/stock-adjustments').then((r) => unwrapArr<StockAdjustment>(r)),
  create: (payload: CreateAdjustmentPayload): Promise<StockAdjustment> =>
    apiClient.post('/stock-adjustments', payload).then((r) => unwrapOne<StockAdjustment>(r)),
};
