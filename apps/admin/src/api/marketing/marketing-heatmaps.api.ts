import { apiClient } from '../client';

export const heatmapsApi = {
  pages: () =>
    apiClient.get('/admin/marketing/heatmaps/pages').then((r) => r.data.data),

  clicks: (path: string) =>
    apiClient
      .get('/admin/marketing/heatmaps/clicks', { params: { path } })
      .then((r) => r.data.data),

  scroll: (path: string) =>
    apiClient
      .get('/admin/marketing/heatmaps/scroll', { params: { path } })
      .then((r) => r.data.data),
};
