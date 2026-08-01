import { apiClient } from '@core/api/client';

export interface CosmeticsGiftBundle {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  occasion?: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number; product?: any }>;
  originalPrice: number;
  bundlePrice: number;
  savings: number;
  hasGiftWrap: boolean;
  giftWrapCost: number;
  includesGreetingCard: boolean;
  isActive: boolean;
  isFeatured: boolean;
  validFrom?: string;
  validUntil?: string;
  totalSold: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const cosmeticsGiftBundlesApi = {
  create: (data: Partial<CosmeticsGiftBundle>) =>
    apiClient.post('/cosmetics/gift-bundles', data).then(unwrap<CosmeticsGiftBundle>),

  list: (params?: { active?: boolean; featured?: boolean; occasion?: string; search?: string }) =>
    apiClient.get('/cosmetics/gift-bundles', { params }).then(unwrap<CosmeticsGiftBundle[]>),

  byOccasion: () => apiClient.get('/cosmetics/gift-bundles/by-occasion').then(unwrap<Record<string, number>>),

  getOne: (id: string) => apiClient.get('/cosmetics/gift-bundles/' + id).then(unwrap<CosmeticsGiftBundle>),

  update: (id: string, data: Partial<CosmeticsGiftBundle>) =>
    apiClient.patch('/cosmetics/gift-bundles/' + id, data).then(unwrap<CosmeticsGiftBundle>),

  remove: (id: string) => apiClient.delete('/cosmetics/gift-bundles/' + id).then(unwrap),
};
