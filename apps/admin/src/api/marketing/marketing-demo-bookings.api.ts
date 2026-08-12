import { apiClient } from '../client';

export interface DemoBooking {
  id: string;
  bookingNumber: string;
  fullName: string;
  email: string;
  phone: string;
  companyName?: string;
  industry?: string;
  preferredDate: string;
  preferredTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'RESCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  meetingLink?: string;
  interestLevel?: string;
  rating?: number;
  feedback?: string;
  followUpNotes?: string;
  assignedTo?: string;
  createdAt: string;
}

export const demoBookingsApi = {
  list: (params: any = {}) =>
    apiClient
      .get('/admin/marketing/demo-bookings', { params })
      .then((r) => r.data.data),

  stats: () =>
    apiClient
      .get('/admin/marketing/demo-bookings/stats')
      .then((r) => r.data.data),

  detail: (id: string): Promise<DemoBooking> =>
    apiClient
      .get(`/admin/marketing/demo-bookings/${id}`)
      .then((r) => r.data.data),

  schedule: (id: string, body: {
    scheduledAt: string;
    meetingLink?: string;
    assignedTo?: string;
    notes?: string;
  }) =>
    apiClient
      .post(`/admin/marketing/demo-bookings/${id}/schedule`, body)
      .then((r) => r.data.data),

  complete: (id: string, body: {
    outcome: 'CONVERTED' | 'INTERESTED' | 'NEEDS_FOLLOWUP' | 'NOT_INTERESTED' | 'WRONG_FIT';
    rating?: number;
    feedback?: string;
    nextStep?: string;
  }) =>
    apiClient
      .post(`/admin/marketing/demo-bookings/${id}/complete`, body)
      .then((r) => r.data.data),

  cancel: (id: string, reason: string) =>
    apiClient
      .post(`/admin/marketing/demo-bookings/${id}/cancel`, { reason })
      .then((r) => r.data.data),
};
