import { marketplaceClient } from '@api/marketplace-client';
const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export const bargainApi = {
  list: (params?: any) => marketplaceClient.get('/bargains', { params }).then(unwrap<any>),
  detail: (id: string) => marketplaceClient.get(`/bargains/${id}`).then(unwrap<any>),
  create: (data: { productId: string; offerPrice: number; quantity: number; message?: string }) =>
    marketplaceClient.post('/bargains', data).then(unwrap<any>),
  counter: (id: string, counterPrice: number, message?: string) =>
    marketplaceClient.post(`/bargains/${id}/counter`, { counterPrice, message }).then(unwrap<any>),
  accept: (id: string) => marketplaceClient.post(`/bargains/${id}/accept`).then(unwrap<any>),
  reject: (id: string, reason?: string) =>
    marketplaceClient.post(`/bargains/${id}/reject`, { reason }).then(unwrap<any>),
  sendMessage: (id: string, message: string) =>
    marketplaceClient.post(`/bargains/${id}/messages`, { message }).then(unwrap<any>),
  addToCart: (id: string) => marketplaceClient.post(`/bargains/${id}/add-to-cart`).then(unwrap<any>),
};
