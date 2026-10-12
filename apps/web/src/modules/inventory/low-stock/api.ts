/**
 * Low stock and reorder API: per-branch lines with days of cover, the order
 * each needs, last supplier and cost, open orders and expiring batches;
 * analytics for the same filter; alert level and "ignore" per line.
 */

import { apiClient } from '@core/api/client';

export type LowStatus = 'out' | 'low' | 'soon' | 'expiry' | 'registration' | 'season';
export type LowStatusFilter = 'all' | LowStatus | 'ordered' | 'ignored';
export type LowSort = 'urgency' | 'daysLeft' | 'value' | 'lost' | 'name' | 'stock';

export interface LowSettings { days: number; targetDays: number; soonDays: number; expiryDays: number }

export interface LowRow {
  key: string;
  productId: string;
  shopId: string;
  shopName: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  image: string | null;
  category: { id: string; name: string; color: string | null } | null;
  price: number;
  cost: number;
  stock: number;
  alert: number;
  alertFrom: 'branch' | 'product' | 'agri';
  status: LowStatus;
  flags: LowStatus[];
  perDay: number;
  sold: number;
  daysLeft: number | null;
  target: number;
  suggestQty: number;
  onOrder: number;
  supplier: { id: string; name: string; phone: string | null } | null;
  lastCost: number;
  lastPurchasedAt: string | null;
  orderValue: number;
  outDays: number | null;
  lostPerDay: number;
  lostSales: number;
  expiry: { date: string; qty: number; expiredQty: number; batches: number } | null;
  made: boolean;
  devices: { label: 'IMEI' | 'Serial'; count: number; variants: Array<{ name: string; count: number }> } | null;
  group: string | null;
  detail: string | null;
  agri: { season: string | null; seasonNow: boolean; reg: { state: 'expired' | 'soon' | 'none'; days: number | null } | null } | null;
  ignored: boolean;
}

interface Facet { id: string; name?: string; color?: string | null; phone?: string | null; count: number; value: number }

export interface LowList {
  items: LowRow[];
  total: number;
  page: number;
  pages: number;
  settings: LowSettings;
  counts: Record<LowStatusFilter, number>;
  totals: { orderValue: number; orderLines: number; madeLines: number; lostPerDay: number; lostSales: number; expiryValue: number; noSupplier: number };
  facets: { categories: Facet[]; suppliers: Facet[]; groups: Facet[]; shops: Facet[] };
}

export interface LowQuery extends Partial<LowSettings> {
  status?: LowStatusFilter;
  categoryId?: string;
  supplierId?: string;
  group?: string;
  search?: string;
  sort?: LowSort;
  view?: 'alerts' | 'reorder';
  page?: number;
  limit?: number;
}

interface Brief {
  key: string; productId: string; name: string; unit: string; shopName: string; stock: number; perDay: number;
  daysLeft: number | null; outDays: number | null; lostPerDay: number; lostSales: number; orderValue: number; suggestQty: number;
}

export interface LowAnalytics {
  settings: LowSettings;
  totals: { lines: number; out: number; orderValue: number; lostPerDay: number; lostSales: number; expiryValue: number; onOrderValue: number; stockouts: number };
  byStatus: Array<{ key: LowStatus; count: number }>;
  cover: Array<{ key: string; label: string; count: number }>;
  trend: Array<{ key: string; count: number }>;
  topLost: Brief[];
  runningOut: Brief[];
  bySupplier: Array<{ key: string; name: string; count: number; value: number; lost: number }>;
  byCategory: Array<{ key: string; name: string; count: number; value: number; lost: number }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const lowStockApi = {
  list: (q: LowQuery) =>
    apiClient.get<{ data: LowList }>('/inventory/low-stock', { params: q }).then(unwrap),
  analytics: (q: Omit<LowQuery, 'page' | 'limit' | 'status' | 'view' | 'sort'>) =>
    apiClient.get<{ data: LowAnalytics }>('/inventory/low-stock/analytics', { params: q }).then(unwrap),
  setAlert: (productId: string, alert: number, shopId: string) =>
    apiClient.patch<{ data: { alert: number } }>(`/inventory/low-stock/${productId}/alert`, { alert, shopId }).then(unwrap),
  ignore: (productId: string, ignore: boolean, shopId: string) =>
    apiClient.post<{ data: { ignored: boolean } }>(`/inventory/low-stock/${productId}/ignore`, { ignore, shopId }).then(unwrap),
};

/** Query key root; stock, sales and purchases screens refresh it through the shared cache rules. */
export const LOW_KEY = 'low-stock';
