import { marketplaceClient } from '@api/marketplace-client';
const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export const liveShopApi = {
  live: () => marketplaceClient.get('/live-shops/live').then(unwrap<any>),
  upcoming: () => marketplaceClient.get('/live-shops/upcoming').then(unwrap<any>),
  detail: (id: string) => marketplaceClient.get(`/live-shops/${id}`).then(unwrap<any>),
  join: (id: string) => marketplaceClient.post(`/live-shops/${id}/join`).then(unwrap<any>),
  leave: (id: string) => marketplaceClient.post(`/live-shops/${id}/leave`).then(unwrap<any>),
  sendMessage: (id: string, message: string) =>
    marketplaceClient.post(`/live-shops/${id}/messages`, { message }).then(unwrap<any>),
  react: (id: string, reaction: string) =>
    marketplaceClient.post(`/live-shops/${id}/react`, { reaction }).then(unwrap<any>),
};
