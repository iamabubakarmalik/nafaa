import { db, type OfflineProduct } from './db';
import { productsApi, type ProductsListParams, type Product } from '@/api/products.api';

export interface OfflineProductsResponse {
  items: Product[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  isFromCache: boolean;
}

function filterProducts(
  products: OfflineProduct[],
  params?: ProductsListParams,
): OfflineProduct[] {
  let list = [...products];

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

/**
 * Strip internal sync fields and ensure required Product fields exist
 */
function toProduct(op: OfflineProduct): Product {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _syncedAt, _localDirty, _updatedAt, ...rest } = op;
  return {
    ...rest,
    createdAt: rest.createdAt || new Date().toISOString(),
    updatedAt: rest.updatedAt || new Date().toISOString(),
  } as Product;
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

    // Background refresh
    if (navigator.onLine) {
      productsApi
        .list({ ...params, page: 1, limit: 5000 })
        .then(async (serverData) => {
          const now = Date.now();
          await db.transaction('rw', db.products, async () => {
            for (const p of serverData.items) {
              await db.products.put({ ...p, _syncedAt: now } as OfflineProduct);
            }
          });
        })
        .catch(() => {});
    }

    return {
      items: paginatedItems,
      meta: { page, limit, total, totalPages },
      isFromCache: true,
    };
  },

  getOne: async (id: string): Promise<Product | null> => {
    const cached = await db.products.get(id);

    if (navigator.onLine) {
      productsApi
        .getOne(id)
        .then(async (fresh) => {
          await db.products.put({ ...fresh, _syncedAt: Date.now() } as OfflineProduct);
        })
        .catch(() => {});
    }

    return cached ? toProduct(cached) : null;
  },

  /**
   * Lookup by barcode — throws if not found (matches original API behavior)
   */
  byBarcode: async (code: string): Promise<Product> => {
    const trimmed = code.trim();

    const cached = await db.products.where('barcode').equals(trimmed).first();
    if (cached) return toProduct(cached);

    const bySku = await db.products.where('sku').equals(trimmed).first();
    if (bySku) return toProduct(bySku);

    if (navigator.onLine) {
      const serverMatch = await productsApi.byBarcode(trimmed);
      if (serverMatch) {
        await db.products.put({
          ...serverMatch,
          _syncedAt: Date.now(),
        } as OfflineProduct);
        return serverMatch;
      }
    }

    throw new Error(`Barcode "${code}" se koi product nahi mila`);
  },

  lowStock: async (): Promise<Product[]> => {
    const all = await db.products.toArray();
    return all
      .filter((p) => p.isActive && p.stock > 0 && p.stock <= p.lowStockAlert)
      .map(toProduct);
  },

  decrementStock: async (productId: string, quantity: number): Promise<void> => {
    const product = await db.products.get(productId);
    if (!product) return;

    await db.products.update(productId, {
      stock: Math.max(0, product.stock - quantity),
      _localDirty: true,
    });
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
