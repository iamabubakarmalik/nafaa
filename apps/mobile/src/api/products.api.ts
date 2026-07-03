import { apiClient } from './client';
import type { ProductImage } from './product-images.api';
import type { ProductVariant } from './product-variants.api';
import type { ProductBatch } from './product-batches.api';
import type { Brand } from './brands.api';
import type { Tag } from './tags.api';

export interface Product {
  id: string;
  tenantId: string;
  categoryId?: string | null;
  brandId?: string | null;
  name: string;
  slug?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  price: number;
  costPrice: number;
  wholesalePrice?: number | null;
  taxRate: number;
  stock: number;
  lowStockAlert: number;
  weight?: number | null;
  weightUnit?: string | null;
  dimensions?: string | null;
  hasVariants: boolean;
  expiryTracked: boolean;
  isActive: boolean;
  isFeatured: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; color: string } | null;
  brand?: Brand | null;
  tags?: Array<{ tag: Tag }>;
  images?: ProductImage[];
  variants?: ProductVariant[];
  batches?: ProductBatch[];
  _count?: {
    saleItems?: number;
    variants?: number;
    images?: number;
    batches?: number;
  };
}

export interface ProductsResponse {
  items: Product[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  brandId?: string;
  sku?: string;
  barcode?: string;
  unit?: string;
  price: number;
  costPrice?: number;
  wholesalePrice?: number;
  taxRate?: number;
  stock?: number;
  lowStockAlert?: number;
  weight?: number;
  weightUnit?: string;
  dimensions?: string;
  expiryTracked?: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  tagIds?: string[];
  imageUrls?: string[];
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export interface ProductsListParams {
  search?: string;
  categoryId?: string;
  brandId?: string;
  tagId?: string;
  stockStatus?: 'all' | 'in' | 'low' | 'out';
  isActive?: boolean;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

function unwrapList(res: any): ProductsResponse {
  const body = res?.data;
  if (body?.data?.items) return body.data;
  if (body?.items) return body;
  if (Array.isArray(body)) {
    return { items: body, meta: { page: 1, limit: body.length, total: body.length, totalPages: 1 } };
  }
  if (Array.isArray(body?.data)) {
    return { items: body.data, meta: { page: 1, limit: body.data.length, total: body.data.length, totalPages: 1 } };
  }
  return { items: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
}

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data) return body.data as T;
  return body as T;
}

function unwrapArr<T>(res: any): T[] {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

// ═══════════════════════════════════════════
// BULK IMPORT TYPES
// ═══════════════════════════════════════════

export interface BulkImportRow {
  name?: string;
  description?: string;
  shortDescription?: string;
  categoryName?: string;
  brandName?: string;
  tagNames?: string;
  sku?: string;
  barcode?: string;
  unit?: string;
  price?: number;
  costPrice?: number;
  wholesalePrice?: number;
  taxRate?: number;
  stock?: number;
  lowStockAlert?: number;
  weight?: number;
  weightUnit?: string;
  dimensions?: string;
  expiryTracked?: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  variantNames?: string;
  imageUrls?: string;
}

export interface BulkImportPreviewRowResult {
  index: number;
  name: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  categoryName?: string;
  willCreateCategory?: boolean;
  brandId?: string;
  brandName?: string;
  willCreateBrand?: boolean;
  tagIds?: string[];
  tagNames?: string[];
  willCreateTags?: string[];
  sku?: string;
  barcode?: string;
  unit: string;
  price: number;
  costPrice?: number;
  wholesalePrice?: number;
  taxRate?: number;
  stock: number;
  lowStockAlert: number;
  weight?: number;
  weightUnit?: string;
  dimensions?: string;
  expiryTracked?: boolean;
  isActive: boolean;
  isFeatured: boolean;
  variantNames: string[];
  imageUrls: string[];
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BulkImportPreviewResponse {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  totalStockValue: number;
  totalCostValue: number;
  totalVariantsToCreate: number;
  totalCategoriesToCreate: number;
  totalBrandsToCreate: number;
  totalTagsToCreate: number;
  rows: BulkImportPreviewRowResult[];
}

export interface BulkImportApplyResponse {
  totalSubmitted: number;
  successCount: number;
  failureCount: number;
  newCategoriesCreated: number;
  newBrandsCreated: number;
  newTagsCreated: number;
  newVariantsCreated: number;
  results: Array<{
    index: number;
    success: boolean;
    productName?: string;
    error?: string;
  }>;
}

export interface ReferenceData {
  categories: Array<{ id: string; name: string; color: string }>;
  brands: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string; color: string }>;
}

// ═══════════════════════════════════════════
// API
// ═══════════════════════════════════════════

export const productsApi = {
  list: (params?: ProductsListParams): Promise<ProductsResponse> =>
    apiClient
      .get('/products', {
        params: {
          ...params,
          isActive: params?.isActive !== undefined ? String(params.isActive) : undefined,
          isFeatured: params?.isFeatured !== undefined ? String(params.isFeatured) : undefined,
        },
      })
      .then(unwrapList),

  lowStock: (): Promise<Product[]> =>
    apiClient.get('/products/low-stock').then((r) => unwrapArr<Product>(r)),

  getOne: (id: string): Promise<Product> =>
    apiClient.get(`/products/${id}`).then((r) => unwrapOne<Product>(r)),

  byBarcode: (code: string): Promise<Product> =>
    apiClient.get(`/products/barcode/${encodeURIComponent(code)}`).then((r) => unwrapOne<Product>(r)),

  create: (payload: CreateProductPayload): Promise<Product> =>
    apiClient.post('/products', payload).then((r) => unwrapOne<Product>(r)),

  update: (id: string, payload: UpdateProductPayload): Promise<Product> =>
    apiClient.patch(`/products/${id}`, payload).then((r) => unwrapOne<Product>(r)),

  toggleFeatured: (id: string): Promise<Product> =>
    apiClient.patch(`/products/${id}/toggle-featured`).then((r) => unwrapOne<Product>(r)),

  toggleActive: (id: string): Promise<Product> =>
    apiClient.patch(`/products/${id}/toggle-active`).then((r) => unwrapOne<Product>(r)),

  bulkAction: (
    productIds: string[],
    action: 'activate' | 'deactivate' | 'delete' | 'feature' | 'unfeature',
  ): Promise<any> =>
    apiClient.post('/products/bulk-action', { productIds, action }).then((r) => unwrapOne<any>(r)),

  remove: (id: string): Promise<{ message: string }> =>
    apiClient.delete(`/products/${id}`).then((r) => unwrapOne<{ message: string }>(r)),

  // ✅ NEW BARCODE METHODS
  generateBarcode: (id: string): Promise<Product> =>
    apiClient.post(`/products/${id}/generate-barcode`).then((r) => unwrapOne<Product>(r)),

  bulkGenerateBarcodes: (productIds: string[]): Promise<{ count: number }> =>
    apiClient
      .post('/products/bulk-generate-barcodes', { productIds })
      .then((r) => unwrapOne<{ count: number }>(r)),

  // ─── Bulk import ────────────────────────────
  bulkImportReferenceData: (): Promise<ReferenceData> =>
    apiClient.get('/products/bulk-import/reference-data').then((r) => unwrapOne<ReferenceData>(r)),

  bulkImportPreview: (rows: BulkImportRow[]): Promise<BulkImportPreviewResponse> =>
    apiClient.post('/products/bulk-import-preview', { rows }).then((r) => unwrapOne<BulkImportPreviewResponse>(r)),

  bulkImportApply: (rows: any[]): Promise<BulkImportApplyResponse> =>
    apiClient.post('/products/bulk-import-apply', { rows }).then((r) => unwrapOne<BulkImportApplyResponse>(r)),
};
