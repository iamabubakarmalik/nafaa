import { marketplaceClient, unwrap } from '@/api/client';

export const storiesApi = {
  feed: () => marketplaceClient.get('/shop-stories/feed').then(unwrap<any[]>),

  shop: (shopId: string) =>
    marketplaceClient.get(`/shops/${shopId}/stories`).then(unwrap<any[]>),

  view: (storyId: string) =>
    marketplaceClient.post(`/shop-stories/${storyId}/view`).then(unwrap),

  react: (storyId: string, reaction: string) =>
    marketplaceClient.post(`/shop-stories/${storyId}/react`, { reaction }).then(unwrap),
};
