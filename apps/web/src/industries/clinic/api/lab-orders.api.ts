import { apiClient } from '@core/api/client';

export interface LabTest {
  id?: string;
  testName: string;
  testCode?: string;
  category?: string;
  price: number;
  result?: string;
  referenceRange?: string;
  unit?: string;
  isAbnormal?: boolean;
  isCritical?: boolean;
  performedBy?: string;
  reportedAt?: string;
  reportUrl?: string;
}

export interface LabOrder {
  id: string;
  orderNumber: string;
  encounterId?: string;
  patientId: string;
  doctorId: string;
  status: 'ORDERED' | 'SAMPLE_COLLECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REPORTED' | 'CANCELLED';
  labName?: string;
  urgency: string;
  orderedAt: string;
  sampleCollectedAt?: string;
  reportedAt?: string;
  totalCost: number;
  paidAmount: number;
  paymentStatus: string;
  notes?: string;
  reportUrls: string[];
  tests: LabTest[];
  createdAt: string;
  updatedAt: string;
}

export type LabOrderRow = LabOrder & {
  patient: { id: string; fullName: string; mrn: string; phonePrimary?: string | null; gender?: string | null; dateOfBirth?: string | null } | null;
  doctor: { id: string; fullName: string; title?: string | null } | null;
};

export interface LabPage {
  items: LabOrderRow[];
  total: number;
  page: number;
  limit: number;
  summary: { fees: number; billed: number; due: number; byStatus: Partial<Record<LabOrder['status'], number>> };
}

const unwrap = <T,>(res: { data?: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const labOrdersApi = {
  create: (data: { patientId?: string; doctorId?: string; encounterId?: string; labName?: string; urgency?: string; notes?: string; tests: Array<{ testName: string; price: number; category?: string }> }) =>
    apiClient.post('/clinic/lab-orders', data).then(unwrap<LabOrder>),
  list: (params?: Record<string, unknown>) => apiClient.get('/clinic/lab-orders', { params }).then(unwrap<LabOrderRow[]>),
  page: (params: Record<string, unknown>) => apiClient.get('/clinic/lab-orders', { params: { page: 1, ...params } }).then(unwrap<LabPage>),
  getOne: (id: string) => apiClient.get('/clinic/lab-orders/' + id).then(unwrap<LabOrder>),
  updateStatus: (id: string, status: LabOrder['status']) => apiClient.patch('/clinic/lab-orders/' + id + '/status', { status }).then(unwrap<LabOrder>),
  recordResult: (testId: string, data: { result: string; referenceRange?: string; unit?: string; isAbnormal?: boolean; isCritical?: boolean; performedBy?: string }) =>
    apiClient.patch('/clinic/lab-orders/tests/' + testId + '/result', data).then(unwrap<LabTest>),
  attachReport: (id: string, reportUrl: string) => apiClient.post('/clinic/lab-orders/' + id + '/attach-report', { reportUrl }).then(unwrap<LabOrder>),
  addPayment: (id: string, body: import('./appointments.api').FeePayment) =>
    apiClient.post('/clinic/lab-orders/' + id + '/payment', body).then(unwrap<LabOrder & { sale: import('./appointments.api').FeeSale }>),
};
