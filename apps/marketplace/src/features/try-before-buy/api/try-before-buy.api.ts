import { marketplaceClient, unwrap } from '@/api/client';

export const tryBeforeBuyApi = {
  request: (data: {
    productId: string;
    variantId?: string;
    addressId: string;
    trialDays?: number;
    customerNotes?: string;
  }) => marketplaceClient.post('/try-before-buy', data).then(unwrap<any>),

  mine: (status?: string) =>
    marketplaceClient.get('/try-before-buy/mine', { params: { status } }).then(unwrap<any[]>),

  payDeposit: (id: string, paymentRef: string) =>
    marketplaceClient.post(`/try-before-buy/${id}/pay-deposit`, { paymentRef }).then(unwrap),

  purchase: (id: string, orderId: string) =>
    marketplaceClient.post(`/try-before-buy/${id}/purchase`, { orderId }).then(unwrap),

  return: (id: string, condition: string, photos: string[]) =>
    marketplaceClient.post(`/try-before-buy/${id}/return`, { condition, photos }).then(unwrap),
};
