import { apiClient } from '@core/api/client';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  isActive: boolean;
  /** Parent category; null = top level. */
  parentId?: string | null;
  sortOrder?: number;
  /** Optional industry kind (agri: SEEDS, FERTILIZER ...); empty means none. */
  kind?: string | null;
  createdAt: string;
  _count?: { products: number; children?: number };
}

export interface CreateCategoryPayload {
  name: string;
  color?: string;
  icon?: string;
  parentId?: string | null;
  kind?: string | null;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const categoriesApi = {
  list: () => apiClient.get<{ data: Category[] }>('/categories').then(unwrap),

  create: (payload: CreateCategoryPayload) =>
    apiClient.post<{ data: Category }>('/categories', payload).then(unwrap),

  update: (id: string, payload: UpdateCategoryPayload) =>
    apiClient.patch<{ data: Category }>(`/categories/${id}`, payload).then(unwrap),

  /** New parent and sibling order after a drag. */
  reorder: (items: Array<{ id: string; parentId?: string | null; sortOrder: number }>) =>
    apiClient.post<{ data: { updated: number } }>('/categories/reorder', { items }).then(unwrap),

  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/categories/${id}`).then(unwrap),
};
