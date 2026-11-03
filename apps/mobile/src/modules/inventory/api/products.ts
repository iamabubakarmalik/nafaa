/**
 * Product records and their parts: the product, packs (ProductUnit),
 * variants, batches, images, per-product insights and purchases, and photo
 * uploads. Same endpoints as the web. Writes that work offline (create, edit,
 * price, stock) go through the offline engine instead; these calls are the
 * online path and the parts the engine does not carry.
 */

import { createUploadsApi, type UploadRecord } from '@nafaa/api-client';
import { apiClient } from '@/core/api/client';

export interface ProductImage { id: string; productId: string; url: string; thumbnail?: string | null; isPrimary: boolean; sortOrder: number }
export interface ProductTagLink { tag: { id: string; name: string; color?: string | null } }

export interface ProductVariant {
  id: string; productId: string; name: string; sku?: string | null; barcode?: string | null;
  color?: string | null; colorHex?: string | null; size?: string | null; unit?: string | null;
  price: number; costPrice: number; wholesalePrice?: number | null; creditPrice?: number | null;
  stock: number; lowStockAlert: number; imageUrl?: string | null; isActive: boolean; sortOrder: number;
}

export interface ProductBatch {
  id: string; productId: string; variantId?: string | null; batchNumber: string;
  manufactureDate?: string | null; expiryDate?: string | null; quantity: number; costPrice: number;
  notes?: string | null; isActive: boolean; createdAt: string;
  product?: { id: string; name: string; unit: string };
  variant?: { id: string; name: string } | null;
}

export type UnitConversionType = 'BASE' | 'PACK' | 'BOX' | 'DOZEN' | 'CARTON' | 'CUSTOM';

export interface ProductUnit {
  id: string; productId: string; variantId?: string | null; unitName: string; unitLabel?: string | null;
  conversionType: UnitConversionType; conversionRate: number; isBase: boolean; isDefault: boolean;
  price: number; costPrice: number; wholesalePrice?: number | null; creditPrice?: number | null; mrpPrice?: number | null;
  barcode?: string | null; sku?: string | null; isActive: boolean; sortOrder: number;
}

export interface Product {
  id: string; name: string; description?: string | null; sku?: string | null; barcode?: string | null;
  unit: string; price: number; costPrice: number; wholesalePrice?: number | null; creditPrice?: number | null; taxRate: number;
  stock: number; shopStock?: number; lowStockAlert: number; weight?: number | null; productType?: string | null;
  hasVariants: boolean; expiryTracked: boolean; isActive: boolean; isFeatured: boolean; isRawMaterial?: boolean;
  categoryId?: string | null; brandId?: string | null;
  category?: { id: string; name: string; color: string } | null;
  brand?: { id: string; name: string } | null;
  tags?: ProductTagLink[];
  images?: ProductImage[];
  variants?: ProductVariant[];
  batches?: ProductBatch[];
  createdAt: string; updatedAt: string;
  _count?: { saleItems?: number; variants?: number; images?: number; batches?: number };
}

export interface ProductPayload {
  name?: string; description?: string; categoryId?: string | null; brandId?: string | null; sku?: string; barcode?: string;
  unit?: string; price?: number; costPrice?: number; wholesalePrice?: number | null; creditPrice?: number | null; taxRate?: number;
  stock?: number; lowStockAlert?: number; isActive?: boolean; isFeatured?: boolean; isRawMaterial?: boolean; expiryTracked?: boolean;
  weight?: number; productType?: string; tagIds?: string[]; imageUrls?: string[]; shopId?: string;
  [extra: string]: unknown;
}

export type BulkAction = 'activate' | 'deactivate' | 'delete' | 'feature' | 'unfeature';

export const productsApi = {
  getOne: (id: string) => apiClient.get<Product>(`/products/${id}`).then((r) => r.data),
  create: (payload: ProductPayload) => apiClient.post<Product>('/products', payload).then((r) => r.data),
  update: (id: string, payload: ProductPayload) => apiClient.patch<Product>(`/products/${id}`, payload).then((r) => r.data),
  /** A product that was ever sold or bought is switched off instead (softDeleted). */
  remove: (id: string, force = false) =>
    apiClient.delete<{ message: string; forced?: boolean; softDeleted?: boolean }>(`/products/${id}${force ? '?force=true' : ''}`).then((r) => r.data),
  bulkAction: (productIds: string[], action: BulkAction) =>
    apiClient.post<{ count?: number; removedEmptySales?: number }>('/products/bulk-action', { productIds, action }).then((r) => r.data),
  generateBarcode: (id: string) => apiClient.post<Product>(`/products/${id}/generate-barcode`).then((r) => r.data),
  bulkGenerateBarcodes: (productIds: string[]) =>
    apiClient.post<{ count: number }>('/products/bulk-generate-barcodes', { productIds }).then((r) => r.data),
};

