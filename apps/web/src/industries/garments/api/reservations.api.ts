import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

type ReservationStatus = 'ACTIVE' | 'CONVERTED_TO_SALE' | 'EXPIRED' | 'CANCELLED';
export type ReservationView = 'active' | 'today' | 'expired' | 'sold' | 'cancelled' | 'all';

export interface Reservation {
  id: string;
  reservationNumber: string;
  customerId?: string | null;
  productId: string;
  variantId?: string | null;
  productName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  quantity: number;
  unitPrice: number;
  depositAmount: number;
  total: number;
  balance: number;
  status: ReservationStatus;
  reservedAt: string;
  expiresAt: string;
  convertedSaleId?: string | null;
  notes?: string | null;
  bill?: { id: string; saleNumber: string } | null;
}

interface ReservationInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  productId: string;
  variantId?: string;
  quantity?: number;
  unitPrice?: number;
  depositAmount?: number;
  paymentMethod?: PaymentMethod;
  holdDays?: number;
  notes?: string;
}

interface ReservationPage {
  items: Reservation[];
  total: number; page: number; pages: number;
  counts: Record<ReservationView, number>;
  totals: { pieces: number; value: number; deposits: number };
}

const unwrap = <T,>(res: { data: { data: T } }): T => res.data.data;

export const reservationsApi = {
  create: (data: ReservationInput) => apiClient.post('/garments/reservations', data).then(unwrap<Reservation>),
  page: (q: { view?: ReservationView; page?: number; limit?: number; search?: string }) =>
    apiClient.get('/garments/reservations/page', { params: q }).then(unwrap<ReservationPage>),
  sell: (id: string, data: { paidNow?: number; paymentMethod?: PaymentMethod }) =>
    apiClient.post('/garments/reservations/' + id + '/sell', data).then(unwrap<Reservation>),
  extend: (id: string, days: number) => apiClient.post('/garments/reservations/' + id + '/extend', { days }).then(unwrap<Reservation>),
  cancel: (id: string, reason?: string) => apiClient.post('/garments/reservations/' + id + '/cancel', { reason }).then(unwrap<Reservation>),
};
