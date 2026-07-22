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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const prescriptionsApi = {
  create: (data: any) => apiClient.post('/clinic/prescriptions', data).then(unwrap<Prescription>),
  list: (params?: any) => apiClient.get('/clinic/prescriptions', { params }).then(unwrap<Prescription[]>),
  getOne: (id: string) => apiClient.get('/clinic/prescriptions/' + id).then(unwrap<Prescription>),
  updateStatus: (id: string, status: string) => apiClient.patch('/clinic/prescriptions/' + id + '/status', { status }).then(unwrap<Prescription>),
};
