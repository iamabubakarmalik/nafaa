import { marketplaceClient, unwrap } from '@/api/client';

export interface CreateSplitPayload {
  orderId: string;
  participants: Array<{
    customerId?: string;
    phone?: string;
    name?: string;
    shareAmount: number;
  }>;
}

export const splitPaymentApi = {
  create: (payload: CreateSplitPayload) =>
    marketplaceClient.post('/split-payments', payload).then(unwrap<{
      split: any; shareLink: string;
    }>),

  byToken: (token: string) =>
    marketplaceClient.get(`/split-payments/by-token/${token}`).then(unwrap<any>),

  payShare: (participantId: string, paymentRef: string, amount: number) =>
    marketplaceClient
      .post(`/split-payments/participants/${participantId}/pay`, { paymentRef, amount })
      .then(unwrap),

  mine: () => marketplaceClient.get('/split-payments/mine').then(unwrap<any[]>),
};
