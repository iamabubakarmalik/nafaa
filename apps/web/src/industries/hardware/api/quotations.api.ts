import { apiClient } from '@core/api/client';

export type QuotationStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED' | 'REVISED';

export interface QuotationItem {
  id?: string;
  productId?: string;
  variantId?: string;
  itemName: string;
  itemDescription?: string;
  brand?: string;
  specifications?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  discountPct: number;
  total: number;
  imageUrl?: string;
  displayOrder?: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  projectId?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  status: QuotationStatus;
  quotationDate: string;
  validUntil: string;
  sentAt?: string;
  viewedAt?: string;
  respondedAt?: string;
  convertedAt?: string;
  convertedSaleId?: string;
  subtotal: number;
  discount: number;
  discountPct: number;
  taxAmount: number;
  taxPct: number;
  deliveryCharges: number;
  laborCharges: number;
  otherCharges: number;
  total: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  warrantyTerms?: string;
  specialTerms?: string;
  validityDays: number;
  attachmentUrls: string[];
  internalNotes?: string;
  customerNotes?: string;
  revisionNumber: number;
  items: QuotationItem[];
  project?: { id: string; name: string; projectNumber: string } | null;
  /** The bill made from this quotation. */
  sale?: { id: string; saleNumber: string; status: string } | null;
  _count?: { items: number };
  createdAt: string;
  updatedAt: string;
}

export type QuotationTab = 'all' | 'open' | 'accepted' | 'converted' | 'expired' | 'rejected';

export interface QuotationQuery { tab?: QuotationTab; search?: string; from?: string; to?: string; projectId?: string; customerId?: string }

export interface QuotationPage {
  items: Quotation[];
  total: number;
  page: number;
  limit: number;
  counts: Record<QuotationTab, number>;
  values: { open: number; accepted: number; converted: number };
}

/** What the form sends; the server prices the lines. */
export interface QuotationInput {
  projectId?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  validityDays?: number;
  discount?: number;
  taxPct?: number;
  deliveryCharges?: number;
  laborCharges?: number;
  otherCharges?: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  customerNotes?: string;
  internalNotes?: string;
  items: Array<{ productId?: string; itemName: string; brand?: string; specifications?: string; quantity: number; unit?: string; unitPrice: number; discount?: number }>;
}

const unwrap = <T,>(res: { data: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const quotationsApi = {
  create: (data: QuotationInput) => apiClient.post('/hardware/quotations', data).then(unwrap<Quotation>),
  page: (params: QuotationQuery & { page: number; limit: number }) => apiClient.get('/hardware/quotations/page', { params }).then(unwrap<QuotationPage>),
  summary: () => apiClient.get('/hardware/quotations/summary').then(unwrap<{ totalQuotations: number; acceptedCount: number; acceptedValue: number; pendingCount: number; expiredCount: number }>),
  getOne: (id: string) => apiClient.get('/hardware/quotations/' + id).then(unwrap<Quotation>),
  updateStatus: (id: string, status: QuotationStatus, notes?: string, convertedSaleId?: string) =>
    apiClient.patch('/hardware/quotations/' + id + '/status', { status, notes, convertedSaleId }).then(unwrap<Quotation>),
  revise: (id: string, data: QuotationInput) => apiClient.post('/hardware/quotations/' + id + '/revise', data).then(unwrap<Quotation>),
  close: (id: string) => apiClient.delete('/hardware/quotations/' + id).then(unwrap<Quotation>),
};
