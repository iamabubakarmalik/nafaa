import { marketplaceClient } from '@/api/marketplace-client';
const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export const wishlistApi = {
  list: (params?: any) => marketplaceClient.get('/wishlist', { params }).then(unwrap<any>),
  count: () => marketplaceClient.get('/wishlist/count').then(unwrap<{ count: number }>),
  add: (productId: string) => marketplaceClient.post('/wishlist', { productId }).then(unwrap),
  remove: (productId: string) =>
    marketplaceClient.delete(`/wishlist/${productId}`).then(unwrap),
  toggle: (productId: string) =>
    marketplaceClient.post(`/wishlist/${productId}/toggle`).then(unwrap<any>),
  moveToCart: (productId: string) =>
    marketplaceClient.post(`/wishlist/${productId}/move-to-cart`).then(unwrap),
};
