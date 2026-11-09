/**
 * Stock forecast (web /inventory/forecast): same endpoint and shapes. The
 * mobile list is read-only plus "make a purchase order", which opens the
 * purchase editor with the supplier's lines (nothing is saved until then).
 */

import { apiClient } from '@/core/api/client';

export type ForecastClass = 'fast' | 'normal' | 'slow' | 'dead' | 'overstock' | 'new' | 'none';
export type ForecastFilter = 'all' | 'stockout7' | 'reorder' | 'fast' | 'slow' | 'dead' | 'overstock';

export interface ForecastRow {
  productId: string; name: string; sku: string | null; unit: string; image: string | null;
  stock: number; onOrder: number; cost: number; demand: number; cover: number | null; stockOut: string | null;
  daysSinceSale: number | null; supplier: { id: string; name: string; phone: string | null } | null; leadDays: number;
  pack: { name: string; size: number } | null; suggestQty: number; orderInDays: number | null; orderValue: number;
  cls: ForecastClass; tiedValue: number; spark: number[];
}
export interface ForecastSummary {
  products: number; stockOut7: number; outNow: number; deadCount: number; deadValue: number; overCount: number; overValue: number;
  reorderCount: number; reorderValue: number; fast: number; slow: number; festivals: string[];
}
export interface ForecastPage { items: ForecastRow[]; total: number; page: number; limit: number; pages: number; summary: ForecastSummary; computedAt: string }
export interface OrderGroup {
  supplier: { id: string; name: string; phone: string | null } | null;
  lines: Array<{ productId: string; name: string; qty: number; cost: number; unit: string }>;
  value: number;
}

export const forecastApi = {
  list: (q: { filter?: ForecastFilter; search?: string; page?: number; limit?: number }) =>
    apiClient.get<Omit<ForecastPage, 'pages'>>('/inventory/forecast', { params: q })
      .then((r) => ({ ...r.data, pages: Math.max(1, Math.ceil(r.data.total / r.data.limit)) })),
  orderGroups: (productIds?: string[]) =>
    apiClient.post<{ shopId: string | null; groups: OrderGroup[] }>('/inventory/forecast/order-groups', { productIds }).then((r) => r.data),
};
