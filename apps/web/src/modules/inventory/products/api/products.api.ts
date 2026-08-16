import { apiClient } from '@core/api/client';
import type { ProductImage } from './product-images.api';
import type { ProductVariant } from './product-variants.api';
import type { ProductBatch } from './product-batches.api';
import type { Brand } from '@modules/inventory/brands/api/brands.api';
import type { Tag } from '@modules/inventory/tags/api/tags.api';

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
  shopStock?: number;
  shopId?: string;
  _count?: {
    saleItems?: number;
    variants?: number;
    images?: number;
    batches?: number;
  };
}

export interface ShopStockEntry {
  id: string;
  tenantId: string;
  shopId: string;
  productId: string;
  variantId: string | null;
  stock: number;
  lowStockAlert: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product: Product;
  variant: ProductVariant | null;
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

/** Network failure check (business error NAHI) */
const isNetFail = (e: any): boolean => {
  const s = e?.response?.status;
  return !s || s === 0 || s === 408 || s >= 502;
};

/* ── Dexie helpers (inline — circular import se bachne ke liye) ── */

async function localList(params?: ProductsListParams): Promise<ProductsResponse> {
  const { db } = await import('@core/lib/offline/db');
  let rows = (await db.products.toArray()).filter((p: any) => !p._localDeleted);

  if (params?.search) {
    const q = params.search.toLowerCase().trim();
    rows = rows.filter(
      (p: any) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q),
    );
  }
  if (params?.categoryId) rows = rows.filter((p: any) => p.categoryId === params.categoryId);
  if (params?.brandId) rows = rows.filter((p: any) => p.brandId === params.brandId);
  if (params?.isActive !== undefined) rows = rows.filter((p: any) => p.isActive === params.isActive);
  if (params?.isFeatured !== undefined) rows = rows.filter((p: any) => p.isFeatured === params.isFeatured);
  if (params?.stockStatus && params.stockStatus !== 'all') {
    rows = rows.filter((p: any) => {
      if (params.stockStatus === 'in') return p.stock > p.lowStockAlert;
      if (params.stockStatus === 'low') return p.stock > 0 && p.stock <= p.lowStockAlert;
      if (params.stockStatus === 'out') return p.stock === 0;
      return true;
    });
  }
  if (params?.minPrice !== undefined) rows = rows.filter((p: any) => p.price >= params.minPrice!);
  if (params?.maxPrice !== undefined) rows = rows.filter((p: any) => p.price <= params.maxPrice!);

