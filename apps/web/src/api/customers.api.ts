import { apiClient } from './client';

export interface Customer {
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

export interface CustomersResponse {
  items: Customer[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateCustomerPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const customersApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: CustomersResponse }>('/customers', { params }).then(unwrap),

  create: (payload: CreateCustomerPayload) =>
    apiClient.post<{ data: Customer }>('/customers', payload).then(unwrap),

  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/customers/${id}`).then(unwrap),
};
