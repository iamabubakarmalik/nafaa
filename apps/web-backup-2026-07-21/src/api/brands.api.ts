import { apiClient } from './client';

export interface Brand {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface UpsertBrandPayload {
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  isActive?: boolean;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const brandsApi = {
  list: (search?: string) =>
    apiClient.get<{ data: Brand[] }>('/brands', { params: { search } }).then(unwrap),
  getOne: (id: string) =>
    apiClient.get<{ data: Brand }>(`/brands/${id}`).then(unwrap),
  create: (payload: UpsertBrandPayload) =>
    apiClient.post<{ data: Brand }>('/brands', payload).then(unwrap),
  update: (id: string, payload: UpsertBrandPayload) =>
    apiClient.patch<{ data: Brand }>(`/brands/${id}`, payload).then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: any }>(`/brands/${id}`).then(unwrap),
};
