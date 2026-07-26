import { marketplaceClient, unwrap } from '@/api/client';

export const subscriptionsApi = {
  list: () => marketplaceClient.get('/marketplace/subscriptions').then(unwrap<any[]>),

  detail: (id: string) => marketplaceClient.get(`/marketplace/subscriptions/${id}`).then(unwrap<any>),

  create: (data: {
    shopId: string;
    items: { productId: string; quantity: number }[];
    frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM_DAYS';
    customDays?: number;
    startDate: string;
    addressId: string;
    paymentMethod: string;
  }) => marketplaceClient.post('/marketplace/subscriptions', data).then(unwrap<any>),

  pause: (id: string, until?: string) =>
    marketplaceClient.post(`/marketplace/subscriptions/${id}/pause`, { until }).then(unwrap),

  resume: (id: string) => marketplaceClient.post(`/marketplace/subscriptions/${id}/resume`).then(unwrap),

  cancel: (id: string, reason?: string) =>
    marketplaceClient.post(`/marketplace/subscriptions/${id}/cancel`, { reason }).then(unwrap),

  skipNext: (id: string) => marketplaceClient.post(`/marketplace/subscriptions/${id}/skip-next`).then(unwrap),
};
