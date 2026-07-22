import { apiClient } from '@core/api/client';

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'ARRIVED' | 'IN_CONSULTATION'
  | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'RESCHEDULED';

export type VisitType = 'FIRST_VISIT' | 'FOLLOW_UP' | 'CONSULTATION' | 'EMERGENCY'
  | 'ROUTINE_CHECKUP' | 'VACCINATION' | 'PROCEDURE' | 'SURGERY' | 'DENTAL_CHECKUP'
  | 'ANTENATAL' | 'POSTNATAL' | 'PHYSIO_SESSION' | 'COUNSELING' | 'TELEMEDICINE' | 'HOME_VISIT' | 'OTHER';

export interface Appointment {
  id: string;
  appointmentNumber: string;
  tokenNumber?: number;
  patientId: string;
  doctorId: string;
  status: AppointmentStatus;
  visitType: VisitType;
  isTelemedicine: boolean;
  isHomeVisit: boolean;
  isEmergency: boolean;
  scheduledStart: string;
  scheduledEnd: string;
  arrivedAt?: string;
  consultationStart?: string;
  consultationEnd?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  chiefComplaint?: string;
  reasonForVisit?: string;
  patientNotes?: string;
  consultationFee: number;
  otherCharges: number;
  discount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  patientRating?: number;
  patientFeedback?: string;
  videoRoomId?: string;
  videoRoomUrl?: string;
  internalNotes?: string;
  patient?: any;
  doctor?: any;
  encounter?: any;
  vitals?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const appointmentsApi = {
  create: (data: any) => apiClient.post('/clinic/appointments', data).then(unwrap<Appointment>),
  list: (params?: any) => apiClient.get('/clinic/appointments', { params }).then(unwrap<Appointment[]>),
  queue: (doctorId: string, date: string) => apiClient.get('/clinic/appointments/queue', { params: { doctorId, date } }).then(unwrap<Appointment[]>),
  getOne: (id: string) => apiClient.get('/clinic/appointments/' + id).then(unwrap<Appointment>),
  updateStatus: (id: string, status: string, cancellationReason?: string) =>
    apiClient.patch('/clinic/appointments/' + id + '/status', { status, cancellationReason }).then(unwrap<Appointment>),
  reschedule: (id: string, data: any) => apiClient.post('/clinic/appointments/' + id + '/reschedule', data).then(unwrap<Appointment>),
  addPayment: (id: string, amount: number) => apiClient.post('/clinic/appointments/' + id + '/payment', { amount }).then(unwrap<Appointment>),
  rate: (id: string, rating: number, feedback?: string) => apiClient.post('/clinic/appointments/' + id + '/rating', { rating, feedback }).then(unwrap<Appointment>),
};
