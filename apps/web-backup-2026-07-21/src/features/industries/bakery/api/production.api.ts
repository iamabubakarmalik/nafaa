import { apiClient } from '@/api/client';

export interface ProductionItem {
  id?: string;
  productId?: string;
  productName: string;
  category?: string;
  cakeOrderId?: string;
  plannedQty: number;
  producedQty: number;
  failedQty: number;
  bakerId?: string;
  bakerName?: string;
  status: string;
  batchNumber?: string;
  ovenNumber?: string;
  bakingStartTime?: string;
  bakingEndTime?: string;
  bakingTempC?: number;
  bakingDurationMin?: number;
  qualityGrade?: string;
  qualityCheckBy?: string;
  qualityNotes?: string;
  ingredientsUsed?: any;
  totalCost: number;
  notes?: string;
}

export interface ProductionPlan {
  id: string;
  planNumber: string;
  planDate: string;
  shift?: string;
  headBakerId?: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  totalCost: number;
  notes?: string;
  items: ProductionItem[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const productionApi = {
  createPlan: (data: any) => apiClient.post('/bakery/production/plans', data).then(unwrap<ProductionPlan>),
  listPlans: (params?: any) => apiClient.get('/bakery/production/plans', { params }).then(unwrap<ProductionPlan[]>),
  today: () => apiClient.get('/bakery/production/today').then(unwrap<ProductionPlan[]>),
  getPlan: (id: string) => apiClient.get('/bakery/production/plans/' + id).then(unwrap<ProductionPlan>),
  updatePlan: (id: string, data: any) => apiClient.patch('/bakery/production/plans/' + id, data).then(unwrap<ProductionPlan>),
  startPlan: (id: string) => apiClient.post('/bakery/production/plans/' + id + '/start').then(unwrap<ProductionPlan>),
  completePlan: (id: string) => apiClient.post('/bakery/production/plans/' + id + '/complete').then(unwrap<ProductionPlan>),
  updateItem: (itemId: string, data: any) => apiClient.patch('/bakery/production/items/' + itemId, data).then(unwrap<ProductionItem>),
  startBaking: (itemId: string, data: { bakingTempC?: number; ovenNumber?: string }) =>
    apiClient.post('/bakery/production/items/' + itemId + '/start-baking', data).then(unwrap<ProductionItem>),
  completeItem: (itemId: string, data: any) =>
    apiClient.post('/bakery/production/items/' + itemId + '/complete', data).then(unwrap<ProductionItem>),
};
