import { apiClient } from './client';

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface PlatformDiscount {
  id: string;
  code: string;
  description?: string | null;
  type: DiscountType;
  value: number;
  scope: string;
  applicablePlans: string[];
  minPurchase: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  perTenantLimit?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: { id: string; fullName: string };
}

export interface UpsertPlatformDiscountPayload {
  code: string;
  description?: string;
  type: DiscountType;
  value: number;
  scope?: string;
  applicablePlans?: string[];
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  perTenantLimit?: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminPlatformDiscountsApi = {
  list: () => apiClient.get<{ data: PlatformDiscount[] }>('/admin/platform-discounts').then(unwrap),
  create: (payload: UpsertPlatformDiscountPayload) =>
    apiClient.post<{ data: PlatformDiscount }>('/admin/platform-discounts', payload).then(unwrap),
  update: (id: string, payload: Partial<UpsertPlatformDiscountPayload>) =>
    apiClient.patch<{ data: PlatformDiscount }>(`/admin/platform-discounts/${id}`, payload).then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/admin/platform-discounts/${id}`).then(unwrap),
};
