/**
 * Website conversion tools: bought-together pairs, the free-delivery
 * threshold advice and coupon automation.
 */

import { apiClient } from '@core/api/client';
import { unwrap } from './online-orders.api';

export interface ProductCard { id: string; name: string; sku: string | null; price: number; image: string | null; inStock: boolean }
export interface TogetherOverview {
  basis: { bills: number; online: boolean; days: number; computedAt: string };
  productsWithPairs: number;
  pairs: Array<{ a: ProductCard; b: ProductCard; together: number; lift: number; confidence: number }>;
}

export interface FreeShipping {
  orders: number;
  median: number;
  average: number;
  threshold: number | null;
  alreadyAbove: number;
  nearBelow: number;
  liftPerOrder: number;
  shippingCostAbove: number;
  shippingCost: number;
  shippingCostKnown: boolean;
  days: number;
  bands: Array<{ from: number; to: number | null; orders: number }>;
  forms: Array<{ id: string; name: string; enabled: boolean; freeAbove: number | null; deliveryFee: number }>;
}

export interface CouponRule { enabled: boolean; type: 'PERCENT' | 'FIXED'; value: number; validDays: number; minSubtotal: number }
export interface CouponSettings {
  abandoned: CouponRule & { afterHours: number };
  winBack: CouponRule & { afterDays: number };
  sharedCode: string | null;
}
export type CouponKind = 'ABANDONED_CART' | 'WIN_BACK' | 'MANUAL';
export type CouponStatus = 'OPEN' | 'SENT' | 'USED' | 'EXPIRED';
export interface CouponRow {
  id: string;
  code: string;
  kind: CouponKind;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minSubtotal: number;
  shared: boolean;
  customerName: string | null;
  customerPhone: string | null;
  expiresAt: string | null;
  sentAt: string | null;
  usedAt: string | null;
  usedOrderId: string | null;
  usedOrderNo: string | null;
  usedOrderTotal: number | null;
  status: CouponStatus;
  createdAt: string;
}
export interface CouponList {
  settings: CouponSettings;
  stats: { issued: number; sent: number; used: number; usedValue: number; rate: number; byKind: Array<{ kind: CouponKind; issued: number; used: number }> };
  items: CouponRow[];
}

export const conversionApi = {
  together: async () => unwrap<TogetherOverview>(await apiClient.get('/online-orders/conversion/together')),
  freeShipping: async () => unwrap<FreeShipping>(await apiClient.get('/online-orders/conversion/free-shipping')),
  coupons: async (q: { status?: CouponStatus; kind?: CouponKind }) => unwrap<CouponList>(await apiClient.get('/online-orders/conversion/coupons', { params: q })),
  saveSettings: async (s: CouponSettings) => unwrap<CouponSettings>(await apiClient.put('/online-orders/conversion/coupons/settings', s)),
  run: async () => unwrap<{ abandoned: number; winBack: number }>(await apiClient.post('/online-orders/conversion/coupons/run')),
  sent: async (id: string) => unwrap(await apiClient.post(`/online-orders/conversion/coupons/${id}/sent`)),
  /** Existing order-form settings endpoint; only the free-delivery amount is sent. */
  setFreeAbove: async (channelId: string, freeAbove: number | null) => unwrap(await apiClient.patch(`/online-store/channels/${channelId}/form`, { freeAbove })),
};
