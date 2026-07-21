import { apiClient } from '@/api/client';

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  code?: string;
  brand?: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  reorderLevel?: number;
  costPerUnit: number;
  lastPurchaseDate?: string;
  lastPurchasePrice?: number;
  lastVendorName?: string;
  shelfLifeDays?: number;
  storageMethod?: string;
  requiresRefrigeration: boolean;
  isCritical: boolean;
  isOrganic: boolean;
  isImported: boolean;
  countryOfOrigin?: string;
  supplierName?: string;
  supplierPhone?: string;
  totalPurchased: number;
  totalConsumed: number;
  totalWasted: number;
  isActive: boolean;
  imageUrl?: string;
  notes?: string;
  transactions?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const ingredientsApi = {
  create: (data: Partial<Ingredient>) => apiClient.post('/bakery/ingredients', data).then(unwrap<Ingredient>),
  list: (params?: any) => apiClient.get('/bakery/ingredients', { params }).then(unwrap<Ingredient[]>),
  lowStock: () => apiClient.get('/bakery/ingredients/low-stock').then(unwrap<Ingredient[]>),
  getOne: (id: string) => apiClient.get('/bakery/ingredients/' + id).then(unwrap<Ingredient>),
  transactions: (id: string) => apiClient.get('/bakery/ingredients/' + id + '/transactions').then(unwrap<any[]>),
  update: (id: string, data: Partial<Ingredient>) => apiClient.patch('/bakery/ingredients/' + id, data).then(unwrap<Ingredient>),
  remove: (id: string) => apiClient.delete('/bakery/ingredients/' + id).then(unwrap),
  purchase: (id: string, data: { quantity: number; costPerUnit: number; vendorName?: string; notes?: string }) =>
    apiClient.post('/bakery/ingredients/' + id + '/purchase', data).then(unwrap<Ingredient>),
  consume: (id: string, data: { quantity: number; productionItemId?: string; cakeOrderId?: string; batchNumber?: string; notes?: string }) =>
    apiClient.post('/bakery/ingredients/' + id + '/consume', data).then(unwrap<Ingredient>),
  waste: (id: string, data: { quantity: number; reason: string }) =>
    apiClient.post('/bakery/ingredients/' + id + '/waste', data).then(unwrap<Ingredient>),
  adjust: (id: string, data: { newStock: number; reason: string }) =>
    apiClient.post('/bakery/ingredients/' + id + '/adjust', data).then(unwrap<Ingredient>),
};
