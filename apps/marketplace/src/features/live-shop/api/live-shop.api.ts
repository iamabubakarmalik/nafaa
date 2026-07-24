import { marketplaceClient, unwrap } from '@/api/client';

export const liveShopApi = {
  list: (params: { shopId?: string; status?: string; limit?: number; offset?: number } = {}) =>
    marketplaceClient.get('/live-shops', { params }).then(unwrap<{
      items: any[]; total: number;
    }>),

  schedule: (limit = 20) =>
    marketplaceClient.get('/live-shops/schedule', { params: { limit } }).then(unwrap<any[]>),

  detail: (id: string) =>
    marketplaceClient.get(`/live-shops/${id}`).then(unwrap<any>),

  join: (id: string) =>
    marketplaceClient.post(`/live-shops/${id}/join`).then(unwrap),

  leave: (id: string) =>
    marketplaceClient.post(`/live-shops/${id}/leave`).then(unwrap),

  sendMessage: (id: string, message: string) =>
    marketplaceClient.post(`/live-shops/${id}/messages`, { message }).then(unwrap<any>),

  getMessages: (id: string, sinceMessageId?: string) =>
    marketplaceClient
      .get(`/live-shops/${id}/messages`, { params: { sinceMessageId } })
      .then(unwrap<any[]>),
};
