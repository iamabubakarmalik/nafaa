import { apiClient } from '@/api/client';

export type StaffRole = 'STYLIST' | 'COLORIST' | 'BEAUTICIAN' | 'MAKEUP_ARTIST' | 'NAIL_TECH'
  | 'MASSAGE_THERAPIST' | 'MEHNDI_ARTIST' | 'APPRENTICE' | 'RECEPTIONIST' | 'MANAGER' | 'OTHER';

export type CommissionType = 'NONE' | 'PERCENTAGE' | 'FIXED_PER_SERVICE' | 'TIERED' | 'HYBRID';

export interface StaffProfile {
  id: string;
  staffId: string;
  role: StaffRole;
  specialization: string[];
  experienceYears?: number;
  bio?: string;
  photoUrl?: string;
  commissionType: CommissionType;
  commissionPct: number;
  commissionFixed: number;
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  isBookable: boolean;
  maxDailyBookings?: number;
  bookingBuffer: number;
  totalAppointments: number;
  totalRevenue: number;
  totalCommission: number;
  avgRating?: number;
  totalReviews: number;
  isActive: boolean;
  staff?: any;
  services?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const staffProfilesApi = {
  upsert: (data: Partial<StaffProfile>) => apiClient.post('/salon/staff-profiles', data).then(unwrap<StaffProfile>),
  list: (params?: any) => apiClient.get('/salon/staff-profiles', { params }).then(unwrap<StaffProfile[]>),
  byStaff: (staffId: string) => apiClient.get('/salon/staff-profiles/by-staff/' + staffId).then(unwrap<StaffProfile | null>),
  getOne: (id: string) => apiClient.get('/salon/staff-profiles/' + id).then(unwrap<StaffProfile>),
  assignServices: (id: string, services: any[]) => apiClient.post('/salon/staff-profiles/' + id + '/services', { services }).then(unwrap),
  availability: (id: string, date: string) => apiClient.get('/salon/staff-profiles/' + id + '/availability', { params: { date } }).then(unwrap<any>),
  remove: (id: string) => apiClient.delete('/salon/staff-profiles/' + id).then(unwrap),
};
