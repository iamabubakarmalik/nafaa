import { apiClient } from './client';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  createdAt: string;
  _count?: { products: number };
}

export interface CreateCategoryPayload {
  name: string;
  color?: string;
  icon?: string;
}

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

function unwrapArr<T>(res: any): T[] {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

export const categoriesApi = {
  list: (): Promise<Category[]> =>
    apiClient.get('/categories').then((r) => unwrapArr<Category>(r)),
  create: (payload: CreateCategoryPayload): Promise<Category> =>
    apiClient.post('/categories', payload).then((r) => unwrapOne<Category>(r)),
  remove: (id: string): Promise<{ message: string }> =>
    apiClient.delete(`/categories/${id}`).then((r) => unwrapOne<{ message: string }>(r)),
};
