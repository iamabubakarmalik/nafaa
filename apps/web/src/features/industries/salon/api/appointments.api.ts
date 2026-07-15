import { apiClient } from '@/api/client';

export type AppointmentStatus = 'DRAFT' | 'CONFIRMED' | 'ARRIVED' | 'IN_PROGRESS'
  | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'RESCHEDULED';

export interface AppointmentService {
  id?: string;
  serviceId: string;
  serviceName?: string;
  staffProfileId?: string;
  staffName?: string;
  price: number;
  discount: number;
  total: number;
  durationMinutes: number;
  commissionAmount?: number;
  notes?: string;
}

export interface Appointment {
  id: string;
  appointmentNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerNotes?: string;
  status: AppointmentStatus;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  arrivedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  subtotal: number;
  serviceCharge: number;
  taxAmount: number;
  discount: number;
  tip: number;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  customerRating?: number;
  customerFeedback?: string;
  internalNotes?: string;
  services: AppointmentService[];
  customer?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const appointmentsApi = {
  create: (data: any) => apiClient.post('/salon/appointments', data).then(unwrap<Appointment>),
  list: (params?: any) => apiClient.get('/salon/appointments', { params }).then(unwrap<Appointment[]>),
  calendar: (from: string, to: string, staffProfileId?: string) =>
    apiClient.get('/salon/appointments/calendar', { params: { from, to, staffProfileId } }).then(unwrap<Appointment[]>),
  getOne: (id: string) => apiClient.get('/salon/appointments/' + id).then(unwrap<Appointment>),
  updateStatus: (id: string, status: string, cancellationReason?: string) =>
    apiClient.patch('/salon/appointments/' + id + '/status', { status, cancellationReason }).then(unwrap<Appointment>),
  reschedule: (id: string, data: { scheduledStart: string; scheduledEnd: string; reason?: string }) =>
    apiClient.post('/salon/appointments/' + id + '/reschedule', data).then(unwrap<Appointment>),
  addPayment: (id: string, data: { amount: number; paymentMethod: string; reference?: string }) =>
    apiClient.post('/salon/appointments/' + id + '/payments', data).then(unwrap<Appointment>),
  rate: (id: string, rating: number, feedback?: string) =>
    apiClient.post('/salon/appointments/' + id + '/rating', { rating, feedback }).then(unwrap<Appointment>),
};
