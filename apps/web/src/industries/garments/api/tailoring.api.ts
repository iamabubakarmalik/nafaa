import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

export type TailoringStatus = 'DRAFT' | 'QUOTED' | 'CONFIRMED' | 'FABRIC_PENDING'
  | 'CUTTING' | 'STITCHING' | 'EMBROIDERY' | 'QUALITY_CHECK' | 'READY'
  | 'DELIVERED' | 'CANCELLED' | 'ON_HOLD';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TailoringView = 'active' | 'today' | 'tomorrow' | 'late' | 'trial' | 'ready' | 'unpaid' | 'done' | 'all';

interface TailoringItem {
  id: string;
  productId?: string | null;
  variantId?: string | null;
  garmentName: string;
  categoryType?: string | null;
  quantity: number;
  fabricProductId?: string | null;
  fabricVariantId?: string | null;
  fabricName?: string | null;
  fabricMeters?: number | null;
  /** Whole line. */
  fabricCost: number;
  /** Whole line (per piece × quantity). */
  stitchingCost: number;
  embroideryCost: number;
  accessoryCost: number;
  total: number;
  size?: string | null;
  colorName?: string | null;
  designNotes?: string | null;
  measurementSnapshot?: Record<string, unknown> | null;
  referenceImageUrls?: string[];
}

interface TailoringPayment {
  id: string;
  amount: number;
  paymentMethod: string;
  reference?: string | null;
  notes?: string | null;
  paidAt: string;
  receivedByName?: string | null;
}

interface TailoringBill { id: string; saleNumber: string; total: number; paidAmount: number; creditAmount: number; createdAt: string }

export interface TailoringOrder {
  id: string;
  orderNumber: string;
  shopId?: string | null;
  customerId?: string | null;
  measurementProfileId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerNotes?: string | null;
  orderStatus: TailoringStatus;
  priority: Priority;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';
  collectionId?: string | null;
  tailorId?: string | null;
  tailorName?: string | null;
  orderDate: string;
  promisedDate?: string | null;
  readyDate?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  qualityCheckNotes?: string | null;
  subtotal: number;
  stitchingCharges: number;
  embroideryCharges: number;
  fabricCharges: number;
  accessoryCharges: number;
  discount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  designReferenceUrls: string[];
  designInstructions?: string | null;
  internalNotes?: string | null;
  items: TailoringItem[];
  payments?: TailoringPayment[];
  customer?: { id: string; name: string; phone?: string | null; balance: number } | null;
  measurementProfile?: Record<string, unknown> & { id: string; profileName: string; unit: 'INCH' | 'CM' } | null;
  bill?: TailoringBill | null;
  createdAt: string;
}

interface TailoringItemInput {
  garmentName: string;
  categoryType?: string;
  quantity: number;
  fabricProductId?: string;
  fabricVariantId?: string;
  fabricMeters?: number;
  fabricCost?: number;
  stitchingCost?: number;
  embroideryCost?: number;
  accessoryCost?: number;
  size?: string;
  colorName?: string;
  designNotes?: string;
  referenceImageUrls?: string[];
}

export interface TailoringInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerNotes?: string;
  measurementProfileId?: string;
  priority?: Priority;
  tailorId?: string;
  promisedDate?: string;
  discount?: number;
  designReferenceUrls?: string[];
  designInstructions?: string;
  internalNotes?: string;
  status?: 'DRAFT' | 'QUOTED' | 'CONFIRMED';
  advanceAmount?: number;
  advanceMethod?: PaymentMethod;
  items: TailoringItemInput[];
}

export interface TailoringQuery {
  view?: TailoringView; page?: number; limit?: number; search?: string; from?: string; to?: string;
  priority?: string; tailorId?: string; sort?: 'due' | 'recent' | 'amount';
}

export interface TailoringPage {
  items: TailoringOrder[];
  total: number; page: number; pages: number;
  counts: Record<TailoringView, number>;
  totals: { value: number; due: number; advance: number } | null;
}

interface TailoringSummary {
  open: { count: number; value: number; due: number; advance: number; today: number; late: number; trial: number; ready: number; urgent: number; unpaid: number };
  period: {
    from: string; to: string; booked: number; bookedValue: number; cancelled: number; delivered: number; deliveredValue: number;
    onTimePct: number | null; avgDays: number | null;
    garments: Array<{ key: string; pieces: number; value: number }>;
    tailors: Array<{ id: string; name: string; orders: number; value: number }>;
    byDay: Array<{ day: string; booked: number; delivered: number; value: number }>;
  };
}

const unwrap = <T,>(res: { data: { data: T } }): T => res.data.data;

export const tailoringApi = {
  create: (data: TailoringInput) => apiClient.post('/garments/tailoring', data).then(unwrap<TailoringOrder>),
  update: (id: string, data: Partial<Omit<TailoringInput, 'status' | 'advanceAmount' | 'advanceMethod'>>) =>
    apiClient.patch('/garments/tailoring/' + id, data).then(unwrap<TailoringOrder>),
  page: (q: TailoringQuery) => apiClient.get('/garments/tailoring/page', { params: q }).then(unwrap<TailoringPage>),
  summary: (params?: { from?: string; to?: string }) => apiClient.get('/garments/tailoring/summary', { params }).then(unwrap<TailoringSummary>),
  getOne: (id: string) => apiClient.get('/garments/tailoring/' + id).then(unwrap<TailoringOrder>),
  updateStatus: (id: string, status: TailoringStatus, opts?: { notes?: string; cancellationReason?: string; paidNow?: number; paymentMethod?: PaymentMethod }) =>
    apiClient.patch('/garments/tailoring/' + id + '/status', { status, ...opts }).then(unwrap<TailoringOrder>),
  addPayment: (id: string, data: { amount: number; paymentMethod: PaymentMethod; reference?: string; notes?: string }) =>
    apiClient.post('/garments/tailoring/' + id + '/payments', data).then(unwrap<TailoringOrder>),
};
