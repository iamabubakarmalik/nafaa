import { marketplaceClient } from '@api/marketplace-client';
const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export const notificationsApi = {
  list: (params?: any) => marketplaceClient.get('/notifications', { params }).then(unwrap<any>),
  count: () => marketplaceClient.get('/notifications/count').then(unwrap<{ unread: number }>),
  markRead: (id: string) => marketplaceClient.post(`/notifications/${id}/read`).then(unwrap),
  markAllRead: () => marketplaceClient.post('/notifications/read-all').then(unwrap),
  delete: (id: string) => marketplaceClient.delete(`/notifications/${id}`).then(unwrap),
};
