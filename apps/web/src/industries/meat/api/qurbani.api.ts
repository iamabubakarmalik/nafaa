import { apiClient } from '@core/api/client';

export interface QurbaniBooking {
  id: string;
  bookingNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerCnic?: string;
  customerAddress?: string;
  occasion: string;
  animalType: string;
  animalPreference?: string;
  shareCount: number;
  shareNumber?: number;
  advanceAmount: number;
  finalPrice?: number;
  paidAmount: number;
  paymentStatus: string;
  slaughterDate?: string;
  slaughterDay?: number;
  wantsMeatDelivery: boolean;
  deliveryPreference: string;
  deliveryAddress?: string;
  needsCharityShare: boolean;
  charityShareKg?: number;
  charityRecipient?: string;
  cuttingStyle?: string;
  packagingCount?: number;
  wantsSkin: boolean;
  wantsOffal: boolean;
  specialInstructions?: string;
  liveAnimalId?: string;
  slaughterLogId?: string;
  status: string;
  cancelledAt?: string;
  cancellationReason?: string;
  bookedAt: string;
  updatedAt: string;
}

export interface QurbaniMoney {
  khataPaid?: number; legacyPaid?: number;
  bill?: { id: string; saleNumber: string; total: number; paidAmount: number; creditAmount: number; soldAt: string } | null;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;
const base = '/meat/qurbani/';

export const qurbaniApi = {
  create: (data: Record<string, unknown>) => apiClient.post('/meat/qurbani', data).then(unwrap<QurbaniBooking>),
  list: (params?: Record<string, string | undefined>) => apiClient.get('/meat/qurbani', { params }).then(unwrap<QurbaniBooking[]>),
  getOne: (id: string) => apiClient.get(base + id).then(unwrap<QurbaniBooking & QurbaniMoney>),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(base + id, data).then(unwrap<QurbaniBooking>),
  payment: (id: string, amount: number, paymentMethod: string) => apiClient.post(base + id + '/payment', { amount, paymentMethod }).then(unwrap<QurbaniBooking>),
  updateStatus: (id: string, status: string, reason?: string) => apiClient.post(base + id + '/status', { status, reason }).then(unwrap<QurbaniBooking>),
  /** Hand-over: one bill for the share; the advance on khata cancels it. */
  complete: (id: string, paidNow: number, paymentMethod: string) =>
    apiClient.post(base + id + '/complete', { paidNow, paymentMethod }).then(unwrap<{ booking: QurbaniBooking; sale: { id: string; saleNumber: string; total: number } }>),
  refund: (id: string, managerPin?: string) => apiClient.post(base + id + '/refund', { managerPin }).then(unwrap<QurbaniBooking>),
};
