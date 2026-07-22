import { apiClient } from '@/api/client';

export interface LayawayInstallment {
  id: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';
  paidAt?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

export interface LayawayPlan {
  id: string;
  planNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  productId?: string;
  variantId?: string;
  tailoringOrderId?: string;
  totalAmount: number;
  depositAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installmentCount: number;
  installmentAmount: number;
  frequency: string;
  startDate: string;
  nextDueDate?: string;
  finalDueDate?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DEFAULTED' | 'REFUNDED';
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  notes?: string;
  installments: LayawayInstallment[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const layawayApi = {
  create: (data: any) =>
    apiClient.post('/garments/layaway', data).then(unwrap<LayawayPlan>),
  list: (params?: { status?: string; customerId?: string }) =>
    apiClient.get('/garments/layaway', { params }).then(unwrap<LayawayPlan[]>),
  getOne: (id: string) =>
    apiClient.get('/garments/layaway/' + id).then(unwrap<LayawayPlan>),
  pay: (planId: string, installmentId: string, data: { amount: number; paymentMethod: string; reference?: string; notes?: string }) =>
    apiClient.post('/garments/layaway/' + planId + '/installments/' + installmentId + '/pay', data).then(unwrap<LayawayPlan>),
  cancel: (id: string, reason?: string) =>
    apiClient.post('/garments/layaway/' + id + '/cancel', { reason }).then(unwrap<LayawayPlan>),
};
