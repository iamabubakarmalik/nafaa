/**
 * Stock adjustments API: the paged record with totals, analytics, common
 * reasons, a product's variants/rolls/IMEIs with branch stock, and the three
 * ways to save (one line, many lines, physical count).
 */

import { apiClient } from '@core/api/client';
import type { ShopStamp } from '@core/lib/shopScope';

export type AdjustmentType = 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'LOSS' | 'OPENING_BALANCE';
export type RollAction = 'ADJUST_LENGTH' | 'MARK_DAMAGED' | 'MARK_LOST' | 'RESTORE';

export interface StockAdjustment {
  id: string;
  type: AdjustmentType;
  quantity: number;
  reason: string;
  note?: string | null;
  createdAt: string;
  unitCost: number;
  value: number;
  groupRef?: string | null;
  systemQty?: number | null;
  countedQty?: number | null;
  product: { id: string; name: string; sku?: string | null; unit: string };
  variant?: {
    id: string; name: string;
    color?: string | null; colorHex?: string | null; size?: string | null;
  } | null;
  carpetRoll?: {
    id: string; rollNumber: string; status: string;
    remainingSqft: number; widthFt: number; widthInch: number;
  } | null;
  imei?: { id: string; imei1: string; status: string; color?: string | null } | null;
  createdBy?: { id: string; fullName: string } | null;
  shop?: ShopStamp | null;
}

export interface AdjustmentQuery {
  from?: string;
  to?: string;
  type?: 'all' | AdjustmentType;
  reason?: string;
  search?: string;
  productId?: string;
  page?: number;
  limit?: number;
}

export interface AdjustmentList {
  items: StockAdjustment[];
  total: number;
  page: number;
  pages: number;
  /** `net` leaves out opening stock; `openingValue` is shown on its own. */
  totals: { count: number; inValue: number; outValue: number; damageValue: number; lossValue: number; openingValue?: number; net: number };
}

/** One bucket of a breakdown; value and qty are signed (in +, out −). */
interface AdjustmentBucket { key: string; count: number; value: number; qty: number }

interface AdjustmentAnalytics {
  totals: { count: number; gained: number; lost: number; opening?: number };
  byType: AdjustmentBucket[];
  byReason: AdjustmentBucket[];
  byPerson: AdjustmentBucket[];
  trend: Array<{ key: string; in: number; out: number }>;
  topLosses: Array<{ name: string; unit: string; qty: number; value: number; count: number }>;
  days: number;
}

export interface CreateAdjustmentPayload extends AdjustmentBatchFields {
  productId: string;
  /** Branch whose stock changes; the active branch when left out. */
  shopId?: string;
  variantId?: string;
  carpetRollId?: string;
  imeiId?: string;
  type: AdjustmentType;
  quantity: number;
  reason: string;
  note?: string;
  lengthFt?: number;
  lengthInch?: number;
  rollAction?: RollAction;
}

/**
 * Batch of expiry-tracked goods. Stock out: `batchId` is taken first.
 * Stock in: added to `batchId`, or to the batch with this number and expiry
 * (created when missing).
 */
export interface AdjustmentBatchFields {
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  manufactureDate?: string;
}

interface BatchAdjustmentPayload {
  shopId?: string;
  reason: string;
  note?: string;
  items: Array<AdjustmentBatchFields & {
    productId: string;
    variantId?: string;
    type: AdjustmentType;
    quantity: number;
    unitName?: string;
    /** Base units in one of `unitName` (carton = 24). */
    conversionRate?: number;
    reason?: string;
  }>;
}

interface StockCountPayload {
  shopId?: string;
  note?: string;
  items: Array<{ productId: string; variantId?: string; counted: number }>;
}

export interface StockCountResult {
  groupRef: string;
  checked: number;
  changed: number;
  gained: number;
  lost: number;
  net: number;
}

interface CarpetRollOption {
  id: string; rollNumber: string; designCode?: string | null; status: string;
  widthFt: number; widthInch: number;
  remainingLengthFt: number; remainingLengthInch: number;
  remainingSqft: number; originalSqft: number;
  salePricePerSqft: number; rackNumber?: string | null;
}

interface ImeiOption {
  id: string; imei1: string; imei2?: string | null;
  status: string; color?: string | null; costPrice: number;
  warrantyMonths?: number | null;
  variant?: { id: string; name: string } | null;
}

export interface AdjustmentOptions {
  product: {
    id: string; name: string; unit: string; stock: number; costPrice: number;
    sku?: string | null; hasVariants: boolean; lowStockAlert: number;
    /** Stock in the active branch; null on the all-branches view. */
    branchStock: number | null;
  };
  variants: Array<{
    id: string; name: string; sku?: string | null;
    color?: string | null; colorHex?: string | null; size?: string | null;
    stock: number; unit?: string | null; imageUrl?: string | null; costPrice?: number | null;
    branchStock: number | null;
  }>;
  carpetRolls: CarpetRollOption[];
  imeis: ImeiOption[];
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const stockAdjustmentsApi = {
  list: (q: AdjustmentQuery = {}) =>
    apiClient.get<{ data: AdjustmentList }>('/stock-adjustments', { params: q }).then(unwrap),

  analytics: (q: Omit<AdjustmentQuery, 'page' | 'limit'> = {}) =>
    apiClient.get<{ data: AdjustmentAnalytics }>('/stock-adjustments/analytics', { params: q }).then(unwrap),

  reasons: () =>
    apiClient.get<{ data: string[] }>('/stock-adjustments/reasons').then(unwrap),

  getOptions: (productId: string) =>
    apiClient.get<{ data: AdjustmentOptions }>(`/stock-adjustments/options/${productId}`).then(unwrap),

  create: (payload: CreateAdjustmentPayload) =>
    apiClient.post<{ data: StockAdjustment }>('/stock-adjustments', payload).then(unwrap),

  batch: (payload: BatchAdjustmentPayload) =>
    apiClient.post<{ data: { groupRef: string; count: number; value: number } }>('/stock-adjustments/batch', payload).then(unwrap),

  count: (payload: StockCountPayload) =>
    apiClient.post<{ data: StockCountResult }>('/stock-adjustments/count', payload).then(unwrap),
};
