import { apiClient } from '@/api/client';

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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const labOrdersApi = {
  create: (data: any) => apiClient.post('/clinic/lab-orders', data).then(unwrap<LabOrder>),
  list: (params?: any) => apiClient.get('/clinic/lab-orders', { params }).then(unwrap<LabOrder[]>),
  getOne: (id: string) => apiClient.get('/clinic/lab-orders/' + id).then(unwrap<LabOrder>),
  updateStatus: (id: string, status: string) => apiClient.patch('/clinic/lab-orders/' + id + '/status', { status }).then(unwrap<LabOrder>),
  recordResult: (testId: string, data: any) => apiClient.patch('/clinic/lab-orders/tests/' + testId + '/result', data).then(unwrap<LabTest>),
  attachReport: (id: string, reportUrl: string) => apiClient.post('/clinic/lab-orders/' + id + '/attach-report', { reportUrl }).then(unwrap<LabOrder>),
};
