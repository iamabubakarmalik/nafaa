import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

export type EmiPlanStatus = 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED';
export type EmiInstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED';
export type EmiView = 'active' | 'overdue' | 'upcoming' | 'done' | 'all';
export type EmiSort = 'new' | 'old' | 'due' | 'remaining';

export interface EmiInstallment {
  id: string;
  planId?: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  paidDate?: string | null;
  paidAmount: number;
  status: EmiInstallmentStatus;
  notes?: string | null;
}

export interface EmiPlan {
  id: string;
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
  installments: EmiInstallment[];
  overdueCount: number;
  overdueAmount: number;
  nextDueDate?: string | null;
  nextDueAmount: number;
  paidInstallmentCount: number;
}

/** One plan with its customer, bill and the khata entries made against it. */
interface EmiPlanDetail extends EmiPlan {
  customer: { id: string; name: string; phone?: string | null; cnic?: string | null; address?: string | null; balance: number } | null;
  sale: {
    id: string; saleNumber: string; status: string; soldAt: string; total: number; paidAmount: number; creditAmount: number;
    items: Array<{ id: string; quantity: number; price: number; total: number; note: string | null; product: { id: string; name: string } | null }>;
  } | null;
  payments: Array<{ id: string; type: string; amount: number; note: string | null; paymentMethod: PaymentMethod | null; createdAt: string }>;
}

interface EmiListPage {
  items: EmiPlan[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<Exclude<EmiView, 'all'>, number> & { all: number };
  totals: { financed: number; collected: number; remaining: number };
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

interface CreateEmiPlanPayload {
  saleId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  downPayment?: number;
  installmentCount: number;
  startDate: string;
  notes?: string;
}

export interface EmiListParams {
  search?: string;
  status?: EmiPlanStatus;
  customerId?: string;
  filter?: 'ONLY_OVERDUE' | 'ONLY_UPCOMING';
  view?: EmiView;
  sort?: EmiSort;
  page?: number;
  limit?: number;
}

const unwrap = (res: { data?: unknown }) => {
  const body = res?.data as { data?: unknown } | undefined;
  return body?.data !== undefined ? body.data : body;
};

export const emiApi = {
  list: (params?: EmiListParams) =>
    apiClient.get('/emi-plans', { params }).then(unwrap) as Promise<EmiListPage>,

  stats: () => apiClient.get('/emi-plans/stats').then(unwrap) as Promise<EmiStats>,

  getOne: (id: string) => apiClient.get(`/emi-plans/${id}`).then(unwrap) as Promise<EmiPlanDetail>,

  create: (payload: CreateEmiPlanPayload) => apiClient.post('/emi-plans', payload).then(unwrap) as Promise<EmiPlan>,

  update: (id: string, payload: { customerName?: string; customerPhone?: string; notes?: string; startDate?: string }) =>
    apiClient.patch(`/emi-plans/${id}`, payload).then(unwrap) as Promise<EmiPlan>,

  /** Any amount; the oldest open installments are settled first. */
  collect: (id: string, payload: { amount: number; paymentMethod?: PaymentMethod; notes?: string }) =>
    apiClient.post(`/emi-plans/${id}/collect`, payload).then(unwrap) as Promise<{ plan: EmiPlan; installments: number[] }>,

  waive: (planId: string, installmentId: string, reason: string) =>
    apiClient.patch(`/emi-plans/${planId}/installments/${installmentId}/waive`, { reason }).then(unwrap),

  markDefaulted: (id: string, reason?: string) => apiClient.patch(`/emi-plans/${id}/default`, { reason }).then(unwrap),

  cancel: (id: string, reason?: string) => apiClient.patch(`/emi-plans/${id}/cancel`, { reason }).then(unwrap),
};
