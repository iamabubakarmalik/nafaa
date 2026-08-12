import { apiClient } from '../client';

export interface Lead {
  id: string;
  leadNumber: string;
  fullName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  industry?: string;
  source: string;
  status: string;
  temperature: 'COLD' | 'WARM' | 'HOT' | 'FIRE';
  score: number;
  assignedTo?: string;
  budget?: string;
  timeline?: string;
  decisionMaker: boolean;
  emailsSent: number;
  emailsOpened: number;
  callsMade: number;
  meetingsHeld: number;
  demosAttended: number;
  lastContactAt?: string;
  createdAt: string;
  activities?: any[];
  _count?: { activities: number };
}

export const leadsApi = {
  list: (params: any = {}) =>
    apiClient.get('/admin/marketing/leads', { params }).then((r) => r.data.data),

  stats: () =>
    apiClient.get('/admin/marketing/leads/stats').then((r) => r.data.data),

  detail: (id: string): Promise<Lead> =>
    apiClient.get(`/admin/marketing/leads/${id}`).then((r) => r.data.data),

  update: (id: string, body: any) =>
    apiClient
      .patch(`/admin/marketing/leads/${id}`, body)
      .then((r) => r.data.data),

  assign: (id: string, assigneeId: string) =>
    apiClient
      .post(`/admin/marketing/leads/${id}/assign`, { assigneeId })
      .then((r) => r.data.data),

  logActivity: (id: string, body: {
    type: 'CALL' | 'EMAIL' | 'MEETING' | 'DEMO' | 'NOTE' | 'SMS' | 'WHATSAPP';
    summary: string;
    details?: string;
    outcome?: string;
  }) =>
    apiClient
      .post(`/admin/marketing/leads/${id}/activities`, body)
      .then((r) => r.data.data),

  exportCsvUrl: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return `/admin/marketing/leads/export?${q}`;
  },
};
