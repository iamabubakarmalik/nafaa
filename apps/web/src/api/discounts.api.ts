import { apiClient } from './client';

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

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
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateDiscountPayload {
  code: string;
  description?: string;
  type: DiscountType;
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
}

export interface DiscountValidation {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  discount: number;
  finalAmount: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const discountsApi = {
  list: () => apiClient.get<{ data: DiscountCode[] }>('/discounts').then(unwrap),
  create: (payload: CreateDiscountPayload) =>
    apiClient.post<{ data: DiscountCode }>('/discounts', payload).then(unwrap),
  toggle: (id: string) =>
    apiClient.patch<{ data: DiscountCode }>(`/discounts/${id}/toggle`).then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/discounts/${id}`).then(unwrap),
  validate: (code: string, amount: number) =>
    apiClient
      .get<{ data: DiscountValidation }>('/discounts/validate', {
        params: { code, amount },
      })
      .then(unwrap),
};
