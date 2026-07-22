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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const qurbaniApi = {
  create: (data: any) => apiClient.post('/meat/qurbani', data).then(unwrap<QurbaniBooking>),
  list: (params?: any) => apiClient.get('/meat/qurbani', { params }).then(unwrap<QurbaniBooking[]>),
  getOne: (id: string) => apiClient.get('/meat/qurbani/' + id).then(unwrap<QurbaniBooking>),
  update: (id: string, data: any) => apiClient.patch('/meat/qurbani/' + id, data).then(unwrap<QurbaniBooking>),
  payment: (id: string, amount: number) => apiClient.post('/meat/qurbani/' + id + '/payment', { amount }).then(unwrap<QurbaniBooking>),
  updateStatus: (id: string, status: string, reason?: string) =>
    apiClient.post('/meat/qurbani/' + id + '/status', { status, reason }).then(unwrap<QurbaniBooking>),
};
