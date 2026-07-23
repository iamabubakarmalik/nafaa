import { marketplaceClient } from '@/api/marketplace-client';
const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export const shopsApi = {
  list: (params: any) => marketplaceClient.get('/shops', { params }).then(unwrap<any>),
  bySlug: (slug: string, params?: any) =>
    marketplaceClient.get(`/shops/by-slug/${slug}`, { params }).then(unwrap<any>),
  byId: (id: string, params?: any) =>
    marketplaceClient.get(`/shops/${id}`, { params }).then(unwrap<any>),
  products: (shopId: string, params: any) =>
    marketplaceClient.get(`/shops/${shopId}/products`, { params }).then(unwrap<any>),
  reviews: (shopId: string, params: any) =>
    marketplaceClient.get(`/shops/${shopId}/reviews`, { params }).then(unwrap<any>),
  follow: (shopId: string) => marketplaceClient.post(`/shops/${shopId}/follow`).then(unwrap),
  unfollow: (shopId: string) => marketplaceClient.delete(`/shops/${shopId}/follow`).then(unwrap),
  followed: () => marketplaceClient.get('/shops/followed/list').then(unwrap<any>),
};
