import { apiClient } from '@core/api/client';

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'MAINTENANCE' | 'OUT_OF_ORDER' | 'BLOCKED';
export type HousekeepingStatus = 'DIRTY' | 'CLEAN' | 'INSPECTED' | 'OUT_OF_ORDER' | 'MAINTENANCE_REQUIRED';

export interface HotelRoom {
  id: string;
  roomTypeId: string;
  roomNumber: string;
  floor?: string;
  building?: string;
  wing?: string;
  status: RoomStatus;
  housekeepingStatus: HousekeepingStatus;
  customPrice?: number;
  customNotes?: string;
  lastCleanedAt?: string;
  lastInspectedAt?: string;
  maintenanceUntil?: string;
  maintenanceNotes?: string;
  viewType?: string;
  facing?: string;
  isActive: boolean;
  roomType?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const roomsApi = {
  create: (data: Partial<HotelRoom>) => apiClient.post('/hotel/rooms', data).then(unwrap<HotelRoom>),
  list: (params?: any) => apiClient.get('/hotel/rooms', { params }).then(unwrap<HotelRoom[]>),
  summary: () => apiClient.get('/hotel/rooms/summary').then(unwrap<any>),
  availability: (params: { checkInDate: string; checkOutDate: string; roomTypeId?: string; adults?: number; children?: number }) =>
    apiClient.get('/hotel/rooms/availability', { params }).then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/hotel/rooms/' + id).then(unwrap<HotelRoom>),
  update: (id: string, data: Partial<HotelRoom>) => apiClient.patch('/hotel/rooms/' + id, data).then(unwrap<HotelRoom>),
  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch('/hotel/rooms/' + id + '/status', { status, notes }).then(unwrap<HotelRoom>),
  updateHousekeeping: (id: string, housekeepingStatus: string) =>
    apiClient.patch('/hotel/rooms/' + id + '/housekeeping', { housekeepingStatus }).then(unwrap<HotelRoom>),
  remove: (id: string) => apiClient.delete('/hotel/rooms/' + id).then(unwrap),
};
