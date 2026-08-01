import { apiClient } from '@core/api/client';

export interface ApplianceBrand {
  id: string;
  name: string;
  code?: string;
  countryOfOrigin?: string;
  description?: string;
  logoUrl?: string;
  authorizedDealer: boolean;
  dealerCode?: string;
  serviceCenter?: string;
  serviceContact?: string;
  serviceEmail?: string;
  warrantyPolicy?: string;
  installationIncluded: boolean;
  demoIncluded: boolean;
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
  totalRevenue: number;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const applianceBrandsApi = {
  create: (data: Partial<ApplianceBrand>) =>
    apiClient.post('/appliances/brands', data).then(unwrap<ApplianceBrand>),
  list: (params?: { featured?: boolean; authorized?: boolean; active?: boolean; search?: string }) =>
    apiClient.get('/appliances/brands', { params }).then(unwrap<ApplianceBrand[]>),
  getOne: (id: string) =>
    apiClient.get('/appliances/brands/' + id).then(unwrap<ApplianceBrand>),
  update: (id: string, data: Partial<ApplianceBrand>) =>
    apiClient.patch('/appliances/brands/' + id, data).then(unwrap<ApplianceBrand>),
  remove: (id: string) =>
    apiClient.delete('/appliances/brands/' + id).then(unwrap),
};
