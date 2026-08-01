import { apiClient } from '@core/api/client';

export type SportsBrandTier = 'PREMIUM' | 'MID_RANGE' | 'ECONOMY' | 'LOCAL';

export interface SportsBrand {
  id: string;
  name: string;
  code?: string;
  countryOfOrigin?: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  brandTier: SportsBrandTier;
  authorizedDealer: boolean;
  dealerCode?: string;
  supportPhone?: string;
  supportEmail?: string;
  warrantyPolicy?: string;
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

export const sportsBrandsApi = {
  create: (data: Partial<SportsBrand>) =>
    apiClient.post('/sports/brands', data).then(unwrap<SportsBrand>),

  list: (params?: { featured?: boolean; authorized?: boolean; tier?: string; active?: boolean; search?: string }) =>
    apiClient.get('/sports/brands', { params }).then(unwrap<SportsBrand[]>),

  getOne: (id: string) =>
    apiClient.get('/sports/brands/' + id).then(unwrap<SportsBrand>),

  update: (id: string, data: Partial<SportsBrand>) =>
    apiClient.patch('/sports/brands/' + id, data).then(unwrap<SportsBrand>),

  toggleFeatured: (id: string) =>
    apiClient.post('/sports/brands/' + id + '/toggle-featured').then(unwrap<SportsBrand>),

  remove: (id: string) =>
    apiClient.delete('/sports/brands/' + id).then(unwrap),

  topBrands: (limit = 10) =>
    apiClient.get('/sports/brands/top', { params: { limit } }).then(unwrap<SportsBrand[]>),

  byTier: () =>
    apiClient.get('/sports/brands/by-tier').then(unwrap<any[]>),
};
