import { apiClient } from './client';

export type StockMovementType =
  | 'PURCHASE_IN'
  | 'SALE_OUT'
  | 'RETURN_IN'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'DAMAGE'
  | 'LOSS';

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

function unwrapArr<T>(res: any): T[] {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

export const stockMovementsApi = {
  list: (): Promise<StockMovement[]> =>
    apiClient.get('/stock-movements').then((r) => unwrapArr<StockMovement>(r)),
};
