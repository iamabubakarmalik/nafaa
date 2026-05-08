import { apiClient } from './client';

export interface TenantNote {
  id: string;
  tenantId: string;
  title?: string | null;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; fullName: string; email: string };
}

export interface UpsertNotePayload {
  tenantId: string;
  title?: string;
  content: string;
  isPinned?: boolean;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminNotesApi = {
  list: (tenantId: string) =>
    apiClient.get<{ data: TenantNote[] }>(`/admin/notes/tenant/${tenantId}`).then(unwrap),
  create: (payload: UpsertNotePayload) =>
    apiClient.post<{ data: TenantNote }>('/admin/notes', payload).then(unwrap),
  update: (id: string, payload: Partial<UpsertNotePayload>) =>
    apiClient.patch<{ data: TenantNote }>(`/admin/notes/${id}`, payload).then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/admin/notes/${id}`).then(unwrap),
};
