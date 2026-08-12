import { apiClient } from '../client';

export const analyticsApi = {
  overview: (from?: string, to?: string) =>
    apiClient
      .get('/admin/marketing/analytics/overview', { params: { from, to } })
      .then((r) => r.data.data),

  sources: (from?: string, to?: string) =>
    apiClient
      .get('/admin/marketing/analytics/sources', { params: { from, to } })
      .then((r) => r.data.data),

  topPages: (from?: string, to?: string) =>
    apiClient
      .get('/admin/marketing/analytics/top-pages', { params: { from, to } })
      .then((r) => r.data.data),

  timeseries: (days = 30) =>
    apiClient
      .get('/admin/marketing/analytics/timeseries', { params: { days } })
      .then((r) => r.data.data),
};
