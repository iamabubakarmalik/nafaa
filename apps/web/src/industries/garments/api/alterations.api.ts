import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { Priority } from './tailoring.api';

export type AlterationStatus = 'RECEIVED' | 'MEASUREMENT_TAKEN' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type AlterationView = 'active' | 'today' | 'late' | 'ready' | 'unpaid' | 'done' | 'all';

export interface AlterationTicket {
  id: string;
  ticketNumber: string;
  customerId?: string | null;
  saleId?: string | null;
  productId?: string | null;
  variantId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  garmentDescription: string;
  alterationType: string;
  alterationDetails?: string | null;
  status: AlterationStatus;
  priority: Priority;
  receivedAt: string;
  promisedDate?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  tailorId?: string | null;
  tailorName?: string | null;
  charges: number;
  paidAmount: number;
  paymentStatus: string;
  beforeImageUrls: string[];
  afterImageUrls: string[];
  notes?: string | null;
  bill?: { id: string; saleNumber: string; total: number } | null;
  fromSale?: { id: string; saleNumber: string; createdAt: string } | null;
}

export interface AlterationInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  saleId?: string;
  garmentDescription: string;
  alterationType: string;
  alterationDetails?: string;
  priority?: Priority;
  promisedDate?: string;
  tailorId?: string;
  charges?: number;
  beforeImageUrls?: string[];
  notes?: string;
  advanceAmount?: number;
  advanceMethod?: PaymentMethod;
}

export interface AlterationQuery { view?: AlterationView; page?: number; limit?: number; search?: string; from?: string; to?: string; priority?: string; type?: string }

interface AlterationPage {
  items: AlterationTicket[];
  total: number; page: number; pages: number;
  counts: Record<AlterationView, number>;
  totals: { value: number; due: number } | null;
}

interface AlterationSummary {
  open: { count: number; value: number; due: number; today: number; late: number; ready: number };
  period: {
    from: string; to: string; received: number; delivered: number; value: number; free: number; fromOwnSales: number; onTimePct: number | null;
    types: Array<{ type: string; count: number; value: number }>;
  };
}

const unwrap = <T,>(res: { data: { data: T } }): T => res.data.data;

export const alterationsApi = {
  create: (data: AlterationInput) => apiClient.post('/garments/alterations', data).then(unwrap<AlterationTicket>),
  update: (id: string, data: Partial<Omit<AlterationInput, 'advanceAmount' | 'advanceMethod'>>) =>
    apiClient.patch('/garments/alterations/' + id, data).then(unwrap<AlterationTicket>),
  page: (q: AlterationQuery) => apiClient.get('/garments/alterations/page', { params: q }).then(unwrap<AlterationPage>),
  summary: (params?: { from?: string; to?: string }) => apiClient.get('/garments/alterations/summary', { params }).then(unwrap<AlterationSummary>),
  updateStatus: (id: string, status: AlterationStatus, opts?: { paidNow?: number; paymentMethod?: PaymentMethod; reason?: string; afterImageUrls?: string[] }) =>
    apiClient.post('/garments/alterations/' + id + '/status', { status, ...opts }).then(unwrap<AlterationTicket>),
  payment: (id: string, amount: number, paymentMethod: PaymentMethod) =>
    apiClient.post('/garments/alterations/' + id + '/payment', { amount, paymentMethod }).then(unwrap<AlterationTicket>),
};
