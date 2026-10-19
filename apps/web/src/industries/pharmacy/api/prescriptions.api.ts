import { apiClient } from '@core/api/client';
import type { PaymentMethod, SalePaymentPart } from '@modules/sales/sales/api/sales.api';

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
  doctor?: { id: string; name: string; specialization?: string | null } | null;
  /** Latest bill made from this prescription (detail only). */
  sale?: { id: string; saleNumber: string; total: number; paidAmount: number; creditAmount: number; status: string; soldAt: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DispensePayload {
  items: { itemId: string; dispensedQty: number; unitPrice?: number; productId?: string; batchId?: string }[];
  paymentMethod?: PaymentMethod;
  paidAmount?: number;
  /** Split payment; replaces method and amount. */
  payments?: SalePaymentPart[];
  discount?: number;
  managerPin?: string;
  notes?: string;
}

export interface PrescriptionQuery {
  status?: PrescriptionStatus;
  doctorId?: string;
  customerId?: string;
  /** Business days, YYYY-MM-DD. */
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PrescriptionPage {
  items: Prescription[];
  total: number;
  page: number;
  limit: number;
  counts: Record<'all' | PrescriptionStatus, number>;
  dispensedValue: number;
}

export interface DispensedSale {
  id: string;
  saleNumber: string;
  total: number;
  creditAmount: number;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const prescriptionsApi = {
  create: (data: Partial<Prescription> & { items: PrescriptionItem[] }) =>
    apiClient.post('/pharmacy/prescriptions', data).then(unwrap<Prescription>),
  list: (params?: { status?: string; customerId?: string; doctorId?: string; from?: string; to?: string; search?: string }) =>
    apiClient.get('/pharmacy/prescriptions', { params }).then(unwrap<Prescription[]>),
  /** One page for the list screen, with counts per status over the same filter. */
  page: (params: PrescriptionQuery) =>
    apiClient.get('/pharmacy/prescriptions/page', { params }).then(unwrap<PrescriptionPage>),
  summary: (params?: { from?: string; to?: string }) =>
    apiClient.get('/pharmacy/prescriptions/summary', { params }).then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/pharmacy/prescriptions/' + id).then(unwrap<Prescription>),
  verify: (id: string, notes?: string) =>
    apiClient.post('/pharmacy/prescriptions/' + id + '/verify', { notes }).then(unwrap<Prescription>),
  reject: (id: string, reason: string) =>
    apiClient.post('/pharmacy/prescriptions/' + id + '/reject', { reason }).then(unwrap<Prescription>),
  /** Bills the handed-over medicines as a sale; the unpaid part goes on the patient's khata. */
  dispense: (id: string, body: DispensePayload) =>
    apiClient.post('/pharmacy/prescriptions/' + id + '/dispense', body).then(unwrap<Prescription & { sale?: DispensedSale }>),
  refill: (id: string) => apiClient.post('/pharmacy/prescriptions/' + id + '/refill').then(unwrap<Prescription>),
};
