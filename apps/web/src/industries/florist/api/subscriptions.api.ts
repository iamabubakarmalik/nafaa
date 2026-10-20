import { apiClient } from '@core/api/client';

export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type SubscriptionFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export interface FloristSubscription {
  id: string;
  subscriptionNumber: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  planName: string;
  frequency: SubscriptionFrequency;
  bouquetType: string;
  pricePerDelivery: number;
  startDate: string;
  endDate?: string | null;
  nextDeliveryDate?: string | null;
  completedDeliveries: number;
  status: SubscriptionStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionInput {
  customerId?: string; customerName: string; customerPhone: string; deliveryAddress: string;
  planName: string; frequency: SubscriptionFrequency; bouquetType: string; pricePerDelivery: number;
  startDate: string; endDate?: string; notes?: string;
}

export interface SubscriptionPage {
  items: FloristSubscription[]; total: number; page: number; limit: number;
  /** Active subscriptions due today or earlier. */
  due: number;
  /** Money of one round of every active subscription. */
  perRound: number;
  counts: Partial<Record<SubscriptionStatus, number>>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- axios envelope varies by endpoint
const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const floristSubscriptionsApi = {
  paged: (params: { status?: string; search?: string; due?: boolean; page?: number; limit?: number }) =>
    apiClient.get('/florist/subscriptions/paged', { params }).then(unwrap<SubscriptionPage>),

  create: (data: SubscriptionInput) =>
    apiClient.post('/florist/subscriptions', data).then(unwrap<FloristSubscription>),

  update: (id: string, data: Partial<SubscriptionInput>) =>
    apiClient.patch('/florist/subscriptions/' + id, data).then(unwrap<FloristSubscription>),

  /** Bills this delivery to the customer's khata. */
  markDelivered: (id: string) =>
    apiClient.post('/florist/subscriptions/' + id + '/mark-delivered').then(unwrap<FloristSubscription & { sale: { id: string; saleNumber: string } | null }>),

  pause: (id: string) => apiClient.post('/florist/subscriptions/' + id + '/pause').then(unwrap<FloristSubscription>),
  resume: (id: string) => apiClient.post('/florist/subscriptions/' + id + '/resume').then(unwrap<FloristSubscription>),
  cancel: (id: string) => apiClient.post('/florist/subscriptions/' + id + '/cancel').then(unwrap<FloristSubscription>),
};
