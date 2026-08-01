import { apiClient } from '@core/api/client';

export interface ShoeExchange {
  id: string;
  exchangeNumber: string;
  originalSaleId?: string;
  originalInvoice?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  productId?: string;
  productName: string;
  originalSize: string;
  newSize: string;
  colorChanged: boolean;
  originalColor?: string;
  newColor?: string;
  reason: string;
  reasonCategory?: string;
  priceDifference: number;
  refundIssued: number;
  additionalCharged: number;
  photoUrls: string[];
  status: string;
  requestedAt: string;
  processedAt?: string;
  handledById?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const shoeExchangesApi = {
  create: (data: Partial<ShoeExchange>) =>
    apiClient.post('/shoe/exchanges', data).then(unwrap<ShoeExchange>),

  list: (params?: { status?: string; reasonCategory?: string; from?: string; to?: string; search?: string }) =>
    apiClient.get('/shoe/exchanges', { params }).then(unwrap<ShoeExchange[]>),

  summary: () => apiClient.get('/shoe/exchanges/summary').then(unwrap<any>),

  byReasonCategory: () =>
    apiClient.get('/shoe/exchanges/by-reason-category').then(unwrap<any[]>),

  getOne: (id: string) =>
    apiClient.get('/shoe/exchanges/' + id).then(unwrap<ShoeExchange>),

  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    apiClient.patch('/shoe/exchanges/' + id + '/status', data).then(unwrap<ShoeExchange>),

  remove: (id: string) =>
    apiClient.delete('/shoe/exchanges/' + id).then(unwrap),
};
