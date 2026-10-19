import { apiClient } from '@core/api/client';

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'ARRIVED' | 'IN_CONSULTATION'
  | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'RESCHEDULED';

export type VisitType = 'FIRST_VISIT' | 'FOLLOW_UP' | 'CONSULTATION' | 'EMERGENCY'
  | 'ROUTINE_CHECKUP' | 'VACCINATION' | 'PROCEDURE' | 'SURGERY' | 'DENTAL_CHECKUP'
  | 'ANTENATAL' | 'POSTNATAL' | 'PHYSIO_SESSION' | 'COUNSELING' | 'TELEMEDICINE' | 'HOME_VISIT' | 'OTHER';

export type FeeMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';

/** Patient and doctor fields sent with every appointment row. */
export interface AptPatient { id: string; fullName: string; mrn: string; phonePrimary?: string | null; gender?: string | null; dateOfBirth?: string | null; customerId?: string; allergies?: string[] }
export interface AptDoctor { id: string; fullName: string; title?: string | null; photoUrl?: string | null; specialties?: string[]; consultationFee?: number; followUpFee?: number; followUpDays?: number; commissionPct?: number; commissionType?: string }

export interface Appointment {
  id: string;
  appointmentNumber: string;
  tokenNumber?: number | null;
  patientId: string;
  doctorId: string;
  shopId?: string | null;
  status: AppointmentStatus;
  visitType: VisitType;
  isTelemedicine: boolean;
  isHomeVisit: boolean;
  isEmergency: boolean;
  scheduledStart: string;
  scheduledEnd: string;
  arrivedAt?: string | null;
  consultationStart?: string | null;
  consultationEnd?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  chiefComplaint?: string | null;
  reasonForVisit?: string | null;
  patientNotes?: string | null;
  consultationFee: number;
  otherCharges: number;
  discount: number;
  taxAmount: number;
  total: number;
  /** What has been billed (cash and khata). */
  paidAmount: number;
  paymentStatus: string;
  patientRating?: number | null;
  internalNotes?: string | null;
  patient?: AptPatient | null;
  doctor?: AptDoctor | null;
  createdAt: string;
  updatedAt: string;
}

export interface AptBill { id: string; saleNumber: string; status: string; paidAmount: number; creditAmount: number; paymentMethod: string; createdAt: string; amount: number }

export interface FeePayment {
  amount: number;
  paymentMethod?: FeeMethod;
  payments?: Array<{ method: FeeMethod; amount: number; reference?: string }>;
  /** Whole amount to the patient's khata. */
  onCredit?: boolean;
  /** Taken now when less than the amount; the rest goes to khata. */
  paid?: number;
}

export interface FeeSale { id: string; saleNumber: string; total: number; paidAmount: number; creditAmount: number }

export interface AptPage {
  items: Appointment[];
  total: number;
  page: number;
  limit: number;
  summary: { fees: number; billed: number; due: number; byStatus: Partial<Record<AppointmentStatus, number>> };
}

export interface FollowUp {
  id: string; appointmentId: string; patientId: string; doctorId: string; followUpDate: string; followUpAdvice?: string | null;
  finalDiagnosis?: string | null; provisionalDiagnosis?: string | null; bookedAppointmentId: string | null; bookedFor: string | null;
  patient?: AptPatient | null; doctor?: AptDoctor | null;
}

export interface DayCloseRow {
  doctorId: string; doctor: AptDoctor | null; booked: number; seen: number; waiting: number; cancelled: number;
  fees: number; labFees: number; collected: number; khata: number; bills: number;
  commissionType: 'PERCENTAGE' | 'FIXED'; commissionPct: number; share: number; clinicKeeps: number;
}
export interface DayClose { date: string; rows: DayCloseRow[]; totals: { booked: number; seen: number; fees: number; labFees: number; collected: number; khata: number; share: number } }

export type AptDetail = Appointment & {
  patient: import('./patients.api').Patient | null;
  doctor: import('./doctors.api').Doctor | null;
  encounter: (import('./encounters.api').Encounter & { prescriptions: import('./prescriptions.api').Prescription[]; labOrders: import('./lab-orders.api').LabOrder[] }) | null;
  vitals: import('./vitals.api').Vitals | null;
  bills: AptBill[];
};

const unwrap = <T,>(res: { data?: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const appointmentsApi = {
  create: (data: Record<string, unknown>) => apiClient.post('/clinic/appointments', data).then(unwrap<Appointment>),
  /** First 300 in the range, oldest first (dashboard, queue boards). */
  list: (params?: Record<string, unknown>) => apiClient.get('/clinic/appointments', { params }).then(unwrap<Appointment[]>),
  page: (params: Record<string, unknown>) => apiClient.get('/clinic/appointments', { params: { page: 1, ...params } }).then(unwrap<AptPage>),
  queue: (doctorId: string | undefined, date: string) => apiClient.get('/clinic/appointments/queue', { params: { doctorId, date } }).then(unwrap<Array<Appointment & { vitals?: Partial<import('./vitals.api').Vitals> | null }>>),
  feeQuote: (doctorId: string, patientId?: string) => apiClient.get('/clinic/appointments/fee-quote', { params: { doctorId, patientId } })
    .then(unwrap<{ visitType: VisitType; fee: number; lastVisitAt: string | null }>),
  followUps: (from: string, to: string) => apiClient.get('/clinic/appointments/follow-ups', { params: { from, to } }).then(unwrap<FollowUp[]>),
  dayClose: (date: string) => apiClient.get('/clinic/appointments/day-close', { params: { date } }).then(unwrap<DayClose>),
  getOne: (id: string) => apiClient.get('/clinic/appointments/' + id).then(unwrap<AptDetail>),
  updateStatus: (id: string, status: AppointmentStatus, cancellationReason?: string) =>
    apiClient.patch('/clinic/appointments/' + id + '/status', { status, cancellationReason }).then(unwrap<Appointment>),
  reschedule: (id: string, data: { scheduledStart: string; reason?: string }) => apiClient.post('/clinic/appointments/' + id + '/reschedule', data).then(unwrap<Appointment>),
  /** Each payment is billed as a sale, so it shows in the drawer and reports. */
  addPayment: (id: string, body: FeePayment) => apiClient.post('/clinic/appointments/' + id + '/payment', body).then(unwrap<Appointment & { sale: FeeSale }>),
};
