import { marketplaceClient } from '@/api/marketplace-client';
const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export const cartApi = {
  get: () => marketplaceClient.get('/cart').then(unwrap<any>),
  count: () => marketplaceClient.get('/cart/count').then(unwrap<{ count: number }>),
  add: (data: any) => marketplaceClient.post('/cart/add', data).then(unwrap<any>),
  updateLine: (lineId: string, data: any) =>
    marketplaceClient.patch(`/cart/lines/${lineId}`, data).then(unwrap<any>),
  removeLine: (lineId: string) =>
    marketplaceClient.delete(`/cart/lines/${lineId}`).then(unwrap<any>),
  clear: () => marketplaceClient.delete('/cart').then(unwrap<any>),
  moveToWishlist: (lineId: string) =>
    marketplaceClient.post(`/cart/lines/${lineId}/move-to-wishlist`).then(unwrap<any>),
};
