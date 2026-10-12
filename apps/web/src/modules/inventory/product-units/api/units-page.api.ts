/**
 * Data for the Multi-units page: products with their packs (paged, from the
 * server), one pack added to many products, and pack analytics. Single pack
 * create, edit and delete use productUnitsApi.
 */

import { apiClient } from '@core/api/client';
import type { ProductUnit, UnitConversionType } from '@modules/inventory/products/api/product-units.api';

export type UnitsFilter = 'all' | 'with' | 'without' | 'noBarcode' | 'priceIssue';

export interface OverviewUnit extends ProductUnit {
  variantName: string | null;
  /** Price at the loose rate (base price × rate). */
  loose: number;
  /** Loose price minus pack price: what the buyer saves. */
  saving: number;
  /** Pack costs more than buying loose. */
  dearer: boolean;
  /** Pack sells below its cost. */
  loss: boolean;
  /** Whole packs in the branch stock. */
  inStock: number;
}

export interface OverviewProduct {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  price: number;
  costPrice?: number;
  stock: number;
  hasVariants: boolean;
  image: string | null;
  category?: { id: string; name: string } | null;
  variants: Array<{ id: string; name: string; price: number }>;
  units: OverviewUnit[];
}

export interface UnitsOverview {
  items: OverviewProduct[];
  total: number;
  page: number;
  pages: number;
  totals: { products: number; withPacks: number; packs: number; noBarcode: number; priceIssues: number; coverage: number };
}

export interface UnitsQuery {
  search?: string;
  filter?: UnitsFilter;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export interface BulkUnitPayload {
  productIds: string[];
  unitName: string;
  conversionType: UnitConversionType;
  conversionRate: number;
  discountPercent?: number;
  roundTo?: number;
  overwrite?: boolean;
}

export interface UnitsAnalytics {
  totals: {
    products: number; withPacks: number; coverage: number; packs: number; inactive: number; noBarcode: number; defaults: number;
    priceIssues: number; packLines: number; purchaseLines: number;
  };
  byName: Array<{ name: string; count: number; commonRate: number }>;
  byType: Array<{ type: UnitConversionType; count: number }>;
  issues: Array<{ productId: string; product: string; unit: string; rate: number; price: number; loose: number; cost: number; kind: 'dearer' | 'loss' }>;
  bought: Array<{ name: string; lines: number; qty: number; baseQty: number; value: number }>;
  topWithoutPacks: Array<{ id: string; name: string; unit: string; qty: number; revenue: number }>;
  days: number;
}

const unwrap = <T,>(res: { data: { data: T } }): T => res.data.data;

export const unitsPageApi = {
  overview: (q: UnitsQuery) =>
    apiClient.get<{ data: UnitsOverview }>('/retail/product-units/overview', { params: q }).then(unwrap),

  analytics: (range: { from?: string; to?: string }) =>
    apiClient.get<{ data: UnitsAnalytics }>('/retail/product-units/analytics', { params: range }).then(unwrap),

  bulkAdd: (payload: BulkUnitPayload) =>
    apiClient.post<{ data: { created: number; updated: number; skipped: number; skippedNames: string[] } }>('/retail/product-units/bulk', payload).then(unwrap),
};
