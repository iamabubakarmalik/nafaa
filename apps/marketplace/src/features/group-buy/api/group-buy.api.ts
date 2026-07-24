import { marketplaceClient, unwrap } from '@/api/client';

export interface ListGroupBuysParams {
  shopId?: string;
  category?: string;
  city?: string;
  limit?: number;
  offset?: number;
}

export const groupBuyApi = {
  list: (params: ListGroupBuysParams = {}) =>
    marketplaceClient.get('/group-buys', { params }).then(unwrap<{
      items: any[]; total: number;
    }>),

  detail: (id: string) =>
    marketplaceClient.get(`/group-buys/${id}`).then(unwrap<any>),

  join: (id: string, quantity = 1) =>
    marketplaceClient.post(`/group-buys/${id}/join`, { quantity }).then(unwrap<any>),

  leave: (id: string) =>
    marketplaceClient.post(`/group-buys/${id}/leave`).then(unwrap),

  mine: (limit = 20, offset = 0) =>
    marketplaceClient.get('/group-buys/my', { params: { limit, offset } }).then(unwrap<any>),
};
