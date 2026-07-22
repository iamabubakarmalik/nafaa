import { apiClient } from '@/api/client';

export interface SizeChart {
  id: string;
  name: string;
  categoryType?: string;
  gender?: string;
  unit: 'INCH' | 'CM';
  description?: string;
  rows: any;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const sizeChartsApi = {
  create: (data: Partial<SizeChart>) =>
    apiClient.post('/garments/size-charts', data).then(unwrap<SizeChart>),
  list: (params?: { categoryType?: string; gender?: string; active?: boolean }) =>
    apiClient.get('/garments/size-charts', { params }).then(unwrap<SizeChart[]>),
  getOne: (id: string) =>
    apiClient.get('/garments/size-charts/' + id).then(unwrap<SizeChart>),
  update: (id: string, data: Partial<SizeChart>) =>
    apiClient.patch('/garments/size-charts/' + id, data).then(unwrap<SizeChart>),
  remove: (id: string) =>
    apiClient.delete('/garments/size-charts/' + id).then(unwrap),
};
