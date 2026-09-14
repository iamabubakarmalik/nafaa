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

export interface TechnicianRow extends Technician {
  openServices: number;
  openInstallations: number;
  openJobs: number;
  completionRate: number;
}

export interface TechnicianSummary {
  total: number; active: number; inactive: number;
  free: number; overloaded: number; openJobs: number;
  avgTeamRating: number | null;
  month: { jobs: number; revenue: number; commission: number };
  leaderboard: Array<{
    id: string; name: string; isActive: boolean; zone: string | null;
    avgRating: number | null; totalReviews: number;
    openJobs: number; monthJobs: number; monthRevenue: number;
    monthCommission: number; lifetimeRevenue: number; completionRate: number;
  }>;
}

/** getOne se aane wali poori tafseel — list se ziyada cheezein aati hain */
export interface TechnicianDetail extends Technician {
  recentJobs: any[];
  recentServices: any[];
  activeServiceRequests: any[];
  openJobs: number;
  completionRate: number;
  month: {
    jobs: number;
    revenue: number;
    cost: number;
    profit: number;
    commission: number;
    avgRating: number | null;
    avgResolutionHours: number;
  };
}

export interface TechnicianWorkload {
  technician: Technician;
  installations: any[];
  serviceRequests: any[];
  byDay: { date: string; installations: number; services: number; revenue: number }[];
  totals: {
    installations: number;
    serviceRequests: number;
    totalJobs: number;
    completed: number;
    revenue: number;
    commission: number;
  };
}

export const techniciansApi = {
  create: (data: Partial<Technician>) =>
    apiClient.post('/appliances/technicians', data).then(unwrap<Technician>),
  list: (params?: { active?: boolean; zone?: string; category?: string; brand?: string; search?: string }) =>
    apiClient.get('/appliances/technicians', { params }).then(unwrap<TechnicianRow[]>),
  summary: () =>
    apiClient.get('/appliances/technicians/summary').then(unwrap<TechnicianSummary>),
  topPerformers: (limit = 10) =>
    apiClient.get('/appliances/technicians/top', { params: { limit } }).then(unwrap<Technician[]>),
  getOne: (id: string) =>
    apiClient.get('/appliances/technicians/' + id).then(unwrap<TechnicianDetail>),
  workload: (id: string, from: string, to: string) =>
    apiClient.get('/appliances/technicians/' + id + '/workload', { params: { from, to } }).then(unwrap<TechnicianWorkload>),
  update: (id: string, data: Partial<Technician>) =>
    apiClient.patch('/appliances/technicians/' + id, data).then(unwrap<Technician>),
  remove: (id: string) =>
    apiClient.delete('/appliances/technicians/' + id).then(unwrap),
};
