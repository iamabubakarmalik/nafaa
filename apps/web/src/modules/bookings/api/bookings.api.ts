/**
 * Bookings API: create, the paged record with totals, KPI overview,
 * analytics, one booking, reschedule, ready mark, payments, cancel (with
 * refund), convert to sale and delete.
 */

import { apiClient } from '@core/api/client';
import type { PaymentMethod, ServiceChargeItem } from '@modules/sales/sales/api/sales.api';

export type BookingStatus =
  | 'PENDING'
  | 'ADVANCE_PAID'
  | 'READY_FOR_PICKUP'
  | 'CONVERTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type BookingPaymentType = 'ADVANCE' | 'ADDITIONAL' | 'REFUND';

export interface BookingItem {
  id: string;
  productId: string;
  variantId?: string | null;
  imeiId?: string | null;
  rollId?: string | null;
  cutPieceId?: string | null;
  quantity: number;
  price: number;
  costPrice: number;
  lineDiscount: number;
  total: number;
  useWholesale: boolean;
  cutWidthFt?: number | null;
  cutLengthFt?: number | null;
  cutLengthInch?: number | null;
  cutSqft?: number | null;
  note?: string | null;
  internalNote?: string | null;
  product?: {
    id: string;
    name: string;
    unit: string;
    sku?: string | null;
  } | null;
  variant?: {
    id: string;
    name: string;
    colorHex?: string | null;
    imageUrl?: string | null;
  } | null;
  imei?: {
    id: string;
    imei1: string;
  } | null;
  roll?: {
    id: string;
    rollNumber: string;
    widthFt: number;
    remainingLengthFt: number;
  } | null;
  cutPiece?: {
    id: string;
    pieceCode: string;
    widthFt: number;
    lengthFt: number;
    totalSqft: number;
  } | null;
}

export interface BookingPayment {
  id: string;
  bookingId: string;
  type: BookingPaymentType;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  paidAt: string;
  createdAt: string;
  createdBy?: { id: string; fullName: string } | null;
}

export interface Booking {
  id: string;
  tenantId: string;
  shopId?: string | null;
  customerId: string;
  bookingNumber: string;
  status: BookingStatus;
  subtotal: number;
  discount: number;
  serviceCharges: number;
  serviceChargesBreakdown?: ServiceChargeItem[] | null;
  total: number;
  totalPaid: number;
  totalRefunded: number;
  balanceDue: number;
  expectedPickupAt?: string | null;
  expiresAt?: string | null;
  convertedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;

  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    balance?: number;
  } | null;
  shop?: {
    id: string;
    name: string;
  } | null;
  items?: BookingItem[];
  payments?: BookingPayment[];
  createdBy?: { id: string; fullName: string } | null;
  sale?: {
    id: string;
    saleNumber: string;
    total: number;
  } | null;
  _count?: {
    items?: number;
    payments?: number;
  };
}

export interface CreateBookingItem {
  productId: string;
  variantId?: string;
  imeiId?: string;
  rollId?: string;
  cutPieceId?: string;
  quantity: number;
  price: number;
  costPrice?: number;
  lineDiscount?: number;
  useWholesale?: boolean;
  cutWidthFt?: number;
  cutLengthFt?: number;
  cutLengthInch?: number;
  cutSqft?: number;
  note?: string;
  internalNote?: string;
}

export interface CreateBookingPayload {
  shopId: string;
  customerId: string;
  expectedPickupAt?: string;
  expiresAt?: string;
  discount?: number;
  paymentMethod?: PaymentMethod;
  initialAdvance?: number;
  serviceCharges?: ServiceChargeItem[];
  notes?: string;
  internalNotes?: string;
  items: CreateBookingItem[];
}

/** ACTIVE = still open; OVERDUE = open and past its pickup day. */
export type BookingStatusFilter = BookingStatus | 'ACTIVE' | 'OVERDUE';

