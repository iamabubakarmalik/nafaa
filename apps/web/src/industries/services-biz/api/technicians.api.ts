import { apiClient } from '@core/api/client';

export type TechStatus = 'AVAILABLE' | 'ON_JOB' | 'ON_BREAK' | 'OFF_DUTY' | 'ON_LEAVE' | 'UNAVAILABLE';

export interface Technician {
  id: string;
  staffId: string;
  employeeCode?: string;
  level: string;
  status: TechStatus;
  primarySkill?: string;
  secondarySkills: string[];
  certifications?: any;
  experienceYears: number;
  bio?: string;
  photoUrl?: string;
  cnicNumber?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  vehicleAssigned?: string;
  vehicleNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  serviceAreas: string[];
  homeCity?: string;
  currentLat?: number;
  currentLng?: number;
  lastLocationAt?: string;
  maxTravelKm?: number;
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  isAvailableForEmergency: boolean;
  isAvailableWeekends: boolean;
  isAvailableNights: boolean;
  commissionType: string;
  commissionPct: number;
  fixedPerJob: number;
  monthlySalary: number;
  maxDailyJobs?: number;
  maxOngoingJobs: number;
  bookingBufferMin: number;
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  totalRevenue: number;
  totalCommission: number;
  avgRating?: number;
  totalReviews: number;
  onTimePct: number;
  completionPct: number;
  isActive: boolean;
  staff?: any;
  services?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const techniciansApi = {
  upsert: (data: Partial<Technician>) => apiClient.post('/services-biz/technicians', data).then(unwrap<Technician>),
  list: (params?: any) => apiClient.get('/services-biz/technicians', { params }).then(unwrap<Technician[]>),
  availableNow: (businessType?: string, city?: string) =>
    apiClient.get('/services-biz/technicians/available-now', { params: { businessType, city } }).then(unwrap<Technician[]>),
  byStaff: (staffId: string) => apiClient.get('/services-biz/technicians/by-staff/' + staffId).then(unwrap<Technician | null>),
  getOne: (id: string) => apiClient.get('/services-biz/technicians/' + id).then(unwrap<Technician>),
  availability: (id: string, date: string) =>
    apiClient.get('/services-biz/technicians/' + id + '/availability', { params: { date } }).then(unwrap<any>),
  performance: (id: string, from?: string, to?: string) =>
    apiClient.get('/services-biz/technicians/' + id + '/performance', { params: { from, to } }).then(unwrap<any>),
  assignSkills: (id: string, skills: any[]) =>
    apiClient.post('/services-biz/technicians/' + id + '/skills', { skills }).then(unwrap),
  updateStatus: (id: string, status: string) =>
    apiClient.patch('/services-biz/technicians/' + id + '/status', { status }).then(unwrap<Technician>),
  updateLocation: (id: string, lat: number, lng: number) =>
    apiClient.patch('/services-biz/technicians/' + id + '/location', { lat, lng }).then(unwrap<Technician>),
  remove: (id: string) => apiClient.delete('/services-biz/technicians/' + id).then(unwrap),
};
