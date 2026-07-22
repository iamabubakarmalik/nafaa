import { apiClient } from '@/api/client';

export interface HappyHourRule {
  id: string;
  name: string;
  description?: string;
  discountType: string;
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
  orderModes: string[];
  isActive: boolean;
  displayOrder: number;
  totalUsage: number;
  totalSaved: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const happyHoursApi = {
  create: (data: Partial<HappyHourRule>) =>
    apiClient.post('/restaurant/happy-hours', data).then(unwrap<HappyHourRule>),

  list: (activeOnly = false) =>
    apiClient.get('/restaurant/happy-hours', { params: { active: activeOnly } }).then(unwrap<HappyHourRule[]>),

  activeNow: () =>
    apiClient.get('/restaurant/happy-hours/active-now').then(unwrap<HappyHourRule[]>),

  update: (id: string, data: Partial<HappyHourRule>) =>
    apiClient.patch('/restaurant/happy-hours/' + id, data).then(unwrap<HappyHourRule>),

  toggle: (id: string) =>
    apiClient.post('/restaurant/happy-hours/' + id + '/toggle').then(unwrap<HappyHourRule>),

  remove: (id: string) =>
    apiClient.delete('/restaurant/happy-hours/' + id).then(unwrap),
};
