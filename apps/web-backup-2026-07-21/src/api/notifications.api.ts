import { apiClient } from './client';

export type NotificationType =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'NEW_SALE'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'RETURN_PROCESSED'
  | 'NEW_CUSTOMER'
  | 'STOCK_TRANSFER'
  | 'EXPENSE_ADDED'
  | 'INVOICE_DUE'
  | 'SUBSCRIPTION_EXPIRING'
  | 'REGISTER_OPENED'
  | 'REGISTER_CLOSED'
  | 'CREDIT_ALERT'
  | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

export interface NotificationListResponse {
  items: Notification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function unwrapList(res: any): NotificationListResponse {
  const body = res?.data;
  if (body?.data?.items) return body.data;
  if (body?.items) return body;
  if (Array.isArray(body?.data)) {
    return {
      items: body.data,
      meta: { page: 1, limit: body.data.length, total: body.data.length, totalPages: 1 },
    };
  }
  if (Array.isArray(body)) {
    return {
      items: body,
      meta: { page: 1, limit: body.length, total: body.length, totalPages: 1 },
    };
  }
  return { items: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
}

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

export const notificationsApi = {
  list: (params?: { limit?: number; page?: number; unreadOnly?: boolean }): Promise<NotificationListResponse> =>
    apiClient.get('/notifications', { params }).then(unwrapList),

  unreadCount: (): Promise<number> =>
    apiClient.get('/notifications/unread-count').then((r) => {
      const body = r?.data;
      if (typeof body?.data?.count === 'number') return body.data.count;
      if (typeof body?.count === 'number') return body.count;
      if (typeof body?.data === 'number') return body.data;
      if (typeof body === 'number') return body;
      return 0;
    }),

  markRead: (id: string): Promise<Notification> =>
    apiClient.patch(`/notifications/${id}/read`).then((r) => unwrapOne<Notification>(r)),

  markAllRead: (): Promise<{ message: string }> =>
    apiClient.post('/notifications/mark-all-read').then((r) => unwrapOne<{ message: string }>(r)),

  remove: (id: string): Promise<{ message: string }> =>
    apiClient.delete(`/notifications/${id}`).then((r) => unwrapOne<{ message: string }>(r)),

  checkLowStock: () =>
    apiClient.post('/notifications/check-low-stock').then((r) => unwrapOne<any>(r)),
};
