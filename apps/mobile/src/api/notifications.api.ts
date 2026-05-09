import { apiClient } from './client';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ListResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean; page?: number; limit?: number }) =>
    apiClient.get<ListResponse<AppNotification>>('/notifications', { params }).then((r) => r.data),

  unreadCount: () =>
    apiClient.get<{ count: number }>('/notifications/unread-count').then((r) => r.data),

  markRead: (id: string) =>
    apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    apiClient.post('/notifications/mark-all-read').then((r) => r.data),

  registerPushToken: (token: string) =>
    apiClient.post('/notifications/push-token', { token }).then((r) => r.data),
};
