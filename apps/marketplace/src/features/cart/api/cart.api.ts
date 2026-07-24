import { marketplaceClient, unwrap } from '@/api/client';
import type { Cart } from '@/types';

export interface AddToCartPayload {
  productId: string;
  variantId?: string;
  quantity: number;
  notes?: string;
  modifiers?: any;
  bargainId?: string;
  groupBuyId?: string;
}

export const cartApi = {
  get: () => marketplaceClient.get('/cart').then(unwrap<Cart>),

  count: () => marketplaceClient.get('/cart/count').then(unwrap<{ count: number }>),

  add: (payload: AddToCartPayload) => marketplaceClient.post('/cart/add', payload).then(unwrap<Cart>),

  updateLine: (lineId: string, data: { quantity?: number; notes?: string; modifiers?: any }) =>
    marketplaceClient.patch(`/cart/lines/${lineId}`, data).then(unwrap<Cart>),

  removeLine: (lineId: string) => marketplaceClient.delete(`/cart/lines/${lineId}`).then(unwrap<Cart>),

  moveToWishlist: (lineId: string) =>
    marketplaceClient.post(`/cart/lines/${lineId}/move-to-wishlist`).then(unwrap<Cart>),

  clear: () => marketplaceClient.delete('/cart').then(unwrap<Cart>),

  clearShop: (shopId: string) => marketplaceClient.delete(`/cart/shop/${shopId}`).then(unwrap<Cart>),
};
