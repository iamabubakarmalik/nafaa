import { apiClient } from '@core/api/client';

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
  reference?: string | null;
  isVoid: boolean;
  voidedAt?: string | null;
  voidReason?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface FolioChargeInput {
  bookingId: string;
  chargeType: FolioChargeType;
  description: string;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  /** Catalog item served; its stock is taken now. */
  productId?: string;
  notes?: string;
}

const unwrap = <T,>(res: { data: unknown }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const folioApi = {
  addCharge: (data: FolioChargeInput) => apiClient.post('/hotel/folio', data).then(unwrap<FolioCharge>),
  byBooking: (bookingId: string) => apiClient.get('/hotel/folio/by-booking/' + bookingId).then(unwrap<FolioCharge[]>),
  void: (id: string, reason: string) => apiClient.post('/hotel/folio/' + id + '/void', { reason }).then(unwrap<FolioCharge>),
};
