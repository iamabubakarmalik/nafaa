import { apiClient } from '@core/api/client';
import type { BookingStatus } from './bookings.api';
import type { HotelRoomType } from './room-types.api';

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'MAINTENANCE' | 'OUT_OF_ORDER' | 'BLOCKED';
export type HousekeepingStatus = 'DIRTY' | 'CLEAN' | 'INSPECTED' | 'OUT_OF_ORDER' | 'MAINTENANCE_REQUIRED';

export interface HotelRoom {
  id: string;
  /** Branch of the room; null = shows in every branch. */
  shopId?: string | null;
  roomTypeId: string;
  roomNumber: string;
  floor?: string | null;
  building?: string | null;
  wing?: string | null;
  status: RoomStatus;
  housekeepingStatus: HousekeepingStatus;
  customPrice?: number | null;
  customNotes?: string | null;
  lastCleanedAt?: string | null;
  lastInspectedAt?: string | null;
  maintenanceNotes?: string | null;
  viewType?: string | null;
  facing?: string | null;
  isActive: boolean;
  roomType?: HotelRoomType;
  createdAt: string;
  updatedAt: string;
}

export interface BoardStay {
  id: string; bookingNumber: string; guestName: string; guestPhone: string; status: BookingStatus;
  checkInDate: string; checkOutDate: string; balanceAmount: number; totalAdults: number; totalChildren: number;
}

export interface BoardRoom extends HotelRoom {
  /** What the desk should see now: occupied, reserved for today's arrival, or the room's own status. */
  live: RoomStatus;
  current: BoardStay | null;
  arrival: BoardStay | null;
  next: BoardStay | null;
  departingToday: boolean;
  overdue: boolean;
  nightsLeft: number | null;
}

export interface RoomSummary { total: number; available: number; occupied: number; reserved: number; cleaning: number; maintenance: number; dirty: number; occupancyPct: number }

/** Status and cleaning state are taken only when a room is created. */
export type RoomInput = Partial<Pick<HotelRoom, 'roomTypeId' | 'roomNumber' | 'floor' | 'building' | 'wing' | 'viewType' | 'facing' | 'customPrice' | 'customNotes' | 'isActive' | 'status' | 'housekeepingStatus' | 'shopId'>>;

const unwrap = <T,>(res: { data: unknown }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const roomsApi = {
  create: (data: RoomInput) => apiClient.post('/hotel/rooms', data).then(unwrap<HotelRoom>),
  list: (params?: { status?: string; roomTypeId?: string; search?: string; includeInactive?: boolean }) => apiClient.get('/hotel/rooms', { params }).then(unwrap<HotelRoom[]>),
  board: () => apiClient.get('/hotel/rooms/board').then(unwrap<{ today: string; rooms: BoardRoom[] }>),
  summary: () => apiClient.get('/hotel/rooms/summary').then(unwrap<RoomSummary>),
  getOne: (id: string) => apiClient.get('/hotel/rooms/' + id).then(unwrap<HotelRoom>),
  update: (id: string, data: RoomInput) => apiClient.patch('/hotel/rooms/' + id, data).then(unwrap<HotelRoom>),
  updateStatus: (id: string, status: RoomStatus, notes?: string) => apiClient.patch('/hotel/rooms/' + id + '/status', { status, notes }).then(unwrap<HotelRoom>),
  updateHousekeeping: (id: string, housekeepingStatus: HousekeepingStatus) => apiClient.patch('/hotel/rooms/' + id + '/housekeeping', { housekeepingStatus }).then(unwrap<HotelRoom>),
  /** Switches the room off; history stays. */
  remove: (id: string) => apiClient.delete('/hotel/rooms/' + id).then(unwrap<HotelRoom>),
};
