/**
 * Discount codes API (same endpoints and shapes as the web). The list is also
 * saved on the phone so the counter can still check a code without internet.
 */

import { apiClient } from '@/core/api/client';
import { kv } from '@/core/storage/kv';
import type { DiscountRule, DiscountStatus, DiscountType } from '@nafaa/core/customers';

export type { DiscountStatus, DiscountType };

export interface DiscountCode {
  id: string; code: string; description?: string | null; type: DiscountType; value: number; minPurchase: number; maxDiscount?: number | null;
  usageLimit?: number | null; usageCount: number; perCustomerLimit?: number | null; shopIds: string[]; validFrom?: string | null; validUntil?: string | null;
  isActive: boolean; createdAt: string; status: DiscountStatus;
  uses: number; revenue: number; discountGiven: number; customers: number; lastUsedAt: string | null;
  branches: Array<{ shopId: string | null; name: string; uses: number; revenue: number }>;
}

export interface DiscountList {
  items: DiscountCode[];
  shops: Array<{ id: string; name: string }>;
  totals: { codes: number; active: number; uses: number; revenue: number; discountGiven: number; customers: number };
}

export interface DiscountPayload {
  code: string; description?: string; type: DiscountType; value: number; minPurchase?: number; maxDiscount?: number | null; usageLimit?: number | null;
  perCustomerLimit?: number | null; shopIds?: string[]; validFrom?: string | null; validUntil?: string | null; isActive?: boolean;
}

const CACHE = 'nafaa.discount-codes';

/** Codes saved from the last list, in the shape the offline check uses. */
export const savedDiscountCodes = (): DiscountRule[] => kv.get<DiscountRule[]>(CACHE, []);

export const discountsApi = {
  list: async (range?: { from?: string; to?: string }) => {
    const res = await apiClient.get<DiscountList>('/discounts', { params: range }).then((r) => r.data);
    kv.set(CACHE, res.items.map((d): DiscountRule => ({ id: d.id, code: d.code, type: d.type, value: d.value, minPurchase: d.minPurchase, maxDiscount: d.maxDiscount, usageLimit: d.usageLimit,
      usageCount: d.usageCount, shopIds: d.shopIds, validFrom: d.validFrom, validUntil: d.validUntil, isActive: d.isActive })));
    return res;
  },
  create: (p: DiscountPayload) => apiClient.post<DiscountCode>('/discounts', p).then((r) => r.data),
  update: (id: string, p: Partial<DiscountPayload>) => apiClient.patch<DiscountCode>(`/discounts/${id}`, p).then((r) => r.data),
  toggle: (id: string) => apiClient.patch<DiscountCode>(`/discounts/${id}/toggle`).then((r) => r.data),
  remove: (id: string) => apiClient.delete<{ message: string; softDeleted?: boolean }>(`/discounts/${id}`).then((r) => r.data),
};