export interface ProductInsights {
  window: number;
  series: Array<{ key: string; qty: number; revenue: number; profit: number; bills: number }>;
  totals: { qty: number; revenue: number; profit: number; bills: number; perDay: number; daysLeft: number | null };
  allTime: { qty: number; revenue: number; lines: number; firstSoldAt: string | null; lastSoldAt: string | null };
  recent: Array<{
    id: string; saleId: string; saleNumber: string; soldAt: string; status: string;
    customer: { id: string; name: string } | null; qty: number; returnedQty: number; price: number; total: number;
  }>;
  movements: Array<{
    id: string; type: string; quantity: number; balanceAfter: number; reference: string | null; note: string | null;
    createdAt: string; shop: { name: string } | null;
  }>;
  shops: Array<{ shopId: string; name: string; stock: number; lowStockAlert: number }>;
  customers: Array<{ id?: string; name?: string; phone?: string | null; bills: number; lastAt: string | null }>;
}

export interface ProductPurchases {
  totals: { qty: number; amount: number; returned: number; bills: number; avgCost: number | null; lastCost: number | null; lastAt: string | null };
  suppliers: Array<{ id: string; name: string; bills: number; lastAt: string | null }>;
  recent: Array<{
    id: string; purchaseId: string; purchaseNumber: string; purchasedAt: string; status: 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
    supplier: { id: string; name: string } | null; shop: string | null; variantId: string | null; unitName: string; conversionRate: number;
    quantity: number; baseQuantity: number; costPrice: number; total: number; receivedQty: number; returnedQty: number;
    batchNo: string | null; expiryDate: string | null;
  }>;
}

export const insightsApi = {
  get: (id: string, days: number) => apiClient.get<ProductInsights>(`/products/${id}/insights`, { params: { days } }).then((r) => r.data),
  purchases: (id: string) => apiClient.get<ProductPurchases>(`/products/${id}/purchases`).then((r) => r.data),
};

const list = <T,>(d: unknown): T[] => (Array.isArray(d) ? d : ((d as { items?: T[] })?.items ?? [])) as T[];

export const unitsApi = {
  byProduct: (productId: string, variantId?: string) =>
    apiClient.get<ProductUnit[]>(`/retail/product-units/by-product/${productId}`, { params: variantId ? { variantId } : {} }).then((r) => list<ProductUnit>(r.data)),
  listAll: () => apiClient.get<ProductUnit[]>('/retail/product-units').then((r) => list<ProductUnit>(r.data)),
  create: (data: Partial<ProductUnit>) => apiClient.post<ProductUnit>('/retail/product-units', data).then((r) => r.data),
  update: (id: string, data: Partial<ProductUnit>) => apiClient.patch<ProductUnit>(`/retail/product-units/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/retail/product-units/${id}`).then((r) => r.data),
  generateBarcode: (id: string) => apiClient.post<ProductUnit>(`/retail/product-units/${id}/generate-barcode`).then((r) => r.data),
};

export interface VariantPayload {
  name: string; sku?: string; barcode?: string; colorHex?: string; unit?: string; price: number; costPrice?: number;
  stock?: number; lowStockAlert?: number; isActive?: boolean; sortOrder?: number; shopId?: string;
}

export const variantsApi = {
  list: (productId: string) => apiClient.get<ProductVariant[]>(`/products/${productId}/variants`).then((r) => list<ProductVariant>(r.data)),
  bulkCreate: (productId: string, variants: VariantPayload[]) => apiClient.post(`/products/${productId}/variants/bulk`, { variants }).then((r) => r.data),
  update: (productId: string, id: string, payload: VariantPayload) => apiClient.patch(`/products/${productId}/variants/${id}`, payload).then((r) => r.data),
};

export interface BatchPayload { batchNumber: string; variantId?: string; manufactureDate?: string; expiryDate?: string; quantity?: number; costPrice?: number; notes?: string }

export const batchesApi = {
  list: (productId: string) => apiClient.get<ProductBatch[]>(`/products/${productId}/batches`).then((r) => list<ProductBatch>(r.data)),
  expiringSoon: (days = 30) => apiClient.get<ProductBatch[]>('/product-batches/expiring-soon', { params: { days } }).then((r) => list<ProductBatch>(r.data)),
  expired: () => apiClient.get<ProductBatch[]>('/product-batches/expired').then((r) => list<ProductBatch>(r.data)),
  create: (productId: string, payload: BatchPayload) => apiClient.post<ProductBatch>(`/products/${productId}/batches`, payload).then((r) => r.data),
  update: (productId: string, id: string, payload: BatchPayload) => apiClient.patch<ProductBatch>(`/products/${productId}/batches/${id}`, payload).then((r) => r.data),
  remove: (productId: string, id: string) => apiClient.delete(`/products/${productId}/batches/${id}`).then((r) => r.data),
};

export const imagesApi = {
  list: (productId: string) => apiClient.get<ProductImage[]>(`/products/${productId}/images`).then((r) => list<ProductImage>(r.data)),
  add: (productId: string, payload: { url: string; isPrimary?: boolean; sortOrder?: number }) =>
    apiClient.post<ProductImage>(`/products/${productId}/images`, payload).then((r) => r.data),
  setPrimary: (productId: string, imageId: string) => apiClient.patch(`/products/${productId}/images/${imageId}/primary`).then((r) => r.data),
  reorder: (productId: string, imageIds: string[]) => apiClient.patch(`/products/${productId}/images/reorder`, { imageIds }).then((r) => r.data),
  remove: (productId: string, imageId: string) => apiClient.delete(`/products/${productId}/images/${imageId}`).then((r) => r.data),
};

/** Photo uploads (multipart) through the shared uploads client. */
export const uploadsApi = createUploadsApi(apiClient);
export type { UploadRecord };
