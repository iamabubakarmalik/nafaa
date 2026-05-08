import { apiClient } from './client';

export interface Shop {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isMain: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateShopPayload {
  name: string;
  address?: string;
  phone?: string;
  isMain?: boolean;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const shopsApi = {
  list: () => apiClient.get<{ data: Shop[] }>('/shops').then(unwrap),
  create: (payload: CreateShopPayload) =>
    apiClient.post<{ data: Shop }>('/shops', payload).then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/shops/${id}`).then(unwrap),
};
