import { apiClient } from '@core/api/client';

export interface OpticalOptometrist {
  id: string;
  employeeCode: string;
  name: string;
  qualification?: string;
  registrationNumber?: string;
  phone: string;
  email?: string;
  specializations: string[];
  yearsExperience?: number;
  languages: string[];
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  consultationFee: number;
  followUpFee?: number;
  isActive: boolean;
  photoUrl?: string;
  bio?: string;
  totalTests: number;
  totalRevenue: number;
  todayAppointments?: any[];
  upcoming?: any[];
  recentCompleted?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const optometristsApi = {
  create: (data: Partial<OpticalOptometrist>) =>
    apiClient.post('/optical/optometrists', data).then(unwrap<OpticalOptometrist>),

  list: (params?: { active?: boolean; availableToday?: boolean; search?: string }) =>
    apiClient.get('/optical/optometrists', { params }).then(unwrap<OpticalOptometrist[]>),

  topPerformers: (limit = 10) =>
    apiClient.get('/optical/optometrists/top', { params: { limit } }).then(unwrap<OpticalOptometrist[]>),

  getOne: (id: string) =>
    apiClient.get('/optical/optometrists/' + id).then(unwrap<OpticalOptometrist>),

  workload: (id: string, from: string, to: string) =>
    apiClient.get('/optical/optometrists/' + id + '/workload', { params: { from, to } }).then(unwrap<any>),

  update: (id: string, data: Partial<OpticalOptometrist>) =>
    apiClient.patch('/optical/optometrists/' + id, data).then(unwrap<OpticalOptometrist>),

  remove: (id: string) =>
    apiClient.delete('/optical/optometrists/' + id).then(unwrap),
};
