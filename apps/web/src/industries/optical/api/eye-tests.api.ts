import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { Power } from '../lib/meta';
import type { OpticalPrescription } from './prescriptions.api';

export type OpticalAppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';

export interface OpticalEyeTest extends Power {
  id: string;
  testNumber: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  customerAge?: number | null;
  appointmentDate: string;
  scheduledSlot?: string | null;
  optometristId?: string | null;
  optometristName?: string | null;
  status: OpticalAppointmentStatus;
  chiefComplaint?: string | null;
  medicalHistory?: string | null;
  rightVa?: string | null; leftVa?: string | null;
  intraocularPressure?: string | null;
  colorVisionTest?: string | null;
  diagnosis?: string | null;
  recommendation?: string | null;
  requiresFollowUp: boolean;
  followUpDate?: string | null;
  followUpReason?: string | null;
  prescriptionIssued: boolean;
  prescriptionId?: string | null;
  testFee: number;
  paidAmount: number;
  paymentMethod?: string | null;
  isWaivedOff: boolean;
  testStartedAt?: string | null;
  testCompletedAt?: string | null;
  testDurationMinutes?: number | null;
  notes?: string | null;
  prescription?: OpticalPrescription | null;
}

export type EyeTestView = 'today' | 'upcoming' | 'waiting' | 'done' | 'unpaid' | 'followup' | 'closed' | 'all';
export interface EyeTestPage { items: OpticalEyeTest[]; total: number; page: number; limit: number; totalPages: number; totals: { fees: number; paid: number; due: number } }
export interface EyeTestSummary { scheduled: number; inProgress: number; completedToday: number; monthCount: number; pendingFollowUps: number; monthlyRevenue: number; monthlyBilled: number; unpaidCount: number; unpaidAmount: number }
export interface Slots { available: string[]; booked: Array<{ scheduledSlot: string | null; customerName: string }>; reason?: string; optometrist?: { consultationFee: number } }
export type EyeTestInput = Partial<Pick<OpticalEyeTest, 'customerId' | 'customerName' | 'customerPhone' | 'customerAge' | 'scheduledSlot' | 'optometristId' | 'chiefComplaint' | 'medicalHistory' | 'testFee' | 'notes'>> & { appointmentDate: string };
export type ResultsInput = Power & Partial<Pick<OpticalEyeTest, 'rightVa' | 'leftVa' | 'intraocularPressure' | 'colorVisionTest' | 'diagnosis' | 'recommendation' | 'requiresFollowUp' | 'followUpReason' | 'notes'>> & { followUpDate?: string; issuePrescription?: boolean };

const unwrap = <T,>(res: { data: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const eyeTestsApi = {
  create: (data: EyeTestInput) => apiClient.post('/optical/eye-tests', data).then(unwrap<OpticalEyeTest>),
  page: (params: { view?: EyeTestView; page?: number; limit?: number; search?: string; from?: string; to?: string; optometristId?: string; customerId?: string }) =>
    apiClient.get('/optical/eye-tests/page', { params }).then(unwrap<EyeTestPage>),
  summary: () => apiClient.get('/optical/eye-tests/summary').then(unwrap<EyeTestSummary>),
  availableSlots: (optometristId: string, date: string) => apiClient.get('/optical/eye-tests/available-slots', { params: { optometristId, date } }).then(unwrap<Slots>),
  bySales: (numbers: string[]) => apiClient.get('/optical/eye-tests/by-sales', { params: { numbers: numbers.join(',') } }).then(unwrap<Array<{ id: string; testNumber: string; notes: string | null }>>),
  getOne: (id: string) => apiClient.get('/optical/eye-tests/' + id).then(unwrap<OpticalEyeTest>),
  start: (id: string) => apiClient.post('/optical/eye-tests/' + id + '/start').then(unwrap<OpticalEyeTest>),
  recordResults: (id: string, data: ResultsInput) => apiClient.post('/optical/eye-tests/' + id + '/results', data).then(unwrap<OpticalEyeTest>),
  recordPayment: (id: string, data: { amount?: number; paymentMethod?: PaymentMethod; waiveOff?: boolean; onKhata?: boolean }) =>
    apiClient.post('/optical/eye-tests/' + id + '/payment', data).then(unwrap<OpticalEyeTest & { sale?: { saleNumber: string } }>),
  updateStatus: (id: string, data: { status: OpticalAppointmentStatus; reason?: string; rescheduledDate?: string; scheduledSlot?: string }) =>
    apiClient.patch('/optical/eye-tests/' + id + '/status', data).then(unwrap<OpticalEyeTest>),
};
