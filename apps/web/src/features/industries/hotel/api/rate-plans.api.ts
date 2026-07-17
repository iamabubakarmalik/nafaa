import { apiClient } from '@/api/client';

export interface RatePlan {
  id: string;
  code: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  planType: string;
  mealPlan: string;
  isPercentage: boolean;
  adjustment: number;
  minNights?: number;
  maxNights?: number;
  applicableDays: number[];
  advanceBookingDays?: number;
  cancellationHours?: number;
  applicableRoomTypeIds: string[];
  applicableSources: string[];
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const ratePlansApi = {
  create: (data: any) => apiClient.post('/hotel/rate-plans', data).then(unwrap<RatePlan>),
  list: (params?: any) => apiClient.get('/hotel/rate-plans', { params }).then(unwrap<RatePlan[]>),
  applicable: (params: any) => apiClient.get('/hotel/rate-plans/applicable', { params }).then(unwrap<RatePlan[]>),
  getOne: (id: string) => apiClient.get('/hotel/rate-plans/' + id).then(unwrap<RatePlan>),
  update: (id: string, data: any) => apiClient.patch('/hotel/rate-plans/' + id, data).then(unwrap<RatePlan>),
  remove: (id: string) => apiClient.delete('/hotel/rate-plans/' + id).then(unwrap),
};
