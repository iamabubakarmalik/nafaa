import { apiClient } from '../client';

export const seoApi = {
  score: () =>
    apiClient.get('/admin/marketing/seo/score').then((r) => r.data.data),

  pages: (params: any = {}) =>
    apiClient
      .get('/admin/marketing/seo/pages', { params })
      .then((r) => r.data.data),

  page: (id: string) =>
    apiClient
      .get(`/admin/marketing/seo/pages/${id}`)
      .then((r) => r.data.data),

  upsert: (body: {
    path: string;
    title?: string;
    description?: string;
    keywords?: string[];
    canonicalUrl?: string;
    ogImage?: string;
    robots?: string;
  }) =>
    apiClient.post('/admin/marketing/seo/pages', body).then((r) => r.data.data),

  keywords: () =>
    apiClient.get('/admin/marketing/seo/keywords').then((r) => r.data.data),
};
