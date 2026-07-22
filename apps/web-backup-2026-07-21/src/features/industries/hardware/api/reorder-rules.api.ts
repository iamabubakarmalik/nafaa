import { apiClient } from '@/api/client';

export interface ReorderRule {
  id: string;
  productId: string;
  minStock: number;
  reorderPoint: number;
  reorderQty: number;
  maxStock?: number;
  preferredSupplier?: string;
  leadTimeDays?: number;
  emergencyContact?: string;
  autoAlert: boolean;
  lastAlertAt?: string;
  isActive: boolean;
  product?: any;
  currentStock?: number;
  needsReorder?: boolean;
  stockDeficit?: number;
  severity?: 'OK' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const reorderRulesApi = {
  upsert: (data: Partial<ReorderRule>) => apiClient.post('/hardware/reorder-rules', data).then(unwrap<ReorderRule>),
  list: (params?: { active?: boolean; needsReorder?: boolean }) => apiClient.get('/hardware/reorder-rules', { params }).then(unwrap<ReorderRule[]>),
  lowStockAlerts: () => apiClient.get('/hardware/reorder-rules/low-stock-alerts').then(unwrap<any>),
  byProduct: (productId: string) => apiClient.get('/hardware/reorder-rules/by-product/' + productId).then(unwrap<ReorderRule | null>),
  getOne: (id: string) => apiClient.get('/hardware/reorder-rules/' + id).then(unwrap<ReorderRule>),
  markAlerted: (id: string) => apiClient.post('/hardware/reorder-rules/' + id + '/mark-alerted').then(unwrap<ReorderRule>),
  remove: (id: string) => apiClient.delete('/hardware/reorder-rules/' + id).then(unwrap),
};
