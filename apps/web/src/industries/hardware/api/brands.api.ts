import { apiClient } from '@core/api/client';

export type BrandTier = 'PREMIUM' | 'STANDARD' | 'ECONOMY' | 'IMPORTED' | 'LOCAL';

export interface HardwareBrand {
  id: string;
  name: string;
  code?: string;
  tier: BrandTier;
  countryOfOrigin?: string;
  description?: string;
  logoUrl?: string;
  supplierContact?: string;
  supplierPhone?: string;
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
  totalProducts: number;
  totalRevenue: number;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const hardwareBrandsApi = {
  create: (data: Partial<HardwareBrand>) => apiClient.post('/hardware/brands', data).then(unwrap<HardwareBrand>),
  list: (params?: any) => apiClient.get('/hardware/brands', { params }).then(unwrap<HardwareBrand[]>),
  getOne: (id: string) => apiClient.get('/hardware/brands/' + id).then(unwrap<HardwareBrand>),
  update: (id: string, data: Partial<HardwareBrand>) => apiClient.patch('/hardware/brands/' + id, data).then(unwrap<HardwareBrand>),
  toggleFeatured: (id: string) => apiClient.post('/hardware/brands/' + id + '/toggle-featured').then(unwrap<HardwareBrand>),
  remove: (id: string) => apiClient.delete('/hardware/brands/' + id).then(unwrap),
};
