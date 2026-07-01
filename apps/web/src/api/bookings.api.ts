import { apiClient } from './client';
import type { PaymentMethod, ServiceChargeItem } from './sales.api';

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

export interface BookingSummary {
  counts: {
    pending: number;
    advancePaid: number;
    ready: number;
    converted: number;
    cancelled: number;
  };
  totalActiveValue: number;
  totalAdvanceHeld: number;
  totalBalanceDue: number;
  expiringSoon: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const bookingsApi = {
  create: (payload: CreateBookingPayload) =>
    apiClient.post<{ data: Booking }>('/bookings', payload).then(unwrap),

  list: (params?: { status?: string; shopId?: string; customerId?: string; search?: string }) =>
    apiClient.get<{ data: Booking[] }>('/bookings', { params }).then(unwrap),

  summary: (shopId?: string) =>
    apiClient.get<{ data: BookingSummary }>('/bookings/summary', {
      params: shopId ? { shopId } : {},
    }).then(unwrap),

  getOne: (id: string) =>
    apiClient.get<{ data: Booking }>(`/bookings/${id}`).then(unwrap),

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
  }) =>
    apiClient.post<{ data: Booking }>(`/bookings/${id}/cancel`, payload).then(unwrap),

  convert: (id: string, payload: {
    additionalPayment?: number;
    paymentMethod?: PaymentMethod;
    notes?: string;
  }) =>
    apiClient.post<{ data: { booking: Booking; sale: any } }>(`/bookings/${id}/convert`, payload).then(unwrap),

  remove: (id: string) =>
    apiClient.delete<{ data: any }>(`/bookings/${id}`).then(unwrap),
};
