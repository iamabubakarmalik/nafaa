import { marketplaceClient, unwrap } from '@/api/client';

export interface ScheduledOrder {
  id: string;
  orderNumber: string;
  scheduledFor: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXECUTED';
  items: any[];
  total: number;
  shopId: string;
  reminderSent: boolean;
  createdAt: string;
}

export const scheduledOrdersApi = {
  list: () => marketplaceClient.get('/scheduled-orders').then(unwrap<ScheduledOrder[]>),

  detail: (id: string) => marketplaceClient.get(`/scheduled-orders/${id}`).then(unwrap<ScheduledOrder>),

  create: (data: {
    cartId?: string;
    scheduledFor: string;
    addressId: string;
    paymentMethod: string;
    notes?: string;
  }) => marketplaceClient.post('/scheduled-orders', data).then(unwrap<ScheduledOrder>),

  cancel: (id: string, reason?: string) =>
    marketplaceClient.post(`/scheduled-orders/${id}/cancel`, { reason }).then(unwrap),

  reschedule: (id: string, newDate: string) =>
    marketplaceClient.post(`/scheduled-orders/${id}/reschedule`, { scheduledFor: newDate }).then(unwrap<ScheduledOrder>),
};
