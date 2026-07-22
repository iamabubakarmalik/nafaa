import { apiClient } from '@/api/client';

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
  description?: string;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  bedType: BedType;
  bedCount: number;
  extraBedAllowed: boolean;
  extraBedPrice: number;
  sizeSqft?: number;
  sizeSqm?: number;
  basePrice: number;
  weekendPrice?: number;
  peakPrice?: number;
  offSeasonPrice?: number;
  hourlyPrice?: number;
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
  rooms?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const roomTypesApi = {
  create: (data: Partial<HotelRoomType>) => apiClient.post('/hotel/room-types', data).then(unwrap<HotelRoomType>),
  list: (params?: any) => apiClient.get('/hotel/room-types', { params }).then(unwrap<HotelRoomType[]>),
  getOne: (id: string) => apiClient.get('/hotel/room-types/' + id).then(unwrap<HotelRoomType>),
  update: (id: string, data: Partial<HotelRoomType>) => apiClient.patch('/hotel/room-types/' + id, data).then(unwrap<HotelRoomType>),
  remove: (id: string) => apiClient.delete('/hotel/room-types/' + id).then(unwrap),
};
