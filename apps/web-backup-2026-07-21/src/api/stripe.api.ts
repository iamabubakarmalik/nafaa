import { apiClient } from './client';

export interface StripeConfig {
  publishableKey: string | null;
  enabled: boolean;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const stripeApi = {
  config: () => apiClient.get<{ data: StripeConfig }>('/stripe/config').then(unwrap),
  checkout: (invoiceId: string) =>
    apiClient
      .post<{ data: { url: string; sessionId: string } }>('/stripe/checkout', { invoiceId })
      .then(unwrap),
};
