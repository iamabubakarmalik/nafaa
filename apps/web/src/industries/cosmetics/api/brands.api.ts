import { apiClient } from '@core/api/client';

export interface CosmeticsBrand {
  id: string;
  name: string;
  code?: string;
  countryOfOrigin?: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  isPremium: boolean;
  isCrueltyFree: boolean;
  isVegan: boolean;
  isOrganic: boolean;
  isHalalCertified: boolean;
  isDermatologistTested: boolean;
  authorizedDealer: boolean;
  dealerCode?: string;
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

export const cosmeticsBrandsApi = {
  create: (data: Partial<CosmeticsBrand>) =>
    apiClient.post('/cosmetics/brands', data).then(unwrap<CosmeticsBrand>),

  list: (params?: {
    featured?: boolean; premium?: boolean; crueltyFree?: boolean;
    vegan?: boolean; organic?: boolean; halal?: boolean;
    authorized?: boolean; active?: boolean; search?: string;
  }) => apiClient.get('/cosmetics/brands', { params }).then(unwrap<CosmeticsBrand[]>),

  getOne: (id: string) =>
    apiClient.get('/cosmetics/brands/' + id).then(unwrap<CosmeticsBrand>),

  update: (id: string, data: Partial<CosmeticsBrand>) =>
    apiClient.patch('/cosmetics/brands/' + id, data).then(unwrap<CosmeticsBrand>),

  toggleFeatured: (id: string) =>
    apiClient.post('/cosmetics/brands/' + id + '/toggle-featured').then(unwrap<CosmeticsBrand>),

  remove: (id: string) => apiClient.delete('/cosmetics/brands/' + id).then(unwrap),

  topBrands: (limit = 10) =>
    apiClient.get('/cosmetics/brands/top', { params: { limit } }).then(unwrap<CosmeticsBrand[]>),

  certified: () => apiClient.get('/cosmetics/brands/certified').then(unwrap<any>),
};
