import { apiClient } from '@core/api/client';

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
  discountPrice?: number | null;
  costPrice?: number | null;
  durationMinutes: number;
  bufferBefore: number;
  bufferAfter: number;
  forMen: boolean;
  forWomen: boolean;
  forKids: boolean;
  commissionPct: number;
  commissionFixed: number;
  imageUrl?: string | null;
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

export type SalonServiceInput = Pick<SalonService, 'name' | 'category' | 'price' | 'durationMinutes' | 'bufferBefore' | 'bufferAfter'
  | 'forMen' | 'forWomen' | 'forKids' | 'commissionPct' | 'commissionFixed' | 'displayOrder' | 'isPopular' | 'isFeatured' | 'isActive'>
  & { code?: string; description?: string; discountPrice?: number | null; costPrice?: number | null; imageUrl?: string | null };

export interface SalonServiceStats {
  service: SalonService;
  productId: string | null;
  last90: { count: number; revenue: number; commission: number };
  staff: Array<{ staffProfileId: string; name: string; count: number; revenue: number; commission: number }>;
  assigned: Array<{ staffProfileId: string; customPrice?: number | null; customDuration?: number | null; customCommissionPct?: number | null }>;
  recent: Array<{ appointmentId: string; appointmentNumber: string; customerName?: string | null; at: string; staffName?: string | null; total: number; notes?: string | null }>;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const salonServicesApi = {
  create: (data: SalonServiceInput) => apiClient.post('/salon/services', data).then(unwrap<SalonService>),
  list: (params?: { active?: boolean; category?: string; forGender?: string; search?: string }) => apiClient.get('/salon/services', { params }).then(unwrap<SalonService[]>),
  getOne: (id: string) => apiClient.get('/salon/services/' + id).then(unwrap<SalonService>),
  stats: (id: string) => apiClient.get('/salon/services/' + id + '/stats').then(unwrap<SalonServiceStats>),
  update: (id: string, data: Partial<SalonServiceInput>) => apiClient.patch('/salon/services/' + id, data).then(unwrap<SalonService>),
  remove: (id: string) => apiClient.delete('/salon/services/' + id).then(unwrap),
};
