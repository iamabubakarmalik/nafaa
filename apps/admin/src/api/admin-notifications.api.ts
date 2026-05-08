import { apiClient } from './client';

export type AdminNotificationType =
  | 'NEW_TENANT' | 'NEW_PAYMENT' | 'PAYMENT_APPROVED' | 'PAYMENT_REJECTED'
  | 'SUBSCRIPTION_EXPIRING' | 'SUBSCRIPTION_CANCELLED' | 'REFERRAL_CONVERTED'
  | 'TENANT_SUSPENDED' | 'HIGH_VALUE_PAYMENT' | 'SYSTEM_ALERT'
  | 'USER_ACTION' | 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';

export type AdminNotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  priority: AdminNotificationPriority;
  title: string;
  message: string;
  link?: string | null;
  metadata?: any;
  isRead: boolean;
  readAt?: string | null;
  tenantId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
}

export interface UnreadCount {
  total: number;
  urgent: number;
  high: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminNotificationsApi = {
  list: (params?: {
    isRead?: boolean;
    type?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) =>
    apiClient
      .get<{ data: { items: AdminNotification[]; meta: any } }>('/admin/notifications', {
        params,
      })
      .then(unwrap),
  unreadCount: () =>
    apiClient.get<{ data: UnreadCount }>('/admin/notifications/unread-count').then(unwrap),
  recent: (limit = 10) =>
    apiClient
      .get<{ data: AdminNotification[] }>('/admin/notifications/recent', { params: { limit } })
      .then(unwrap),
  markRead: (id: string) =>
    apiClient.patch<{ data: any }>(`/admin/notifications/${id}/read`).then(unwrap),
  markAllRead: () =>
    apiClient
      .post<{ data: { updatedCount: number } }>('/admin/notifications/mark-all-read')
      .then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: any }>(`/admin/notifications/${id}`).then(unwrap),
  clearRead: () =>
    apiClient
      .delete<{ data: { deletedCount: number } }>('/admin/notifications/clear/read')
      .then(unwrap),
  stats: () => apiClient.get<{ data: any }>('/admin/notifications/stats').then(unwrap),
};
