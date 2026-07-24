import { marketplaceClient, unwrap } from '@/api/client';

export const loyaltyApi = {
  configs: () => marketplaceClient.get('/loyalty-tiers/configs', {
    baseURL: marketplaceClient.defaults.baseURL?.replace('/marketplace', ''),
  }).then(unwrap<any[]>),

  me: () => marketplaceClient.get('/loyalty-tiers/me', {
    baseURL: marketplaceClient.defaults.baseURL?.replace('/marketplace', ''),
  }).then(unwrap<any>),

  recompute: () => marketplaceClient.post('/loyalty-tiers/me/recompute', {}, {
    baseURL: marketplaceClient.defaults.baseURL?.replace('/marketplace', ''),
  }).then(unwrap<any>),

  history: () => marketplaceClient.get('/loyalty-tiers/me/history', {
    baseURL: marketplaceClient.defaults.baseURL?.replace('/marketplace', ''),
  }).then(unwrap<any[]>),
};
