import { apiClient } from '@core/api/client';

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'OUT_OF_SERVICE';

export interface RestaurantTable {
  id: string;
  tableNumber: string;
  tableName?: string;
  capacity: number;
  minCapacity: number;
  maxCapacity: number;
  section?: string;
  floor?: string;
  shape?: string;
  positionX?: number;
  positionY?: number;
  status: TableStatus;
  isReservable: boolean;
  isSmokingAllowed: boolean;
  isAcRoom: boolean;
  isFamilyArea: boolean;
  isVip: boolean;
  minOrderAmount?: number;
  currentOrderId?: string;
  occupiedAt?: string;
  reservedAt?: string;
  reservedFor?: string;
  reservedByName?: string;
  reservedByPhone?: string;
  reservationNote?: string;
  totalOrders: number;
  totalRevenue: number;
  qrCodeUrl?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const tablesApi = {
  create: (data: Partial<RestaurantTable>) =>
    apiClient.post('/restaurant/tables', data).then(unwrap<RestaurantTable>),

  list: (params?: { status?: string; section?: string; shopId?: string }) =>
    apiClient.get('/restaurant/tables', { params }).then(unwrap<RestaurantTable[]>),

  layout: (shopId?: string) =>
    apiClient.get('/restaurant/tables/layout', { params: shopId ? { shopId } : {} }).then(unwrap<any>),

  getOne: (id: string) =>
    apiClient.get('/restaurant/tables/' + id).then(unwrap<RestaurantTable>),

  update: (id: string, data: Partial<RestaurantTable>) =>
    apiClient.patch('/restaurant/tables/' + id, data).then(unwrap<RestaurantTable>),

  changeStatus: (id: string, status: TableStatus) =>
    apiClient.post('/restaurant/tables/' + id + '/status', { status }).then(unwrap<RestaurantTable>),

  reserve: (id: string, data: { reservedByName: string; reservedByPhone?: string; reservedFor: string; reservationNote?: string; numberOfGuests?: number }) =>
    apiClient.post('/restaurant/tables/' + id + '/reserve', data).then(unwrap<RestaurantTable>),

  cancelReservation: (id: string) =>
    apiClient.post('/restaurant/tables/' + id + '/cancel-reservation').then(unwrap<RestaurantTable>),

  remove: (id: string) =>
    apiClient.delete('/restaurant/tables/' + id).then(unwrap),
};
