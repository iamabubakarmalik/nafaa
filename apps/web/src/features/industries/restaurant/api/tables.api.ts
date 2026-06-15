import { apiClient } from '@/api/client';

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'OUT_OF_SERVICE';

export interface RestaurantTable {
  id: string;
  tableNumber: string;
  name?: string | null;
  capacity: number;
  status: TableStatus;
  floor?: string | null;
  zone?: string | null;
  shopId?: string | null;
  notes?: string | null;
  currentSaleId?: string | null;
  occupiedAt?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateTablePayload {
  tableNumber: string;
  name?: string;
  capacity: number;
  floor?: string;
  zone?: string;
  shopId?: string;
  notes?: string;
}

export interface TableStats {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
}

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const tablesApi = {
  stats: () =>
    apiClient.get('/industries/restaurant/tables/stats').then(unwrap) as Promise<TableStats>,
  list: (shopId?: string) =>
    apiClient.get('/industries/restaurant/tables', { params: { shopId } }).then(unwrap) as Promise<RestaurantTable[]>,
  create: (payload: CreateTablePayload) =>
    apiClient.post('/industries/restaurant/tables', payload).then(unwrap) as Promise<RestaurantTable>,
  update: (id: string, payload: Partial<CreateTablePayload>) =>
    apiClient.patch(`/industries/restaurant/tables/${id}`, payload).then(unwrap) as Promise<RestaurantTable>,
  updateStatus: (id: string, status: TableStatus, saleId?: string) =>
    apiClient.patch(`/industries/restaurant/tables/${id}/status`, { status, saleId }).then(unwrap) as Promise<RestaurantTable>,
  remove: (id: string) =>
    apiClient.delete(`/industries/restaurant/tables/${id}`).then(unwrap),
};
