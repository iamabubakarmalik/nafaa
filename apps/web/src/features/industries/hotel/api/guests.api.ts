import { apiClient } from '@/api/client';

export interface HotelGuest {
  id: string;
  guestNumber: string;
  customerId?: string;
  title?: string;
  firstName: string;
  lastName?: string;
  fullName: string;
  email?: string;
  phone: string;
  altPhone?: string;
  idType?: string;
  idNumber?: string;
  idExpiryDate?: string;
  idFrontUrl?: string;
  idBackUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  language?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  companyName?: string;
  designation?: string;
  gstNumber?: string;
  isVIP: boolean;
  vipLevel?: string;
  loyaltyNumber?: string;
  loyaltyPoints: number;
  preferences?: any;
  allergies: string[];
  dietaryRestrictions: string[];
  specialRequests?: string;
  isBlacklisted: boolean;
  blacklistReason?: string;
  totalStays: number;
  totalNights: number;
  totalSpent: number;
  lastStayAt?: string;
  photoUrl?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const guestsApi = {
  create: (data: Partial<HotelGuest>) => apiClient.post('/hotel/guests', data).then(unwrap<HotelGuest>),
  list: (params?: any) => apiClient.get('/hotel/guests', { params }).then(unwrap<HotelGuest[]>),
  stats: () => apiClient.get('/hotel/guests/stats').then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/hotel/guests/' + id).then(unwrap<HotelGuest>),
  update: (id: string, data: Partial<HotelGuest>) => apiClient.patch('/hotel/guests/' + id, data).then(unwrap<HotelGuest>),
  blacklist: (id: string, reason: string) => apiClient.post('/hotel/guests/' + id + '/blacklist', { reason }).then(unwrap<HotelGuest>),
  unblacklist: (id: string) => apiClient.post('/hotel/guests/' + id + '/unblacklist').then(unwrap<HotelGuest>),
  remove: (id: string) => apiClient.delete('/hotel/guests/' + id).then(unwrap),
};
