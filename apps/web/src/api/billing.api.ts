import { apiClient } from './client';
import { useAuthStore } from '@/store/auth.store';

export type PaymentProvider =
  | 'MANUAL_BANK' | 'JAZZCASH' | 'EASYPAISA' | 'STRIPE' | 'CASH';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
export type InvoiceStatus =
  | 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';

export interface BankInfo {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  jazzcash: string;
  easypaisa: string;
}

export interface Invoice {
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
  periodStart?: string | null;
  periodEnd?: string | null;
  createdAt: string;
  subscription?: { plan: { name: string; slug: string } } | null;
  payments?: Payment[];
}

export interface UploadFile {
  id: string;
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
}

export interface Payment {
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
  upload?: UploadFile | null;
  invoice?: { invoiceNumber: string } | null;
}

export interface SubmitPaymentPayload {
  invoiceId: string;
  amount: number;
  provider: PaymentProvider;
  bankName?: string;
  accountNumber?: string;
  transactionId?: string;
  payerName?: string;
  uploadId?: string;
  notes?: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const billingApi = {
  bankInfo: () =>
    apiClient.get<{ data: BankInfo }>('/billing/bank-info').then(unwrap),
  invoices: () =>
    apiClient.get<{ data: Invoice[] }>('/billing/invoices').then(unwrap),
  invoice: (id: string) =>
    apiClient.get<{ data: Invoice }>(`/billing/invoices/${id}`).then(unwrap),
  payments: () =>
    apiClient.get<{ data: Payment[] }>('/billing/payments').then(unwrap),
  submitPayment: (payload: SubmitPaymentPayload) =>
    apiClient.post<{ data: Payment }>('/billing/payments', payload).then(unwrap),

  uploadFile: async (file: File, purpose?: string): Promise<UploadFile> => {
    const formData = new FormData();
    formData.append('file', file);
    if (purpose) formData.append('purpose', purpose);

    const token = useAuthStore.getState().accessToken;
    const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000/api';
    const res = await fetch(`${apiUrl}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    const json = await res.json();
    return json.data;
  },
};
