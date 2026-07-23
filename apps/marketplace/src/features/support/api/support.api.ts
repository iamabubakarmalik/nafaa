import { marketplaceClient } from '@api/marketplace-client';
const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export const supportApi = {
  listTickets: () => marketplaceClient.get('/support/tickets').then(unwrap<any>),
  createTicket: (data: any) => marketplaceClient.post('/support/tickets', data).then(unwrap<any>),
  ticketDetail: (id: string) => marketplaceClient.get(`/support/tickets/${id}`).then(unwrap<any>),
  reply: (id: string, message: string) =>
    marketplaceClient.post(`/support/tickets/${id}/messages`, { message }).then(unwrap<any>),
  close: (id: string) => marketplaceClient.post(`/support/tickets/${id}/close`).then(unwrap<any>),
};
