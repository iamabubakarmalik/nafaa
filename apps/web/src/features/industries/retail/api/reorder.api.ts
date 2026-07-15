import { apiClient } from '@/api/client';

export interface ReorderSuggestion {
  id: string;
  productId: string;
  variantId?: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQuantity: number;
  avgDailySales: number;
  daysOfStockLeft: number;
  lastPurchasePrice: number;
  preferredSupplierId?: string;
  status: 'PENDING' | 'ORDERED' | 'IGNORED';
  createdAt: string;
  product?: any;
  supplier?: any;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const reorderApi = {
  generate: () =>
    apiClient.post('/retail/reorder/generate').then(unwrap<{ generated: number }>),

  list: (status?: string) =>
    apiClient
      .get('/retail/reorder', { params: status ? { status } : {} })
      .then(unwrap<ReorderSuggestion[]>),

  updateStatus: (id: string, status: string) =>
    apiClient.patch('/retail/reorder/' + id + '/status', { status }).then(unwrap),

  remove: (id: string) =>
    apiClient.delete('/retail/reorder/' + id).then(unwrap),
};
