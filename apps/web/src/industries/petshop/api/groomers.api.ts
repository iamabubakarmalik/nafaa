import { apiClient } from '@core/api/client';
import type { PetSpeciesType } from './products.api';
import type { PetGroomingServiceType } from './grooming.api';

export interface PetGroomer {
  id: string;
  employeeCode: string;
  name: string;
  phone: string;
  cnic?: string;
  specializations: PetSpeciesType[];
  serviceTypes: PetGroomingServiceType[];
  experienceYears?: number;
  certifications: string[];
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  perServiceRate?: number;
  commissionPct: number;
  isActive: boolean;
  photoUrl?: string;
  completedAppointments: number;
  totalRevenue: number;
  avgRating?: number;
  todayAppointments?: any[];
  upcoming?: any[];
  recentCompleted?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const groomersApi = {
  create: (data: Partial<PetGroomer>) =>
    apiClient.post('/petshop/groomers', data).then(unwrap<PetGroomer>),

  list: (params?: { active?: boolean; availableToday?: boolean; species?: string; search?: string }) =>
    apiClient.get('/petshop/groomers', { params }).then(unwrap<PetGroomer[]>),

  top: (limit = 10) => apiClient.get('/petshop/groomers/top', { params: { limit } }).then(unwrap<PetGroomer[]>),
  getOne: (id: string) => apiClient.get('/petshop/groomers/' + id).then(unwrap<PetGroomer>),
  workload: (id: string, from: string, to: string) =>
    apiClient.get('/petshop/groomers/' + id + '/workload', { params: { from, to } }).then(unwrap<any>),

  update: (id: string, data: Partial<PetGroomer>) =>
    apiClient.patch('/petshop/groomers/' + id, data).then(unwrap<PetGroomer>),
  remove: (id: string) => apiClient.delete('/petshop/groomers/' + id).then(unwrap),
};
