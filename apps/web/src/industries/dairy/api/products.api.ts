import { apiClient } from '@core/api/client';

export type DairyProductType = 'FRESH_MILK' | 'BUFFALO_MILK' | 'COW_MILK' | 'GOAT_MILK'
  | 'MIXED_MILK' | 'BOILED_MILK' | 'RAW_MILK' | 'YOGURT' | 'DAHI' | 'LASSI'
  | 'BUTTER_MILK' | 'BUTTER' | 'MAKHAN' | 'DESI_GHEE' | 'CREAM' | 'MALAI'
  | 'KHOA' | 'MAWA' | 'PANEER' | 'CHEESE' | 'KHEER' | 'RABRI' | 'KULFI'
  | 'SWEETS' | 'ICE_CREAM' | 'MILK_POWDER' | 'OTHER';

export type DairyUnit = 'LITER' | 'KG' | 'GRAM' | 'PIECE' | 'PLATE' | 'CUP'
  | 'BOTTLE' | 'PACKET' | 'KATTA' | 'KILO' | 'MAAN' | 'SEER';

export type MilkQuality = 'A_GRADE' | 'B_GRADE' | 'C_GRADE' | 'REJECTED';

export interface DairyProduct {
  id: string;
  productId: string;
  productType: DairyProductType;
  unit: DairyUnit;
  fatContent?: number;
  snfContent?: number;
  proteinContent?: number;
  waterAdded: boolean;
  quality?: MilkQuality;
  isPasteurized: boolean;
  isHomogenized: boolean;
  isRaw: boolean;
  isOrganic: boolean;
  isFresh: boolean;
  productionDate?: string;
  bestBeforeHours?: number;
  shelfLifeHours?: number;
  requiresRefrigeration: boolean;
  storageTempMin?: number;
  storageTempMax?: number;
  farmSource?: string;
  cattleType?: string;
  morningPrice?: number;
  eveningPrice?: number;
  bulkPrice?: number;
  minBulkQty?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  homeDeliveryPrice?: number;
  availableMorning: boolean;
  availableEvening: boolean;
  homeDeliveryAvailable: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  displayOrder: number;
  totalSold: number;
  totalRevenue: number;
  notes?: string;
  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const dairyProductsApi = {
  upsert: (data: Partial<DairyProduct>) => apiClient.post('/dairy/products', data).then(unwrap<DairyProduct>),
  list: (params?: any) => apiClient.get('/dairy/products', { params }).then(unwrap<DairyProduct[]>),
  byProduct: (productId: string) => apiClient.get('/dairy/products/by-product/' + productId).then(unwrap<DairyProduct | null>),
  getOne: (id: string) => apiClient.get('/dairy/products/' + id).then(unwrap<DairyProduct>),
  remove: (id: string) => apiClient.delete('/dairy/products/' + id).then(unwrap),
};
