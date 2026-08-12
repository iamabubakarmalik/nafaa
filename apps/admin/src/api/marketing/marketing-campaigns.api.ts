import { apiClient } from '../client';

export const campaignsApi = {
  list: (params: any = {}) =>
    apiClient
      .get('/admin/marketing/campaigns', { params })
      .then((r) => r.data.data),

  stats: () =>
    apiClient.get('/admin/marketing/campaigns/stats').then((r) => r.data.data),

  detail: (id: string) =>
    apiClient
      .get(`/admin/marketing/campaigns/${id}`)
      .then((r) => r.data.data),

  create: (body: {
    name: string;
    channel: 'EMAIL' | 'SMS' | 'BOTH';
    type: 'BROADCAST' | 'DRIP' | 'TRIGGERED' | 'AB_TEST';
    emailSubject?: string;
    emailHtml?: string;
    emailPreheader?: string;
    smsMessage?: string;
    audienceTags?: string[];
    audienceSegment?: string;
    scheduledFor?: string;
    draft?: boolean;
  }) =>
    apiClient.post('/admin/marketing/campaigns', body).then((r) => r.data.data),

  launch: (id: string) =>
    apiClient
      .post(`/admin/marketing/campaigns/${id}/launch`)
      .then((r) => r.data.data),

  pause: (id: string) =>
    apiClient
      .post(`/admin/marketing/campaigns/${id}/pause`)
      .then((r) => r.data.data),

  cancel: (id: string) =>
    apiClient
      .post(`/admin/marketing/campaigns/${id}/cancel`)
      .then((r) => r.data.data),
};
