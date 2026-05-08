import { apiClient } from './client';

export type StockMovementType =
  | 'PURCHASE_IN'
  | 'SALE_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'RETURN_IN'
  | 'OPENING_BALANCE';

export interface StockMovement {
  id: string;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku?: string | null;
    unit: string;
  };
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const stockMovementsApi = {
  list: () => apiClient.get<{ data: StockMovement[] }>('/stock-movements').then(unwrap),
};
