import { apiClient } from '@/api/client';

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
  standardItems: any;
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

export const subscriptionsApi = {
  create: (data: any) => apiClient.post('/meat/subscriptions', data).then(unwrap<Subscription>),
  list: (params?: any) => apiClient.get('/meat/subscriptions', { params }).then(unwrap<Subscription[]>),
  getOne: (id: string) => apiClient.get('/meat/subscriptions/' + id).then(unwrap<Subscription>),
  update: (id: string, data: any) => apiClient.patch('/meat/subscriptions/' + id, data).then(unwrap<Subscription>),
  pause: (id: string, reason?: string) => apiClient.post('/meat/subscriptions/' + id + '/pause', { reason }).then(unwrap<Subscription>),
  resume: (id: string) => apiClient.post('/meat/subscriptions/' + id + '/resume').then(unwrap<Subscription>),
  cancel: (id: string, reason?: string) => apiClient.post('/meat/subscriptions/' + id + '/cancel', { reason }).then(unwrap<Subscription>),
  deliver: (id: string, revenue: number) => apiClient.post('/meat/subscriptions/' + id + '/deliver', { revenue }).then(unwrap<Subscription>),
};
