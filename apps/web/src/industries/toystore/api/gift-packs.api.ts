import { apiClient } from '@core/api/client';

export interface ToyGiftPack {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  targetAgeGroup?: string;
  targetGender?: string;
  occasion?: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number; product?: any }>;
  itemCount: number;
  originalPrice: number;
  giftPackPrice: number;
  savings: number;
  savingsPct: number;
  isGiftWrapped: boolean;
  includesCard: boolean;
  isActive: boolean;
  isFeatured: boolean;
  isSeasonal: boolean;
  seasonName?: string;
  validFrom?: string;
  validUntil?: string;
  totalSold: number;
  computed?: { buildableUnits: number; allInStock: boolean };
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const toyGiftPacksApi = {
  create: (data: Partial<ToyGiftPack>) =>
    apiClient.post('/toystore/gift-packs', data).then(unwrap<ToyGiftPack>),

  list: (params?: {
    active?: boolean; featured?: boolean; seasonal?: boolean;
    ageGroup?: string; gender?: string; occasion?: string; search?: string;
  }) => apiClient.get('/toystore/gift-packs', { params }).then(unwrap<ToyGiftPack[]>),

  summary: () => apiClient.get('/toystore/gift-packs/summary').then(unwrap<any>),

  getOne: (id: string) =>
    apiClient.get('/toystore/gift-packs/' + id).then(unwrap<ToyGiftPack>),

  update: (id: string, data: Partial<ToyGiftPack>) =>
    apiClient.patch('/toystore/gift-packs/' + id, data).then(unwrap<ToyGiftPack>),

  duplicate: (id: string) =>
    apiClient.post('/toystore/gift-packs/' + id + '/duplicate').then(unwrap<ToyGiftPack>),

  recordSale: (id: string, quantity = 1) =>
    apiClient.post('/toystore/gift-packs/' + id + '/record-sale', { quantity }).then(unwrap<ToyGiftPack>),

  remove: (id: string) =>
    apiClient.delete('/toystore/gift-packs/' + id).then(unwrap),
};
