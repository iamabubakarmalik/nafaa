import { apiClient } from '@/api/client';
import type { PaymentMethod } from '@/api/sales.api';

export type EmiPlanStatus = 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED';
export type EmiInstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED';

export const EMI_STATUS_LABELS: Record<EmiPlanStatus, string> = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  DEFAULTED: 'Defaulted',
  CANCELLED: 'Cancelled',
};

export const EMI_STATUS_COLORS: Record<EmiPlanStatus, { bg: string; text: string; border: string }> = {
  ACTIVE: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  DEFAULTED: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
  CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
};

export const INSTALLMENT_STATUS_LABELS: Record<EmiInstallmentStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  WAIVED: 'Waived',
};

export const INSTALLMENT_STATUS_COLORS: Record<EmiInstallmentStatus, { bg: string; text: string; border: string }> = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
  OVERDUE: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' },
  WAIVED: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' },
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

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const emiApi = {
  list: (params?: {
    search?: string;
    status?: EmiPlanStatus;
    customerId?: string;
    filter?: 'ONLY_OVERDUE' | 'ONLY_UPCOMING';
    page?: number;
    limit?: number;
  }) =>
    apiClient.get('/emi-plans', { params }).then(unwrap) as Promise<{
      items: EmiPlan[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>,

  stats: () => apiClient.get('/emi-plans/stats').then(unwrap) as Promise<EmiStats>,

  getOne: (id: string) =>
    apiClient.get(`/emi-plans/${id}`).then(unwrap) as Promise<EmiPlan>,

  create: (payload: CreateEmiPlanPayload) =>
    apiClient.post('/emi-plans', payload).then(unwrap) as Promise<EmiPlan>,

  update: (id: string, payload: Partial<CreateEmiPlanPayload>) =>
    apiClient.patch(`/emi-plans/${id}`, payload).then(unwrap) as Promise<EmiPlan>,

  recordPayment: (planId: string, installmentId: string, payload: RecordPaymentPayload) =>
    apiClient
      .post(`/emi-plans/${planId}/installments/${installmentId}/pay`, payload)
      .then(unwrap),

  waiveInstallment: (planId: string, installmentId: string, reason?: string) =>
    apiClient
      .patch(`/emi-plans/${planId}/installments/${installmentId}/waive`, { reason })
      .then(unwrap),

  markDefaulted: (id: string, reason?: string) =>
    apiClient.patch(`/emi-plans/${id}/default`, { reason }).then(unwrap),

  cancel: (id: string, reason?: string) =>
    apiClient.patch(`/emi-plans/${id}/cancel`, { reason }).then(unwrap),

  remove: (id: string) =>
    apiClient.delete(`/emi-plans/${id}`).then(unwrap),

  updateOverdueFlags: () =>
    apiClient.post('/emi-plans/update-overdue-flags').then(unwrap),
};