export interface BookingQuery {
  /** Booked on these business days. */
  from?: string;
  to?: string;
  /** Pickup on these business days. */
  pickupFrom?: string;
  pickupTo?: string;
  status?: BookingStatusFilter;
  staffId?: string;
  customerId?: string;
  search?: string;
  sort?: 'new' | 'pickup';
  page?: number;
  limit?: number;
}

export interface BookingRecords {
  items: Booking[];
  total: number;
  page: number;
  pages: number;
  totals: { value: number; paid: number; balance: number };
}

export interface BookingOverview {
  today: { count: number; value: number };
  active: { count: number; value: number; held: number; balance: number };
  ready: { count: number; balance: number };
  overdue: { count: number; balance: number };
  pickupToday: number;
  /** Open bookings with pickup in the next 7 days. */
  upcoming: number;
  /** Payments taken in the chosen period (today when none). */
  collected: { received: number; refunded: number; net: number; payments: number };
}

export interface BookingBucket { key: string; label: string; count: number; value: number; qty: number }

export interface BookingAnalytics {
  totals: {
    count: number; value: number; converted: number; convertedValue: number; cancelled: number; open: number;
    conversionRate: number | null; received: number; refunded: number; avgAdvancePct: number | null; avgDaysToSale: number | null;
  };
  trend: Array<{ key: string; count: number; value: number; converted: number; cancelled: number }>;
  byStatus: BookingBucket[];
  byStaff: BookingBucket[];
  byProduct: Array<BookingBucket & { unit: string }>;
  byMethod: BookingBucket[];
  pickupLoad: Array<{ key: string; count: number; balance: number }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const bookingsApi = {
  create: (payload: CreateBookingPayload) =>
    apiClient.post<{ data: Booking }>('/bookings', payload).then(unwrap),

  records: (q: BookingQuery = {}) =>
    apiClient.get<{ data: BookingRecords }>('/bookings/records', { params: q }).then(unwrap),

  overview: (q: Pick<BookingQuery, 'from' | 'to'> = {}) =>
    apiClient.get<{ data: BookingOverview }>('/bookings/overview', { params: q }).then(unwrap),

  analytics: (q: Omit<BookingQuery, 'page' | 'limit' | 'status' | 'sort'> = {}) =>
    apiClient.get<{ data: BookingAnalytics }>('/bookings/analytics', { params: q }).then(unwrap),

  getOne: (id: string) =>
    apiClient.get<{ data: Booking }>(`/bookings/${id}`).then(unwrap),

  update: (id: string, payload: { expectedPickupAt?: string | null; expiresAt?: string | null; notes?: string; internalNotes?: string }) =>
    apiClient.patch<{ data: Booking }>(`/bookings/${id}`, payload).then(unwrap),

  markReady: (id: string, ready: boolean) =>
    apiClient.post<{ data: Booking }>(`/bookings/${id}/ready`, { ready }).then(unwrap),

  addPayment: (id: string, payload: {
    amount: number;
    paymentMethod?: PaymentMethod;
    reference?: string;
    notes?: string;
  }) =>
    apiClient.post<{ data: Booking }>(`/bookings/${id}/payment`, payload).then(unwrap),

  cancel: (id: string, payload: {
    reason?: string;
    refundAdvance: boolean;
    refundMethod?: PaymentMethod;
    managerPin?: string;
  }) =>
    apiClient.post<{ data: Booking }>(`/bookings/${id}/cancel`, payload).then(unwrap),

  convert: (id: string, payload: {
    additionalPayment?: number;
    paymentMethod?: PaymentMethod;
    notes?: string;
  }) =>
    apiClient.post<{ data: { booking: Booking; sale: { id: string; saleNumber: string; total: number } } }>(`/bookings/${id}/convert`, payload).then(unwrap),

  remove: (id: string) =>
    apiClient.delete<{ data: { success: boolean } }>(`/bookings/${id}`).then(unwrap),
};
