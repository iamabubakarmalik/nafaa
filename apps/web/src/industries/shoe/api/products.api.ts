import { apiClient } from '@core/api/client';
import type { ShoeMeta } from '../components/meta';

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

/** Shoe details kept next to a product. */
export interface ShoeProductProfile {
  id: string;
  productId: string;
  brandId?: string | null;
  categoryType?: string | null;
  gender: string;
  ageGroup?: string | null;
  modelName?: string | null;
  modelCode?: string | null;
  collection?: string | null;
  season?: string | null;
  upperMaterial?: string | null;
  soleMaterial?: string | null;
  innerMaterial?: string | null;
  colorName?: string | null;
  closureType?: string | null;
  heelHeight?: string | null;
  sizeSystem: string;
  width?: string;
  runsLarge: boolean;
  runsSmall: boolean;
  sizingNotes?: string | null;
  isWaterproof: boolean;
  isBreathable: boolean;
  hasArchSupport: boolean;
  isOrthopedic: boolean;
  isHandmade: boolean;
  sport?: string | null;
  careInstructions?: string | null;
  warrantyMonths: number;
  warrantyDetails?: string | null;
  includesBox: boolean;
  mrp?: number | null;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isBridal: boolean;
  isEidSpecial: boolean;
  notes?: string | null;
}

interface SizeCell {
  id: string; name: string; barcode: string | null; sku: string | null; price: number; isActive: boolean;
  size: string | null; colorName: string | null; colorHex: string | null; lowStockAlert: number;
  stock: number; allStock: number; byShop: Array<{ shopId: string; name: string; stock: number }>; sold30: number;
}
export interface SizeGrid { productId: string; name: string; sizes: string[]; colors: string[]; shops: Array<{ id: string; name: string }>; variants: SizeCell[] }

export interface ReorderGroup {
  productId: string; name: string; brand: string | null; sold30: number;
  sizes: Array<{ variantId: string; name: string; size: string | null; colorName: string | null; stock: number; alert: number; sold30: number; suggest: number }>;
}

export const shoeProductsApi = {
  upsert: (data: Partial<ShoeProductProfile> & { productId: string }) => apiClient.post('/shoe/products', data).then(unwrap<ShoeProductProfile>),
  byProduct: (productId: string) => apiClient.get('/shoe/products/by-product/' + productId).then(unwrap<ShoeProductProfile | null>),
  meta: () => apiClient.get('/shoe/products/meta').then(unwrap<{ items: ShoeMeta[] }>),
  sizeGrid: (productId: string) => apiClient.get(`/shoe/products/${productId}/size-grid`).then(unwrap<SizeGrid>),
  reorder: (limit = 100) => apiClient.get('/shoe/products/reorder', { params: { limit } }).then(unwrap<{ items: ReorderGroup[]; products: number; pairs: number }>),
  saveVariantSizes: (productId: string, items: Array<{ variantId: string; size?: string; color?: string; colorHex?: string }>) =>
    apiClient.post(`/shoe/products/${productId}/variant-sizes`, { items }).then(unwrap),
  splitVariantStock: (productId: string) => apiClient.post(`/shoe/products/${productId}/variant-stock-split`).then(unwrap),
  syncBrands: () => apiClient.post('/shoe/products/brands/sync').then(unwrap<{ brands: number; products: number }>),
};
