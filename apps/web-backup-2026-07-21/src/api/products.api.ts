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
  metaTitle?: string;
  metaDescription?: string;
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

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const productsApi = {
  list: (params?: ProductsListParams) =>
    apiClient
      .get<{ data: ProductsResponse }>('/products', {
        params: {
          ...params,
          isActive: params?.isActive !== undefined ? String(params.isActive) : undefined,
          isFeatured: params?.isFeatured !== undefined ? String(params.isFeatured) : undefined,
        },
      })
      .then(unwrap),

  lowStock: () =>
    apiClient.get<{ data: Product[] }>('/products/low-stock').then(unwrap),

  getOne: (id: string) =>
    apiClient.get<{ data: Product }>(`/products/${id}`).then(unwrap),

  byBarcode: (code: string) =>
    apiClient
      .get<{ data: Product }>(`/products/barcode/${encodeURIComponent(code)}`)
      .then(unwrap),

  create: (payload: CreateProductPayload) =>
    apiClient.post<{ data: Product }>('/products', payload).then(unwrap),

  update: (id: string, payload: UpdateProductPayload) =>
    apiClient.patch<{ data: Product }>(`/products/${id}`, payload).then(unwrap),

  toggleFeatured: (id: string) =>
    apiClient
      .patch<{ data: Product }>(`/products/${id}/toggle-featured`)
      .then(unwrap),

  toggleActive: (id: string) =>
    apiClient.patch<{ data: Product }>(`/products/${id}/toggle-active`).then(unwrap),

  bulkAction: (
    productIds: string[],
    action: 'activate' | 'deactivate' | 'delete' | 'feature' | 'unfeature',
  ) =>
    apiClient
      .post<{ data: any }>('/products/bulk-action', { productIds, action })
      .then(unwrap),

  generateBarcode: (id: string) =>
    apiClient.post<{ data: Product }>(`/products/${id}/generate-barcode`).then(unwrap),

  bulkGenerateBarcodes: (productIds: string[]) =>
    apiClient
      .post<{ data: { count: number; products: Product[] } }>('/products/bulk-generate-barcodes', { productIds })
      .then(unwrap),

  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/products/${id}`).then(unwrap),

  // ─── Bulk Import ────────────────────────────────────
  bulkImportPreview: (rows: BulkImportProductRow[]) =>
    apiClient
      .post<{ data: BulkImportPreviewResponse }>('/products/bulk-import/preview', { rows })
      .then(unwrap),

  bulkImportApply: (rows: BulkImportApplyRow[]) =>
    apiClient
      .post<{ data: BulkImportApplyResponse }>('/products/bulk-import/apply', { rows })
      .then(unwrap),

  bulkImportReferenceData: () =>
    apiClient
      .get<{ data: BulkImportReferenceData }>('/products/bulk-import/reference-data')
      .then(unwrap),
};

// ─── Bulk Import Types ────────────────────────────────────

export interface BulkImportProductRow {
  name: string;
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

export interface BulkImportPreviewRow {
  index: number;
  name: string;
  description?: string;
  shortDescription?: string;
  sku?: string;
  barcode?: string;
  unit: string;
  price: number;
  costPrice: number;
  wholesalePrice?: number;
  taxRate: number;
  stock: number;
  lowStockAlert: number;
  weight?: number;
  weightUnit?: string;
  dimensions?: string;
  expiryTracked: boolean;
  isActive: boolean;
  isFeatured: boolean;
  categoryName?: string;
  categoryId?: string;
  brandName?: string;
  brandId?: string;
  tagNames: string[];
  tagIds: string[];
  variantNames: string[];
  imageUrls: string[];
  valid: boolean;
  errors: string[];
  warnings: string[];
  willCreateCategory: boolean;
  willCreateBrand: boolean;
  willCreateTags: string[];
}

export interface BulkImportPreviewResponse {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  rows: BulkImportPreviewRow[];
  totalProductsToCreate: number;
  totalVariantsToCreate: number;
  totalCategoriesToCreate: number;
  totalBrandsToCreate: number;
  totalTagsToCreate: number;
  totalStockValue: number;
  totalCostValue: number;
}

export interface BulkImportApplyRow {
  name: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  newCategoryName?: string;
  brandId?: string;
  newBrandName?: string;
  tagIds?: string[];
  newTagNames?: string[];
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
  variantNames?: string[];
  imageUrls?: string[];
}

export interface BulkImportApplyResponse {
  totalSubmitted: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    index: number;
    productName: string;
    success: boolean;
    productId?: string;
    variantsCreated?: number;
    error?: string;
  }>;
  newCategoriesCreated: number;
  newBrandsCreated: number;
  newTagsCreated: number;
  newVariantsCreated: number;
}

export interface BulkImportReferenceData {
  categories: Array<{ id: string; name: string; color: string }>;
  brands: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string; color: string }>;
}
