import { apiClient } from '@/api/client';

export type GarmentSeason = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER' | 'ALL_SEASON'
  | 'EID_COLLECTION' | 'WEDDING_COLLECTION' | 'FESTIVE_COLLECTION' | 'RAMADAN_COLLECTION' | 'SCHOOL_COLLECTION';

export interface GarmentCollection {
  id: string;
  name: string;
  code?: string;
  description?: string;
  season: GarmentSeason;
  year?: number;
  launchDate?: string;
  endDate?: string;
  coverImageUrl?: string;
  bannerImageUrl?: string;
  colorTheme?: string;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  totalProducts: number;
  totalSales: number;
  products?: any[];
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const collectionsApi = {
  create: (data: Partial<GarmentCollection>) =>
    apiClient.post('/garments/collections', data).then(unwrap<GarmentCollection>),
  list: (params?: { season?: string; active?: boolean; featured?: boolean; search?: string }) =>
    apiClient.get('/garments/collections', { params }).then(unwrap<GarmentCollection[]>),
  getOne: (id: string) =>
    apiClient.get('/garments/collections/' + id).then(unwrap<GarmentCollection>),
  update: (id: string, data: Partial<GarmentCollection>) =>
    apiClient.patch('/garments/collections/' + id, data).then(unwrap<GarmentCollection>),
  toggleFeatured: (id: string) =>
    apiClient.post('/garments/collections/' + id + '/toggle-featured').then(unwrap<GarmentCollection>),
  remove: (id: string) =>
    apiClient.delete('/garments/collections/' + id).then(unwrap),
};
