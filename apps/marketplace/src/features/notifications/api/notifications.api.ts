import { marketplaceClient, unwrap } from '@/api/client';
import type { Notification } from '@/types';

export const notificationsApi = {
  list: (params: { type?: string; onlyUnread?: boolean; limit?: number; offset?: number }) =>
    marketplaceClient.get('/notifications', { params }).then(unwrap<{
      items: Notification[]; total: number; unreadCount: number;
      unreadByType: Record<string, number>;
    }>),

  unreadCount: () =>
    marketplaceClient.get('/notifications/unread-count').then(unwrap<{ count: number }>),

  markRead: (id: string) =>
    marketplaceClient.patch(`/notifications/${id}/read`).then(unwrap),

  markAllRead: (type?: string) =>
    marketplaceClient.post('/notifications/mark-all-read', { type }).then(unwrap),

  delete: (id: string) =>
    marketplaceClient.delete(`/notifications/${id}`).then(unwrap),

  clearAll: (opts?: { onlyRead?: boolean; type?: string }) =>
    marketplaceClient.delete('/notifications', { data: opts }).then(unwrap),

  preferences: () =>
    marketplaceClient.get('/notifications/preferences').then(unwrap<any>),

  updatePreferences: (prefs: any) =>
    marketplaceClient.patch('/notifications/preferences', prefs).then(unwrap),
};
