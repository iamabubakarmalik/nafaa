import { apiClient } from '@core/api/client';

export interface FurnitureCarpenter {
  id: string;
  employeeCode: string;
  name: string;
  phone: string;
  cnic?: string;
  address?: string;
  specializations: string[];
  materialsExpertise: string[];
  experienceYears?: number;
  workshopLocation?: string;
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  dailyWage?: number;
  perProjectRate?: number;
  commissionPct: number;
  totalProjects: number;
  completedProjects: number;
  activeProjects: number;
  totalRevenue: number;
  avgRating?: number;
  isActive: boolean;
  photoUrl?: string;
  notes?: string;
  activeOrders?: any[];
  recentCompleted?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const carpentersApi = {
  create: (data: Partial<FurnitureCarpenter>) =>
    apiClient.post('/furniture/carpenters', data).then(unwrap<FurnitureCarpenter>),

  list: (params?: { active?: boolean; workshop?: string; search?: string }) =>
    apiClient.get('/furniture/carpenters', { params }).then(unwrap<FurnitureCarpenter[]>),

  top: (limit = 10) =>
    apiClient.get('/furniture/carpenters/top', { params: { limit } }).then(unwrap<FurnitureCarpenter[]>),

  getOne: (id: string) => apiClient.get('/furniture/carpenters/' + id).then(unwrap<FurnitureCarpenter>),

  workload: (id: string, from: string, to: string) =>
    apiClient.get('/furniture/carpenters/' + id + '/workload', { params: { from, to } }).then(unwrap<any>),

  update: (id: string, data: Partial<FurnitureCarpenter>) =>
    apiClient.patch('/furniture/carpenters/' + id, data).then(unwrap<FurnitureCarpenter>),

  remove: (id: string) => apiClient.delete('/furniture/carpenters/' + id).then(unwrap),
};
