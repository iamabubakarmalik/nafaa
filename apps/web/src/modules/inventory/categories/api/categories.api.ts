import { apiClient } from '@core/api/client';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { products: number };
}

export interface CreateCategoryPayload {
  name: string;
  color?: string;
  icon?: string;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const categoriesApi = {
  list: () => apiClient.get<{ data: Category[] }>('/categories').then(unwrap),

  create: (payload: CreateCategoryPayload) =>
    apiClient.post<{ data: Category }>('/categories', payload).then(unwrap),

  update: (id: string, payload: UpdateCategoryPayload) =>
    apiClient.patch<{ data: Category }>(`/categories/${id}`, payload).then(unwrap),

  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/categories/${id}`).then(unwrap),
};
