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
  _count?: { products: number };
}

export interface UpsertBrandPayload {
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  isActive?: boolean;
}

export const brandsApi = {
  list: (search?: string) =>
    apiClient.get<Brand[]>('/brands', { params: { search } }).then((r) => r.data),
  getOne: (id: string) =>
    apiClient.get<Brand>(`/brands/${id}`).then((r) => r.data),
  create: (payload: UpsertBrandPayload) =>
    apiClient.post<Brand>('/brands', payload).then((r) => r.data),
  update: (id: string, payload: UpsertBrandPayload) =>
    apiClient.patch<Brand>(`/brands/${id}`, payload).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/brands/${id}`).then((r) => r.data),
};
