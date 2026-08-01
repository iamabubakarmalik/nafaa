import { apiClient } from '@core/api/client';

export type OpticalAppointmentStatus =
  | 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED'
  | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';

export interface OpticalEyeTest {
  id: string;
  testNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAge?: number;
  appointmentDate: string;
  scheduledSlot?: string;
  optometristId?: string;
  optometristName?: string;
  status: OpticalAppointmentStatus;
  chiefComplaint?: string;
  medicalHistory?: string;
  currentMedications?: string;
  familyEyeHistory?: string;
  rightSph?: number; rightCyl?: number; rightAxis?: number; rightAdd?: number; rightVa?: string;
  leftSph?: number; leftCyl?: number; leftAxis?: number; leftAdd?: number; leftVa?: string;
  pupilDistance?: number;
  intraocularPressure?: string;
  colorVisionTest?: string;
  depthPerceptionTest?: string;
  peripheralVisionTest?: string;
  fundusExamination?: string;
  diagnosis?: string;
  recommendation?: string;
  requiresFollowUp: boolean;
  followUpDate?: string;
  followUpReason?: string;
  prescriptionIssued: boolean;
  prescriptionId?: string;
  testFee: number;
  paidAmount: number;
  paymentMethod?: string;
  isWaivedOff: boolean;
  testStartedAt?: string;
  testCompletedAt?: string;
  testDurationMinutes?: number;
  imageUrls: string[];
  notes?: string;
  prescription?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const eyeTestsApi = {
  create: (data: Partial<OpticalEyeTest>) =>
    apiClient.post('/optical/eye-tests', data).then(unwrap<OpticalEyeTest>),

  list: (params?: {
    status?: string; customerId?: string; optometristId?: string;
    from?: string; to?: string; today?: boolean; search?: string;
  }) => apiClient.get('/optical/eye-tests', { params }).then(unwrap<OpticalEyeTest[]>),

  summary: () => apiClient.get('/optical/eye-tests/summary').then(unwrap<any>),

  today: () => apiClient.get('/optical/eye-tests/today').then(unwrap<OpticalEyeTest[]>),

  availableSlots: (optometristId: string, date: string) =>
    apiClient.get('/optical/eye-tests/available-slots', { params: { optometristId, date } }).then(unwrap<any>),

  getOne: (id: string) =>
    apiClient.get('/optical/eye-tests/' + id).then(unwrap<OpticalEyeTest>),

  assignOptometrist: (id: string, optometristId: string) =>
    apiClient.post('/optical/eye-tests/' + id + '/assign-optometrist', { optometristId }).then(unwrap<OpticalEyeTest>),

  start: (id: string) =>
    apiClient.post('/optical/eye-tests/' + id + '/start').then(unwrap<OpticalEyeTest>),

  recordResults: (id: string, data: any) =>
    apiClient.post('/optical/eye-tests/' + id + '/results', data).then(unwrap<OpticalEyeTest>),

  recordPayment: (id: string, data: { amount: number; paymentMethod?: string; waiveOff?: boolean }) =>
    apiClient.post('/optical/eye-tests/' + id + '/payment', data).then(unwrap<OpticalEyeTest>),

  updateStatus: (id: string, data: { status: OpticalAppointmentStatus; reason?: string; rescheduledDate?: string }) =>
    apiClient.patch('/optical/eye-tests/' + id + '/status', data).then(unwrap<OpticalEyeTest>),

  remove: (id: string) =>
    apiClient.delete('/optical/eye-tests/' + id).then(unwrap),
};
