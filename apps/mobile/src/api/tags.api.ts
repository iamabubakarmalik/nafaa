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

export const tagsApi = {
  list: () => apiClient.get<Tag[]>('/tags').then((r) => r.data),
  create: (payload: UpsertTagPayload) =>
    apiClient.post<Tag>('/tags', payload).then((r) => r.data),
  update: (id: string, payload: UpsertTagPayload) =>
    apiClient.patch<Tag>(`/tags/${id}`, payload).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/tags/${id}`).then((r) => r.data),
};
