import { db, type OfflineProduct, localId, isTempId } from './db';
import {
  productsApi,
  type ProductsListParams,
  type Product,
  type CreateProductPayload,
  type UpdateProductPayload,
} from '@modules/inventory/products/api/products.api';
import { queueGenericMutation } from './syncEngine';

export interface OfflineProductsResponse {
  items: Product[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  isFromCache: boolean;
}

let lastBgRefreshAt = 0;
const BG_REFRESH_GAP_MS = 30 * 1000;

function filterProducts(products: OfflineProduct[], params?: ProductsListParams): OfflineProduct[] {
  let list = products.filter((p) => !p._localDeleted);

  if (params?.search) {
    const q = params.search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q),
    );
  }
  if (params?.categoryId) list = list.filter((p) => p.categoryId === params.categoryId);
  if (params?.brandId) list = list.filter((p) => p.brandId === params.brandId);
  if (params?.isActive !== undefined) list = list.filter((p) => p.isActive === params.isActive);
  if (params?.isFeatured !== undefined) list = list.filter((p) => p.isFeatured === params.isFeatured);
  if (params?.stockStatus && params.stockStatus !== 'all') {
    list = list.filter((p) => {
      if (params.stockStatus === 'in') return p.stock > p.lowStockAlert;
      if (params.stockStatus === 'low') return p.stock > 0 && p.stock <= p.lowStockAlert;
      if (params.stockStatus === 'out') return p.stock === 0;
      return true;
    });
  }
  if (params?.minPrice !== undefined) list = list.filter((p) => p.price >= params.minPrice!);
  if (params?.maxPrice !== undefined) list = list.filter((p) => p.price <= params.maxPrice!);
  return list;
}

function toProduct(op: OfflineProduct): Product {
  const { _syncedAt, _localDirty, _localDeleted, _tempId, _updatedAt, ...rest } = op;
  return {
    ...rest,
    createdAt: rest.createdAt || new Date().toISOString(),
    updatedAt: rest.updatedAt || new Date().toISOString(),
  } as Product;
}

async function backgroundRefresh(params?: ProductsListParams) {
  const now = Date.now();
  if (now - lastBgRefreshAt < BG_REFRESH_GAP_MS) return;
  lastBgRefreshAt = now;

  try {
    const serverData = await productsApi.list({ ...params, page: 1, limit: 5000 });
    if (!serverData.items?.length) return;

    const syncedAt = Date.now();
    await db.transaction('rw', db.products, async () => {
      for (const p of serverData.items) {
        // Preserve local dirty flag if this product is a pending update
        const existing = await db.products.get(p.id);
        if (existing?._localDirty && !existing?._tempId) continue;
        await db.products.put({ ...p, _syncedAt: syncedAt } as OfflineProduct);
      }
    });
  } catch {}
}

export async function forceRefreshProducts(): Promise<void> {
  lastBgRefreshAt = 0;
  if (!navigator.onLine) return;
  try {
    const serverData = await productsApi.list({ page: 1, limit: 5000 });
    const now = Date.now();
    const serverIds = new Set(serverData.items.map((p) => p.id));
    await db.transaction('rw', db.products, async () => {
      const localIds = (await db.products.toCollection().primaryKeys()) as string[];
      const toDelete = localIds.filter((id) => !serverIds.has(id) && !isTempId(id));
      if (toDelete.length > 0) await db.products.bulkDelete(toDelete);
      for (const p of serverData.items) {
        const existing = await db.products.get(p.id);
        if (existing?._localDirty && !existing?._tempId) continue;
        await db.products.put({ ...p, _syncedAt: now } as OfflineProduct);
      }
    });
  } catch (e) {
    console.error('[offlineProducts] Force refresh failed', e);
  }
}

