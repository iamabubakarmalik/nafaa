/**
 * Suppliers of one product (same endpoints as the web): the saved links with
 * the usual cost per base unit and the last purchases. Saving replaces the
 * whole list; the server keeps exactly one preferred supplier.
 */

import { apiClient } from '@/core/api/client';

export interface SupplierLinkUnit { id: string; unitName: string; conversionRate: number }

export interface ProductSupplierPurchase {
  purchaseId: string; purchaseNumber: string; purchasedAt: string; unitName: string; quantity: number; costPrice: number; baseCost: number;
}

export interface ProductSupplierLink {
  id: string; supplierId: string;
  supplier: { id: string; name: string; phone?: string | null; city?: string | null; isActive: boolean };
  supplierSku: string | null;
  /** Usual cost of one base unit; absent without cost.view. */
  costPrice?: number | null;
  lastPurchasePrice?: number | null;
  lastPurchasedAt: string | null;
  /** In base units. */
  minOrderQty: number | null;
  leadDays: number | null;
  unitId: string | null;
  isPreferred: boolean;
  notes: string | null;
  unit: SupplierLinkUnit | null;
  purchases: ProductSupplierPurchase[];
}

export interface ProductSuppliers { baseUnit: string; units: SupplierLinkUnit[]; items: ProductSupplierLink[] }

export interface SupplierLinkPayload {
  supplierId: string; supplierSku?: string; costPrice?: number; minOrderQty?: number; leadDays?: number; unitId?: string; isPreferred?: boolean; notes?: string;
}

export const productSuppliersApi = {
  list: (productId: string) => apiClient.get<ProductSuppliers>(`/products/${productId}/suppliers`).then((r) => r.data),
  save: (productId: string, links: SupplierLinkPayload[]) =>
    apiClient.put<ProductSuppliers>(`/products/${productId}/suppliers`, { links }).then((r) => r.data),
};
