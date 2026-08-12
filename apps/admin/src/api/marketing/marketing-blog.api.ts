import { apiClient } from '../client';

export const blogAnalyticsApi = {
  overview: (from?: string, to?: string) =>
    apiClient
      .get('/admin/marketing/blog-analytics/overview', { params: { from, to } })
      .then((r) => r.data.data),

  topPosts: (from?: string, to?: string, limit = 20) =>
    apiClient
      .get('/admin/marketing/blog-analytics/top-posts', {
        params: { from, to, limit },
      })
      .then((r) => r.data.data),
};
