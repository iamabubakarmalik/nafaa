import { apiClient } from '@core/api/client';
import type { ShoeGender } from './products.api';

export interface ShoeTryOnRequest {
  id: string;
  requestNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  productId?: string;
  productName: string;
  requestedSizes: string[];
  colorPreference?: string;
  gender?: ShoeGender;
  status: string;
  scheduledAt?: string;
  completedAt?: string;
  purchased: boolean;
  purchasedSize?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const shoeTryOnApi = {
  create: (data: Partial<ShoeTryOnRequest>) =>
    apiClient.post('/shoe/try-on', data).then(unwrap<ShoeTryOnRequest>),

  list: (params?: { status?: string; search?: string }) =>
    apiClient.get('/shoe/try-on', { params }).then(unwrap<ShoeTryOnRequest[]>),

  summary: () => apiClient.get('/shoe/try-on/summary').then(unwrap<any>),

  getOne: (id: string) =>
    apiClient.get('/shoe/try-on/' + id).then(unwrap<ShoeTryOnRequest>),

  complete: (id: string, data: { purchased: boolean; purchasedSize?: string }) =>
    apiClient.post('/shoe/try-on/' + id + '/complete', data).then(unwrap<ShoeTryOnRequest>),

  cancel: (id: string) =>
    apiClient.post('/shoe/try-on/' + id + '/cancel').then(unwrap<ShoeTryOnRequest>),

  remove: (id: string) =>
    apiClient.delete('/shoe/try-on/' + id).then(unwrap),
};
