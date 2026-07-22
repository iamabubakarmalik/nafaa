import { apiClient } from './client';

export interface Tag {
  id: string;
  tenantId: string;
  name: string;
  color: string;
  createdAt: string;
  _count?: { products: number };
}

export interface UpsertTagPayload {
  name: string;
  color?: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const tagsApi = {
  list: () => apiClient.get<{ data: Tag[] }>('/tags').then(unwrap),
  create: (payload: UpsertTagPayload) =>
    apiClient.post<{ data: Tag }>('/tags', payload).then(unwrap),
  update: (id: string, payload: UpsertTagPayload) =>
    apiClient.patch<{ data: Tag }>(`/tags/${id}`, payload).then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: any }>(`/tags/${id}`).then(unwrap),
};
