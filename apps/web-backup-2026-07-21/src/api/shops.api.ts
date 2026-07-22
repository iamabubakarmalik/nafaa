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
  // Optional: Create manager with shop
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

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const shopsApi = {
  list: () => apiClient.get<{ data: Shop[] }>('/shops').then(unwrap),
  overview: () => apiClient.get<{ data: ShopWithOverview[] }>('/shops/overview').then(unwrap),
  get: (id: string) => apiClient.get<{ data: Shop }>(`/shops/${id}`).then(unwrap),
  create: (payload: CreateShopPayload) =>
    apiClient.post<{ data: Shop & { manager?: any } }>('/shops', payload).then(unwrap),
  update: (id: string, payload: UpdateShopPayload) =>
    apiClient.patch<{ data: Shop }>(`/shops/${id}`, payload).then(unwrap),
  toggleActive: (id: string) =>
    apiClient.patch<{ data: Shop }>(`/shops/${id}/toggle`).then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/shops/${id}`).then(unwrap),
};
