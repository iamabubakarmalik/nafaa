import { apiClient } from '@/api/client';

export interface QuickKey {
  id: string;
  userId?: string;
  shopId?: string;
  productId?: string;
  comboId?: string;
  variantId?: string;
  unitId?: string;
  label: string;
  color?: string;
  icon?: string;
  position: number;
  hotkey?: string;
  group?: string;
  isActive: boolean;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const quickKeysApi = {
  list: (shopId?: string) =>
    apiClient
      .get('/retail/quick-keys', { params: shopId ? { shopId } : {} })
      .then(unwrap<QuickKey[]>),

  create: (data: Partial<QuickKey>) =>
    apiClient.post('/retail/quick-keys', data).then(unwrap<QuickKey>),

  update: (id: string, data: Partial<QuickKey>) =>
    apiClient.patch('/retail/quick-keys/' + id, data).then(unwrap<QuickKey>),

  remove: (id: string) =>
    apiClient.delete('/retail/quick-keys/' + id).then(unwrap),

  reorder: (items: { id: string; position: number }[]) =>
    apiClient.post('/retail/quick-keys/reorder', { items }).then(unwrap),
};
