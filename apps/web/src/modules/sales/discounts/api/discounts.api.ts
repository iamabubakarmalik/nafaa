/**
 * Discount codes: list with performance for a period, create, edit, switch,
 * delete (used codes are switched off), and validate at the counter. The
 * codes are saved on the device so the counter can still apply them without
 * internet; the server checks them again when the bill syncs.
 */

import { apiClient } from '@core/api/client';

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type DiscountStatus = 'active' | 'inactive' | 'expired' | 'scheduled' | 'used_up';

export interface DiscountCode {
  id: string;
  code: string;
  description?: string | null;
  type: DiscountType;
  value: number;
  minPurchase: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  perCustomerLimit?: number | null;
  shopIds: string[];
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
  createdAt: string;
  status: DiscountStatus;
  uses: number;
  revenue: number;
  discountGiven: number;
  customers: number;
  lastUsedAt: string | null;
  branches: Array<{ shopId: string | null; name: string; uses: number; revenue: number }>;
}

export interface DiscountList {
  items: DiscountCode[];
  shops: Array<{ id: string; name: string }>;
  totals: { codes: number; active: number; uses: number; revenue: number; discountGiven: number; customers: number };
}

export interface CreateDiscountPayload {
  code: string;
  description?: string;
  type: DiscountType;
  value: number;
  minPurchase?: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  shopIds?: string[];
  /** Business days YYYY-MM-DD; the code works through the last day. */
  validFrom?: string | null;
  validUntil?: string | null;
  isActive?: boolean;
}

export interface DiscountValidation {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  discount: number;
  finalAmount: number;
  /** Checked against the codes saved on this device. */
  offline?: boolean;
}

const CACHE_KEY = 'discount-codes-cache';
const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;
const isNetFail = (e: unknown) => {
  const s = (e as { response?: { status?: number } })?.response?.status;
  return !navigator.onLine || !s || s === 408 || s >= 502;
};

async function saveCache(items: DiscountCode[]) {
  try {
    const { db } = await import('@core/lib/offline/db');
    await db.meta.put({ key: CACHE_KEY, value: items, updatedAt: Date.now() });
  } catch { /* device storage unavailable */ }
}

/** Same rules as the server, against the saved codes (no per-customer count offline). */
async function validateOffline(code: string, amount: number, shopId?: string | null): Promise<DiscountValidation> {
  const { db } = await import('@core/lib/offline/db');
  const items = ((await db.meta.get(CACHE_KEY))?.value ?? []) as DiscountCode[];
  const dc = items.find((c) => c.code === code.toUpperCase().replace(/\s+/g, '') && c.isActive);
  if (!dc) throw new Error('Yeh code nahi chalta');
  const now = Date.now();
  if (dc.validFrom && now < new Date(dc.validFrom).getTime()) throw new Error('Yeh code abhi shuru nahi hua');
  if (dc.validUntil && now > new Date(dc.validUntil).getTime()) throw new Error('Is code ki muddat khatam ho gayi');
  if (dc.usageLimit && dc.usageCount >= dc.usageLimit) throw new Error('Is code ki had poori ho chuki hai');
  if (dc.shopIds?.length && shopId && !dc.shopIds.includes(shopId)) throw new Error('Yeh code is branch par nahi chalta');
  if (amount < dc.minPurchase) throw new Error(`Kam se kam Rs ${dc.minPurchase} ki khareedari par chalta hai`);
  let discount = dc.type === 'PERCENTAGE' ? (amount * dc.value) / 100 : dc.value;
  if (dc.type === 'PERCENTAGE' && dc.maxDiscount && discount > dc.maxDiscount) discount = dc.maxDiscount;
  discount = Math.min(discount, amount);
  return { id: dc.id, code: dc.code, type: dc.type, value: dc.value, discount, finalAmount: amount - discount, offline: true };
}

export const discountsApi = {
  list: async (range?: { from?: string; to?: string }): Promise<DiscountList> => {
    const res = await apiClient.get<{ data: DiscountList }>('/discounts', { params: range }).then(unwrap);
    void saveCache(res.items);
    return res;
  },
  create: (payload: CreateDiscountPayload) => apiClient.post<{ data: DiscountCode }>('/discounts', payload).then(unwrap),
  update: (id: string, payload: Partial<CreateDiscountPayload>) => apiClient.patch<{ data: DiscountCode }>(`/discounts/${id}`, payload).then(unwrap),
  toggle: (id: string) => apiClient.patch<{ data: DiscountCode }>(`/discounts/${id}/toggle`).then(unwrap),
  remove: (id: string) => apiClient.delete<{ data: { message: string; softDeleted?: boolean } }>(`/discounts/${id}`).then(unwrap),
  validate: async (code: string, amount: number, opts: { customerId?: string | null; shopId?: string | null } = {}): Promise<DiscountValidation> => {
    try {
      return await apiClient.get<{ data: DiscountValidation }>('/discounts/validate', { params: { code, amount, customerId: opts.customerId ?? undefined } }).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw new Error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Code nahi chala');
      return validateOffline(code, amount, opts.shopId);
    }
  },
};
