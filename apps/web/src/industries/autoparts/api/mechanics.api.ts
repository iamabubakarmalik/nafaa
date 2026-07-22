import { apiClient } from '@core/api/client';

export interface MechanicProfile {
  id: string;
  staffId: string;
  specialization: string[];
  certifications: string[];
  yearsOfExperience?: number;
  bio?: string;
  photoUrl?: string;
  hourlyRate: number;
  commissionPct: number;
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  isAvailable: boolean;
  currentJobId?: string;
  totalJobs: number;
  totalHours: number;
  totalRevenue: number;
  totalCommission: number;
  avgRating?: number;
  totalReviews: number;
  isActive: boolean;
  staff?: any;
  activeJobs?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const mechanicsApi = {
  upsert: (data: Partial<MechanicProfile>) => apiClient.post('/autoparts/mechanics', data).then(unwrap<MechanicProfile>),
  list: (params?: { available?: boolean; search?: string }) => apiClient.get('/autoparts/mechanics', { params }).then(unwrap<MechanicProfile[]>),
  byStaff: (staffId: string) => apiClient.get('/autoparts/mechanics/by-staff/' + staffId).then(unwrap<MechanicProfile | null>),
  getOne: (id: string) => apiClient.get('/autoparts/mechanics/' + id).then(unwrap<MechanicProfile>),
  toggleAvailability: (id: string) => apiClient.post('/autoparts/mechanics/' + id + '/toggle-availability').then(unwrap<MechanicProfile>),
  remove: (id: string) => apiClient.delete('/autoparts/mechanics/' + id).then(unwrap),
};
