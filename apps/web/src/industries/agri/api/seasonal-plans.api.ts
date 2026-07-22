import { apiClient } from '@core/api/client';

export interface SeasonalPlan {
  id: string;
  season: string;
  year: number;
  cropName: string;
  sowingStart: string;
  sowingEnd: string;
  harvestStart: string;
  harvestEnd: string;
  recommendedProducts?: any;
  applicationSchedule?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const seasonalPlansApi = {
  create: (data: any) => apiClient.post('/agri/seasonal-plans', data).then(unwrap<SeasonalPlan>),
  list: (params?: any) => apiClient.get('/agri/seasonal-plans', { params }).then(unwrap<SeasonalPlan[]>),
  getOne: (id: string) => apiClient.get('/agri/seasonal-plans/' + id).then(unwrap<SeasonalPlan>),
  update: (id: string, data: any) => apiClient.patch('/agri/seasonal-plans/' + id, data).then(unwrap<SeasonalPlan>),
  remove: (id: string) => apiClient.delete('/agri/seasonal-plans/' + id).then(unwrap),
};
