import { marketplaceClient, unwrap } from '@/api/client';

export const giftCardsApi = {
  designs: () =>
    marketplaceClient.get('/gift-cards/designs').then(unwrap<any[]>),

  purchase: (data: {
    amount: number;
    recipientName: string;
    recipientPhone?: string;
    recipientEmail?: string;
    message?: string;
    designId: string;
    deliveryDate?: string;
  }) => marketplaceClient.post('/gift-cards/purchase', data).then(unwrap<any>),

  redeem: (code: string) =>
    marketplaceClient.post('/gift-cards/redeem', { code }).then(unwrap<{
      success: boolean; amount: number; newBalance: number;
    }>),

  mine: () => marketplaceClient.get('/gift-cards/mine').then(unwrap<any[]>),

  sent: () => marketplaceClient.get('/gift-cards/sent').then(unwrap<any[]>),

  detail: (id: string) => marketplaceClient.get(`/gift-cards/${id}`).then(unwrap<any>),
};
