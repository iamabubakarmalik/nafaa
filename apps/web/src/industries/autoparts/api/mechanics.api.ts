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
  staff?: { id: string; fullName: string; phone?: string | null; designation?: string | null } | null;
  /** Added by the list. */
  openJobs?: number;
  monthJobs?: number;
  monthLabour?: number;
  monthHours?: number;
  monthCommission?: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const mechanicsApi = {
  upsert: (data: Partial<Omit<MechanicProfile, 'staff'>>) => apiClient.post('/autoparts/mechanics', data).then(unwrap<MechanicProfile>),
  list: (params?: { available?: boolean; search?: string }) => apiClient.get('/autoparts/mechanics', { params }).then(unwrap<MechanicProfile[]>),
  toggleAvailability: (id: string) => apiClient.post('/autoparts/mechanics/' + id + '/toggle-availability').then(unwrap<MechanicProfile>),
  remove: (id: string) => apiClient.delete('/autoparts/mechanics/' + id).then(unwrap<MechanicProfile>),
};
