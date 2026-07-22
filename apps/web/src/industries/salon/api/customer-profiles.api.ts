import { apiClient } from '@core/api/client';

export interface SalonCustomerProfile {
  id: string;
  customerId: string;
  hairType?: string;
  hairLength?: string;
  hairColor?: string;
  hairTexture?: string;
  skinType?: string;
  skinTone?: string;
  allergies: string[];
  preferredStaffId?: string;
  preferredServices: string[];
  favoriteBrands: string[];
  medicalConditions?: string;
  medications?: string;
  pregnancyStatus?: string;
  totalVisits: number;
  totalSpent: number;
  lastVisitAt?: string;
  avgRating?: number;
  notes?: string;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const salonCustomerProfilesApi = {
  upsert: (data: Partial<SalonCustomerProfile>) => apiClient.post('/salon/customer-profiles', data).then(unwrap<SalonCustomerProfile>),
  list: (params?: { search?: string }) => apiClient.get('/salon/customer-profiles', { params }).then(unwrap<SalonCustomerProfile[]>),
  byCustomer: (customerId: string) => apiClient.get('/salon/customer-profiles/by-customer/' + customerId).then(unwrap<SalonCustomerProfile | null>),
};
