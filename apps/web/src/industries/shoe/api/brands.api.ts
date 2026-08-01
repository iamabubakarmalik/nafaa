import { apiClient } from '@core/api/client';

export interface ShoeBrand {
  id: string;
  name: string;
  code?: string;
  countryOfOrigin?: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  isPremium: boolean;
  isSportsBrand: boolean;
  isLocal: boolean;
  authorizedDealer: boolean;
  dealerCode?: string;
  warrantyPolicy?: string;
  returnPolicy?: string;
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
  totalRevenue: number;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const shoeBrandsApi = {
  create: (data: Partial<ShoeBrand>) =>
    apiClient.post('/shoe/brands', data).then(unwrap<ShoeBrand>),

  list: (params?: {
    featured?: boolean; premium?: boolean; sports?: boolean;
    local?: boolean; authorized?: boolean; active?: boolean; search?: string;
  }) => apiClient.get('/shoe/brands', { params }).then(unwrap<ShoeBrand[]>),

  getOne: (id: string) =>
    apiClient.get('/shoe/brands/' + id).then(unwrap<ShoeBrand>),

  update: (id: string, data: Partial<ShoeBrand>) =>
    apiClient.patch('/shoe/brands/' + id, data).then(unwrap<ShoeBrand>),

  toggleFeatured: (id: string) =>
    apiClient.post('/shoe/brands/' + id + '/toggle-featured').then(unwrap<ShoeBrand>),

  remove: (id: string) =>
    apiClient.delete('/shoe/brands/' + id).then(unwrap),

  topBrands: (limit = 10) =>
    apiClient.get('/shoe/brands/top', { params: { limit } }).then(unwrap<ShoeBrand[]>),
};
