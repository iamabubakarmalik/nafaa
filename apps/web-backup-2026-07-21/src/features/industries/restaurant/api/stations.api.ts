import { apiClient } from '@/api/client';

export interface KitchenStation {
  id: string;
  name: string;
  code?: string;
  printerName?: string;
  categoryIds: string[];
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const stationsApi = {
  create: (data: Partial<KitchenStation>) =>
    apiClient.post('/restaurant/stations', data).then(unwrap<KitchenStation>),

  list: () => apiClient.get('/restaurant/stations').then(unwrap<KitchenStation[]>),

  update: (id: string, data: Partial<KitchenStation>) =>
    apiClient.patch('/restaurant/stations/' + id, data).then(unwrap<KitchenStation>),

  remove: (id: string) => apiClient.delete('/restaurant/stations/' + id).then(unwrap),
};
