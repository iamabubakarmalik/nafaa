import { apiClient } from '@/api/client';

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface SalonAppointment {
  id: string;
  appointmentNumber: string;
  customerName: string;
  customerPhone?: string | null;
  customerId?: string | null;
  serviceName: string;
  duration: number;
  price: number;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  staffId?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface CreateAppointmentPayload {
  customerName: string;
  customerPhone?: string;
  customerId?: string;
  serviceName: string;
  duration: number;
  price?: number;
  startTime: string;
  staffId?: string;
  notes?: string;
}

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const appointmentsApi = {
  stats: () => apiClient.get('/industries/salon/appointments/stats').then(unwrap) as Promise<{ today: number; scheduled: number; completed: number; upcoming: number }>,
  today: () => apiClient.get('/industries/salon/appointments/today').then(unwrap) as Promise<SalonAppointment[]>,
  list: (params?: { from?: string; to?: string; status?: AppointmentStatus }) =>
    apiClient.get('/industries/salon/appointments', { params }).then(unwrap) as Promise<SalonAppointment[]>,
  create: (payload: CreateAppointmentPayload) =>
    apiClient.post('/industries/salon/appointments', payload).then(unwrap) as Promise<SalonAppointment>,
  updateStatus: (id: string, status: AppointmentStatus) =>
    apiClient.patch(`/industries/salon/appointments/${id}/status`, { status }).then(unwrap) as Promise<SalonAppointment>,
  remove: (id: string) =>
    apiClient.delete(`/industries/salon/appointments/${id}`).then(unwrap),
};
