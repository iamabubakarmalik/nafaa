import { apiClient } from '@core/api/client';
import type { BookingStatus } from './bookings.api';

export interface HotelGuest {
  id: string;
  guestNumber: string;
  customerId?: string | null;
  title?: string | null;
  firstName: string;
  lastName?: string | null;
  fullName: string;
  email?: string | null;
  phone: string;
  altPhone?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  idExpiryDate?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  companyName?: string | null;
  designation?: string | null;
  isVIP: boolean;
  specialRequests?: string | null;
  isBlacklisted: boolean;
  blacklistReason?: string | null;
  totalStays: number;
  totalNights: number;
  totalSpent: number;
  lastStayAt?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type GuestView = 'all' | 'vip' | 'company' | 'repeat' | 'noid' | 'blacklisted';

export interface GuestStats { total: number; vip: number; blacklisted: number; company: number; repeat: number; noId: number; inHouse: number }

export interface GuestPage {
  items: Array<HotelGuest & { inHouse: { bookingId: string; rooms: string } | null }>;
  total: number;
  page: number;
  pages: number;
  counts: GuestStats;
}

export interface GuestDetail extends HotelGuest {
  stays: Array<{ id: string; bookingNumber: string; status: BookingStatus; checkInDate: string; checkOutDate: string; nights: number; grandTotal: number; balanceAmount: number; bookedRooms: Array<{ roomNumber: string | null }> }>;
  khata: { id: string; name: string; balance: number } | null;
}

export type GuestInput = Partial<Pick<HotelGuest,
  'title' | 'firstName' | 'lastName' | 'email' | 'phone' | 'altPhone' | 'idType' | 'idNumber' | 'idExpiryDate' | 'dateOfBirth' | 'gender'
  | 'nationality' | 'address' | 'city' | 'country' | 'companyName' | 'designation' | 'isVIP' | 'specialRequests' | 'notes'>> & { fullName?: string; customerId?: string };

const unwrap = <T,>(res: { data: unknown }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const guestsApi = {
  create: (data: GuestInput) => apiClient.post('/hotel/guests', data).then(unwrap<HotelGuest>),
  list: (params?: { search?: string; isVIP?: boolean; isBlacklisted?: boolean; customerId?: string }) => apiClient.get('/hotel/guests', { params }).then(unwrap<HotelGuest[]>),
  page: (params: { view?: GuestView; search?: string; sort?: string; page?: number; limit?: number }) => apiClient.get('/hotel/guests/page', { params }).then(unwrap<GuestPage>),
  stats: () => apiClient.get('/hotel/guests/stats').then(unwrap<GuestStats>),
  getOne: (id: string) => apiClient.get('/hotel/guests/' + id).then(unwrap<GuestDetail>),
  update: (id: string, data: GuestInput) => apiClient.patch('/hotel/guests/' + id, data).then(unwrap<HotelGuest>),
  blacklist: (id: string, reason: string) => apiClient.post('/hotel/guests/' + id + '/blacklist', { reason }).then(unwrap<HotelGuest>),
  unblacklist: (id: string) => apiClient.post('/hotel/guests/' + id + '/unblacklist').then(unwrap<HotelGuest>),
  remove: (id: string) => apiClient.delete('/hotel/guests/' + id).then(unwrap<HotelGuest>),
};
