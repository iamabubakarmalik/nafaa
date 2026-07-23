import { marketplaceClient } from '@/api/marketplace-client';
const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export const ordersApi = {
  list: (params: any) => marketplaceClient.get('/orders', { params }).then(unwrap<any>),
  active: () => marketplaceClient.get('/orders/active').then(unwrap<any>),
  detail: (id: string) => marketplaceClient.get(`/orders/${id}`).then(unwrap<any>),
  track: (id: string) => marketplaceClient.get(`/orders/${id}/track`).then(unwrap<any>),
  cancel: (id: string, reason?: string) =>
    marketplaceClient.post(`/orders/${id}/cancel`, { reason }).then(unwrap),
  reorder: (id: string) => marketplaceClient.post(`/orders/${id}/reorder`).then(unwrap<any>),
  rate: (id: string, data: any) =>
    marketplaceClient.post(`/orders/${id}/rate`, data).then(unwrap),
  stats: () => marketplaceClient.get('/orders/stats').then(unwrap<any>),
};
