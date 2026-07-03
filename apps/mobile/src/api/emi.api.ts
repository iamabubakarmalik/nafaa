import { apiClient } from './client';
import type { PaymentMethod } from './sales.api';

export type EmiPlanStatus = 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED';
export type EmiInstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED';

export const EMI_STATUS_LABELS: Record<EmiPlanStatus, string> = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  DEFAULTED: 'Defaulted',
  CANCELLED: 'Cancelled',
};

export const EMI_STATUS_COLORS: Record<EmiPlanStatus, { bg: string; text: string; border: string }> = {
  ACTIVE: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  COMPLETED: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  DEFAULTED: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  CANCELLED: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
};

export const INSTALLMENT_STATUS_LABELS: Record<EmiInstallmentStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  WAIVED: 'Waived',
};

export const INSTALLMENT_STATUS_COLORS: Record<EmiInstallmentStatus, { bg: string; text: string; border: string }> = {
  PENDING: { bg: '#fefce8', text: '#b45309', border: '#fcd34d' },
  PAID: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  OVERDUE: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  WAIVED: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
};

export interface EmiInstallment {
  id: string;
  planId: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  paidDate?: string | null;
  paidAmount: number;
  status: EmiInstallmentStatus;
  notes?: string | null;
  createdAt: string;
}

export interface EmiPlan {
  id: string;
  tenantId: string;
  saleId?: string | null;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  planNumber: string;
  totalAmount: number;
  downPayment: number;
  financedAmount: number;
  installmentCount: number;
  installmentAmount: number;
  startDate: string;
  paidAmount: number;
  remainingAmount: number;
  status: EmiPlanStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  installments: EmiInstallment[];
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    cnic?: string | null;
    address?: string | null;
    balance?: number;
  } | null;
  overdueCount: number;
  overdueAmount: number;
  nextDueDate?: string | null;
  nextDueAmount: number;
  paidInstallmentCount: number;
}

export interface EmiStats {
  byStatus: { status: EmiPlanStatus; count: number }[];
  activeFinanced: number;
  activePaid: number;
  activeRemaining: number;
  overdueCount: number;
  overdueAmount: number;
  upcomingCount: number;
  upcomingAmount: number;
  collectedThisMonth: number;
  collectedCountThisMonth: number;
}

export interface CreateEmiPlanPayload {
  saleId?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  downPayment?: number;
  installmentCount: number;
  startDate: string;
  notes?: string;
}

export interface RecordPaymentPayload {
  amount: number;
  paymentMethod?: PaymentMethod;
  paidDate?: string;
  notes?: string;
}

const unwrap = <T = any>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data) as T;

export const emiApi = {
  list: (params?: {
    search?: string;
    status?: EmiPlanStatus;
    customerId?: string;
    filter?: 'ONLY_OVERDUE' | 'ONLY_UPCOMING';
    page?: number;
    limit?: number;
  }): Promise<{ items: EmiPlan[]; total: number; page: number; limit: number; totalPages: number }> =>
    apiClient.get('/emi-plans', { params }).then(unwrap) as any,

  stats: (): Promise<EmiStats> =>
    apiClient.get('/emi-plans/stats').then(unwrap) as any,

  getOne: (id: string): Promise<EmiPlan> =>
    apiClient.get(`/emi-plans/${id}`).then(unwrap) as any,

  create: (payload: CreateEmiPlanPayload): Promise<EmiPlan> =>
    apiClient.post('/emi-plans', payload).then(unwrap) as any,

  update: (id: string, payload: Partial<CreateEmiPlanPayload>): Promise<EmiPlan> =>
    apiClient.patch(`/emi-plans/${id}`, payload).then(unwrap) as any,

  recordPayment: (planId: string, installmentId: string, payload: RecordPaymentPayload): Promise<any> =>
    apiClient.post(`/emi-plans/${planId}/installments/${installmentId}/pay`, payload).then(unwrap) as any,

  waiveInstallment: (planId: string, installmentId: string, reason?: string): Promise<any> =>
    apiClient.patch(`/emi-plans/${planId}/installments/${installmentId}/waive`, { reason }).then(unwrap) as any,

  markDefaulted: (id: string, reason?: string): Promise<any> =>
    apiClient.patch(`/emi-plans/${id}/default`, { reason }).then(unwrap) as any,

  cancel: (id: string, reason?: string): Promise<any> =>
    apiClient.patch(`/emi-plans/${id}/cancel`, { reason }).then(unwrap) as any,

  remove: (id: string): Promise<any> =>
    apiClient.delete(`/emi-plans/${id}`).then(unwrap) as any,

  updateOverdueFlags: (): Promise<any> =>
    apiClient.post('/emi-plans/update-overdue-flags').then(unwrap) as any,
};
