/**
 * POS quick keys: the counter loads the active keys for its branch; the
 * setup page loads every key (switched off too) and saves, reorders and
 * deletes them.
 */

import { apiClient } from '@core/api/client';

export interface QuickKey {
  id: string;
  /** Set when the key is personal; null for a shared key. */
  userId?: string | null;
  /** Set when the key shows only in one branch. */
  shopId?: string | null;
  productId?: string | null;
  comboId?: string | null;
  variantId?: string | null;
  unitId?: string | null;
  label: string;
  color?: string | null;
  icon?: string | null;
  position: number;
  hotkey?: string | null;
  group?: string | null;
  isActive: boolean;
}

export interface QuickKeyPayload {
  productId?: string | null;
  comboId?: string | null;
  variantId?: string | null;
  unitId?: string | null;
  label: string;
  /** null clears the colour. */
  color?: string | null;
  icon?: string;
  group?: string;
  shopId?: string | null;
  isActive?: boolean;
  personal?: boolean;
  position?: number;
}

const unwrap = <T,>(res: { data: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const quickKeysApi = {
  /** Active keys for the counter. */
  list: (shopId?: string) =>
    apiClient.get('/retail/quick-keys', { params: shopId ? { shopId } : {} }).then(unwrap<QuickKey[]>),

  /** Every key this person can edit, switched-off keys included. */
  manage: () =>
    apiClient.get('/retail/quick-keys', { params: { manage: 1 } }).then(unwrap<QuickKey[]>),

  create: (data: QuickKeyPayload) =>
    apiClient.post('/retail/quick-keys', data).then(unwrap<QuickKey>),

  update: (id: string, data: Partial<QuickKeyPayload>) =>
    apiClient.patch('/retail/quick-keys/' + id, data).then(unwrap<QuickKey>),

  remove: (id: string) =>
    apiClient.delete('/retail/quick-keys/' + id).then(unwrap<QuickKey>),

  reorder: (items: { id: string; position: number }[]) =>
    apiClient.post('/retail/quick-keys/reorder', { items }).then(unwrap<{ updated: number }>),
};
