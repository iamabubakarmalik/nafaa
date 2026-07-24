import { marketplaceClient, unwrap } from '@/api/client';

export interface ListWishlistParams {
  category?: string;
  shopId?: string;
  sortBy?: 'recent' | 'price_asc' | 'price_desc' | 'name';
  limit?: number;
  offset?: number;
}

export const wishlistApi = {
  list: (params: ListWishlistParams) =>
    marketplaceClient.get('/wishlist', { params }).then(unwrap<{
      items: any[]; total: number; limit: number; offset: number;
    }>),

  count: () => marketplaceClient.get('/wishlist/count').then(unwrap<{ count: number }>),

  checkBatch: (productIds: string[]) =>
    marketplaceClient.post('/wishlist/check-batch', { productIds }).then(unwrap<{
      inWishlist: Record<string, boolean>;
    }>),

  add: (productId: string, notes?: string) =>
    marketplaceClient.post('/wishlist', { productId, notes }).then(unwrap<{ success: boolean; isInWishlist: boolean }>),

  toggle: (productId: string) =>
    marketplaceClient.post(`/wishlist/${productId}/toggle`).then(unwrap<{ success: boolean; isInWishlist: boolean }>),

  moveToCart: (productId: string, quantity = 1) =>
    marketplaceClient.post(`/wishlist/${productId}/move-to-cart`, { quantity }).then(unwrap),

  remove: (productId: string) =>
    marketplaceClient.delete(`/wishlist/${productId}`).then(unwrap<{ success: boolean; isInWishlist: boolean }>),

  clear: () => marketplaceClient.delete('/wishlist').then(unwrap<{ success: boolean; cleared: number }>),
};
