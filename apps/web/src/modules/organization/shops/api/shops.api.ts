import { apiClient } from '@core/api/client';

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
    cashRegisters?: number;
  };
}

export interface ShopWithOverview extends Shop {
  todaySales: number;
  todayProfit: number;
  todayOrders: number;
  todayPaid: number;
  todayCredit: number;
  monthSales: number;
  monthProfit: number;
  lowStockCount: number;
  totalStock: number;
  registerOpen: boolean;
  registerBalance: number;
  registerOpening: number;
  registerOpenedAt: string | null;
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

/**
 * Structured error from backend for shop deletion
 */
export interface ShopDeleteError {
  message: string;
  code:
    | 'MAIN_SHOP_PROTECTED'
    | 'HAS_SALES_HISTORY'
    | 'HAS_PENDING_TRANSFERS'
    | 'HAS_OPEN_REGISTER';
  suggestion:
    | 'DEACTIVATE'
    | 'DEACTIVATE_OR_SET_ANOTHER_AS_MAIN'
    | 'COMPLETE_TRANSFERS_FIRST'
    | 'CLOSE_REGISTER_FIRST';
  stats?: {
    sales?: number;
    users?: number;
    products?: number;
    registers?: number;
  };
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const shopsApi = {
  list: () => apiClient.get<{ data: Shop[] }>('/shops').then(unwrap),
  overview: () => apiClient.get<{ data: ShopWithOverview[] }>('/shops/overview').then(unwrap),
  get: (id: string) => apiClient.get<{ data: Shop }>(`/shops/${id}`).then(unwrap),
  create: (payload: CreateShopPayload) =>
    apiClient.post<{ data: Shop & { manager?: any; productsBackfilled?: number } }>('/shops', payload).then(unwrap),
  update: (id: string, payload: UpdateShopPayload) =>
    apiClient.patch<{ data: Shop }>(`/shops/${id}`, payload).then(unwrap),
  toggleActive: (id: string) =>
    apiClient.patch<{ data: Shop }>(`/shops/${id}/toggle`).then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/shops/${id}`).then(unwrap),
};
