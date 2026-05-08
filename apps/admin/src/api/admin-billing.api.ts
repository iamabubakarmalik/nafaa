import { apiClient } from './client';

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
export type PaymentProvider = 'MANUAL_BANK' | 'JAZZCASH' | 'EASYPAISA' | 'STRIPE' | 'CASH';

export interface AdminPayment {
  id: string;
  amount: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  bankName?: string | null;
  transactionId?: string | null;
  payerName?: string | null;
  notes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  tenant: { id: string; name: string; slug: string };
  invoice?: {
    invoiceNumber: string;
    subscription?: { plan: { name: string } } | null;
  } | null;
  upload?: { id: string; url: string; filename: string; mimeType: string } | null;
}

export interface BillingStats {
  pending: number;
  approved: number;
  rejected: number;
  totalApproved: number;
  todayApproved: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminBillingApi = {
  stats: () =>
    apiClient.get<{ data: BillingStats }>('/admin/billing/stats').then(unwrap),
  list: (params?: { status?: PaymentStatus; search?: string; page?: number; limit?: number }) =>
    apiClient
      .get<{ data: { items: AdminPayment[]; meta: any } }>('/admin/billing/payments', { params })
      .then(unwrap),
  approve: (id: string, notes?: string) =>
    apiClient
      .post<{ data: any }>(`/admin/billing/payments/${id}/approve`, { notes })
      .then(unwrap),
  reject: (id: string, reason?: string) =>
    apiClient
      .post<{ data: any }>(`/admin/billing/payments/${id}/reject`, { reason })
      .then(unwrap),
};
