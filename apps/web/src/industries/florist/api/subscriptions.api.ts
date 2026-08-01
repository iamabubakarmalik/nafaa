import { apiClient } from '@core/api/client';

export interface FloristSubscription {
  id: string;
  subscriptionNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  planName: string;
  frequency: string;
  bouquetType: string;
  pricePerDelivery: number;
  startDate: string;
  endDate?: string;
  nextDeliveryDate: string;
  completedDeliveries: number;
  status: string;
  preferences?: any;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const floristSubscriptionsApi = {
  create: (data: Partial<FloristSubscription>) =>
    apiClient.post('/florist/subscriptions', data).then(unwrap<FloristSubscription>),

  list: (params?: { status?: string; search?: string }) =>
    apiClient.get('/florist/subscriptions', { params }).then(unwrap<FloristSubscription[]>),

  summary: () => apiClient.get('/florist/subscriptions/summary').then(unwrap<any>),

  dueToday: () => apiClient.get('/florist/subscriptions/due-today').then(unwrap<FloristSubscription[]>),

  getOne: (id: string) => apiClient.get('/florist/subscriptions/' + id).then(unwrap<FloristSubscription>),

  markDelivered: (id: string) =>
    apiClient.post('/florist/subscriptions/' + id + '/mark-delivered').then(unwrap<FloristSubscription>),

  pause: (id: string) => apiClient.post('/florist/subscriptions/' + id + '/pause').then(unwrap<FloristSubscription>),
  resume: (id: string) => apiClient.post('/florist/subscriptions/' + id + '/resume').then(unwrap<FloristSubscription>),
  cancel: (id: string) => apiClient.post('/florist/subscriptions/' + id + '/cancel').then(unwrap<FloristSubscription>),
  remove: (id: string) => apiClient.delete('/florist/subscriptions/' + id).then(unwrap),
};
