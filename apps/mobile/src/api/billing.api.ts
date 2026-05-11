import { apiClient } from './client';

export type PaymentProvider =
  | 'MANUAL_BANK' | 'JAZZCASH' | 'EASYPAISA' | 'NAYAPAY' | 'STRIPE' | 'CASH';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
export type InvoiceStatus =
  | 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';

export interface BankInfo {
  holderName: string;
  bank: { name: string; accountTitle: string; accountNumber: string; iban: string };
  jazzcash: { number: string; title: string };
  easypaisa: { number: string; title: string };
  nayapay: { number: string; handle: string; title: string };
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
  createdAt: string;
  subscription?: { plan: { name: string; slug: string } } | null;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  amount: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  payerName?: string | null;
  transactionId?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  upload?: { id: string; url: string } | null;
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
  payerPhone?: string;
  uploadId?: string;
  notes?: string;
}

export const billingApi = {
  bankInfo: () => apiClient.get<BankInfo>('/billing/bank-info').then((r) => r.data),
  invoices: () => apiClient.get<Invoice[]>('/billing/invoices').then((r) => r.data),
  invoice: (id: string) => apiClient.get<Invoice>(`/billing/invoices/${id}`).then((r) => r.data),
  payments: () => apiClient.get<Payment[]>('/billing/payments').then((r) => r.data),
  submitPayment: (payload: SubmitPaymentPayload) =>
    apiClient.post<Payment>('/billing/payments', payload).then((r) => r.data),
};
