import { apiClient } from '@core/api/client';
import type { ApplianceCategoryType } from './products.api';

export interface Technician {
  id: string;
  employeeCode: string;
  name: string;
  phone: string;
  cnic?: string;
  address?: string;
  specializations: string[];
  brandsExpertise: string[];
  categoriesExpertise: ApplianceCategoryType[];
  experienceYears?: number;
  certifications: string[];
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  currentZone?: string;
  visitChargeRate: number;
  hourlyRate: number;
  commissionPct: number;
  totalJobs: number;
  completedJobs: number;
  totalRevenue: number;
  totalCommission: number;
  avgRating?: number;
  totalReviews: number;
  isActive: boolean;
  photoUrl?: string;
  notes?: string;
  recentJobs?: any[];
  activeServiceRequests?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const techniciansApi = {
  create: (data: Partial<Technician>) =>
    apiClient.post('/appliances/technicians', data).then(unwrap<Technician>),
  list: (params?: { active?: boolean; zone?: string; category?: string; brand?: string; search?: string }) =>
    apiClient.get('/appliances/technicians', { params }).then(unwrap<Technician[]>),
  topPerformers: (limit = 10) =>
    apiClient.get('/appliances/technicians/top', { params: { limit } }).then(unwrap<Technician[]>),
  getOne: (id: string) =>
    apiClient.get('/appliances/technicians/' + id).then(unwrap<Technician>),
  workload: (id: string, from: string, to: string) =>
    apiClient.get('/appliances/technicians/' + id + '/workload', { params: { from, to } }).then(unwrap<any>),
  update: (id: string, data: Partial<Technician>) =>
    apiClient.patch('/appliances/technicians/' + id, data).then(unwrap<Technician>),
  remove: (id: string) =>
    apiClient.delete('/appliances/technicians/' + id).then(unwrap),
};
