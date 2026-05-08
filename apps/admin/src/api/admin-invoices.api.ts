import { apiClient } from './client';

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';

export interface AdminInvoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  description?: string | null;
  dueDate: string;
  paidAt?: string | null;
  createdAt: string;
  tenant: { id: string; name: string; slug: string };
  subscription?: { plan: { name: string } } | null;
  payments: any[];
}

export interface CreateInvoicePayload {
  tenantId: string;
  amount: number;
  description: string;
  notes?: string;
  dueDate: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminInvoicesApi = {
  list: (params?: { status?: string; tenantId?: string; page?: number; limit?: number }) =>
    apiClient
      .get<{ data: { items: AdminInvoice[]; meta: any } }>('/admin/invoices', { params })
      .then(unwrap),
  create: (payload: CreateInvoicePayload) =>
    apiClient.post<{ data: AdminInvoice }>('/admin/invoices', payload).then(unwrap),
  markPaid: (id: string, notes?: string) =>
    apiClient.post<{ data: AdminInvoice }>(`/admin/invoices/${id}/mark-paid`, { notes }).then(unwrap),
  voidInvoice: (id: string) =>
    apiClient.post<{ data: AdminInvoice }>(`/admin/invoices/${id}/void`).then(unwrap),
};
