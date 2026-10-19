import { apiClient } from '@core/api/client';

export type TaskType = 'CHECKOUT_CLEAN' | 'DAILY_CLEAN' | 'DEEP_CLEAN' | 'TURNDOWN' | 'INSPECTION' | 'MAINTENANCE' | 'LINEN_CHANGE';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface HousekeepingTask {
  id: string;
  taskNumber: string;
  roomId?: string | null;
  roomNumber: string;
  taskType: TaskType;
  priority: TaskPriority;
  scheduledFor?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMin?: number | null;
  assignedTo?: string | null;
  assignedName?: string | null;
  status: TaskStatus;
  notes?: string | null;
  issueFound?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HousekeepingSummary { pending: number; assigned: number; inProgress: number; completedToday: number; urgent: number; dirtyRooms: number }

const unwrap = <T,>(res: { data: unknown }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const housekeepingApi = {
  create: (data: { roomId: string; taskType: TaskType; priority?: TaskPriority; scheduledFor?: string; assignedName?: string; notes?: string }) =>
    apiClient.post('/hotel/housekeeping', data).then(unwrap<HousekeepingTask>),
  list: (params?: { view?: 'open' | 'done' | 'all'; status?: string; roomId?: string; search?: string }) => apiClient.get('/hotel/housekeeping', { params }).then(unwrap<HousekeepingTask[]>),
  summary: () => apiClient.get('/hotel/housekeeping/summary').then(unwrap<HousekeepingSummary>),
  assign: (id: string, assignedName: string, assignedTo?: string) => apiClient.post('/hotel/housekeeping/' + id + '/assign', { assignedTo, assignedName }).then(unwrap<HousekeepingTask>),
  start: (id: string) => apiClient.post('/hotel/housekeeping/' + id + '/start').then(unwrap<HousekeepingTask>),
  complete: (id: string, data: { notes?: string; issueFound?: string }) => apiClient.post('/hotel/housekeeping/' + id + '/complete', data).then(unwrap<HousekeepingTask>),
  cancel: (id: string, reason: string) => apiClient.post('/hotel/housekeeping/' + id + '/cancel', { reason }).then(unwrap<HousekeepingTask>),
};
