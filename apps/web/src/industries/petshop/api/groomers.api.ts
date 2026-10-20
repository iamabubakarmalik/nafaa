import { apiClient } from '@core/api/client';
import type { PetSpeciesType } from './products.api';
import type { PetGroomingAppointment, PetGroomingServiceType } from './grooming.api';

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
  todayAppointments?: PetGroomingAppointment[];
  upcoming?: PetGroomingAppointment[];
  recentCompleted?: PetGroomingAppointment[];
  createdAt: string;
  updatedAt: string;
}

export type GroomerInput = Pick<PetGroomer, 'employeeCode' | 'name' | 'phone' | 'specializations' | 'serviceTypes' | 'workingDays' | 'workStartTime' | 'workEndTime' | 'commissionPct' | 'isActive'>
  & { cnic?: string; experienceYears?: number; perServiceRate?: number };

export interface GroomerWorkload {
  totals: { total: number; completed: number; cancelled: number; noShow: number; revenue: number; commission: number };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- axios envelope varies by endpoint
const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const groomersApi = {
  create: (data: GroomerInput) => apiClient.post('/petshop/groomers', data).then(unwrap<PetGroomer>),
  list: (params?: { active?: boolean; availableToday?: boolean; species?: string; search?: string }) =>
    apiClient.get('/petshop/groomers', { params }).then(unwrap<PetGroomer[]>),
  getOne: (id: string) => apiClient.get('/petshop/groomers/' + id).then(unwrap<PetGroomer>),
  /** Visits, money and commission over shop days (`yyyy-mm-dd`). */
  workload: (id: string, from?: string, to?: string) =>
    apiClient.get('/petshop/groomers/' + id + '/workload', { params: { from, to } }).then(unwrap<GroomerWorkload>),
  update: (id: string, data: Partial<GroomerInput>) => apiClient.patch('/petshop/groomers/' + id, data).then(unwrap<PetGroomer>),
  /** Switches the groomer off (nothing is deleted). */
  deactivate: (id: string) => apiClient.delete('/petshop/groomers/' + id).then(unwrap<PetGroomer>),
};
