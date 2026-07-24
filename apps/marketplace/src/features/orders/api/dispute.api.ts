import { marketplaceClient, unwrap } from '@/api/client';

export const disputeApi = {
  create: (orderId: string, data: {
    reason: string;
    description: string;
    itemIds?: string[];
    photos?: string[];
    videos?: string[];
    resolution: 'REFUND' | 'REPLACEMENT' | 'PARTIAL_REFUND' | 'OTHER';
  }) => marketplaceClient.post(`/orders/${orderId}/disputes`, data).then(unwrap<any>),

  list: (orderId: string) =>
    marketplaceClient.get(`/orders/${orderId}/disputes`).then(unwrap<any[]>),

  detail: (id: string) =>
    marketplaceClient.get(`/disputes/${id}`).then(unwrap<any>),

  addMessage: (id: string, message: string, attachments?: string[]) =>
    marketplaceClient.post(`/disputes/${id}/messages`, { message, attachments }).then(unwrap),

  escalate: (id: string, reason: string) =>
    marketplaceClient.post(`/disputes/${id}/escalate`, { reason }).then(unwrap),

  withdraw: (id: string) =>
    marketplaceClient.post(`/disputes/${id}/withdraw`).then(unwrap),
};
