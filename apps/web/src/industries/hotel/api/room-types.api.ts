import { apiClient } from '@core/api/client';
import type { HotelRoom } from './rooms.api';

export type RoomType = 'SINGLE' | 'DOUBLE' | 'TWIN' | 'TRIPLE' | 'QUAD' | 'FAMILY'
  | 'SUITE' | 'DELUXE' | 'EXECUTIVE' | 'PRESIDENTIAL' | 'DORMITORY' | 'STUDIO'
  | 'APARTMENT' | 'VILLA' | 'BUNGALOW' | 'TENT' | 'CABIN' | 'OTHER';

export type BedType = 'SINGLE_BED' | 'DOUBLE_BED' | 'QUEEN_BED' | 'KING_BED'
  | 'SOFA_BED' | 'BUNK_BED' | 'TWIN_BEDS' | 'CUSTOM';

export interface HotelRoomType {
  id: string;
  code: string;
  name: string;
  type: RoomType;
  description?: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  bedType: BedType;
  bedCount: number;
  extraBedAllowed: boolean;
  extraBedPrice: number;
  sizeSqft?: number | null;
  sizeSqm?: number | null;
  basePrice: number;
  weekendPrice?: number | null;
  peakPrice?: number | null;
  offSeasonPrice?: number | null;
  hourlyPrice?: number | null;
  hasAC: boolean;
  hasHeater: boolean;
  hasTV: boolean;
  hasWifi: boolean;
  hasBalcony: boolean;
  hasKitchen: boolean;
  hasBathtub: boolean;
  hasSafe: boolean;
  hasMinibar: boolean;
  isPetFriendly: boolean;
  isSmoking: boolean;
  amenities: string[];
  imageUrls: string[];
  displayOrder: number;
  isActive: boolean;
  rooms?: Array<Pick<HotelRoom, 'id' | 'roomNumber' | 'status' | 'housekeepingStatus' | 'floor'> & Partial<HotelRoom>>;
  createdAt: string;
  updatedAt: string;
}

export interface RoomTypeDetail extends HotelRoomType {
  rooms: HotelRoom[];
  last90: { stays: number; nights: number; revenue: number; adr: number };
}

export interface NewRoomInput {
  roomNumber: string;
  floor?: string;
  building?: string;
  wing?: string;
  viewType?: string;
  facing?: string;
  customPrice?: number;
  customNotes?: string;
}

export type RoomTypeInput = Partial<Omit<HotelRoomType, 'id' | 'rooms' | 'createdAt' | 'updatedAt'>>;

const unwrap = <T,>(res: { data: unknown }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const roomTypesApi = {
  /** Creates the type and, when given, its rooms in one step. */
  create: (data: RoomTypeInput & { rooms?: NewRoomInput[] }) => apiClient.post('/hotel/room-types', data).then(unwrap<HotelRoomType & { roomsCreated: number }>),
  list: (params?: { type?: string; active?: boolean; search?: string }) => apiClient.get('/hotel/room-types', { params }).then(unwrap<HotelRoomType[]>),
  getOne: (id: string) => apiClient.get('/hotel/room-types/' + id).then(unwrap<RoomTypeDetail>),
  update: (id: string, data: RoomTypeInput) => apiClient.patch('/hotel/room-types/' + id, data).then(unwrap<HotelRoomType>),
  remove: (id: string) => apiClient.delete('/hotel/room-types/' + id).then(unwrap<HotelRoomType>),
};
