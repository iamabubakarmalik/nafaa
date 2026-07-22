import { apiClient } from '@/api/client';

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceId?: string;
  serviceName: string;
  problemDescription: string;
  siteVisitRequired: boolean;
  siteVisitCompleted: boolean;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REVISED';
  labourCharge: number;
  partsCharge: number;
  visitCharge: number;
  otherCharges: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  lineItems?: any;
  validUntil?: string;
  termsConditions?: string;
  sentAt?: string;
  respondedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  convertedJobId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const quotesApi = {
  create: (data: any) => apiClient.post('/services-biz/quotes', data).then(unwrap<Quote>),
  list: (params?: any) => apiClient.get('/services-biz/quotes', { params }).then(unwrap<Quote[]>),
  getOne: (id: string) => apiClient.get('/services-biz/quotes/' + id).then(unwrap<Quote>),
  send: (id: string) => apiClient.post('/services-biz/quotes/' + id + '/send').then(unwrap<Quote>),
  accept: (id: string) => apiClient.post('/services-biz/quotes/' + id + '/accept').then(unwrap<Quote>),
  reject: (id: string, reason?: string) => apiClient.post('/services-biz/quotes/' + id + '/reject', { reason }).then(unwrap<Quote>),
  convert: (id: string) => apiClient.post('/services-biz/quotes/' + id + '/convert').then(unwrap<any>),
};
