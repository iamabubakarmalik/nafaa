/**
 * Happy hours (/restaurant/happy-hours): automatic price cuts for a time
 * window in shop time, by day, date range, dishes, categories and order
 * type, held to the shop's discount limit.
 */

import { apiClient } from '@core/api/client';

export type HappyDiscountType = 'PERCENTAGE' | 'FIXED' | 'BUY_ONE_GET_ONE';
export type OrderMode = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'DRIVE_THRU' | 'ROOM_SERVICE' | 'PICKUP';

export interface HappyHourRule {
  id: string;
  name: string;
  description?: string | null;
  discountType: HappyDiscountType;
  discountValue: number;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  validFrom?: string | null;
  validTo?: string | null;
  categoryIds: string[];
  productIds: string[];
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  orderModes: OrderMode[];
  isActive: boolean;
  displayOrder: number;
  totalUsage: number;
  totalSaved: number;
  /** Running right now in shop time (list endpoint). */
  liveNow?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HappyHourInput {
  name: string;
  description?: string;
  discountType: HappyDiscountType;
  discountValue: number;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  validFrom?: string;
  validTo?: string;
  categoryIds: string[];
  productIds: string[];
  minOrderAmount?: number;
  maxDiscount?: number;
  orderModes: OrderMode[];
  isActive?: boolean;
}

export interface HappyQuote {
  lines: Array<{ productId: string; quantity: number; unitPrice: number; discount: number; ruleId: string | null; ruleName: string | null }>;
  discount: number;
  rules: Array<{ id: string; name: string; saved: number }>;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const happyHoursApi = {
  create: (data: HappyHourInput) =>
    apiClient.post('/restaurant/happy-hours', data).then(unwrap<HappyHourRule>),

  list: (activeOnly = false) =>
    apiClient.get('/restaurant/happy-hours', { params: { active: activeOnly } }).then(unwrap<HappyHourRule[]>),

  activeNow: (mode?: OrderMode) =>
    apiClient.get('/restaurant/happy-hours/active-now', { params: { mode } }).then(unwrap<HappyHourRule[]>),

  /** Happy-hour discount for a cart right now, at menu prices. */
  quote: (items: Array<{ productId: string; quantity: number; variantId?: string }>, mode?: OrderMode) =>
    apiClient.get('/restaurant/happy-hours/quote', {
      params: { items: items.map((i) => `${i.productId}:${i.quantity}${i.variantId ? `:${i.variantId}` : ''}`).join(','), mode },
    }).then(unwrap<HappyQuote>),

  update: (id: string, data: HappyHourInput) =>
    apiClient.patch('/restaurant/happy-hours/' + id, data).then(unwrap<HappyHourRule>),

  toggle: (id: string) =>
    apiClient.post('/restaurant/happy-hours/' + id + '/toggle').then(unwrap<HappyHourRule>),

  remove: (id: string) =>
    apiClient.delete('/restaurant/happy-hours/' + id).then(unwrap),
};
