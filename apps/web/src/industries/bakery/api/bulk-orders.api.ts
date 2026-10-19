import { apiClient } from '@core/api/client';
import type { OrderBill, OrderPayOptions } from './cake-orders.api';

export interface BulkOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  organizationName: string;
  contactPerson?: string;
  contactPhone: string;
  contactEmail?: string;
  orderType: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  totalGuests?: number;
  totalItems: number;
  items: any;
  quotedPrice: number;
  finalPrice?: number;
  advancePaid: number;
  /** Single-order reads only: part of the money received that is held on the customer's khata. */
  khataPaid?: number;
  paidAmount: number;
  paymentStatus: string;
  status: string;
  requiresDelivery: boolean;
  deliveryAddress?: string;
  requiresSetup: boolean;
  setupTime?: string;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

export type BulkView = 'active' | 'week' | 'late' | 'unpaid' | 'noAdvance' | 'done' | 'all';

export interface BulkQuery {
  view?: BulkView;
  search?: string;
  from?: string;
  to?: string;
  orderType?: string;
  sort?: 'due' | 'recent' | 'amount';
  page?: number;
  limit?: number;
}

export interface BulkPage {
  items: BulkOrder[];
  total: number;
  page: number;
  pages: number;
  counts: Record<BulkView, number>;
  totals: { value: number; due: number } | null;
}

export interface BulkSummary {
  period: { from: string; to: string };
  open: { count: number; value: number; due: number; week: number; late: number; noAdvance: number };
  totals: { orders: number; value: number; collected: number; delivered: number; avgOrder: number; guests: number; cancelled: number };
  byMonth: Array<{ key: string; count: number; value: number; guests: number }>;
  byType: Array<{ key: string; count: number; value: number; guests: number }>;
  byStatus: Array<{ key: string; count: number; value: number; guests: number }>;
  topItems: Array<{ key: string; qty: number; value: number }>;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const bulkOrdersApi = {
  create: (data: any) => apiClient.post('/bakery/bulk-orders', data).then(unwrap<BulkOrder>),
  /** `open: true` returns every order still to deliver. */
  list: (params?: any) => apiClient.get('/bakery/bulk-orders', { params }).then(unwrap<BulkOrder[]>),
  page: (q: BulkQuery) => apiClient.get('/bakery/bulk-orders/page', { params: q }).then(unwrap<BulkPage>),
  summary: (range?: { from?: string; to?: string }) => apiClient.get('/bakery/bulk-orders/summary', { params: range }).then(unwrap<BulkSummary>),
  bill: (id: string) => apiClient.get('/bakery/bulk-orders/' + id + '/bill').then(unwrap<OrderBill | null>),
  getOne: (id: string) => apiClient.get('/bakery/bulk-orders/' + id).then(unwrap<BulkOrder>),
  update: (id: string, data: any) => apiClient.patch('/bakery/bulk-orders/' + id, data).then(unwrap<BulkOrder>),
  updateStatus: (id: string, status: string) => apiClient.patch('/bakery/bulk-orders/' + id + '/status', { status }).then(unwrap<BulkOrder>),
  /** Cash refund of a cancelled order's khata advance; the order becomes REFUNDED. */
  refund: (id: string, managerPin?: string) => apiClient.post('/bakery/bulk-orders/' + id + '/refund', { managerPin }).then(unwrap<BulkOrder>),
  /** Same rules as the cake order payment: khata advance unless `withBill`. */
  payment: (id: string, amount: number, expectedPaid?: number, opts?: OrderPayOptions) =>
    apiClient.post('/bakery/bulk-orders/' + id + '/payment', { amount, expectedPaid, ...opts }).then(unwrap<BulkOrder>),
};
