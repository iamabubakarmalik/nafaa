import { apiClient } from '@/api/client';

export interface DietPlan {
  id: string;
  memberId: string;
  trainerId?: string;
  planName: string;
  planType?: string;
  goal: string;
  startDate: string;
  endDate?: string;
  durationDays?: number;
  targetCalories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatsGrams?: number;
  meals?: any;
  restrictions: string[];
  supplements: string[];
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const dietPlansApi = {
  create: (data: Partial<DietPlan>) => apiClient.post('/gym/diet-plans', data).then(unwrap<DietPlan>),
  list: (params?: any) => apiClient.get('/gym/diet-plans', { params }).then(unwrap<DietPlan[]>),
  getOne: (id: string) => apiClient.get('/gym/diet-plans/' + id).then(unwrap<DietPlan>),
  update: (id: string, data: Partial<DietPlan>) => apiClient.patch('/gym/diet-plans/' + id, data).then(unwrap<DietPlan>),
  remove: (id: string) => apiClient.delete('/gym/diet-plans/' + id).then(unwrap),
};
