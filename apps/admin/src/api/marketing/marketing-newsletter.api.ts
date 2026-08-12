import { apiClient } from '../client';

export interface Subscriber {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  status: 'ACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED' | 'COMPLAINED' | 'PENDING_CONFIRMATION';
  source: string;
  tags: string[];
  engagementScore: number;
  totalOpened: number;
  totalClicked: number;
  createdAt: string;
  unsubscribedAt?: string | null;
}

export interface NewsletterStats {
  total: number;
  active: number;
  unsubscribed: number;
  bounced: number;
  pending: number;
  new30d: number;
  new7d: number;
  growthRate: string;
  bySource: { source: string; count: number }[];
  unsubscribeRate: string;
  bounceRate: string;
}

export interface ListSubsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  source?: string;
  tag?: string;
  from?: string;
  to?: string;
}

export const newsletterApi = {
  list: (params: ListSubsParams = {}) =>
    apiClient
      .get('/admin/marketing/newsletter/subscribers', { params })
      .then((r) => r.data.data),

  stats: (): Promise<NewsletterStats> =>
    apiClient.get('/admin/marketing/newsletter/stats').then((r) => r.data.data),

  detail: (id: string) =>
    apiClient
      .get(`/admin/marketing/newsletter/subscribers/${id}`)
      .then((r) => r.data.data),

  update: (id: string, body: Partial<Subscriber & { notes: string }>) =>
    apiClient
      .patch(`/admin/marketing/newsletter/subscribers/${id}`, body)
      .then((r) => r.data.data),

  bulk: (body: {
    subscriberIds: string[];
    action: 'UNSUBSCRIBE' | 'DELETE' | 'TAG' | 'UNTAG' | 'MARK_BOUNCED' | 'REACTIVATE';
    tag?: string;
  }) =>
    apiClient
      .post('/admin/marketing/newsletter/subscribers/bulk', body)
      .then((r) => r.data.data),

  send: (body: {
    subject: string;
    html: string;
    preheader?: string;
    tags?: string[];
    subscriberIds?: string[];
    testMode?: boolean;
    testEmail?: string;
  }) => apiClient.post('/admin/marketing/newsletter/send', body).then((r) => r.data.data),

  history: (params: { page?: number; limit?: number } = {}) =>
    apiClient
      .get('/admin/marketing/newsletter/history', { params })
      .then((r) => r.data.data),

  exportCsvUrl: (params: ListSubsParams = {}) => {
    const q = new URLSearchParams(params as any).toString();
    return `/admin/marketing/newsletter/export?${q}`;
  },
};
