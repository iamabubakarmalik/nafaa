import { apiClient } from '@/api/client';

export interface HousekeepingTask {
  id: string;
  taskNumber: string;
  roomId?: string;
  roomNumber: string;
  taskType: string;
  priority: string;
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
  durationMin?: number;
  assignedTo?: string;
  assignedName?: string;
  status: string;
  checklist?: any;
  suppliesUsed?: any;
  notes?: string;
  issueFound?: string;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const housekeepingApi = {
  create: (data: Partial<HousekeepingTask>) => apiClient.post('/hotel/housekeeping', data).then(unwrap<HousekeepingTask>),
  list: (params?: any) => apiClient.get('/hotel/housekeeping', { params }).then(unwrap<HousekeepingTask[]>),
  summary: () => apiClient.get('/hotel/housekeeping/summary').then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/hotel/housekeeping/' + id).then(unwrap<HousekeepingTask>),
  assign: (id: string, assignedTo: string, assignedName: string) =>
    apiClient.post('/hotel/housekeeping/' + id + '/assign', { assignedTo, assignedName }).then(unwrap<HousekeepingTask>),
  start: (id: string) => apiClient.post('/hotel/housekeeping/' + id + '/start').then(unwrap<HousekeepingTask>),
  complete: (id: string, data: any) => apiClient.post('/hotel/housekeeping/' + id + '/complete', data).then(unwrap<HousekeepingTask>),
};
