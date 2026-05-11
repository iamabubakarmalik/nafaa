import { apiClient } from './client';

export interface Shop {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isMain: boolean;
  createdAt: string;
}

export interface CreateShopPayload {
  name: string;
  address?: string;
  phone?: string;
  isMain?: boolean;
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

export const shopsApi = {
  list: (): Promise<Shop[]> =>
    apiClient.get('/shops').then((r) => unwrapArr<Shop>(r)),
  create: (payload: CreateShopPayload): Promise<Shop> =>
    apiClient.post('/shops', payload).then((r) => unwrapOne<Shop>(r)),
  remove: (id: string): Promise<{ message: string }> =>
    apiClient.delete(`/shops/${id}`).then((r) => unwrapOne<{ message: string }>(r)),
};
