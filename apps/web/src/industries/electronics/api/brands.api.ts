import { apiClient } from '@core/api/client';

export interface ElectronicsBrand {
  id: string;
  name: string;
  code?: string;
  countryOfOrigin?: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  authorizedDealer: boolean;
  dealerCode?: string;
  supportContact?: string;
  supportPhone?: string;
  supportEmail?: string;
  warrantyPolicy?: string;
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
  totalRevenue: number;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const electronicsBrandsApi = {
  create: (data: Partial<ElectronicsBrand>) =>
    apiClient.post('/electronics/brands', data).then(unwrap<ElectronicsBrand>),

  list: (params?: { featured?: boolean; authorized?: boolean; active?: boolean; search?: string }) =>
    apiClient.get('/electronics/brands', { params }).then(unwrap<ElectronicsBrand[]>),

  getOne: (id: string) =>
    apiClient.get('/electronics/brands/' + id).then(unwrap<ElectronicsBrand>),

  update: (id: string, data: Partial<ElectronicsBrand>) =>
    apiClient.patch('/electronics/brands/' + id, data).then(unwrap<ElectronicsBrand>),

  toggleFeatured: (id: string) =>
    apiClient.post('/electronics/brands/' + id + '/toggle-featured').then(unwrap<ElectronicsBrand>),

  remove: (id: string) =>
    apiClient.delete('/electronics/brands/' + id).then(unwrap),

  topBrands: (limit = 10) =>
    apiClient.get('/electronics/brands/top', { params: { limit } }).then(unwrap<ElectronicsBrand[]>),
};
