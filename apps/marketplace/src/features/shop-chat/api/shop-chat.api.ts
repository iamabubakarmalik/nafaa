import { marketplaceClient, unwrap } from '@/api/client';

export const shopChatApi = {
  conversations: () =>
    marketplaceClient.get('/customer/conversations').then(unwrap<any[]>),

  getOrCreate: (shopId: string) =>
    marketplaceClient.post(`/customer/conversations/shop/${shopId}`).then(unwrap<any>),

  detail: (id: string) =>
    marketplaceClient.get(`/customer/conversations/${id}`).then(unwrap<any>),

  sendMessage: (id: string, message: string, attachments?: string[]) =>
    marketplaceClient
      .post(`/customer/conversations/${id}/messages`, { message, attachments })
      .then(unwrap<any>),

  markRead: (id: string) =>
    marketplaceClient.post(`/customer/conversations/${id}/read`).then(unwrap),
};
