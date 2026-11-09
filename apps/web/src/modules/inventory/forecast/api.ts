/**
 * Stock forecast API: per product how fast it sells, days of cover, the day
 * it runs out, reorder point and an order quantity rounded to the supplier's
 * pack; classes (fast, slow, dead, overstock) and the hero totals.
 */

import { apiClient } from '@core/api/client';

export type ForecastClass = 'fast' | 'normal' | 'slow' | 'dead' | 'overstock' | 'new' | 'none';
export type ForecastFilter = 'all' | 'stockout7' | 'reorder' | 'fast' | 'slow' | 'dead' | 'overstock';
export type ForecastSort = 'urgency' | 'value' | 'tied' | 'demand' | 'name';

export interface ForecastRow {
  productId: string;
  name: string;
  sku: string | null;
  unit: string;
  image: string | null;
  category: { id: string; name: string } | null;
  stock: number;
  onOrder: number;
  cost: number;
  price: number;
  sold: { d7: number; d30: number; d90: number };
  velocity: number;
  season: number | null;
  festival: { factor: number; names: string[] } | null;
  demand: number;
  cover: number | null;
  stockOut: string | null;
  lastSale: string | null;
  daysSinceSale: number | null;
  supplier: { id: string; name: string; phone: string | null } | null;
  leadDays: number;
  leadFromSupplier: boolean;
  pack: { name: string; size: number } | null;
  minOrder: number | null;
  safety: number;
  reorderPoint: number;
  suggestQty: number;
  orderInDays: number | null;
  orderValue: number;
  cls: ForecastClass;
  tiedValue: number;
  spark: number[];
  variants: Array<{ id: string; name: string; stock: number; sold30: number; cover: number | null }>;
}

export interface ForecastSummary {
  products: number; stockOut7: number; outNow: number; deadCount: number; deadValue: number; overCount: number; overValue: number;
  reorderCount: number; reorderValue: number; fast: number; slow: number; festivals: string[];
}

export interface ForecastList {
  items: ForecastRow[];
  total: number;
  page: number;
  limit: number;
  summary: ForecastSummary;
  today: string;
  computedAt: string;
  categories: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
}

export interface ForecastQuery {
  filter?: ForecastFilter; sort?: ForecastSort; search?: string; categoryId?: string; supplierId?: string;
  page?: number; limit?: number; refresh?: boolean;
}

export interface OrderGroup {
  supplier: { id: string; name: string; phone: string | null } | null;
  lines: Array<{ productId: string; name: string; qty: number; cost: number; unit: string }>;
  value: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const forecastApi = {
  list: (q: ForecastQuery) => apiClient.get<{ data: ForecastList }>('/inventory/forecast', { params: q }).then(unwrap),
  orderGroups: (productIds?: string[]) =>
    apiClient.post<{ data: { shopId: string | null; groups: OrderGroup[] } }>('/inventory/forecast/order-groups', { productIds }).then(unwrap),
};

export const FORECAST_KEY = 'stock-forecast';
