import { apiClient } from '@/api/client';

export type PrescriptionStatus = 'PENDING' | 'VERIFIED' | 'PARTIALLY_DISPENSED' | 'DISPENSED' | 'REJECTED' | 'CANCELLED';
export type PrescriptionType = 'WALK_IN' | 'ONLINE' | 'REFILL' | 'HOSPITAL' | 'INSURANCE' | 'EMERGENCY';
export type RefillFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'AS_NEEDED';

export interface PrescriptionItem {
  id?: string;
  productId?: string;
  batchId?: string;
  medicineName: string;
  saltName?: string;
  strength?: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  instructions?: string;
  prescribedQty: number;
  dispensedQty?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  isDispensed?: boolean;
  isSubstituted?: boolean;
  substituteFor?: string;
  isOutOfStock?: boolean;
  displayOrder?: number;
}

export interface Prescription {
  id: string;
  prescriptionNumber: string;
  type: PrescriptionType;
  status: PrescriptionStatus;
  doctorId?: string;
  doctorName?: string;
  doctorRegNumber?: string;
  doctorSpeciality?: string;
  hospitalName?: string;
  customerId?: string;
  patientName?: string;
  patientAge?: number;
  patientGender?: string;
  patientPhone?: string;
  patientCnic?: string;
  patientWeight?: number;
  prescriptionDate?: string;
  diagnosis?: string;
  chiefComplaint?: string;
  imageUrls: string[];
  isRefillable: boolean;
  refillsAllowed: number;
  refillsUsed: number;
  refillFrequency?: RefillFrequency;
  nextRefillDate?: string;
  isInsuranceClaim: boolean;
  insuranceProvider?: string;
  insuranceApprovalCode?: string;
  insuranceAmount: number;
  verifiedById?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  dispensedById?: string;
  dispensedAt?: string;
  rejectionReason?: string;
  totalAmount: number;
  notes?: string;
  items: PrescriptionItem[];
  doctor?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const prescriptionsApi = {
  create: (data: Partial<Prescription> & { items: PrescriptionItem[] }) =>
    apiClient.post('/pharmacy/prescriptions', data).then(unwrap<Prescription>),
  list: (params?: { status?: string; customerId?: string; doctorId?: string; from?: string; to?: string; search?: string }) =>
    apiClient.get('/pharmacy/prescriptions', { params }).then(unwrap<Prescription[]>),
  summary: (params?: { from?: string; to?: string }) =>
    apiClient.get('/pharmacy/prescriptions/summary', { params }).then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/pharmacy/prescriptions/' + id).then(unwrap<Prescription>),
  verify: (id: string, notes?: string) =>
    apiClient.post('/pharmacy/prescriptions/' + id + '/verify', { notes }).then(unwrap<Prescription>),
  reject: (id: string, reason: string) =>
    apiClient.post('/pharmacy/prescriptions/' + id + '/reject', { reason }).then(unwrap<Prescription>),
  dispense: (id: string, items: any[], notes?: string) =>
    apiClient.post('/pharmacy/prescriptions/' + id + '/dispense', { items, notes }).then(unwrap<Prescription>),
  refill: (id: string) => apiClient.post('/pharmacy/prescriptions/' + id + '/refill').then(unwrap<Prescription>),
};
