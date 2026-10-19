import { apiClient } from '@core/api/client';
import type { ServiceJob } from './jobs.api';

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REVISED';
export type QuoteView = 'open' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted' | 'all';
export type QuoteLineKind = 'VISIT' | 'LABOUR' | 'PART' | 'OTHER';
export interface QuoteLine { kind: QuoteLineKind; description: string; quantity: number; unitPrice: number; total: number; productId?: string | null }

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  serviceId?: string | null;
  serviceName: string;
  problemDescription: string;
  siteVisitRequired: boolean;
  status: QuoteStatus;
  visitCharge: number;
  labourCharge: number;
  partsCharge: number;
  otherCharges: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  lines: QuoteLine[];
  validUntil?: string | null;
  termsConditions?: string | null;
  notes?: string | null;
  sentAt?: string | null;
  rejectionReason?: string | null;
  convertedJobId?: string | null;
  isExpired: boolean;
  createdAt: string;
}

export interface QuoteInput {
  customerId?: string; customerName?: string; customerPhone?: string; serviceId?: string; serviceName?: string; problemDescription?: string;
  siteVisitRequired?: boolean; lines?: Array<Omit<QuoteLine, 'total'>>; discount?: number; taxAmount?: number; validUntil?: string;
  termsConditions?: string; notes?: string;
}

const unwrap = <T,>(res: { data: unknown }): T => ((res.data as { data?: T })?.data ?? res.data) as T;
const base = '/services-biz/quotes';

export const quotesApi = {
  create: (data: QuoteInput) => apiClient.post(base, data).then(unwrap<Quote>),
  update: (id: string, data: QuoteInput) => apiClient.patch(`${base}/${id}`, data).then(unwrap<Quote>),
  list: (params?: { view?: QuoteView; search?: string; customerId?: string }) => apiClient.get(base, { params }).then(unwrap<Quote[]>),
  send: (id: string) => apiClient.post(`${base}/${id}/send`).then(unwrap<Quote>),
  accept: (id: string) => apiClient.post(`${base}/${id}/accept`).then(unwrap<Quote>),
  reject: (id: string, reason?: string) => apiClient.post(`${base}/${id}/reject`, { reason }).then(unwrap<Quote>),
  convert: (id: string, data: { scheduledStart?: string; primaryTechnicianId?: string } = {}) => apiClient.post(`${base}/${id}/convert`, data).then(unwrap<ServiceJob>),
};
