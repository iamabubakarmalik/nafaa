import { apiClient } from '@/api/client';

export interface Reservation {
  id: string;
  reservationNumber: string;
  customerId?: string;
  productId: string;
  variantId?: string;
  customerName?: string;
  customerPhone?: string;
  quantity: number;
  unitPrice: number;
  depositAmount: number;
  status: 'ACTIVE' | 'CONVERTED_TO_SALE' | 'EXPIRED' | 'CANCELLED';
  reservedAt: string;
  expiresAt: string;
  convertedSaleId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const reservationsApi = {
  create: (data: Partial<Reservation>) =>
    apiClient.post('/garments/reservations', data).then(unwrap<Reservation>),
  list: (params?: any) =>
    apiClient.get('/garments/reservations', { params }).then(unwrap<Reservation[]>),
  cancel: (id: string, reason?: string) =>
    apiClient.post('/garments/reservations/' + id + '/cancel', { reason }).then(unwrap<Reservation>),
  convert: (id: string, saleId: string) =>
    apiClient.post('/garments/reservations/' + id + '/convert', { saleId }).then(unwrap<Reservation>),
  expireOld: () =>
    apiClient.post('/garments/reservations/expire-old').then(unwrap),
};
