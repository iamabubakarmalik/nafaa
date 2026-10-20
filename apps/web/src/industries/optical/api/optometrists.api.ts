import { apiClient } from '@core/api/client';

export interface OpticalOptometrist {
  id: string;
  employeeCode: string;
  name: string;
  qualification?: string | null;
  registrationNumber?: string | null;
  phone: string;
  email?: string | null;
  specializations: string[];
  yearsExperience?: number | null;
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  consultationFee: number;
  followUpFee: number;
  isActive: boolean;
  bio?: string | null;
  totalTests: number;
  totalRevenue: number;
}

export interface Workload {
  totals: { total: number; completed: number; cancelled: number; noShow: number; prescriptionsIssued: number; revenue: number; avgDurationMinutes: number };
}

export type OptometristInput = Partial<Omit<OpticalOptometrist, 'id' | 'totalTests' | 'totalRevenue'>>;

const unwrap = <T,>(res: { data: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const optometristsApi = {
  create: (data: OptometristInput) => apiClient.post('/optical/optometrists', data).then(unwrap<OpticalOptometrist>),
  list: (params?: { active?: boolean; availableToday?: boolean; search?: string }) => apiClient.get('/optical/optometrists', { params }).then(unwrap<OpticalOptometrist[]>),
  workload: (id: string, from: string, to: string) => apiClient.get('/optical/optometrists/' + id + '/workload', { params: { from, to } }).then(unwrap<Workload>),
  update: (id: string, data: OptometristInput) => apiClient.patch('/optical/optometrists/' + id, data).then(unwrap<OpticalOptometrist>),
  deactivate: (id: string) => apiClient.delete('/optical/optometrists/' + id).then(unwrap<OpticalOptometrist>),
};
