import { apiClient } from '@core/api/client';

export type ComboStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'DRAFT';

export interface ComboItem {
  id?: string;
  productId: string;
  variantId?: string;
  unitId?: string;
  quantity: number;
  unitName?: string;
  originalPrice?: number;
  product?: any;
  variant?: any;
  unit?: any;
}

export interface ProductCombo {
  id: string;
  name: string;
  slug?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  imageUrl?: string;
  categoryId?: string;
  comboPrice: number;
  originalTotal: number;
  savingsAmount: number;
  savingsPercentage: number;
  status: ComboStatus;
  validFrom?: string;
  validTo?: string;
  maxPurchasePerCustomer?: number;
  stockAvailable?: number;
  soldCount: number;
  totalRevenue: number;
  isFeatured: boolean;
  sortOrder: number;
  tagLine?: string;
  isActive: boolean;
  items: ComboItem[];
  category?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const combosApi = {
  create: (data: Partial<ProductCombo>) =>
    apiClient.post('/retail/combos', data).then(unwrap<ProductCombo>),

  list: (params?: { status?: string; featured?: boolean; search?: string }) =>
    apiClient.get('/retail/combos', { params }).then(unwrap<ProductCombo[]>),

  getOne: (id: string) =>
    apiClient.get('/retail/combos/' + id).then(unwrap<ProductCombo>),

  update: (id: string, data: Partial<ProductCombo>) =>
    apiClient.patch('/retail/combos/' + id, data).then(unwrap<ProductCombo>),

  remove: (id: string) => apiClient.delete('/retail/combos/' + id).then(unwrap),

  toggleFeatured: (id: string) =>
    apiClient.post('/retail/combos/' + id + '/toggle-featured').then(unwrap<ProductCombo>),
};
