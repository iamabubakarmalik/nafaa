import { apiClient } from '@core/api/client';
import type { ShoeSizeSystem, ShoeWidth } from './products.api';

export interface ShoeSizeVariant {
  id: string;
  productId: string;
  size: string;
  sizeSystem: ShoeSizeSystem;
  width: ShoeWidth;
  sku?: string;
  barcode?: string;
  boxNumber?: string;
  shelfLocation?: string;
  stock: number;
  reservedStock: number;
  lowStockAlert: number;
  priceOverride?: number;
  costOverride?: number;
  totalSold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SizeAvailability {
  id: string;
  size: string;
  sizeSystem: ShoeSizeSystem;
  width: ShoeWidth;
  available: number;
  stock: number;
  reserved: number;
  isAvailable: boolean;
  boxNumber?: string;
  shelfLocation?: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const shoeSizeVariantsApi = {
  upsert: (data: Partial<ShoeSizeVariant>) =>
    apiClient.post('/shoe/size-variants', data).then(unwrap<ShoeSizeVariant>),

  bulkUpsert: (data: { productId: string; variants: Partial<ShoeSizeVariant>[] }) =>
    apiClient.post('/shoe/size-variants/bulk', data).then(unwrap<{ count: number; variants: ShoeSizeVariant[] }>),

  list: (params?: {
    productId?: string; size?: string; inStock?: boolean;
    lowStock?: boolean; active?: boolean; search?: string;
  }) => apiClient.get('/shoe/size-variants', { params }).then(unwrap<ShoeSizeVariant[]>),

  lowStockReport: () =>
    apiClient.get('/shoe/size-variants/low-stock-report').then(unwrap<ShoeSizeVariant[]>),

  byProduct: (productId: string) =>
    apiClient.get('/shoe/size-variants/by-product/' + productId).then(unwrap<ShoeSizeVariant[]>),

  availability: (productId: string) =>
    apiClient.get('/shoe/size-variants/by-product/' + productId + '/availability').then(unwrap<SizeAvailability[]>),

  bySku: (sku: string) =>
    apiClient.get('/shoe/size-variants/by-sku/' + sku).then(unwrap<ShoeSizeVariant | null>),

  byBarcode: (barcode: string) =>
    apiClient.get('/shoe/size-variants/by-barcode/' + barcode).then(unwrap<ShoeSizeVariant | null>),

  getOne: (id: string) =>
    apiClient.get('/shoe/size-variants/' + id).then(unwrap<ShoeSizeVariant>),

  adjustStock: (id: string, data: { delta: number; reason?: string }) =>
    apiClient.patch('/shoe/size-variants/' + id + '/adjust-stock', data).then(unwrap<ShoeSizeVariant>),

  reserve: (id: string, quantity: number) =>
    apiClient.post('/shoe/size-variants/' + id + '/reserve', { quantity }).then(unwrap<ShoeSizeVariant>),

  releaseReservation: (id: string, quantity: number) =>
    apiClient.post('/shoe/size-variants/' + id + '/release-reservation', { quantity }).then(unwrap<ShoeSizeVariant>),

  remove: (id: string) =>
    apiClient.delete('/shoe/size-variants/' + id).then(unwrap),
};
