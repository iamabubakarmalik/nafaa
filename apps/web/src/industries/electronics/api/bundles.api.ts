import { apiClient } from '@core/api/client';

export interface ElectronicsBundle {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number; product?: any }>;
  originalPrice: number;
  bundlePrice: number;
  savings: number;
  savingsPct: number;
  isFeatured: boolean;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  soldCount?: number;
  totalRevenue?: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const electronicsBundlesApi = {
  create: (data: Partial<ElectronicsBundle>) =>
    apiClient.post('/electronics/bundles', data).then(unwrap<ElectronicsBundle>),

  list: (params?: { active?: boolean; featured?: boolean; search?: string }) =>
    apiClient.get('/electronics/bundles', { params }).then(unwrap<ElectronicsBundle[]>),

  getOne: (id: string) =>
    apiClient.get('/electronics/bundles/' + id).then(unwrap<ElectronicsBundle>),

  update: (id: string, data: Partial<ElectronicsBundle>) =>
    apiClient.patch('/electronics/bundles/' + id, data).then(unwrap<ElectronicsBundle>),

  remove: (id: string) =>
    apiClient.delete('/electronics/bundles/' + id).then(unwrap),
};
