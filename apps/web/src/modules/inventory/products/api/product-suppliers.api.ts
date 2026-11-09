/**
 * Where a product can be bought: its suppliers with code, usual and last cost
 * (per base unit), minimum order and delivery days. Also the bulk changes the
 * products page makes to many products at once.
 */

import { apiClient } from '@core/api/client';

export interface SupplierLink {
  id: string;
  supplierId: string;
  supplier: { id: string; name: string; phone: string | null; city: string | null; isActive: boolean };
  supplierSku: string | null;
  /** Usual cost of one base unit; absent without cost.view. */
  costPrice?: number | null;
  /** Cost of one base unit on the latest purchase; absent without cost.view. */
  lastPurchasePrice?: number | null;
  lastPurchasedAt: string | null;
  /** In base units. */
  minOrderQty: number | null;
  leadDays: number | null;
  unitId: string | null;
  unit: { id: string; unitName: string; conversionRate: number } | null;
  isPreferred: boolean;
  notes: string | null;
  purchases: Array<{ purchaseId: string; purchaseNumber: string; purchasedAt: string; unitName: string; quantity: number; costPrice?: number; baseCost?: number }>;
}

export interface SupplierLinks {
  baseUnit: string;
  units: Array<{ id: string; unitName: string; conversionRate: number }>;
  items: SupplierLink[];
}

export interface SupplierLinkInput {
  supplierId: string;
  supplierSku?: string | null;
  costPrice?: number | null;
  minOrderQty?: number | null;
  leadDays?: number | null;
  unitId?: string | null;
  isPreferred?: boolean;
  notes?: string | null;
}

export interface SupplierLinkRow {
  productId: string; supplierId: string; isPreferred: boolean; costPrice?: number | null; lastPurchasePrice?: number | null;
  unitId: string | null; minOrderQty: number | null; supplierSku: string | null;
}

export interface BulkProductUpdate {
  productIds: string[];
  categoryId?: string;
  brandId?: string;
  supplierId?: string;
  preferred?: boolean;
  pricePercent?: number;
  priceField?: 'price' | 'wholesalePrice' | 'creditPrice';
  roundTo?: number;
  withPacks?: boolean;
}

const unwrap = <T,>(res: { data: { data: T } }): T => res.data.data;

export const productSuppliersApi = {
  list: (productId: string) => apiClient.get<{ data: SupplierLinks }>(`/products/${productId}/suppliers`).then(unwrap),
  replace: (productId: string, links: SupplierLinkInput[]) =>
    apiClient.put<{ data: SupplierLinks }>(`/products/${productId}/suppliers`, { links }).then(unwrap),
  /** Every link of the shop (or one supplier), for the purchase editor. */
  map: (supplierId?: string) =>
    apiClient.get<{ data: SupplierLinkRow[] }>('/products/supplier-links', { params: supplierId ? { supplierId } : {} }).then(unwrap),
  bulkUpdate: (body: BulkProductUpdate) =>
    apiClient.post<{ data: Record<string, number> & { message: string } }>('/products/bulk-update', body).then(unwrap),
};
