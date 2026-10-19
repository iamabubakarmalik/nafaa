import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

export type LayawayView = 'active' | 'overdue' | 'week' | 'completed' | 'cancelled' | 'all';

interface LayawayInstallment {
  id: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';
  paidAt?: string | null;
  paymentMethod?: string | null;
}

export interface LayawayPlan {
  id: string;
  planNumber: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  productId?: string | null;
  variantId?: string | null;
  productName?: string | null;
  totalAmount: number;
  depositAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installmentCount: number;
  installmentAmount: number;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | string;
  startDate: string;
  nextDueDate?: string | null;
  finalDueDate?: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DEFAULTED' | 'REFUNDED';
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  notes?: string | null;
  installments: LayawayInstallment[];
  bill?: { id: string; saleNumber: string } | null;
  createdAt: string;
}

interface LayawayInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  productId?: string;
  variantId?: string;
  totalAmount: number;
  depositAmount?: number;
  installmentCount: number;
  frequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  startDate?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
}

export interface LayawayPage {
  items: LayawayPlan[];
  total: number; page: number; pages: number;
  counts: Record<LayawayView, number>;
  totals: { remaining: number; paid: number; value: number };
}

const unwrap = <T,>(res: { data: { data: T } }): T => res.data.data;

export const layawayApi = {
  create: (data: LayawayInput) => apiClient.post('/garments/layaway', data).then(unwrap<LayawayPlan>),
  page: (q: { view?: LayawayView; page?: number; limit?: number; search?: string }) =>
    apiClient.get('/garments/layaway/page', { params: q }).then(unwrap<LayawayPage>),
  pay: (id: string, data: { amount: number; paymentMethod: PaymentMethod }) =>
    apiClient.post('/garments/layaway/' + id + '/pay', data).then(unwrap<LayawayPlan>),
  complete: (id: string) => apiClient.post('/garments/layaway/' + id + '/complete').then(unwrap<LayawayPlan>),
  cancel: (id: string, reason?: string) => apiClient.post('/garments/layaway/' + id + '/cancel', { reason }).then(unwrap<LayawayPlan>),
};
