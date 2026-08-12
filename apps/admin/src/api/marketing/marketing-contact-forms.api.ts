import { apiClient } from '../client';

export interface ContactForm {
  id: string;
  ticketNumber: string;
  fullName: string;
  email: string;
  phone?: string | null;
  companyName?: string | null;
  formType: string;
  subject: string;
  message: string;
  status: 'NEW' | 'IN_PROGRESS' | 'REPLIED' | 'RESOLVED' | 'SPAM' | 'ARCHIVED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assignedTo?: string | null;
  createdAt: string;
  firstResponseAt?: string | null;
  repliesCount: number;
  replies?: any[];
}

export interface ContactFormStats {
  total: number;
  new: number;
  inProgress: number;
  replied: number;
  resolved: number;
  spam: number;
  urgentOpen: number;
  avgResponseMinutes: number;
  resolvedRate: string;
}

export const contactFormsApi = {
  list: (params: any = {}) =>
    apiClient
      .get('/admin/marketing/contact-forms', { params })
      .then((r) => r.data.data),

  stats: (): Promise<ContactFormStats> =>
    apiClient
      .get('/admin/marketing/contact-forms/stats')
      .then((r) => r.data.data),

  detail: (id: string): Promise<ContactForm> =>
    apiClient
      .get(`/admin/marketing/contact-forms/${id}`)
      .then((r) => r.data.data),

  update: (id: string, body: any) =>
    apiClient
      .patch(`/admin/marketing/contact-forms/${id}`, body)
      .then((r) => r.data.data),

  reply: (id: string, body: {
    subject?: string;
    message: string;
    markResolved?: boolean;
    sendSms?: boolean;
  }) =>
    apiClient
      .post(`/admin/marketing/contact-forms/${id}/reply`, body)
      .then((r) => r.data.data),

  markSpam: (id: string) =>
    apiClient
      .post(`/admin/marketing/contact-forms/${id}/spam`)
      .then((r) => r.data.data),
};
