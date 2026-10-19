import { apiClient } from '@core/api/client';
import type { BookingSource, MealPlan } from './bookings.api';

export type PlanType = 'SEASON' | 'PEAK' | 'OFF_SEASON' | 'WEEKEND' | 'PROMO' | 'CORPORATE' | 'LONG_STAY';

export interface RatePlan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  planType: PlanType;
  mealPlan: MealPlan;
  isPercentage: boolean;
  adjustment: number;
  minNights?: number | null;
  maxNights?: number | null;
  applicableDays: number[];
  applicableRoomTypeIds: string[];
  applicableSources: BookingSource[];
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type RatePlanInput = Partial<Omit<RatePlan, 'id' | 'createdAt' | 'updatedAt'>>;

const unwrap = <T,>(res: { data: unknown }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const ratePlansApi = {
  create: (data: RatePlanInput) => apiClient.post('/hotel/rate-plans', data).then(unwrap<RatePlan>),
  list: (params?: { active?: boolean; planType?: string }) => apiClient.get('/hotel/rate-plans', { params }).then(unwrap<RatePlan[]>),
  update: (id: string, data: RatePlanInput) => apiClient.patch('/hotel/rate-plans/' + id, data).then(unwrap<RatePlan>),
  /** Switches the plan off. */
  remove: (id: string) => apiClient.delete('/hotel/rate-plans/' + id).then(unwrap<RatePlan>),
};
