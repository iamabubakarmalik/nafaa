import { marketplaceClient, unwrap } from '@/api/client';

export const priceAlertsApi = {
  list: () => marketplaceClient.get('/price-alerts').then(unwrap<any[]>),

  create: (productId: string, targetPrice: number) =>
    marketplaceClient.post('/price-alerts', { productId, targetPrice }).then(unwrap<any>),

  update: (id: string, targetPrice: number) =>
    marketplaceClient.patch(`/price-alerts/${id}`, { targetPrice }).then(unwrap<any>),

  delete: (id: string) => marketplaceClient.delete(`/price-alerts/${id}`).then(unwrap),
};
