import { apiClient } from '@core/api/client';

export type SubscriptionFreq = 'DAILY' | 'ALTERNATE_DAY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';

export interface Subscription {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  status: SubscriptionStatus;
  frequency: SubscriptionFreq;
  customDays: number[];
  startDate: string;
  endDate?: string;
  nextDeliveryDate?: string;
  lastDeliveryDate?: string;
  standardItems: Array<{ productId: string; productName: string; kg: number }>;
  totalMonthlyKg: number;
  discountPct: number;
  deliveryAddress: string;
  deliveryTimeSlot?: string;
  contactPerson?: string;
  contactPhone?: string;
  billingCycle: string;
  monthlyEstimate: number;
  autoRenew: boolean;
  pausedAt?: string;
  pauseReason?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  totalDeliveries: number;
  totalRevenue: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;
const base = '/meat/subscriptions/';

export const subscriptionsApi = {
  create: (data: Record<string, unknown>) => apiClient.post('/meat/subscriptions', data).then(unwrap<Subscription>),
  list: (params?: Record<string, string | undefined>) => apiClient.get('/meat/subscriptions', { params }).then(unwrap<Subscription[]>),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(base + id, data).then(unwrap<Subscription>),
  pause: (id: string, reason?: string) => apiClient.post(base + id + '/pause', { reason }).then(unwrap<Subscription>),
  resume: (id: string) => apiClient.post(base + id + '/resume').then(unwrap<Subscription>),
  cancel: (id: string, reason?: string) => apiClient.post(base + id + '/cancel', { reason }).then(unwrap<Subscription>),
  /** Makes today's delivery as a weight order at today's rates. */
  deliver: (id: string) => apiClient.post(base + id + '/deliver').then(unwrap<{ id: string; orderNumber: string; total: number }>),
};
