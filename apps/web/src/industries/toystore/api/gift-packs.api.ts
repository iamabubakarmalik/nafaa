import { apiClient } from '@core/api/client';

export interface ToyGiftPack {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  targetAgeGroup?: string;
  targetGender?: string;
  occasion?: string;
  items: Array<{ productId: string; variantId?: string; quantity: number; unitPrice: number; product?: any }>;
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

/** Fields the save endpoints accept (the API refuses any other field). */
export type GiftPackBody = Pick<ToyGiftPack, 'name' | 'giftPackPrice'> & Partial<Pick<ToyGiftPack,
  'description' | 'imageUrl' | 'targetAgeGroup' | 'targetGender' | 'occasion' | 'isGiftWrapped' | 'includesCard' | 'isActive' | 'isFeatured' | 'isSeasonal' | 'seasonName' | 'validFrom' | 'validUntil'>>
  & { items: Array<{ productId: string; variantId?: string; quantity: number; unitPrice?: number }> };

/** Save body of an existing pack, with optional changes. */
export function packBody(p: ToyGiftPack, patch: Partial<GiftPackBody> = {}): GiftPackBody {
  return {
    name: p.name, description: p.description ?? undefined, imageUrl: p.imageUrl ?? undefined, targetAgeGroup: p.targetAgeGroup ?? undefined,
    targetGender: p.targetGender ?? undefined, occasion: p.occasion ?? undefined, giftPackPrice: p.giftPackPrice,
    items: p.items.map((i) => ({ productId: i.productId, ...(i.variantId ? { variantId: i.variantId } : {}), quantity: i.quantity, unitPrice: i.unitPrice })),
    isGiftWrapped: p.isGiftWrapped, includesCard: p.includesCard, isActive: p.isActive, isFeatured: p.isFeatured, isSeasonal: p.isSeasonal,
    seasonName: p.seasonName ?? undefined, validFrom: p.validFrom ?? undefined, validUntil: p.validUntil ?? undefined,
    ...patch,
  };
}

export const toyGiftPacksApi = {
  create: (data: GiftPackBody) =>
    apiClient.post('/toystore/gift-packs', data).then(unwrap<ToyGiftPack>),

  list: (params?: {
    active?: boolean; featured?: boolean; seasonal?: boolean;
    ageGroup?: string; gender?: string; occasion?: string; search?: string;
  }) => apiClient.get('/toystore/gift-packs', { params }).then(unwrap<ToyGiftPack[]>),

  getOne: (id: string) =>
    apiClient.get('/toystore/gift-packs/' + id).then(unwrap<ToyGiftPack>),

  update: (id: string, data: GiftPackBody) =>
    apiClient.patch('/toystore/gift-packs/' + id, data).then(unwrap<ToyGiftPack>),

  duplicate: (id: string) =>
    apiClient.post('/toystore/gift-packs/' + id + '/duplicate').then(unwrap<ToyGiftPack>),

  recordSale: (id: string, quantity = 1) =>
    apiClient.post('/toystore/gift-packs/' + id + '/record-sale', { quantity }).then(unwrap<ToyGiftPack>),

  remove: (id: string) =>
    apiClient.delete('/toystore/gift-packs/' + id).then(unwrap),
};
