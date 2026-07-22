import { apiClient } from '@core/api/client';

export interface DairyRoute {
  id: string;
  routeNumber: string;
  name: string;
  description?: string;
  assignedStaffId?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  slot: string;
  status: 'ACTIVE' | 'PAUSED' | 'DISCONTINUED';
  totalCustomers: number;
  totalDailyLiters: number;
  startTime?: string;
  estimatedDurationMin?: number;
  areaName?: string;
  color?: string;
  isActive: boolean;
  customers?: any[];
  assignedStaff?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const routesApi = {
  create: (data: Partial<DairyRoute>) => apiClient.post('/dairy/routes', data).then(unwrap<DairyRoute>),
  list: (params?: any) => apiClient.get('/dairy/routes', { params }).then(unwrap<DairyRoute[]>),
  getOne: (id: string) => apiClient.get('/dairy/routes/' + id).then(unwrap<DairyRoute>),
  todayDeliveries: (id: string) => apiClient.get('/dairy/routes/' + id + '/today-deliveries').then(unwrap<any[]>),
  update: (id: string, data: Partial<DairyRoute>) => apiClient.patch('/dairy/routes/' + id, data).then(unwrap<DairyRoute>),
  recalculate: (id: string) => apiClient.post('/dairy/routes/' + id + '/recalculate').then(unwrap<DairyRoute>),
  remove: (id: string) => apiClient.delete('/dairy/routes/' + id).then(unwrap),
};
