import { apiClient } from '../client';

export const abTestsApi = {
  list: () =>
    apiClient.get('/admin/marketing/ab-tests').then((r) => r.data.data),

  detail: (id: string) =>
    apiClient.get(`/admin/marketing/ab-tests/${id}`).then((r) => r.data.data),

  results: (id: string) =>
    apiClient
      .get(`/admin/marketing/ab-tests/${id}/results`)
      .then((r) => r.data.data),

  create: (body: {
    name: string;
    hypothesis?: string;
    goalMetric: string;
    variants: { name: string; content: any; weight?: number }[];
  }) =>
    apiClient.post('/admin/marketing/ab-tests', body).then((r) => r.data.data),

  start: (id: string) =>
    apiClient
      .post(`/admin/marketing/ab-tests/${id}/start`)
      .then((r) => r.data.data),

  stop: (id: string, winnerId?: string) =>
    apiClient
      .post(`/admin/marketing/ab-tests/${id}/stop`, { winnerId })
      .then((r) => r.data.data),
};
