/**
 * Notifications API (same endpoints as the web): the feed with group counts,
 * read / unread / delete for one or many, and the push token. Titles and
 * messages are stored as finished text; texts with values also keep their
 * template in `metadata.i18n`, so they show in the viewer's language.
 */

import { apiClient } from '@/core/api/client';
import { translateStoredText } from '@/core/i18n/serverMessage';

export type NotificationType =
  | 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'NEW_SALE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'PAYMENT_RECEIVED' | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED' | 'RETURN_PROCESSED' | 'NEW_CUSTOMER' | 'STOCK_TRANSFER' | 'EXPENSE_ADDED' | 'INVOICE_DUE'
  | 'SUBSCRIPTION_EXPIRING' | 'REGISTER_OPENED' | 'REGISTER_CLOSED' | 'CREDIT_ALERT' | 'SYSTEM';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export type NotificationGroup = 'summary' | 'sales' | 'online' | 'stock' | 'alerts';

export interface NotificationFeedFilters {
  group?: NotificationGroup;
  unreadOnly?: boolean;
  /** Business days "YYYY-MM-DD". */
  from?: string;
  to?: string;
  search?: string;
}

export interface NotificationFeed {
  items: AppNotification[];
  nextCursor: string | null;
  total: number;
  counts: { all: number; unread: number; groups: Record<NotificationGroup, number> };
}

function localize(n: AppNotification): AppNotification {
  const i18n = (n.metadata as { i18n?: { title?: { key?: unknown; params?: unknown }; message?: { key?: unknown; params?: unknown } } } | null)?.i18n;
  return { ...n, title: translateStoredText(n.title, i18n?.title), message: translateStoredText(n.message, i18n?.message) };
}

export const notificationsApi = {
  feed: (f: NotificationFeedFilters, cursor?: string, limit = 40): Promise<NotificationFeed> =>
    apiClient.get<NotificationFeed>('/notifications/feed', { params: { ...f, ...(cursor && { cursor }), limit } })
      .then((r) => ({ ...r.data, items: (r.data?.items ?? []).map(localize) })),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),
  markUnread: (id: string) => apiClient.patch(`/notifications/${id}/unread`).then((r) => r.data),
  bulk: (ids: string[], action: 'read' | 'unread' | 'delete') =>
    apiClient.post<{ count: number }>('/notifications/bulk', { ids, action }).then((r) => r.data),
  markAllRead: () => apiClient.post('/notifications/mark-all-read').then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/notifications/${id}`).then((r) => r.data),
  checkLowStock: () => apiClient.post('/notifications/check-low-stock').then((r) => r.data),
  registerPushToken: (token: string) => apiClient.post('/notifications/push-token', { token }).then((r) => r.data),
  unreadCount: () => apiClient.get<{ count?: number } | number>('/notifications/unread-count').then((r) => (typeof r.data === 'number' ? r.data : r.data?.count ?? 0)),
};
