/**
 * Combos API. Lists come with live figures for the branch in view: how many
 * can be made from stock, cost, profit and margin. Analytics reads the combo
 * lines of sales over a business-day range. The POS uses the same list.
 */

import { apiClient } from '@core/api/client';

export type ComboStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'DRAFT';

export interface ComboItem {
  id?: string;
  productId: string;
  variantId?: string | null;
  unitId?: string | null;
  quantity: number;
  unitName?: string | null;
  /** Normal price of one unit of this part, saved with the combo. */
  originalPrice?: number;
  product?: {
    id: string; name: string; sku?: string | null; barcode?: string | null; unit: string; price: number; costPrice?: number; stock: number;
    isActive: boolean; hasVariants?: boolean; images?: Array<{ url: string }>; category?: { id: string; name: string } | null;
  };
  variant?: { id: string; name: string; price: number; costPrice?: number; stock: number; isActive: boolean } | null;
  unit?: { id: string; unitName: string; unitLabel?: string | null; conversionRate: number; price: number; costPrice?: number; isActive: boolean } | null;
  /** Live figures. */
  baseQuantity?: number;
  rate?: number;
  stock?: number;
  canMake?: number;
  cost?: number;
  inactive?: boolean;
}

export interface ProductCombo {
  id: string;
  name: string;
  slug?: string | null;
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  comboPrice: number;
  originalTotal: number;
  savingsAmount: number;
  savingsPercentage: number;
  status: ComboStatus;
  validFrom?: string | null;
  validTo?: string | null;
  maxPurchasePerCustomer?: number | null;
  stockAvailable?: number | null;
  soldCount: number;
  totalRevenue: number;
  isFeatured: boolean;
  sortOrder: number;
  tagLine?: string | null;
  isActive: boolean;
  items: ComboItem[];
  category?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  /** Live figures for the branch in view (cost fields are hidden without cost access). */
  cost?: number;
  profit?: number;
  margin?: number;
  available?: number;
  /** Product name that limits `available`, or "limit" when the combo's own cap does. */
  limitedBy?: string | null;
  /** Today's price of all parts bought separately. */
  partsTotal?: number;
  expired?: boolean;
  upcoming?: boolean;
  sellable?: boolean;
}

export interface ComboPayload {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  comboPrice: number;
  status?: ComboStatus;
  validFrom?: string | null;
  validTo?: string | null;
  maxPurchasePerCustomer?: number | null;
  stockAvailable?: number | null;
  isFeatured?: boolean;
  tagLine?: string | null;
  items: Array<{ productId: string; variantId?: string | null; unitId?: string | null; quantity: number; unitName?: string; originalPrice?: number }>;
}

export interface ComboSalesRow {
  id: string | null;
  name: string;
  count: number;
  bills: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface ComboAnalytics {
  totals: { combos: number; active: number; sold: number; bills: number; revenue: number; cost: number; profit: number; margin: number; savingsGiven: number };
  byCombo: ComboSalesRow[];
  trend: Array<{ key: string; count: number; revenue: number }>;
  weekday: Array<{ day: number; count: number; revenue: number }>;
  notSold: Array<{ id: string; name: string; comboPrice: number; available: number }>;
  runningLow: Array<{ id: string; name: string; available: number; limitedBy: string | null }>;
  days: number;
}

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const combosApi = {
  create: (data: ComboPayload) => apiClient.post('/retail/combos', data).then(unwrap<ProductCombo>),

  list: (params?: { status?: string; featured?: boolean; search?: string }) =>
    apiClient.get('/retail/combos', { params }).then(unwrap<ProductCombo[]>),

  getOne: (id: string) => apiClient.get(`/retail/combos/${id}`).then(unwrap<ProductCombo>),

  update: (id: string, data: Partial<ComboPayload>) => apiClient.patch(`/retail/combos/${id}`, data).then(unwrap<ProductCombo>),

  remove: (id: string) => apiClient.delete(`/retail/combos/${id}`).then(unwrap<{ id: string }>),

  toggleFeatured: (id: string) => apiClient.post(`/retail/combos/${id}/toggle-featured`).then(unwrap<ProductCombo>),

  analytics: (range: { from?: string; to?: string }) =>
    apiClient.get('/retail/combos/analytics', { params: range }).then(unwrap<ComboAnalytics>),
};
