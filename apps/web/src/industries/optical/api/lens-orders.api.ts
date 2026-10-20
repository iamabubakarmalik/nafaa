import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { Power } from '../lib/meta';
import type { OpticalPrescription } from './prescriptions.api';

export type LensOrderStatus = 'ORDERED' | 'SENT_TO_LAB' | 'AT_LAB' | 'RECEIVED' | 'QC_PASSED' | 'FITTED' | 'READY' | 'DELIVERED' | 'CANCELLED';

export interface OpticalLensOrder extends Power {
  id: string;
  orderNumber: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  prescriptionId?: string | null;
  frameProductId?: string | null;
  frameName: string;
  lensType: string;
  lensMaterial?: string | null;
  lensIndex?: string | null;
  lensCoatings: string[];
  labName?: string | null;
  labOrderRef?: string | null;
  expectedDate?: string | null;
  orderedAt: string;
  receivedAt?: string | null;
  fittedAt?: string | null;
  deliveredAt?: string | null;
  framePrice: number;
  lensPrice: number;
  fittingCharge: number;
  totalPrice: number;
  paidAmount: number;
  remainingAmount: number;
  status: LensOrderStatus;
  qcNotes?: string | null;
  fittingNotes?: string | null;
  notes?: string | null;
}

export interface LensOrderDetail extends OpticalLensOrder {
  prescription: OpticalPrescription | null;
  booking: { id: string; bookingNumber: string; status: string; totalPaid: number; balanceDue: number; total: number } | null;
  sale: { id: string; saleNumber: string; status: string; total: number } | null;
  computed: { daysWaiting: number; isOverdue: boolean; isRepair: boolean };
}

export type LensOrderView = 'open' | 'lab' | 'ready' | 'late' | 'unpaid' | 'repairs' | 'delivered' | 'cancelled' | 'all';
export interface LensOrderPage { items: OpticalLensOrder[]; total: number; page: number; limit: number; totalPages: number; totals: { value: number; paid: number; due: number } }
export interface LensOrderSummary {
  ordered: number; atLab: number; received: number; ready: number; delivered: number; overdue: number; repairsOpen: number; dueToday: number;
  totalBilled: number; totalCollected: number; totalReceivable: number; monthlyOrders: number; monthlyValue: number;
}
export interface LabRow { labName: string; totalOrders: number; lensRevenue: number; avgTurnaroundDays: number; lateDeliveries: number; onTimePct: number }

export type LensOrderInput = Power & {
  customerId?: string; customerName: string; customerPhone: string; prescriptionId?: string;
  frameProductId?: string; frameName: string; lensType: string; lensMaterial?: string; lensIndex?: string; lensCoatings?: string[];
  labName?: string; labOrderRef?: string; expectedDate?: string;
  framePrice?: number; lensPrice?: number; lensCost?: number; fittingCharge?: number; paidAmount?: number; paymentMethod?: PaymentMethod; notes?: string;
};

const unwrap = <T,>(res: { data: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const lensOrdersApi = {
  create: (data: LensOrderInput) => apiClient.post('/optical/lens-orders', data).then(unwrap<OpticalLensOrder>),
  page: (params: { view?: LensOrderView; page?: number; limit?: number; search?: string; from?: string; to?: string; customerId?: string }) =>
    apiClient.get('/optical/lens-orders/page', { params }).then(unwrap<LensOrderPage>),
  summary: () => apiClient.get('/optical/lens-orders/summary').then(unwrap<LensOrderSummary>),
  labPerformance: () => apiClient.get('/optical/lens-orders/lab-performance').then(unwrap<LabRow[]>),
  bySales: (ids: string[]) => apiClient.get('/optical/lens-orders/by-sales', { params: { ids: ids.join(',') } })
    .then(unwrap<Record<string, { id: string; number: string; repair: boolean; status: string }>>),
  getOne: (id: string) => apiClient.get('/optical/lens-orders/' + id).then(unwrap<LensOrderDetail>),
  sendToLab: (id: string, data: { labName: string; labOrderRef?: string; expectedDate?: string }) =>
    apiClient.post('/optical/lens-orders/' + id + '/send-to-lab', data).then(unwrap<OpticalLensOrder>),
  /** CANCELLED cancels the order's booking; refundAdvance gives the advance back. */
  updateStatus: (id: string, data: { status: LensOrderStatus; qcNotes?: string; fittingNotes?: string; notes?: string; refundAdvance?: boolean; refundMethod?: PaymentMethod; managerPin?: string }) =>
    apiClient.patch('/optical/lens-orders/' + id + '/status', data).then(unwrap<OpticalLensOrder>),
  recordPayment: (id: string, data: { amount: number; paymentMethod?: PaymentMethod }) =>
    apiClient.post('/optical/lens-orders/' + id + '/payment', data).then(unwrap<OpticalLensOrder>),
  deliver: (id: string, data: { fittingNotes?: string; payment?: number; paymentMethod?: PaymentMethod; onKhata?: boolean }) =>
    apiClient.post('/optical/lens-orders/' + id + '/deliver', data).then(unwrap<OpticalLensOrder>),
};
