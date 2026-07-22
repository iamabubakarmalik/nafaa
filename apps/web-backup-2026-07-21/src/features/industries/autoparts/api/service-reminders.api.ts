import { apiClient } from '@/api/client';

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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const serviceRemindersApi = {
  create: (data: Partial<ServiceReminder>) => apiClient.post('/autoparts/service-reminders', data).then(unwrap<ServiceReminder>),
  list: (params?: any) => apiClient.get('/autoparts/service-reminders', { params }).then(unwrap<ServiceReminder[]>),
  byVehicle: (vehicleId: string) => apiClient.get('/autoparts/service-reminders/by-vehicle/' + vehicleId).then(unwrap<ServiceReminder[]>),
  updateStatus: (id: string, status: string) => apiClient.post('/autoparts/service-reminders/' + id + '/status', { status }).then(unwrap<ServiceReminder>),
  autoGenerate: (vehicleId: string) => apiClient.post('/autoparts/service-reminders/auto-generate/' + vehicleId).then(unwrap<any>),
  remove: (id: string) => apiClient.delete('/autoparts/service-reminders/' + id).then(unwrap),
};
