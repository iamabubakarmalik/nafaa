/** Bookings API (same endpoints and shapes as the web). Bookings need the server; the last loaded lists stay readable offline. */

import { apiClient } from '@/core/api/client';
import type { BookingStatus } from '@nafaa/core/bookings';

export type { BookingStatus };
export type BookingStatusFilter = BookingStatus | 'ACTIVE' | 'OVERDUE';
export type BookingPaymentType = 'ADVANCE' | 'ADDITIONAL' | 'REFUND';

export interface BookingItem {
  id: string; productId: string; variantId?: string | null; quantity: number; price: number; costPrice: number; lineDiscount: number; total: number;
  note?: string | null; internalNote?: string | null;
  product?: { id: string; name: string; unit: string; sku?: string | null } | null;
  variant?: { id: string; name: string; colorHex?: string | null } | null;
  imei?: { id: string; imei1: string } | null;
  roll?: { id: string; rollNumber: string } | null;
  cutPiece?: { id: string; pieceCode: string; widthFt: number; lengthFt: number } | null;
  cutSqft?: number | null;
}

export interface BookingPayment {
  id: string; type: BookingPaymentType; amount: number; paymentMethod: string; reference?: string | null; notes?: string | null; paidAt: string;
  createdBy?: { id: string; fullName: string } | null;
}

export interface ServiceCharge { label: string; amount: number }

export interface Booking {
  id: string; shopId?: string | null; customerId: string; bookingNumber: string; status: BookingStatus;
  subtotal: number; discount: number; serviceCharges: number; serviceChargesBreakdown?: ServiceCharge[] | null; total: number;
  totalPaid: number; totalRefunded: number; balanceDue: number; expectedPickupAt?: string | null; expiresAt?: string | null; convertedAt?: string | null;
  cancelledAt?: string | null; cancelReason?: string | null; paymentMethod: string; notes?: string | null; internalNotes?: string | null; createdAt: string;
  customer?: { id: string; name: string; phone?: string | null; balance?: number } | null;
  shop?: { id: string; name: string } | null;
  items?: BookingItem[]; payments?: BookingPayment[]; createdBy?: { id: string; fullName: string } | null;
  sale?: { id: string; saleNumber: string; total: number } | null;
}

export interface CreateBookingItem {
  productId: string; variantId?: string; quantity: number; price: number; costPrice?: number; lineDiscount?: number; note?: string; internalNote?: string;
}

export interface CreateBookingPayload {
  shopId: string; customerId: string; expectedPickupAt?: string; expiresAt?: string; discount?: number; paymentMethod?: string; initialAdvance?: number;
  serviceCharges?: ServiceCharge[]; notes?: string; internalNotes?: string; items: CreateBookingItem[];
}

export interface BookingQuery {
  from?: string; to?: string; pickupFrom?: string; pickupTo?: string; status?: BookingStatusFilter; staffId?: string; customerId?: string; search?: string;
  sort?: 'new' | 'pickup'; page?: number; limit?: number;
}

export interface BookingRecords { items: Booking[]; total: number; page: number; pages: number; totals: { value: number; paid: number; balance: number } }

export interface BookingOverview {
  today: { count: number; value: number };
  active: { count: number; value: number; held: number; balance: number };
  ready: { count: number; balance: number };
  overdue: { count: number; balance: number };
  pickupToday: number; upcoming: number;
  collected: { received: number; refunded: number; net: number; payments: number };
}

export interface BookingAnalytics {
  totals: { count: number; value: number; converted: number; convertedValue: number; cancelled: number; open: number; conversionRate: number | null; received: number; refunded: number; avgAdvancePct: number | null; avgDaysToSale: number | null };
  byStatus: Array<{ key: string; label: string; count: number; value: number }>;
  byProduct: Array<{ key: string; label: string; count: number; value: number; qty: number; unit: string }>;
  byStaff: Array<{ key: string; label: string; count: number; value: number }>;
}

export const bookingsApi = {
  create: (p: CreateBookingPayload) => apiClient.post<Booking>('/bookings', p).then((r) => r.data),
  records: (q: BookingQuery = {}) => apiClient.get<BookingRecords>('/bookings/records', { params: q }).then((r) => r.data),
  overview: (q: Pick<BookingQuery, 'from' | 'to'> = {}) => apiClient.get<BookingOverview>('/bookings/overview', { params: q }).then((r) => r.data),
  analytics: (q: Omit<BookingQuery, 'page' | 'limit' | 'status' | 'sort'> = {}) => apiClient.get<BookingAnalytics>('/bookings/analytics', { params: q }).then((r) => r.data),
  getOne: (id: string) => apiClient.get<Booking>(`/bookings/${id}`).then((r) => r.data),
  update: (id: string, p: { expectedPickupAt?: string | null; expiresAt?: string | null; notes?: string; internalNotes?: string }) => apiClient.patch<Booking>(`/bookings/${id}`, p).then((r) => r.data),
  markReady: (id: string, ready: boolean) => apiClient.post<Booking>(`/bookings/${id}/ready`, { ready }).then((r) => r.data),
  addPayment: (id: string, p: { amount: number; paymentMethod?: string; reference?: string; notes?: string }) => apiClient.post<Booking>(`/bookings/${id}/payment`, p).then((r) => r.data),
  cancel: (id: string, p: { reason?: string; refundAdvance: boolean; refundMethod?: string; managerPin?: string }) => apiClient.post<Booking>(`/bookings/${id}/cancel`, p).then((r) => r.data),
  convert: (id: string, p: { additionalPayment?: number; paymentMethod?: string; notes?: string }) =>
    apiClient.post<{ booking: Booking; sale: { id: string; saleNumber: string; total: number } }>(`/bookings/${id}/convert`, p).then((r) => r.data),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`/bookings/${id}`).then((r) => r.data),
};
