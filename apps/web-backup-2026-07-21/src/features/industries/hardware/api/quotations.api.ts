import { apiClient } from '@/api/client';

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
  project?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const quotationsApi = {
  create: (data: any) => apiClient.post('/hardware/quotations', data).then(unwrap<Quotation>),
  list: (params?: any) => apiClient.get('/hardware/quotations', { params }).then(unwrap<Quotation[]>),
  summary: () => apiClient.get('/hardware/quotations/summary').then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/hardware/quotations/' + id).then(unwrap<Quotation>),
  updateStatus: (id: string, status: string, notes?: string) => apiClient.patch('/hardware/quotations/' + id + '/status', { status, notes }).then(unwrap<Quotation>),
  revise: (id: string, data: any) => apiClient.post('/hardware/quotations/' + id + '/revise', data).then(unwrap<Quotation>),
  remove: (id: string) => apiClient.delete('/hardware/quotations/' + id).then(unwrap),
};
