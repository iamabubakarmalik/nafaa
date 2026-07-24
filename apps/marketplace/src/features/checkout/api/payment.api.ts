import { marketplaceClient, unwrap } from '@/api/client';

export const paymentApi = {
  // ─── JAZZCASH ───
  jazzcashInitiate: (payload: {
    orderId: string;
    amount: number;
    paymentType: 'WALLET' | 'CARD' | 'VOUCHER';
    mobileNumber?: string;
    cnic?: string;
    description?: string;
  }) =>
    marketplaceClient
      .post('/integrations/payments/jazzcash/initiate', payload, {
        baseURL: marketplaceClient.defaults.baseURL?.replace('/marketplace', ''),
      })
      .then(unwrap<any>),

  jazzcashVerify: (txnRefNo: string, orderId?: string) =>
    marketplaceClient
      .post('/integrations/payments/jazzcash/verify', { txnRefNo, orderId }, {
        baseURL: marketplaceClient.defaults.baseURL?.replace('/marketplace', ''),
      })
      .then(unwrap<any>),

  // ─── EASYPAISA ───
  easypaisaInitiate: (payload: {
    orderId: string;
    amount: number;
    paymentMethod: 'MA' | 'OTC';
    mobileAccountNo?: string;
    email?: string;
  }) =>
    marketplaceClient
      .post('/integrations/payments/easypaisa/initiate', payload, {
        baseURL: marketplaceClient.defaults.baseURL?.replace('/marketplace', ''),
      })
      .then(unwrap<any>),

  easypaisaVerify: (orderRefNum: string) =>
    marketplaceClient
      .post('/integrations/payments/easypaisa/verify', { orderRefNum }, {
        baseURL: marketplaceClient.defaults.baseURL?.replace('/marketplace', ''),
      })
      .then(unwrap<any>),
};
