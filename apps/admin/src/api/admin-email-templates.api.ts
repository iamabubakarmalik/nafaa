import { apiClient } from './client';

export interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string | null;
  variables?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertEmailTemplatePayload {
  slug: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  variables?: any;
  isActive?: boolean;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminEmailTemplatesApi = {
  list: () => apiClient.get<{ data: EmailTemplate[] }>('/admin/email-templates').then(unwrap),
  getOne: (id: string) =>
    apiClient.get<{ data: EmailTemplate }>(`/admin/email-templates/${id}`).then(unwrap),
  create: (payload: UpsertEmailTemplatePayload) =>
    apiClient.post<{ data: EmailTemplate }>('/admin/email-templates', payload).then(unwrap),
  update: (id: string, payload: Partial<UpsertEmailTemplatePayload>) =>
    apiClient.patch<{ data: EmailTemplate }>(`/admin/email-templates/${id}`, payload).then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/admin/email-templates/${id}`).then(unwrap),
  seedDefaults: () =>
    apiClient.post<{ data: any }>('/admin/email-templates/seed-defaults').then(unwrap),
};
