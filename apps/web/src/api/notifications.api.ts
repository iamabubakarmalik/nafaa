import { apiClient } from './client';

export type NotificationType =
  | 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  | 'LOW_STOCK' | 'NEW_SALE' | 'PAYMENT_RECEIVED'
  | 'REGISTER_OPENED' | 'REGISTER_CLOSED' | 'CREDIT_ALERT';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  readAt?: string | null;
  metadata?: any;
  createdAt: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const notificationsApi = {
  list: () => apiClient.get<{ data: NotificationItem[] }>('/notifications').then(unwrap),
  unreadCount: () =>
    apiClient.get<{ data: { count: number } }>('/notifications/unread-count').then(unwrap),
  markRead: (id: string) =>
    apiClient.patch<{ data: any }>(`/notifications/${id}/read`).then(unwrap),
  markAllRead: () =>
    apiClient.post<{ data: { message: string } }>('/notifications/mark-all-read').then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/notifications/${id}`).then(unwrap),
  checkLowStock: () =>
    apiClient.post<{ data: { message: string } }>('/notifications/check-low-stock').then(unwrap),
};
