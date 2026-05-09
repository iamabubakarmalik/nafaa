import { apiClient } from './client';

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  balance: number;
  loyaltyPoints: number;
  totalSpent: number;
  isActive: boolean;
  createdAt?: string;
}

export interface CreateCustomerPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface ListResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const customersApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.get<ListResponse<Customer>>('/customers', { params }).then((r) => r.data),

  create: (payload: CreateCustomerPayload) =>
    apiClient.post<Customer>('/customers', payload).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/customers/${id}`).then((r) => r.data),
};
