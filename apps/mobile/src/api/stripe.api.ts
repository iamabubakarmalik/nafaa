import { apiClient } from './client';

export interface StripeConfig {
  publishableKey: string | null;
  enabled: boolean;
}

export const stripeApi = {
  config: () => apiClient.get<StripeConfig>('/stripe/config').then((r) => r.data),
  checkout: (invoiceId: string) =>
    apiClient
      .post<{ url: string; sessionId: string }>('/stripe/checkout', { invoiceId })
      .then((r) => r.data),
};
