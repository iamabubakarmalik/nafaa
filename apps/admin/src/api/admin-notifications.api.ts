import { apiClient } from './client';

export type AdminNotificationType =
  | 'NEW_TENANT' | 'NEW_PAYMENT' | 'PAYMENT_APPROVED' | 'PAYMENT_REJECTED'
  | 'SUBSCRIPTION_EXPIRING' | 'SUBSCRIPTION_CANCELLED' | 'REFERRAL_CONVERTED'
  | 'TENANT_SUSPENDED' | 'HIGH_VALUE_PAYMENT' | 'SYSTEM_ALERT'
  | 'USER_ACTION' | 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';

export type AdminNotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export const NOTIFY_CATEGORIES = ['shops', 'billing', 'commerce', 'social', 'system', 'marketing', 'support', 'general'] as const;
export type NotifyCategory = (typeof NOTIFY_CATEGORIES)[number];
export type NotifySeverity = 'info' | 'warning' | 'critical';

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  priority: AdminNotificationPriority;
  category: NotifyCategory;
  severity: NotifySeverity;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  readAt?: string | null;
  readBy?: { id: string; fullName: string } | null;
  tenantId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  /** How many times the same event happened (grouped). */
  occurrences: number;
  /** Latest occurrence. */
  lastAt: string;
  createdAt: string;
}

export interface UnreadCount {
  total: number;
  urgent: number;
  high: number;
}

export interface FeedItem extends AdminNotification {
  alert: { toast: boolean; sound: boolean; desktop: boolean };
}

export interface NotifyFeed {
  /** Cursor for the next poll. */
  now: string;
  unread: UnreadCount;
  items: FeedItem[];
}

export interface NotifyPrefs {
  categories: Record<NotifyCategory, boolean>;
  toast: boolean;
  sound: boolean;
  desktop: boolean;
  quietHours: { enabled: boolean; start: string; end: string };
  criticalInQuiet: boolean;
}

export interface NotifyStats {
  total: number;
  unread: number;
  today: number;
  byType: Array<{ type: string; _count: number }>;
  byPriority: Array<{ priority: AdminNotificationPriority; _count: number }>;
  byCategory: Array<{ category: string; _count: number }>;
  /** Categories this admin can see. */
  categories: NotifyCategory[];
}

export interface ListParams {
  isRead?: boolean;
  type?: string;
  priority?: string;
  severity?: NotifySeverity;
  category?: NotifyCategory;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminNotificationsApi = {
  list: (params?: ListParams) =>
    apiClient
      .get<{ data: { items: AdminNotification[]; meta: { page: number; limit: number; total: number; totalPages: number } } }>('/admin/notifications', { params })
      .then(unwrap),
  feed: (since?: string) =>
    apiClient.get<{ data: NotifyFeed }>('/admin/notifications/feed', { params: since ? { since } : undefined }).then(unwrap),
  unreadCount: () =>
    apiClient.get<{ data: UnreadCount }>('/admin/notifications/unread-count').then(unwrap),
  recent: (limit = 10) =>
    apiClient.get<{ data: AdminNotification[] }>('/admin/notifications/recent', { params: { limit } }).then(unwrap),
  markRead: (id: string) =>
    apiClient.patch<{ data: { id: string } }>(`/admin/notifications/${id}/read`).then(unwrap),
  markAllRead: (category?: NotifyCategory) =>
    apiClient
      .post<{ data: { updatedCount: number } }>('/admin/notifications/mark-all-read', undefined, { params: category ? { category } : undefined })
      .then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: unknown }>(`/admin/notifications/${id}`).then(unwrap),
  clearRead: () =>
    apiClient.delete<{ data: { deletedCount: number } }>('/admin/notifications/clear/read').then(unwrap),
  stats: () => apiClient.get<{ data: NotifyStats }>('/admin/notifications/stats').then(unwrap),
  prefs: () => apiClient.get<{ data: NotifyPrefs }>('/admin/notifications/preferences').then(unwrap),
  savePrefs: (body: Partial<NotifyPrefs>) =>
    apiClient.put<{ data: NotifyPrefs }>('/admin/notifications/preferences', body).then(unwrap),
};
