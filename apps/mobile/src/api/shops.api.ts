import { apiClient } from './client';

export type ShopType = 'SHOP' | 'WAREHOUSE' | 'GODOWN';

export interface Shop {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isMain: boolean;
  isActive: boolean;
  type: ShopType;
  createdAt: string;
  _count?: {
    users?: number;
    sales?: number;
    shopStocks?: number;
  };
}

export interface ShopWithOverview extends Shop {
  todaySales: number;
  todayProfit: number;
  todayOrders: number;
  lowStockCount: number;
  registerOpen: boolean;
  registerBalance: number;
}

export interface CreateShopPayload {
  name: string;
  address?: string;
  phone?: string;
  isMain?: boolean;
  type?: ShopType;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  managerPassword?: string;
}

export interface UpdateShopPayload {
  name?: string;
  address?: string;
  phone?: string;
  isMain?: boolean;
  type?: ShopType;
  isActive?: boolean;
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
  overview: (): Promise<ShopWithOverview[]> =>
    apiClient.get('/shops/overview').then((r) => unwrapArr<ShopWithOverview>(r)),
  get: (id: string): Promise<Shop> =>
    apiClient.get(`/shops/${id}`).then((r) => unwrapOne<Shop>(r)),
  create: (payload: CreateShopPayload): Promise<Shop & { manager?: any }> =>
    apiClient.post('/shops', payload).then((r) => unwrapOne<Shop & { manager?: any }>(r)),
  update: (id: string, payload: UpdateShopPayload): Promise<Shop> =>
    apiClient.patch(`/shops/${id}`, payload).then((r) => unwrapOne<Shop>(r)),
  toggleActive: (id: string): Promise<Shop> =>
    apiClient.patch(`/shops/${id}/toggle`).then((r) => unwrapOne<Shop>(r)),
  remove: (id: string): Promise<{ message: string }> =>
    apiClient.delete(`/shops/${id}`).then((r) => unwrapOne<{ message: string }>(r)),
};
