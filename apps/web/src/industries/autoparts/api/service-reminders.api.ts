import { apiClient } from '@core/api/client';

export interface ServiceReminder {
  id: string;
  vehicleId: string;
  reminderType: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueOdometerKm?: number;
  status: string;
  sentAt?: string;
  acknowledgedAt?: string;
  doneAt?: string;
  autoCreated: boolean;
  fromJobId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReminderView = 'due' | 'overdue' | 'upcoming' | 'open' | 'done' | 'all';
export interface ReminderRow extends ServiceReminder {
  vehicle: { id: string; registrationNumber: string; makeName?: string | null; modelName?: string | null; ownerName?: string | null; ownerPhone?: string | null; customerId: string; odometerKm?: number | null; lastOdometerKm?: number | null } | null;
}
export interface ReminderPage { items: ReminderRow[]; total: number; page: number; limit: number; totalPages: number }
export interface ReminderStats { overdue: number; week: number; month: number; done: number }

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const serviceRemindersApi = {
  create: (data: { vehicleId: string; reminderType: string; title: string; description?: string; dueDate?: string; dueOdometerKm?: number; notes?: string }) =>
    apiClient.post('/autoparts/service-reminders', data).then(unwrap<ServiceReminder>),
  /** Plain list (dashboard). */
  list: (params?: { upcoming?: boolean; overdue?: boolean; vehicleId?: string }) => apiClient.get('/autoparts/service-reminders', { params }).then(unwrap<ReminderRow[]>),
  page: (params: { view?: ReminderView; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/autoparts/service-reminders', { params: { ...params, page: params.page ?? 1 } }).then(unwrap<ReminderPage>),
  stats: () => apiClient.get('/autoparts/service-reminders/stats').then(unwrap<ReminderStats>),
  updateStatus: (id: string, status: string) => apiClient.post('/autoparts/service-reminders/' + id + '/status', { status }).then(unwrap<ServiceReminder>),
  snooze: (id: string, until: string) => apiClient.post('/autoparts/service-reminders/' + id + '/snooze', { until }).then(unwrap<ServiceReminder>),
  autoGenerate: (vehicleId: string) => apiClient.post('/autoparts/service-reminders/auto-generate/' + vehicleId).then(unwrap<{ created: number }>),
};
