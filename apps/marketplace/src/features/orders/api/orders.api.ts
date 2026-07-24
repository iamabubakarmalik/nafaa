import { marketplaceClient, unwrap } from '@/api/client';
import type { Order, OrderStatus } from '@/types';

export interface ListOrdersParams {
  status?: OrderStatus[];
  shopId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface RateOrderPayload {
  shopRating: number;
  riderRating?: number;
  qualityRating?: number;
  packagingRating?: number;
  deliveryRating?: number;
  valueRating?: number;
  title?: string;
  comment?: string;
  imageUrls?: string[];
  videoUrl?: string;
}

export const ordersApi = {
  list: (params: ListOrdersParams = {}) =>
    marketplaceClient
      .get('/orders', {
        params: {
          ...params,
          status: params.status?.join(','),
        },
      })
      .then(unwrap<{
        items: Order[];
        total: number;
        counts: { all: number; active: number; delivered: number; cancelled: number; refunded: number };
      }>),

  active: () =>
    marketplaceClient.get('/orders/active').then(unwrap<{ items: Order[]; count: number }>),

  stats: () =>
    marketplaceClient.get('/orders/stats').then(unwrap<{
      totalOrders: number;
      deliveredOrders: number;
      cancelledOrders: number;
      totalSpent: number;
      favouriteShops: Array<{ shopId: string; orderCount: number }>;
    }>),

  detail: (orderId: string) =>
    marketplaceClient.get(`/orders/${orderId}`).then(unwrap<Order>),

  track: (orderId: string) =>
    marketplaceClient.get(`/orders/${orderId}/track`).then(unwrap<{
      order: Order;
      timeline: Array<{
        status: OrderStatus;
        reached: boolean;
        reachedAt: string | null;
        isCurrent: boolean;
      }>;
      currentStatus: OrderStatus;
      isActive: boolean;
    }>),

  cancel: (orderId: string, reason?: string) =>
    marketplaceClient.post(`/orders/${orderId}/cancel`, { reason }).then(unwrap),

  reorder: (orderId: string) =>
    marketplaceClient.post(`/orders/${orderId}/reorder`).then(unwrap<{
      addedCount: number;
      skippedCount: number;
      skippedItems: string[];
      message: string;
    }>),

  rate: (orderId: string, payload: RateOrderPayload) =>
    marketplaceClient.post(`/orders/${orderId}/rate`, payload).then(unwrap),
};