  const page = params?.page ?? 1;
  const limit = params?.limit ?? 24;
  const total = rows.length;
  const start = (page - 1) * limit;
  const items = rows.slice(start, start + limit).map((p: any) => {
    const { _syncedAt, _localDirty, _localDeleted, _tempId, _updatedAt, ...rest } = p;
    return rest as Product;
  });
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

async function localCreate(payload: CreateProductPayload): Promise<Product> {
  const { db, localId } = await import('@core/lib/offline/db');
  const { queueGenericMutation } = await import('@core/lib/offline/syncEngine');

  const tempId = localId('temp_prod');
  const now = new Date().toISOString();
  const local: any = {
    id: tempId,
    tenantId: '',
    categoryId: payload.categoryId ?? null,
    brandId: payload.brandId ?? null,
    name: payload.name,
    description: payload.description ?? null,
    shortDescription: payload.shortDescription ?? null,
    sku: payload.sku ?? null,
    barcode: payload.barcode ?? null,
    unit: payload.unit || 'pcs',
    price: Number(payload.price) || 0,
    costPrice: Number(payload.costPrice) || 0,
    wholesalePrice: payload.wholesalePrice ?? null,
    taxRate: Number(payload.taxRate) || 0,
    stock: Number(payload.stock) || 0,
    lowStockAlert: Number(payload.lowStockAlert) || 0,
    hasVariants: false,
    expiryTracked: !!payload.expiryTracked,
    isActive: payload.isActive !== false,
    isFeatured: !!payload.isFeatured,
    createdAt: now,
    updatedAt: now,
    _syncedAt: 0,
    _localDirty: true,
    _tempId: true,
  };
  await db.products.put(local);
  await queueGenericMutation({
    type: 'CREATE_PRODUCT',
    payload,
    endpoint: '/products',
    method: 'POST',
    tempId,
  });
  const { _syncedAt, _localDirty, _tempId, ...rest } = local;
  return rest as Product;
}

async function localUpdate(id: string, payload: UpdateProductPayload): Promise<Product> {
  const { db, isTempId } = await import('@core/lib/offline/db');
  const { queueGenericMutation } = await import('@core/lib/offline/syncEngine');

  const existing = await db.products.get(id);
  if (!existing) throw new Error('Product nahi mila');

  const updated: any = {
    ...existing,
    ...(payload as any),
    updatedAt: new Date().toISOString(),
    _localDirty: true,
  };
  await db.products.put(updated);
  await queueGenericMutation({
    type: 'UPDATE_PRODUCT',
    payload,
    endpoint: `/products/${id}`,
    method: 'PATCH',
    tempId: isTempId(id) ? id : undefined,
    idField: 'endpoint',
  });
  const { _syncedAt, _localDirty, _localDeleted, _tempId, ...rest } = updated;
  return rest as Product;
}

async function localRemove(id: string, force = false): Promise<{ message: string; forced?: boolean; softDeleted?: boolean }> {
  const { db, isTempId } = await import('@core/lib/offline/db');
  const { queueGenericMutation } = await import('@core/lib/offline/syncEngine');

  const existing = await db.products.get(id);
  if (!existing) return { message: 'Already removed' };

  // Temp product (kabhi sync nahi hua) — seedha delete
  if (isTempId(id) && (existing as any)._tempId) {
    await db.products.delete(id);
    const pendingCreate = await db.syncQueue.where('tempId').equals(id).first();
    if (pendingCreate) await db.syncQueue.delete(pendingCreate.id);
    return { message: 'Removed (was offline-only)' };
  }

  await db.products.update(id, { _localDeleted: true, _localDirty: true } as any);
  await queueGenericMutation({
    type: 'DELETE_PRODUCT',
    payload: { force },
    endpoint: `/products/${id}${force ? '?force=true' : ''}`,
    method: 'DELETE',
  });
  return { message: 'Queued for delete', softDeleted: true };
}

export const productsApi = {
  /**
   * LIST — server first, network fail pe Dexie cache.
   * Har industry ka products page offline chalega.
   */
  list: async (params?: ProductsListParams): Promise<ProductsResponse> => {
    try {
      return await apiClient
        .get<{ data: ProductsResponse }>('/products', {
          params: {
            ...params,
            isActive: params?.isActive !== undefined ? String(params.isActive) : undefined,
            isFeatured: params?.isFeatured !== undefined ? String(params.isFeatured) : undefined,
          },
        })
        .then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      return localList(params);
    }
  },

  lowStock: async (shopId?: string): Promise<Product[]> => {
    try {
      return await apiClient
        .get<{ data: Product[] }>('/products/low-stock', { params: shopId ? { shopId } : {} })
        .then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db } = await import('@core/lib/offline/db');
      const all = await db.products.toArray();
      return all
        .filter((p: any) => !p._localDeleted && p.isActive && p.stock > 0 && p.stock <= p.lowStockAlert)
        .map((p: any) => {
          const { _syncedAt, _localDirty, _localDeleted, _tempId, ...rest } = p;
          return rest as Product;
        });
    }
  },

  shopStock: async (shopId: string): Promise<ShopStockEntry[]> => {
    try {
      return await apiClient
        .get<{ data: ShopStockEntry[] }>('/products/shop-stock', { params: { shopId } })
        .then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      // Offline fallback: cache se pseudo shop-stock
      const { db } = await import('@core/lib/offline/db');
      const rows = (await db.products.toArray()).filter((p: any) => !p._localDeleted && p.isActive);
      return rows.map((p: any) => ({
        id: `ss_${p.id}`,
        tenantId: p.tenantId || '',
        shopId,
        productId: p.id,
        variantId: null,
        stock: p.stock,
        lowStockAlert: p.lowStockAlert,
        isActive: true,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        product: p as unknown as Product,
        variant: null,
      }));
    }
  },

