/**
 * Shoe endpoints (same paths and shapes as apps/web/src/industries/shoe/api):
 * the shoe product profile, size grid and reorder, size requests (try-on) and
 * size charts. Desk screens need the server and show the last saved data offline.
 */

import { apiClient } from '@/core/api/client';

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);
const del = <T>(path: string) => apiClient.delete<T>(path).then((r) => r.data);

export interface ShoeProfile {
  id: string; productId: string; brandId?: string | null; categoryType?: string | null; gender: string; modelName?: string | null; modelCode?: string | null;
  collection?: string | null; season?: string | null; upperMaterial?: string | null; soleMaterial?: string | null; colorName?: string | null; closureType?: string | null;
  heelHeight?: string | null; sizeSystem: string; runsLarge: boolean; runsSmall: boolean; sizingNotes?: string | null; isWaterproof: boolean; isOrthopedic: boolean;
  isHandmade: boolean; careInstructions?: string | null; warrantyMonths: number; includesBox: boolean; mrp?: number | null; isFeatured: boolean;
  isBestSeller: boolean; isNewArrival: boolean; isBridal: boolean; isEidSpecial: boolean;
}
export interface ShoeMeta {
  productId: string; categoryType: string | null; gender: string; modelName: string | null; modelCode: string | null; collection: string | null; season: string | null;
  colorName: string | null; sizeSystem: string; mrp: number | null; isNewArrival: boolean; isBestSeller: boolean; isBridal: boolean; isEidSpecial: boolean;
  /** Selling below the MRP on the box. */
  onSale: boolean; offPct: number;
}
interface SizeCell {
  id: string; name: string; barcode: string | null; sku: string | null; price: number; isActive: boolean; size: string | null; colorName: string | null;
  colorHex: string | null; lowStockAlert: number; stock: number; allStock: number; byShop: Array<{ shopId: string; name: string; stock: number }>; sold30: number;
}
export interface SizeGrid { productId: string; name: string; sizes: string[]; colors: string[]; shops: Array<{ id: string; name: string }>; variants: SizeCell[] }
export interface ReorderGroup {
  productId: string; name: string; brand: string | null; sold30: number;
  sizes: Array<{ variantId: string; name: string; size: string | null; colorName: string | null; stock: number; alert: number; sold30: number; suggest: number }>;
}
export interface ShoeOverview {
  totals?: { totalBrands: number; totalProducts: number; totalSizeVariants: number; totalStockUnits: number; pendingTryOns: number; pendingExchanges: number; lowStockCount: number; outOfStockCount: number };
  topBrands?: Array<{ id: string; name: string; totalRevenue?: number | string | null }>;
  lowStockVariants?: Array<{ id: string; productId: string; size: string; sizeSystem: string; stock: number; lowStockAlert: number; boxNumber?: string | null; productName?: string }>;
  outOfStockVariants?: Array<{ id: string; productId: string; size: string; sizeSystem: string; stock: number; lowStockAlert: number; boxNumber?: string | null; productName?: string }>;
}

export const shoeProductsApi = {
  upsert: (data: Partial<ShoeProfile> & { productId: string }) => post<ShoeProfile>('/shoe/products', data),
  byProduct: (productId: string) => get<ShoeProfile | null>('/shoe/products/by-product/' + productId),
  meta: () => get<{ items: ShoeMeta[] }>('/shoe/products/meta'),
  sizeGrid: (productId: string) => get<SizeGrid>(`/shoe/products/${productId}/size-grid`),
  reorder: (limit = 100) => get<{ items: ReorderGroup[]; products: number; pairs: number }>('/shoe/products/reorder', { limit }),
  saveVariantSizes: (productId: string, items: Array<{ variantId: string; size?: string; color?: string; colorHex?: string }>) => post(`/shoe/products/${productId}/variant-sizes`, { items }),
  splitVariantStock: (productId: string) => post(`/shoe/products/${productId}/variant-stock-split`),
  syncBrands: () => post<{ brands: number; products: number }>('/shoe/products/brands/sync'),
  overview: () => get<ShoeOverview>('/shoe/dashboard/overview'),
  sizePopularity: () => get<Array<{ size: string; sold: number }>>('/shoe/dashboard/size-popularity'),
  exchangeSummary: () => get<{ last30Days?: { count: number; value: number } }>('/shoe/exchanges/summary'),
};

export type ChartRow = Record<string, string>;
export interface ShoeSizeChart { id: string; name: string; gender?: string | null; categoryType?: string | null; mappings: ChartRow[]; notes?: string | null; isActive: boolean }
export interface SizeChartInput { name: string; gender?: string; mappings: ChartRow[]; notes?: string; isActive?: boolean }
export const shoeSizeChartsApi = {
  list: () => get<ShoeSizeChart[]>('/shoe/size-charts'),
  create: (data: SizeChartInput) => post<ShoeSizeChart>('/shoe/size-charts', data),
  update: (id: string, data: Partial<SizeChartInput>) => patch<ShoeSizeChart>('/shoe/size-charts/' + id, data),
  /** Hides the chart; nothing is deleted. */
  deactivate: (id: string) => del<ShoeSizeChart>('/shoe/size-charts/' + id),
};

export type RequestStatus = 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type RequestView = 'open' | 'waiting' | 'told' | 'bought' | 'closed' | 'all';
/** A customer waiting for a size or colour. */
export interface SizeRequest {
  id: string; requestNumber: string; customerId?: string | null; customerName: string; customerPhone: string; productId?: string | null; productName: string;
  requestedSizes: string[]; colorPreference?: string | null; gender?: string | null; status: RequestStatus; purchased: boolean; purchasedSize?: string | null;
  notes?: string | null; createdAt: string;
  /** Asked sizes now in stock in this branch (open requests only). */
  available: Array<{ size: string | null; color: string | null; stock: number }>;
}
export interface NewSizeRequest {
  customerId?: string; customerName: string; customerPhone: string; productId?: string; productName: string; requestedSizes: string[];
  colorPreference?: string; gender?: string; notes?: string;
}
export interface RequestPage { items: SizeRequest[]; total: number; page: number; pages: number; counts: Record<RequestView, number> }
export interface TryOnSummary { pending: number; scheduled: number; completed: number; cancelled: number; conversion: number }
export const shoeTryOnApi = {
  page: (params: { view?: RequestView; search?: string; page?: number; limit?: number }) => get<RequestPage>('/shoe/try-on/page', params),
  create: (data: NewSizeRequest) => post<SizeRequest>('/shoe/try-on', data),
  summary: () => get<TryOnSummary>('/shoe/try-on/summary'),
  notified: (id: string) => post<SizeRequest>(`/shoe/try-on/${id}/notified`),
  complete: (id: string, data: { purchased: boolean; purchasedSize?: string }) => post<SizeRequest>(`/shoe/try-on/${id}/complete`, data),
  cancel: (id: string) => post<SizeRequest>(`/shoe/try-on/${id}/cancel`),
};
