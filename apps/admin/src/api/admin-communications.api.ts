import { apiClient } from './client';

export type DeliveryStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';

export interface EmailLog {
  id: string;
  tenantId?: string | null;
  templateSlug?: string | null;
  toEmail: string;
  toName?: string | null;
  subject: string;
  status: DeliveryStatus;
  errorMessage?: string | null;
  retryCount: number;
  sentAt?: string | null;
  createdAt: string;
  tenant?: { id: string; name: string } | null;
}

export interface SmsLog {
  id: string;
  tenantId?: string | null;
  templateSlug?: string | null;
  toPhone: string;
  message: string;
  status: DeliveryStatus;
  cost: number;
  errorMessage?: string | null;
  retryCount: number;
  sentAt?: string | null;
  createdAt: string;
  tenant?: { id: string; name: string } | null;
}

export interface SmsTemplate {
  id: string;
  slug: string;
  name: string;
  message: string;
  isActive: boolean;
  createdAt: string;
}

export interface UpsertSmsTemplatePayload {
  slug: string;
  name: string;
  message: string;
  isActive?: boolean;
}

export interface CommStats {
  total: number;
  sent: number;
  failed: number;
  queued: number;
  today: number;
  totalCost?: number;
  provider?: string;
}

export interface BulkSendPayload {
  channel: 'EMAIL' | 'SMS' | 'BOTH';
  target: 'ALL' | 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'SPECIFIC';
  tenantIds?: string[];
  emailTemplateSlug?: string;
  smsTemplateSlug?: string;
  emailSubject?: string;
  emailBody?: string;
  smsMessage?: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminCommunicationsApi = {
  emailStats: () =>
    apiClient.get<{ data: CommStats }>('/admin/communications/email/stats').then(unwrap),
  emailLogs: (params?: { tenantId?: string; status?: string; page?: number; limit?: number }) =>
    apiClient
      .get<{ data: { items: EmailLog[]; meta: any } }>('/admin/communications/email/logs', { params })
      .then(unwrap),
  retryEmail: (id: string) =>
    apiClient.post<{ data: any }>(`/admin/communications/email/retry/${id}`).then(unwrap),

  smsStats: () =>
    apiClient.get<{ data: CommStats }>('/admin/communications/sms/stats').then(unwrap),
  smsLogs: (params?: { tenantId?: string; status?: string; page?: number; limit?: number }) =>
    apiClient
      .get<{ data: { items: SmsLog[]; meta: any } }>('/admin/communications/sms/logs', { params })
      .then(unwrap),
  retrySms: (id: string) =>
    apiClient.post<{ data: any }>(`/admin/communications/sms/retry/${id}`).then(unwrap),

  listSmsTemplates: () =>
    apiClient.get<{ data: SmsTemplate[] }>('/admin/communications/sms/templates').then(unwrap),
  createSmsTemplate: (payload: UpsertSmsTemplatePayload) =>
    apiClient
      .post<{ data: SmsTemplate }>('/admin/communications/sms/templates', payload)
      .then(unwrap),
  updateSmsTemplate: (id: string, payload: Partial<UpsertSmsTemplatePayload>) =>
    apiClient
      .patch<{ data: SmsTemplate }>(`/admin/communications/sms/templates/${id}`, payload)
      .then(unwrap),
  deleteSmsTemplate: (id: string) =>
    apiClient
      .delete<{ data: { message: string } }>(`/admin/communications/sms/templates/${id}`)
      .then(unwrap),
  seedSmsDefaults: () =>
    apiClient
      .post<{ data: any }>('/admin/communications/sms/templates/seed-defaults')
      .then(unwrap),

  bulkSend: (payload: BulkSendPayload) =>
    apiClient.post<{ data: any }>('/admin/communications/bulk-send', payload).then(unwrap),
  testEmail: (toEmail: string, templateSlug?: string) =>
    apiClient
      .post<{ data: any }>('/admin/communications/test/email', { toEmail, templateSlug })
      .then(unwrap),
  testSms: (toPhone: string, templateSlug?: string) =>
    apiClient
      .post<{ data: any }>('/admin/communications/test/sms', { toPhone, templateSlug })
      .then(unwrap),
};
