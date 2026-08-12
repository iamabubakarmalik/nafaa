import { apiClient } from '../client';

export const conversionsApi = {
  funnel: (from?: string, to?: string) =>
    apiClient
      .get('/admin/marketing/conversions/funnel', { params: { from, to } })
      .then((r) => r.data.data),

  goals: () =>
    apiClient
      .get('/admin/marketing/conversions/goals')
      .then((r) => r.data.data),

  createGoal: (body: { name: string; eventName: string; valuePkr?: number }) =>
    apiClient
      .post('/admin/marketing/conversions/goals', body)
      .then((r) => r.data.data),
};
