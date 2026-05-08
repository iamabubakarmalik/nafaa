import { apiClient } from './client';

export type AdjustmentType =
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'DAMAGE'
  | 'LOSS';

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

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const stockAdjustmentsApi = {
  list: () =>
    apiClient.get<{ data: StockAdjustment[] }>('/stock-adjustments').then(unwrap),
  create: (payload: CreateAdjustmentPayload) =>
    apiClient
      .post<{ data: StockAdjustment }>('/stock-adjustments', payload)
      .then(unwrap),
};