export const offlineProductsApi = {
  list: async (params?: ProductsListParams): Promise<OfflineProductsResponse> => {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 24;

    const allCached = await db.products.toArray();
    const filtered = filterProducts(allCached, params);
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const startIdx = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIdx, startIdx + limit).map(toProduct);

    if (navigator.onLine && allCached.length > 0) {
      backgroundRefresh(params);
    } else if (navigator.onLine && allCached.length === 0) {
      try {
        const serverData = await productsApi.list({ ...params, page: 1, limit: 5000 });
        const now = Date.now();
        await db.transaction('rw', db.products, async () => {
          for (const p of serverData.items) {
            await db.products.put({ ...p, _syncedAt: now } as OfflineProduct);
          }
        });
        const freshCache = await db.products.toArray();
        const freshFiltered = filterProducts(freshCache, params);
        return {
          items: freshFiltered.slice(startIdx, startIdx + limit).map(toProduct),
          meta: { page, limit, total: freshFiltered.length, totalPages: Math.ceil(freshFiltered.length / limit) },
          isFromCache: false,
        };
      } catch {}
    }

    return {
      items: paginatedItems,
      meta: { page, limit, total, totalPages },
      isFromCache: allCached.length > 0,
    };
  },

  getOne: async (id: string): Promise<Product | null> => {
    const cached = await db.products.get(id);
    if (navigator.onLine && !isTempId(id)) {
      productsApi.getOne(id)
        .then(async (fresh) => {
          const existing = await db.products.get(id);
          if (existing?._localDirty) return;
          await db.products.put({ ...fresh, _syncedAt: Date.now() } as OfflineProduct);
        })
        .catch(() => {});
    }
    return cached && !cached._localDeleted ? toProduct(cached) : null;
  },

  byBarcode: async (code: string): Promise<Product> => {
    const trimmed = code.trim();
    const cached = await db.products.where('barcode').equals(trimmed).first();
    if (cached && !cached._localDeleted) return toProduct(cached);

    const bySku = await db.products.where('sku').equals(trimmed).first();
    if (bySku && !bySku._localDeleted) return toProduct(bySku);

    if (navigator.onLine) {
      const serverMatch = await productsApi.byBarcode(trimmed);
      if (serverMatch) {
        await db.products.put({ ...serverMatch, _syncedAt: Date.now() } as OfflineProduct);
        return serverMatch;
      }
    }
    throw new Error(`Barcode "${code}" se koi product nahi mila`);
  },

  lowStock: async (): Promise<Product[]> => {
    const all = await db.products.toArray();
    return all
      .filter((p) => !p._localDeleted && p.isActive && p.stock > 0 && p.stock <= p.lowStockAlert)
      .map(toProduct);
  },

  /**
   * POS fast search — offline Dexie se, online server se.
   * Returns Product[] shaped for POS tiles.
   */
  posSearch: async (query: string, limit = 24): Promise<Product[]> => {
    const all = (await db.products.toArray()).filter((p) => !p._localDeleted && p.isActive);
    if (!query.trim()) {
      return all.slice(0, limit).map(toProduct);
    }
    const q = query.toLowerCase().trim();
    const scored = all
      .map((p) => {
        let score = 0;
        const name = p.name.toLowerCase();
        if (p.barcode === q) score += 1000;
        if (p.sku?.toLowerCase() === q) score += 900;
        if (name.startsWith(q)) score += 500;
        if (name.includes(q)) score += 300;
        if ((p.barcode || '').includes(q)) score += 200;
        if ((p.sku || '').toLowerCase().includes(q)) score += 150;
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((x) => toProduct(x.p));
  },

  decrementStock: async (productId: string, quantity: number): Promise<void> => {
    const product = await db.products.get(productId);
    if (!product) return;
    await db.products.update(productId, {
      stock: Math.max(0, product.stock - quantity),
      _localDirty: true,
    });
  },

  // ═══════════════════════════════════════════════
  // MUTATIONS — CREATE / UPDATE / DELETE (offline-first)
  // ═══════════════════════════════════════════════
  create: async (payload: CreateProductPayload): Promise<Product> => {
    if (navigator.onLine) {
      try {
        const created = await productsApi.create(payload);
        await db.products.put({ ...created, _syncedAt: Date.now() } as OfflineProduct);
        return created;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status && status < 500 && status !== 408) throw err; // real business error
      }
    }
    // Offline path — build a local product
    const tempId = localId('temp_prod');
    const now = new Date().toISOString();
    const local: OfflineProduct = {
      id: tempId,
      tenantId: '',
      categoryId: null,
      brandId: null,
      name: payload.name,
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
    return toProduct(local);
  },

  update: async (id: string, payload: UpdateProductPayload): Promise<Product> => {
    const existing = await db.products.get(id);
    if (!existing) throw new Error('Product nahi mila');

    // Optimistic local update
    const updated: OfflineProduct = {
      ...existing,
      ...(payload as any),
      updatedAt: new Date().toISOString(),
      _localDirty: true,
    };
    await db.products.put(updated);

    if (navigator.onLine && !isTempId(id)) {
      try {
        const server = await productsApi.update(id, payload);
        await db.products.put({ ...server, _syncedAt: Date.now(), _localDirty: false } as OfflineProduct);
        return server;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status && status < 500 && status !== 408) throw err;
      }
    }

    // Queue if temp OR offline
    await queueGenericMutation({
      type: 'UPDATE_PRODUCT',
      payload,
      endpoint: `/products/${id}`,
      method: 'PATCH',
      tempId: isTempId(id) ? id : undefined,
      idField: 'endpoint',
    });
    return toProduct(updated);
  },

  remove: async (id: string, force = false): Promise<void> => {
    const existing = await db.products.get(id);
    if (!existing) return;

    // If temp product created offline & never synced — just remove
    if (isTempId(id) && existing._tempId) {
      await db.products.delete(id);
      // Remove pending create if any
      const pendingCreate = await db.syncQueue.where('tempId').equals(id).first();
      if (pendingCreate) await db.syncQueue.delete(pendingCreate.id);
      return;
    }

    // Mark deleted locally (hide from lists)
    await db.products.update(id, { _localDeleted: true, _localDirty: true });

    if (navigator.onLine) {
      try {
        await productsApi.remove(id, force);
        await db.products.delete(id);
        return;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status && status < 500 && status !== 408) {
          // Restore visibility on business error
          await db.products.update(id, { _localDeleted: false, _localDirty: false });
          throw err;
        }
      }
    }

    await queueGenericMutation({
      type: 'DELETE_PRODUCT',
      payload: { force },
      endpoint: `/products/${id}${force ? '?force=true' : ''}`,
      method: 'DELETE',
    });
  },

  toggleActive: async (id: string): Promise<Product> => {
    const existing = await db.products.get(id);
    if (!existing) throw new Error('Product nahi mila');
    return offlineProductsApi.update(id, { isActive: !existing.isActive });
  },

  toggleFeatured: async (id: string): Promise<Product> => {
    const existing = await db.products.get(id);
    if (!existing) throw new Error('Product nahi mila');
    return offlineProductsApi.update(id, { isFeatured: !existing.isFeatured });
  },
};

export const offlineLookups = {
  categories: async () => {
    const list = await db.lookups.where('type').equals('category').toArray();
    return list.map((l) => ({ id: l.id, name: l.name, color: l.color || '#6366f1' }));
  },
  brands: async () => {
    const list = await db.lookups.where('type').equals('brand').toArray();
    return list.map((l) => ({ id: l.id, name: l.name }));
  },
  tags: async () => {
    const list = await db.lookups.where('type').equals('tag').toArray();
    return list.map((l) => ({ id: l.id, name: l.name, color: l.color || '#94a3b8' }));
  },
};
