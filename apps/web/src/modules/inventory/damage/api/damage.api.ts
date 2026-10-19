/**
 * Damage and wastage API: report, the paged record with status totals, the
 * approval queue, analytics, a product's report options, and approve /
 * reject (one or many).
 */

import { apiClient } from '@core/api/client';
import type { ShopStamp } from '@core/lib/shopScope';

export type DamageStatus = 'REPORTED' | 'APPROVED' | 'REJECTED' | 'WRITTEN_OFF';
export type DamageReasonCode =
  | 'EXPIRY' | 'BREAKAGE' | 'SPOILAGE' | 'PEST_DAMAGE' | 'WATER_DAMAGE' | 'THEFT' | 'MISHANDLING' | 'MANUFACTURING_DEFECT' | 'OTHER';

interface Person { id: string; fullName: string }

export interface DamageLog {
  id: string;
  damageNumber: string;
  status: DamageStatus;
  /** Base units. */
  quantity: number;
  unitCost: number;
  costImpact: number;
  salvageValue: number;
  netLoss: number;
  reason: string;
  reasonCode: DamageReasonCode;
  photos: string[];
  notes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  product: {
    id: string; name: string; sku?: string | null; unit: string;
    category?: { id: string; name: string } | null;
    images?: Array<{ url: string }>;
  };
  variant?: { id: string; name: string; color?: string | null; colorHex?: string | null; size?: string | null } | null;
  batch?: { id: string; batchNumber: string; expiryDate?: string | null } | null;
  unit?: { id: string; unitName: string; conversionRate: number } | null;
  reportedBy?: Person | null;
  decidedBy?: Person | null;
  shop?: ShopStamp | null;
}

export interface DamageQuery {
  from?: string;
  to?: string;
  status?: DamageStatus;
  reasonCode?: DamageReasonCode;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DamageList {
  items: DamageLog[];
  total: number;
  page: number;
  pages: number;
  totals: { reported: number; approved: number; rejected: number; pendingValue: number; lost: number };
}

export interface DamageQueue {
  pending: number;
  pendingValue: number;
  /** Reports waiting longer than `agingHours`. */
  aging: number;
  agingHours: number;
  oldestAt: string | null;
}

/** One bucket: value is approved net loss, pending is the value still waiting. */
export interface DamageBucket { key: string; label: string; count: number; qty: number; value: number; pending: number }

export interface DamageAnalytics {
  totals: { count: number; approved: number; pending: number; rejected: number; lost: number; costImpact: number; salvage: number; pendingValue: number };
  byReason: DamageBucket[];
  byProduct: Array<DamageBucket & { unit: string }>;
  byCategory: DamageBucket[];
  byPerson: DamageBucket[];
  trend: Array<{ key: string; approved: number; pending: number; count: number }>;
}

export interface DamageOptions {
  product: { id: string; name: string; unit: string; sku?: string | null; stock: number; costPrice: number; hasVariants: boolean; expiryTracked: boolean; branchStock: number | null };
  variants: Array<{ id: string; name: string; color?: string | null; colorHex?: string | null; size?: string | null; stock: number; costPrice?: number | null; branchStock: number | null }>;
  units: Array<{ id: string; unitName: string; conversionRate: number; variantId?: string | null; barcode?: string | null }>;
  batches: Array<{ id: string; batchNumber: string; expiryDate?: string | null; quantity: number; costPrice: number; variantId?: string | null }>;
  /** Roll or IMEI products are written off on the Adjustments page. */
  tracked: 'roll' | 'imei' | 'serial' | null;
}

export interface CreateDamagePayload {
  productId: string;
  variantId?: string;
  batchId?: string;
  unitId?: string;
  /** In the chosen unit. */
  quantity: number;
  salvageValue?: number;
  reason: string;
  reasonCode: DamageReasonCode;
  photos?: string[];
  notes?: string;
  supplierClaim?: boolean;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const damageApi = {
  list: (q: DamageQuery = {}) =>
    apiClient.get<{ data: DamageList }>('/retail/damage', { params: q }).then(unwrap),

  queue: () =>
    apiClient.get<{ data: DamageQueue }>('/retail/damage/queue').then(unwrap),

  analytics: (q: Omit<DamageQuery, 'page' | 'limit' | 'status'> = {}) =>
    apiClient.get<{ data: DamageAnalytics }>('/retail/damage/analytics', { params: q }).then(unwrap),

  options: (productId: string) =>
    apiClient.get<{ data: DamageOptions }>(`/retail/damage/options/${productId}`).then(unwrap),

  create: (payload: CreateDamagePayload) =>
    apiClient.post<{ data: DamageLog }>('/retail/damage', payload).then(unwrap),

  approve: (id: string, notes?: string) =>
    apiClient.post<{ data: DamageLog }>(`/retail/damage/${id}/approve`, { notes }).then(unwrap),

  approveMany: (ids: string[], notes?: string) =>
    apiClient.post<{ data: { approved: number; failed: Array<{ id: string; message: string }> } }>('/retail/damage/approve-many', { ids, notes }).then(unwrap),

  reject: (id: string, reason?: string) =>
    apiClient.post<{ data: DamageLog }>(`/retail/damage/${id}/reject`, { reason }).then(unwrap),
};
