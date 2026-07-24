import { marketplaceClient, unwrap } from '@/api/client';

export const bundlesApi = {
  list: (shopId?: string) =>
    marketplaceClient.get('/bundles', { params: { shopId } }).then(unwrap<any[]>),

  detail: (id: string) =>
    marketplaceClient.get(`/bundles/${id}`).then(unwrap<any>),

  addToCart: (id: string) =>
    marketplaceClient.post(`/bundles/${id}/add-to-cart`).then(unwrap),
};
