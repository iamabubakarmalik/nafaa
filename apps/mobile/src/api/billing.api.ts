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

export interface UploadFile {
  id: string;
  url: string;
  filename?: string;
  originalName?: string;
  mimeType?: string;
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

export interface Payment {
  id: string;
  amount: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  bankName?: string | null;
  payerName?: string | null;
  transactionId?: string | null;
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
  payerPhone?: string;
  uploadId?: string;
  notes?: string;
}

const unwrap = <T = any>(res: any): T =>
  (res?.data?.data !== undefined ? res.data.data : res?.data) as T;

export const billingApi = {
  bankInfo: (): Promise<BankInfo> =>
    apiClient.get('/billing/bank-info').then(unwrap) as any,
  invoices: (): Promise<Invoice[]> =>
    apiClient.get('/billing/invoices').then(unwrap) as any,
  invoice: (id: string): Promise<Invoice> =>
    apiClient.get(`/billing/invoices/${id}`).then(unwrap) as any,
  payments: (): Promise<Payment[]> =>
    apiClient.get('/billing/payments').then(unwrap) as any,
  submitPayment: (payload: SubmitPaymentPayload): Promise<Payment> =>
    apiClient.post('/billing/payments', payload).then(unwrap) as any,
};
