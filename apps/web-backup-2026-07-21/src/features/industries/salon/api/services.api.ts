import { apiClient } from '@/api/client';

export type ServiceCategory = 'HAIR_CUT' | 'HAIR_COLOR' | 'HAIR_TREATMENT' | 'HAIR_STYLING'
  | 'BEARD_SHAVE' | 'FACIAL' | 'MAKEUP' | 'BRIDAL_MAKEUP' | 'PARTY_MAKEUP'
  | 'MANICURE' | 'PEDICURE' | 'NAIL_ART' | 'WAXING' | 'THREADING' | 'MASSAGE'
  | 'BODY_TREATMENT' | 'SPA_PACKAGE' | 'MEHNDI' | 'HAIR_EXTENSION' | 'KERATIN' | 'BOTOX' | 'OTHER';

export interface SalonService {
  id: string;
  name: string;
  code?: string;
  category: ServiceCategory;
  description?: string;
  price: number;
  discountPrice?: number;
  costPrice?: number;
  durationMinutes: number;
  bufferBefore: number;
  bufferAfter: number;
  forMen: boolean;
  forWomen: boolean;
  forKids: boolean;
  commissionPct: number;
  commissionFixed: number;
  imageUrl?: string;
  displayOrder: number;
  isPopular: boolean;
  isFeatured: boolean;
  isActive: boolean;
  totalBookings: number;
  totalRevenue: number;
  avgRating?: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const salonServicesApi = {
  create: (data: Partial<SalonService>) => apiClient.post('/salon/services', data).then(unwrap<SalonService>),
  list: (params?: any) => apiClient.get('/salon/services', { params }).then(unwrap<SalonService[]>),
  byCategory: () => apiClient.get('/salon/services/by-category').then(unwrap<Record<string, SalonService[]>>),
  getOne: (id: string) => apiClient.get('/salon/services/' + id).then(unwrap<SalonService>),
  update: (id: string, data: Partial<SalonService>) => apiClient.patch('/salon/services/' + id, data).then(unwrap<SalonService>),
  remove: (id: string) => apiClient.delete('/salon/services/' + id).then(unwrap),
};
