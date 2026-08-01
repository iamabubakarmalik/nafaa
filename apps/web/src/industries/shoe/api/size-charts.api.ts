import { apiClient } from '@core/api/client';
import type { ShoeCategoryType, ShoeGender } from './products.api';

export interface ShoeSizeChart {
  id: string;
  name: string;
  brandId?: string;
  gender?: ShoeGender;
  categoryType?: ShoeCategoryType;
  mappings: any;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const shoeSizeChartsApi = {
  create: (data: Partial<ShoeSizeChart>) =>
    apiClient.post('/shoe/size-charts', data).then(unwrap<ShoeSizeChart>),

  list: (params?: { brandId?: string; gender?: string; categoryType?: string; active?: boolean }) =>
    apiClient.get('/shoe/size-charts', { params }).then(unwrap<ShoeSizeChart[]>),

  getOne: (id: string) =>
    apiClient.get('/shoe/size-charts/' + id).then(unwrap<ShoeSizeChart>),

  update: (id: string, data: Partial<ShoeSizeChart>) =>
    apiClient.patch('/shoe/size-charts/' + id, data).then(unwrap<ShoeSizeChart>),

  remove: (id: string) =>
    apiClient.delete('/shoe/size-charts/' + id).then(unwrap),
};
