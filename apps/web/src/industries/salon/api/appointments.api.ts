import { apiClient } from '@core/api/client';

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
  notes?: string | null;
  productsUsed?: Array<{ productId: string; variantId?: string | null; name: string; unit: string; quantity: number }> | null;
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
  saleId?: string | null;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  customerRating?: number;
  customerFeedback?: string;
  internalNotes?: string;
  services: AppointmentService[];
  customer?: { id: string; name: string; phone?: string | null; balance?: number } | null;
  sale?: { id: string; saleNumber: string; status: string; total: number; creditAmount: number; refundedAmount: number } | null;
  membershipId?: string | null;
  packageId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentView = 'today' | 'queue' | 'upcoming' | 'done' | 'missed' | 'all';

export interface AppointmentQuery {
  view?: AppointmentView; from?: string; to?: string; staffProfileId?: string; search?: string; page?: number; limit?: number;
}

export interface AppointmentPage {
  items: Appointment[]; total: number; page: number; limit: number; pages: number;
  counts: Record<AppointmentView, number>;
  totals: { value: number; paid: number };
}

export interface AppointmentSummary {
  today: { total: number; waiting: number; inChair: number; done: number; noShow: number; late: number; upcoming: number };
  held: { amount: number; count: number };
  period: {
    from: string; to: string; bookings: number; completed: number; noShows: number; cancelled: number; noShowRate: number;
    walkIns: number; customers: number; revenue: number; average: number; commission: number;
  };
  staff: Array<{ staffProfileId: string; name: string; services: number; revenue: number; commission: number }>;
  services: Array<{ serviceId: string; name: string; count: number; revenue: number }>;
  hours: Array<{ hour: number; bookings: number }>;
  weekdays: Array<{ day: number; bookings: number }>;
}

export interface NewAppointment {
  customerId?: string; customerName?: string; customerPhone?: string; customerNotes?: string;
  scheduledStart: string; walkIn?: boolean; numberOfGuests?: number;
  services: Array<{ serviceId: string; staffProfileId?: string; price?: number; durationMinutes?: number; notes?: string }>;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const appointmentsApi = {
  create: (data: NewAppointment) => apiClient.post('/salon/appointments', data).then(unwrap<Appointment>),
  list: (params?: { status?: string; customerId?: string; staffProfileId?: string; from?: string; to?: string; search?: string; saleId?: string; saleIds?: string }) =>
    apiClient.get('/salon/appointments', { params }).then(unwrap<Appointment[]>),
  page: (params: AppointmentQuery) => apiClient.get('/salon/appointments/page', { params }).then(unwrap<AppointmentPage>),
  summary: (params?: { from?: string; to?: string }) => apiClient.get('/salon/appointments/summary', { params }).then(unwrap<AppointmentSummary>),
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
