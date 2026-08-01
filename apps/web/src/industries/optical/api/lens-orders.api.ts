import { apiClient } from '@core/api/client';

export type LensOrderStatus =
  | 'ORDERED' | 'SENT_TO_LAB' | 'AT_LAB' | 'RECEIVED'
  | 'QC_PASSED' | 'FITTED' | 'READY' | 'DELIVERED' | 'CANCELLED';

export interface OpticalLensOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  prescriptionId?: string;
  frameProductId?: string;
  frameName: string;
  lensType: string;
  lensMaterial?: string;
  lensIndex?: string;
  lensCoatings: string[];
  rightSph?: number; rightCyl?: number; rightAxis?: number; rightAdd?: number;
  leftSph?: number; leftCyl?: number; leftAxis?: number; leftAdd?: number;
  pupilDistance?: number;
  labName?: string;
  labOrderRef?: string;
  expectedDate?: string;
  orderedAt: string;
  receivedAt?: string;
  fittedAt?: string;
  deliveredAt?: string;
  framePrice: number;
  lensPrice: number;
  fittingCharge: number;
  totalPrice: number;
  paidAmount: number;
  remainingAmount: number;
  status: LensOrderStatus;
  qcNotes?: string;
  fittingNotes?: string;
  notes?: string;
  prescription?: any;
  computed?: { daysWaiting: number; isOverdue: boolean };
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const lensOrdersApi = {
  create: (data: Partial<OpticalLensOrder>) =>
    apiClient.post('/optical/lens-orders', data).then(unwrap<OpticalLensOrder>),

  list: (params?: {
    status?: string; customerId?: string; labName?: string;
    pendingPayment?: boolean; overdue?: boolean;
    from?: string; to?: string; search?: string;
  }) => apiClient.get('/optical/lens-orders', { params }).then(unwrap<OpticalLensOrder[]>),

  summary: () => apiClient.get('/optical/lens-orders/summary').then(unwrap<any>),

  labPerformance: () => apiClient.get('/optical/lens-orders/lab-performance').then(unwrap<any[]>),

  getOne: (id: string) =>
    apiClient.get('/optical/lens-orders/' + id).then(unwrap<OpticalLensOrder>),

  sendToLab: (id: string, data: { labName: string; labOrderRef?: string; expectedDate?: string }) =>
    apiClient.post('/optical/lens-orders/' + id + '/send-to-lab', data).then(unwrap<OpticalLensOrder>),

  updateStatus: (id: string, data: { status: string; labOrderRef?: string; qcNotes?: string; fittingNotes?: string; notes?: string }) =>
    apiClient.patch('/optical/lens-orders/' + id + '/status', data).then(unwrap<OpticalLensOrder>),

  recordPayment: (id: string, data: { amount: number; paymentMethod?: string }) =>
    apiClient.post('/optical/lens-orders/' + id + '/payment', data).then(unwrap<OpticalLensOrder>),

  deliver: (id: string, data?: { fittingNotes?: string }) =>
    apiClient.post('/optical/lens-orders/' + id + '/deliver', data || {}).then(unwrap<OpticalLensOrder>),

  remove: (id: string) =>
    apiClient.delete('/optical/lens-orders/' + id).then(unwrap),
};
