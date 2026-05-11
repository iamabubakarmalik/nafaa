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
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

export interface ListResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

function unwrapList(res: any): ListResponse<AppNotification> {
  const body = res?.data;
  // Backend ke saare possible shapes handle karein
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
  list: (params?: { unreadOnly?: boolean; page?: number; limit?: number }) =>
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

  markRead: (id: string) =>
    apiClient.patch(`/notifications/${id}/read`).then((r) => unwrapOne<AppNotification>(r)),

  markAllRead: () =>
    apiClient.post('/notifications/mark-all-read').then((r) => unwrapOne<{ message: string }>(r)),

  remove: (id: string) =>
    apiClient.delete(`/notifications/${id}`).then((r) => unwrapOne<{ message: string }>(r)),

  registerPushToken: (token: string) =>
    apiClient.post('/notifications/push-token', { token }).then((r) => unwrapOne<any>(r)),
};
