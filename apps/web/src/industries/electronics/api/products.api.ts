import { apiClient } from '@core/api/client';

/**
 * Ye types ab `../constants` se aati hain — wohi Prisma enum se match
 * karti hain. Pehle yahan apni alag list likhi hui thi (SMARTPHONE,
 * LAPTOP, USED_GOOD waghera) jo database me hain hi nahi, is liye
 * un options ke saath product save hi nahi hota tha.
 */
export type { CategoryType as ElectronicsCategoryType, ConditionType as ElectronicsConditionType } from '../constants';
import type { CategoryType, ConditionType } from '../constants';

export interface ElectronicsProductProfile {
  id: string;
  productId: string;
  brandId?: string;
  categoryType?: CategoryType;
  conditionType?: ConditionType;
  modelNumber?: string;
  partNumber?: string;
  colorName?: string;
  colorHex?: string;
  connectivity: string[];
  powerRating?: string;
  batteryCapacity?: string;
  batteryLifeHours?: number;
  chargingTimeMinutes?: number;
  operatingRange?: string;
  waterResistance?: string;
  screenSize?: string;
  resolution?: string;
  refreshRate?: string;
  compatibleWith: string[];
  compatibleOS: string[];
  weightGrams?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  warrantyMonths?: number;
  warrantyType?: string;
  hasInternationalWarranty: boolean;
  requiresSerial: boolean;
  hasImei: boolean;
  boxContents: string[];
  hasManual: boolean;
  hasWarrantyCard: boolean;
  mrp?: number;
  costPrice?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  onlinePrice?: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  totalSold: number;
  notes?: string;
  product?: any;
  brand?: any;
  availableSerials?: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const electronicsProductsApi = {
  upsert: (data: Partial<ElectronicsProductProfile>) =>
    apiClient.post('/electronics/products', data).then(unwrap<ElectronicsProductProfile>),

  list: (params?: {
    brandId?: string;
    categoryType?: string;
    conditionType?: string;
    featured?: boolean;
    bestSeller?: boolean;
    newArrival?: boolean;
    trending?: boolean;
    search?: string;
  }) => apiClient.get('/electronics/products', { params }).then(unwrap<ElectronicsProductProfile[]>),

  byProduct: (productId: string) =>
    apiClient.get('/electronics/products/by-product/' + productId).then(unwrap<ElectronicsProductProfile | null>),

  byCategory: () =>
    apiClient.get('/electronics/products/by-category-count').then(unwrap<Record<string, number>>),

  getOne: (id: string) =>
    apiClient.get('/electronics/products/' + id).then(unwrap<ElectronicsProductProfile>),

  remove: (id: string, force = false) =>
    apiClient.delete(`/electronics/products/${id}${force ? '?force=true' : ''}`).then(unwrap),
};
