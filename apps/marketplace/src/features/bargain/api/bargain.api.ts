import { marketplaceClient, unwrap } from '@/api/client';

export interface StartBargainPayload {
  productId: string;
  variantId?: string;
  offerPrice: number;
  quantity?: number;
  message?: string;
}

export interface CounterOfferPayload {
  offerPrice: number;
  message?: string;
}

export const bargainApi = {
  start: (payload: StartBargainPayload) =>
    marketplaceClient.post('/bargain', payload).then(unwrap<any>),

  list: (status?: string[], limit = 20, offset = 0) =>
    marketplaceClient
      .get('/bargain', { params: { status: status?.join(','), limit, offset } })
      .then(unwrap<{ items: any[]; total: number; counts: Record<string, number> }>),

  detail: (id: string) =>
    marketplaceClient.get(`/bargain/${id}`).then(unwrap<any>),

  counter: (id: string, payload: CounterOfferPayload) =>
    marketplaceClient.post(`/bargain/${id}/counter`, payload).then(unwrap<any>),

  accept: (id: string) =>
    marketplaceClient.post(`/bargain/${id}/accept`).then(unwrap<any>),

  reject: (id: string, reason?: string) =>
    marketplaceClient.post(`/bargain/${id}/reject`, { reason }).then(unwrap),

  cancel: (id: string) =>
    marketplaceClient.post(`/bargain/${id}/cancel`).then(unwrap),
};
