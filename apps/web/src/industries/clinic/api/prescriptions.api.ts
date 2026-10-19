import { apiClient } from '@core/api/client';

export interface PrescriptionItem {
  id?: string;
  drugId?: string;
  drugName: string;
  strength?: string;
  form?: string;
  dose?: string;
  frequency?: string;
  route?: string;
  durationDays?: number;
  quantity?: string;
  beforeMeal?: boolean;
  afterMeal?: boolean;
  atBedtime?: boolean;
  emptyStomach?: boolean;
  instructions?: string;
  displayOrder?: number;
}

export interface Prescription {
  id: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  prescriptionNumber: string;
  status: 'DRAFT' | 'ACTIVE' | 'DISPENSED' | 'EXPIRED' | 'CANCELLED';
  issuedAt: string;
  validUntil?: string;
  isDigital: boolean;
  pdfUrl?: string;
  generalInstructions?: string;
  totalItems: number;
  items: PrescriptionItem[];
  createdAt: string;
  updatedAt: string;
}

export type PrescriptionRow = Prescription & {
  patient: { id: string; fullName: string; mrn: string; phonePrimary?: string | null; gender?: string | null; dateOfBirth?: string | null; allergies?: string[]; customerId?: string } | null;
  doctor: { id: string; fullName: string; title?: string | null; qualifications?: string[]; pmcNumber?: string | null } | null;
  encounter: { id: string; appointmentId: string; finalDiagnosis?: string | null; provisionalDiagnosis?: string | null; advice?: string | null; followUpDate?: string | null } | null;
};

const unwrap = <T,>(res: { data?: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const prescriptionsApi = {
  create: (data: { encounterId: string; generalInstructions?: string; items: PrescriptionItem[] }) => apiClient.post('/clinic/prescriptions', data).then(unwrap<Prescription>),
  list: (params?: Record<string, unknown>) => apiClient.get('/clinic/prescriptions', { params }).then(unwrap<PrescriptionRow[]>),
  page: (params: Record<string, unknown>) => apiClient.get('/clinic/prescriptions', { params: { page: 1, ...params } })
    .then(unwrap<{ items: PrescriptionRow[]; total: number; page: number; limit: number }>),
  getOne: (id: string) => apiClient.get('/clinic/prescriptions/' + id).then(unwrap<Prescription>),
  updateStatus: (id: string, status: Prescription['status']) => apiClient.patch('/clinic/prescriptions/' + id + '/status', { status }).then(unwrap<Prescription>),
};
