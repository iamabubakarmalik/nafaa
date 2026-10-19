import { apiClient } from '@core/api/client';

export type SizeRow = { size: string } & Record<string, string | number>;

export interface SizeChart {
  id: string;
  name: string;
  categoryType?: string | null;
  gender?: string | null;
  unit: 'INCH' | 'CM';
  description?: string | null;
  rows: SizeRow[];
  isDefault: boolean;
  isActive: boolean;
  productCount?: number;
  updatedAt: string;
}

export interface SizeChartInput {
  name: string;
  categoryType?: string;
  gender?: string;
  unit: 'INCH' | 'CM';
  description?: string;
  rows: SizeRow[];
  isDefault?: boolean;
  isActive?: boolean;
}

const unwrap = <T,>(res: { data: { data: T } }): T => res.data.data;

export const sizeChartsApi = {
  create: (data: SizeChartInput) => apiClient.post('/garments/size-charts', data).then(unwrap<SizeChart>),
  list: (params?: { categoryType?: string; gender?: string; active?: boolean }) =>
    apiClient.get('/garments/size-charts', { params }).then(unwrap<SizeChart[]>),
  update: (id: string, data: SizeChartInput) => apiClient.patch('/garments/size-charts/' + id, data).then(unwrap<SizeChart>),
  remove: (id: string) => apiClient.delete('/garments/size-charts/' + id).then(unwrap<SizeChart>),
};
