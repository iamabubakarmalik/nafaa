import { marketplaceClient, unwrap } from '@/api/client';

export const restockApi = {
  create: (productId: string) =>
    marketplaceClient.post('/restock-alerts', { productId }).then(unwrap<any>),

  list: () => marketplaceClient.get('/restock-alerts').then(unwrap<any[]>),

  delete: (id: string) => marketplaceClient.delete(`/restock-alerts/${id}`).then(unwrap),
};
