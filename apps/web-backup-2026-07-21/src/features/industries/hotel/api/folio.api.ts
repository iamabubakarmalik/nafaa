import { apiClient } from '@/api/client';

export type FolioChargeType = 'ROOM' | 'FOOD' | 'BEVERAGE' | 'LAUNDRY' | 'SPA' | 'MINIBAR'
  | 'TELEPHONE' | 'INTERNET' | 'PARKING' | 'TAX' | 'SERVICE_CHARGE' | 'DAMAGE'
  | 'MISCELLANEOUS' | 'DISCOUNT' | 'REFUND';

export interface FolioCharge {
  id: string;
  bookingId: string;
  chargeNumber: string;
  chargeDate: string;
  chargeType: FolioChargeType;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  reference?: string;
  isVoid: boolean;
  voidedAt?: string;
  voidReason?: string;
  notes?: string;
  createdAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const folioApi = {
  addCharge: (data: any) => apiClient.post('/hotel/folio', data).then(unwrap<FolioCharge>),
  byBooking: (bookingId: string) => apiClient.get('/hotel/folio/by-booking/' + bookingId).then(unwrap<FolioCharge[]>),
  void: (id: string, reason: string) => apiClient.post('/hotel/folio/' + id + '/void', { reason }).then(unwrap),
};
