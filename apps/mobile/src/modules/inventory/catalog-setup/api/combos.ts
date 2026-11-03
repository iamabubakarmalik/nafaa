/** Combos (same endpoints as the web): list with live figures for the branch in view, analytics, create, edit, delete. */

import { apiClient } from '@/core/api/client';

export type ComboStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'DRAFT';

export interface ComboItem {
  id?: string; productId: string; variantId?: string | null; unitId?: string | null; quantity: number; unitName?: string | null; originalPrice?: number;
  product?: { id: string; name: string; unit: string; price: number; costPrice?: number; stock: number; isActive: boolean; hasVariants?: boolean; images?: Array<{ url: string }>; category?: { id: string; name: string } | null };
  variant?: { id: string; name: string; price: number; stock: number } | null;
  unit?: { id: string; unitName: string; conversionRate: number; price: number } | null;
  canMake?: number; cost?: number;
}

export interface ProductCombo {
  id: string; name: string; sku?: string | null; barcode?: string | null; description?: string | null; imageUrl?: string | null; categoryId?: string | null;
  comboPrice: number; originalTotal: number; savingsAmount: number; savingsPercentage: number; status: ComboStatus;
  validFrom?: string | null; validTo?: string | null; maxPurchasePerCustomer?: number | null; stockAvailable?: number | null;
  soldCount: number; totalRevenue: number; isFeatured: boolean; tagLine?: string | null; isActive: boolean; items: ComboItem[];
  category?: { id: string; name: string } | null; createdAt: string;
  cost?: number; profit?: number; margin?: number; available?: number; limitedBy?: string | null; partsTotal?: number;
  expired?: boolean; upcoming?: boolean; sellable?: boolean;
}

export interface ComboPayload {
  name: string; sku?: string | null; barcode?: string | null; description?: string | null; imageUrl?: string | null; categoryId?: string | null;
  comboPrice: number; status?: ComboStatus; validFrom?: string | null; validTo?: string | null; maxPurchasePerCustomer?: number | null;
  stockAvailable?: number | null; isFeatured?: boolean; tagLine?: string | null;
  items: Array<{ productId: string; variantId?: string | null; unitId?: string | null; quantity: number; unitName?: string; originalPrice?: number }>;
}

export interface ComboSalesRow { id: string | null; name: string; count: number; bills: number; revenue: number; cost: number; profit: number; margin: number }

export interface ComboAnalytics {
  totals: { combos: number; active: number; sold: number; bills: number; revenue: number; cost: number; profit: number; margin: number; savingsGiven: number };
  byCombo: ComboSalesRow[];
  trend: Array<{ key: string; count: number; revenue: number }>;
  weekday: Array<{ day: number; count: number; revenue: number }>;
  notSold: Array<{ id: string; name: string; comboPrice: number; available: number }>;
  runningLow: Array<{ id: string; name: string; available: number; limitedBy: string | null }>;
  days: number;
}

const list = <T,>(d: unknown): T[] => (Array.isArray(d) ? d : ((d as { items?: T[] })?.items ?? [])) as T[];

export const combosApi = {
  list: () => apiClient.get('/retail/combos').then((r) => list<ProductCombo>(r.data)),
  getOne: (id: string) => apiClient.get<ProductCombo>(`/retail/combos/${id}`).then((r) => r.data),
  create: (data: ComboPayload) => apiClient.post<ProductCombo>('/retail/combos', data).then((r) => r.data),
  update: (id: string, data: Partial<ComboPayload>) => apiClient.patch<ProductCombo>(`/retail/combos/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/retail/combos/${id}`).then((r) => r.data),
  toggleFeatured: (id: string) => apiClient.post<ProductCombo>(`/retail/combos/${id}/toggle-featured`).then((r) => r.data),
  analytics: (range: { from?: string; to?: string }) => apiClient.get<ComboAnalytics>('/retail/combos/analytics', { params: range }).then((r) => r.data),
};
