/** Multi-units page data (same endpoints as the web): products with their packs, one pack on many products, and pack analytics. */

import { apiClient } from '@/core/api/client';
import type { ProductUnit } from '../../api/products';

export type UnitsFilter = 'all' | 'with' | 'without' | 'noBarcode' | 'priceIssue';
export type PackType = 'BASE' | 'PACK' | 'BOX' | 'DOZEN' | 'CARTON' | 'KG_TO_GRAM' | 'L_TO_ML' | 'CUSTOM';

export interface OverviewUnit extends Omit<ProductUnit, 'conversionType'> {
  conversionType: PackType;
  variantName: string | null; loose: number; saving: number; dearer: boolean; loss: boolean; inStock: number;
}

export interface OverviewProduct {
  id: string; name: string; sku?: string | null; barcode?: string | null; unit: string; price: number; costPrice?: number; stock: number;
  hasVariants: boolean; image: string | null; category?: { id: string; name: string } | null;
  variants: Array<{ id: string; name: string; price: number }>; units: OverviewUnit[];
}

export interface UnitsOverview {
  items: OverviewProduct[]; total: number; page: number; pages: number;
  totals: { products: number; withPacks: number; packs: number; noBarcode: number; priceIssues: number; coverage: number };
}

export interface UnitsAnalytics {
  totals: { products: number; withPacks: number; coverage: number; packs: number; inactive: number; noBarcode: number; defaults: number; priceIssues: number; packLines: number; purchaseLines: number };
  byName: Array<{ name: string; count: number; commonRate: number }>;
  byType: Array<{ type: PackType; count: number }>;
  issues: Array<{ productId: string; product: string; unit: string; rate: number; price: number; loose: number; cost: number; kind: 'dearer' | 'loss' }>;
  bought: Array<{ name: string; lines: number; qty: number; baseQty: number; value: number }>;
  topWithoutPacks: Array<{ id: string; name: string; unit: string; qty: number; revenue: number }>;
  days: number;
}

export interface BulkUnitPayload {
  productIds: string[]; unitName: string; conversionType: PackType; conversionRate: number; discountPercent?: number; roundTo?: number; overwrite?: boolean;
}

export const unitsPageApi = {
  overview: (q: { search?: string; filter?: UnitsFilter; categoryId?: string; page?: number; limit?: number }) =>
    apiClient.get<UnitsOverview>('/retail/product-units/overview', { params: q }).then((r) => r.data),
  analytics: (range: { from?: string; to?: string }) => apiClient.get<UnitsAnalytics>('/retail/product-units/analytics', { params: range }).then((r) => r.data),
  bulkAdd: (payload: BulkUnitPayload) =>
    apiClient.post<{ created: number; updated: number; skipped: number; skippedNames: string[] }>('/retail/product-units/bulk', payload).then((r) => r.data),
  create: (data: Record<string, unknown>) => apiClient.post<OverviewUnit>('/retail/product-units', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch<OverviewUnit>(`/retail/product-units/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/retail/product-units/${id}`).then((r) => r.data),
  generateBarcode: (id: string) => apiClient.post<OverviewUnit>(`/retail/product-units/${id}/generate-barcode`).then((r) => r.data),
};
