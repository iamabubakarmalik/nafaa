import { marketplaceClient, unwrap } from '@/api/client';

export const supportApi = {
  home: () => marketplaceClient.get('/support/home').then(unwrap<any>),

  listTickets: (params: any = {}) =>
    marketplaceClient.get('/support/tickets', { params }).then(unwrap<any>),

  createTicket: (data: {
    subject: string;
    category: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    orderId?: string;
    shopId?: string;
    message: string;
    attachments?: string[];
  }) => marketplaceClient.post('/support/tickets', data).then(unwrap<any>),

  detail: (id: string) => marketplaceClient.get(`/support/tickets/${id}`).then(unwrap<any>),

  reply: (id: string, message: string, attachments?: string[]) =>
    marketplaceClient.post(`/support/tickets/${id}/messages`, { message, attachments }).then(unwrap),

  close: (id: string, reason?: string) =>
    marketplaceClient.post(`/support/tickets/${id}/close`, { reason }).then(unwrap),

  rate: (id: string, rating: number, feedback?: string) =>
    marketplaceClient.post(`/support/tickets/${id}/rate`, { rating, feedback }).then(unwrap),

  reopen: (id: string, reason: string) =>
    marketplaceClient.post(`/support/tickets/${id}/reopen`, { reason }).then(unwrap),
};
