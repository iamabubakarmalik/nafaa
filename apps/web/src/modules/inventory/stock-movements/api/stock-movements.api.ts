/**
 * Stock movements API: the paged ledger with totals for the whole filter,
 * analytics for the same filter, the people filter and a product's history.
 */

import { apiClient } from '@core/api/client';

export const MOVEMENT_TYPES = [
  'SALE_OUT', 'RETURN_IN', 'PURCHASE_IN', 'PURCHASE_RETURN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT',
  'DAMAGE', 'LOSS', 'TRANSFER_IN', 'TRANSFER_OUT', 'OPENING_BALANCE',
] as const;

export type StockMovementType = typeof MOVEMENT_TYPES[number];

export interface StockMovement {
  id: string;
  type: StockMovementType;
  /** Signed: positive came in, negative went out. */
  quantity: number;
  /** Branch stock right after this entry. */
  balanceAfter: number;
  reference: string | null;
  note: string | null;
  createdAt: string;
  unitCost: number | null;
  /** quantity × cost, signed like quantity. */
  value: number;
  product: { id: string; name: string; sku: string | null; unit: string; costPrice: number };
  shop: { id: string; name: string; isMain: boolean } | null;
  variant: { id: string; name: string } | null;
  createdBy: { id: string; fullName: string } | null;
}

export interface MovementQuery {
  from?: string;
  to?: string;
  /** One type or a comma list. */
  type?: string;
  direction?: 'all' | 'in' | 'out';
  productId?: string;
  userId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MovementList {
  items: StockMovement[];
  total: number;
  page: number;
  pages: number;
  totals: {
    count: number;
    qtyIn: number;
    qtyOut: number;
    byType: Array<{ type: StockMovementType; count: number; qty: number }>;
  };
}

export interface MovementAnalytics {
  totals: { count: number; valueIn: number; valueOut: number; net: number };
  byType: Array<{ type: StockMovementType; count: number; qty: number; value: number }>;
  trend: Array<{ key: string; in: number; out: number }>;
  topMovers: Array<{ name: string; unit: string; in: number; out: number; value: number }>;
  byPerson: Array<{ name: string; count: number; value: number }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const stockMovementsApi = {
  list: (q: MovementQuery) =>
    apiClient.get<{ data: MovementList }>('/stock-movements', { params: q }).then(unwrap),
  analytics: (q: MovementQuery) =>
    apiClient.get<{ data: MovementAnalytics }>('/stock-movements/analytics', { params: { ...q, page: undefined, limit: undefined } }).then(unwrap),
  people: () =>
    apiClient.get<{ data: Array<{ id: string; fullName: string }> }>('/stock-movements/people').then(unwrap),
  /** Latest 100 entries of one product, all time. */
  forProduct: (productId: string) =>
    apiClient.get<{ data: MovementList }>('/stock-movements', { params: { productId, limit: 100 } }).then(unwrap).then((r) => r.items),
};
