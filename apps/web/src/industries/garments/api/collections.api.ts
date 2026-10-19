import { apiClient } from '@core/api/client';

export type GarmentSeason = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER' | 'ALL_SEASON'
  | 'EID_COLLECTION' | 'WEDDING_COLLECTION' | 'FESTIVE_COLLECTION' | 'RAMADAN_COLLECTION' | 'SCHOOL_COLLECTION';

export interface GarmentCollection {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  season: GarmentSeason;
  year?: number | null;
  launchDate?: string | null;
  endDate?: string | null;
  coverImageUrl?: string | null;
  colorTheme?: string | null;
  isFeatured: boolean;
  isActive: boolean;
  productCount?: number;
  createdAt: string;
}

interface CollectionProduct {
  id: string; name: string; sku?: string | null; price: number; stock: number; isActive: boolean; isOnSale: boolean;
  images: Array<{ url: string }>;
}

interface CollectionStats {
  days: number;
  items: Array<{ collectionId: string; products: number; onSale: number; stock: number; stockValue: number; soldQty: number; soldValue: number }>;
}

export interface CollectionInput {
  name: string;
  code?: string;
  description?: string;
  season?: GarmentSeason;
  year?: number;
  launchDate?: string;
  endDate?: string;
  coverImageUrl?: string;
  colorTheme?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}

const unwrap = <T,>(res: { data: { data: T } }): T => res.data.data;

export const collectionsApi = {
  create: (data: CollectionInput) => apiClient.post('/garments/collections', data).then(unwrap<GarmentCollection>),
  list: (params?: { season?: string; active?: boolean; search?: string }) =>
    apiClient.get('/garments/collections', { params }).then(unwrap<GarmentCollection[]>),
  stats: (days = 30) => apiClient.get('/garments/collections/stats', { params: { days } }).then(unwrap<CollectionStats>),
  getOne: (id: string) => apiClient.get('/garments/collections/' + id).then(unwrap<GarmentCollection & { products: CollectionProduct[] }>),
  update: (id: string, data: CollectionInput) => apiClient.patch('/garments/collections/' + id, data).then(unwrap<GarmentCollection>),
  setOnSale: (id: string, onSale: boolean) => apiClient.post('/garments/collections/' + id + '/on-sale', { onSale }).then(unwrap<{ updated: number }>),
  addProducts: (id: string, productIds: string[]) => apiClient.post('/garments/collections/' + id + '/products', { productIds }).then(unwrap<{ added: number }>),
  removeProducts: (id: string, productIds: string[]) => apiClient.post('/garments/collections/' + id + '/products/remove', { productIds }).then(unwrap<{ removed: number }>),
  remove: (id: string) => apiClient.delete('/garments/collections/' + id).then(unwrap<GarmentCollection>),
};
