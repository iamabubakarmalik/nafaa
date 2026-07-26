import { marketplaceClient, unwrap } from '@/api/client';

export const b2bApi = {
  register: (data: {
    buyerShopId: string;
    cnicNumber?: string;
    taxNumber?: string;
    businessProofUrls?: string[];
  }) => marketplaceClient.post('/b2b-wholesale/register', data).then(unwrap<any>),

  myAccount: (buyerShopId: string) =>
    marketplaceClient.get(`/b2b-wholesale/account/${buyerShopId}`).then(unwrap<any>),

  createOrder: (data: any) =>
    marketplaceClient.post('/b2b-wholesale/orders', data).then(unwrap<any>),

  listOrders: (params: any = {}) =>
    marketplaceClient.get('/b2b-wholesale/orders', { params }).then(unwrap<any[]>),

  recordPayment: (orderId: string, amount: number) =>
    marketplaceClient.post(`/b2b-wholesale/orders/${orderId}/payment`, { amount }).then(unwrap),
};
