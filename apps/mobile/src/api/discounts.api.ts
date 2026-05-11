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

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

function unwrapArr<T>(res: any): T[] {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

export const discountsApi = {
  list: (): Promise<DiscountCode[]> =>
    apiClient.get('/discounts').then((r) => unwrapArr<DiscountCode>(r)),
  create: (payload: CreateDiscountPayload): Promise<DiscountCode> =>
    apiClient.post('/discounts', payload).then((r) => unwrapOne<DiscountCode>(r)),
  toggle: (id: string): Promise<DiscountCode> =>
    apiClient.patch(`/discounts/${id}/toggle`).then((r) => unwrapOne<DiscountCode>(r)),
  remove: (id: string): Promise<{ message: string }> =>
    apiClient.delete(`/discounts/${id}`).then((r) => unwrapOne<{ message: string }>(r)),
  validate: (code: string, amount: number): Promise<DiscountValidation> =>
    apiClient
      .get('/discounts/validate', { params: { code, amount } })
      .then((r) => unwrapOne<DiscountValidation>(r)),
};