  getOne: async (id: string): Promise<Product> => {
    try {
      return await apiClient.get<{ data: Product }>(`/products/${id}`).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db } = await import('@core/lib/offline/db');
      const p: any = await db.products.get(id);
      if (!p || p._localDeleted) throw new Error('Product nahi mila (offline cache me nahi)');
      const { _syncedAt, _localDirty, _localDeleted, _tempId, ...rest } = p;
      return rest as Product;
    }
  },

  byBarcode: async (code: string, shopId?: string): Promise<Product> => {
    try {
      return await apiClient
        .get<{ data: Product }>(`/products/barcode/${encodeURIComponent(code)}`, {
          params: shopId ? { shopId } : {},
        })
        .then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db } = await import('@core/lib/offline/db');
      const trimmed = code.trim();
      const hit: any =
        (await db.products.where('barcode').equals(trimmed).first()) ||
        (await db.products.where('sku').equals(trimmed).first());
      if (!hit || hit._localDeleted) throw new Error(`Barcode "${code}" se koi product nahi mila`);
      const { _syncedAt, _localDirty, _localDeleted, _tempId, ...rest } = hit;
      return rest as Product;
    }
  },

  /** CREATE — online pe server, offline pe local + queue */
  create: async (payload: CreateProductPayload): Promise<Product> => {
    try {
      return await apiClient.post<{ data: Product }>('/products', payload).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      return localCreate(payload);
    }
  },

  update: async (id: string, payload: UpdateProductPayload): Promise<Product> => {
    try {
      return await apiClient.patch<{ data: Product }>(`/products/${id}`, payload).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      return localUpdate(id, payload);
    }
  },

  toggleFeatured: async (id: string): Promise<Product> => {
    try {
      return await apiClient.patch<{ data: Product }>(`/products/${id}/toggle-featured`).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db } = await import('@core/lib/offline/db');
      const p: any = await db.products.get(id);
      if (!p) throw new Error('Product nahi mila');
      return localUpdate(id, { isFeatured: !p.isFeatured } as any);
    }
  },

  toggleActive: async (id: string): Promise<Product> => {
    try {
      return await apiClient.patch<{ data: Product }>(`/products/${id}/toggle-active`).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db } = await import('@core/lib/offline/db');
      const p: any = await db.products.get(id);
      if (!p) throw new Error('Product nahi mila');
      return localUpdate(id, { isActive: !p.isActive } as any);
    }
  },

  remove: async (id: string, force = false) => {
    try {
      return await apiClient
        .delete<{ data: { message: string; forced?: boolean; softDeleted?: boolean } }>(
          `/products/${id}${force ? '?force=true' : ''}`,
        )
        .then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      return localRemove(id, force);
    }
  },

  /* ── Server-only operations (offline pe clear error) ── */

  bulkAction: (
    productIds: string[],
    action: 'activate' | 'deactivate' | 'delete' | 'feature' | 'unfeature',
  ) => {
    if (!navigator.onLine) return Promise.reject(new Error('Bulk action ke liye internet chahiye'));
    return apiClient
      .post<{ data: any }>('/products/bulk-action', { productIds, action })
      .then(unwrap);
  },

  generateBarcode: (id: string) => {
    if (!navigator.onLine) return Promise.reject(new Error('Barcode generate ke liye internet chahiye'));
    return apiClient.post<{ data: Product }>(`/products/${id}/generate-barcode`).then(unwrap);
  },

  bulkGenerateBarcodes: (productIds: string[]) => {
    if (!navigator.onLine) return Promise.reject(new Error('Internet chahiye'));
    return apiClient
      .post<{ data: { count: number; products: Product[] } }>('/products/bulk-generate-barcodes', { productIds })
      .then(unwrap);
  },

  backfillShopStock: () => {
    if (!navigator.onLine) return Promise.reject(new Error('Internet chahiye'));
    return apiClient
      .post<{ data: { productsProcessed: number; shopsProcessed: number } }>('/products/backfill-shop-stock')
      .then(unwrap);
  },

  bulkImportPreview: (rows: BulkImportProductRow[]) => {
    if (!navigator.onLine) return Promise.reject(new Error('Bulk import ke liye internet chahiye'));
    return apiClient
      .post<{ data: BulkImportPreviewResponse }>('/products/bulk-import/preview', { rows })
      .then(unwrap);
  },

  bulkImportApply: (rows: BulkImportApplyRow[]) => {
    if (!navigator.onLine) return Promise.reject(new Error('Bulk import ke liye internet chahiye'));
    return apiClient
      .post<{ data: BulkImportApplyResponse }>('/products/bulk-import/apply', { rows })
      .then(unwrap);
  },

  bulkImportReferenceData: async (): Promise<BulkImportReferenceData> => {
    try {
      return await apiClient
        .get<{ data: BulkImportReferenceData }>('/products/bulk-import/reference-data')
        .then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db } = await import('@core/lib/offline/db');
      const lookups = await db.lookups.toArray();
      return {
        categories: lookups.filter((l: any) => l.type === 'category').map((l: any) => ({ id: l.id, name: l.name, color: l.color || '#6366f1' })),
        brands: lookups.filter((l: any) => l.type === 'brand').map((l: any) => ({ id: l.id, name: l.name })),
        tags: lookups.filter((l: any) => l.type === 'tag').map((l: any) => ({ id: l.id, name: l.name, color: l.color || '#94a3b8' })),
      };
    }
  },
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
