import { apiClient } from '@core/api/client';

export interface RefillReminder {
  id: string;
  customerId: string;
  productId?: string;
  prescriptionId?: string;
  medicineName: string;
  scheduledFor: string;
  reminderType: string;
  status: 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'MISSED';
  sentAt?: string;
  acknowledgedAt?: string;
  notes?: string;
  createdAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const refillRemindersApi = {
  create: (data: Partial<RefillReminder>) =>
    apiClient.post('/pharmacy/refill-reminders', data).then(unwrap<RefillReminder>),
  list: (params?: { status?: string; customerId?: string; from?: string; to?: string }) =>
    apiClient.get('/pharmacy/refill-reminders', { params }).then(unwrap<RefillReminder[]>),
  dueToday: () => apiClient.get('/pharmacy/refill-reminders/due-today').then(unwrap<RefillReminder[]>),
  markSent: (id: string) =>
    apiClient.patch('/pharmacy/refill-reminders/' + id + '/mark-sent').then(unwrap),
  acknowledge: (id: string) =>
    apiClient.patch('/pharmacy/refill-reminders/' + id + '/acknowledge').then(unwrap),
  remove: (id: string) => apiClient.delete('/pharmacy/refill-reminders/' + id).then(unwrap),
};
