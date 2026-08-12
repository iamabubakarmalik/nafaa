import { apiClient } from '../client';

export const marketingDashboardApi = {
  overview: () =>
    apiClient.get('/admin/marketing/dashboard/overview').then((r) => r.data.data),
  activity: (limit = 20) =>
    apiClient
      .get(`/admin/marketing/dashboard/activity?limit=${limit}`)
      .then((r) => r.data.data),
};
