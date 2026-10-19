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

export type ProfileInput = Partial<Pick<SalonCustomerProfile, 'hairType' | 'hairLength' | 'hairColor' | 'hairTexture' | 'skinType' | 'skinTone'
  | 'allergies' | 'preferredStaffId' | 'favoriteBrands' | 'medicalConditions' | 'medications' | 'notes'>> & { customerId: string };

export type ProfileView = 'all' | 'regular' | 'away' | 'allergy';

export interface ProfileRow {
  customer: { id: string; name: string; phone?: string | null; balance: number };
  profile: SalonCustomerProfile | null;
}

export interface ProfilePage {
  items: ProfileRow[]; total: number; page: number; limit: number; pages: number; counts: Record<ProfileView, number>;
}

export interface CustomerHistory {
  customer: { id: string; name: string; phone?: string | null; balance: number; createdAt: string };
  profile: SalonCustomerProfile | null;
  stats: { visits: number; spent: number; lastVisit: string | null; favouriteStylist: string | null; favouriteService: string | null; everyDays: number | null; noShows: number };
  visits: Array<{
    id: string; appointmentNumber: string; status: string; at: string; total: number; paidAmount: number;
    sale: { id: string; saleNumber: string; status: string; total: number } | null;
    services: Array<{ serviceName: string; staffName?: string | null; total: number; notes?: string | null; productsUsed?: Array<{ name: string; unit: string; quantity: number }> | null }>;
  }>;
  packages: Array<{ id: string; purchaseNumber: string; status: string; sessionsRemaining: number; expiryDate: string; package: { name: string; totalSessions: number } }>;
  memberships: Array<{ id: string; membershipNumber: string; status: string; expiryDate: string; plan: { name: string; tier: string; discountPct: number } }>;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const salonCustomerProfilesApi = {
  upsert: (data: ProfileInput) => apiClient.post('/salon/customer-profiles', data).then(unwrap<SalonCustomerProfile>),
  page: (params: { search?: string; view?: ProfileView; page?: number; limit?: number }) =>
    apiClient.get('/salon/customer-profiles/page', { params }).then(unwrap<ProfilePage>),
  history: (customerId: string) => apiClient.get('/salon/customer-profiles/by-customer/' + customerId + '/history').then(unwrap<CustomerHistory>),
  byCustomer: (customerId: string) => apiClient.get('/salon/customer-profiles/by-customer/' + customerId).then(unwrap<SalonCustomerProfile | null>),
};
