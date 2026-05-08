import { apiClient } from './client';

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SuppliersResponse {
  items: Supplier[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateSupplierPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const suppliersApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: SuppliersResponse }>('/suppliers', { params }).then(unwrap),

  create: (payload: CreateSupplierPayload) =>
    apiClient.post<{ data: Supplier }>('/suppliers', payload).then(unwrap),

  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/suppliers/${id}`).then(unwrap),
};
