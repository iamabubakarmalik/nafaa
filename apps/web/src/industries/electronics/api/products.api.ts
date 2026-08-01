import { apiClient } from '@core/api/client';

export type ElectronicsCategoryType =
  | 'SMARTPHONE' | 'FEATURE_PHONE' | 'TABLET' | 'LAPTOP' | 'DESKTOP'
  | 'SMARTWATCH' | 'FITNESS_TRACKER' | 'HEADPHONE' | 'EARBUDS' | 'SPEAKER'
  | 'CAMERA' | 'DRONE' | 'GAMING_CONSOLE' | 'GAMING_ACCESSORY'
  | 'CHARGER' | 'CABLE' | 'ADAPTER' | 'POWER_BANK'
  | 'MEMORY_CARD' | 'USB_DRIVE' | 'HARD_DRIVE' | 'SSD'
  | 'MONITOR' | 'KEYBOARD' | 'MOUSE' | 'WEBCAM'
  | 'ROUTER' | 'MODEM' | 'NETWORK_SWITCH'
  | 'SMART_HOME' | 'SECURITY_CAMERA' | 'VR_HEADSET'
  | 'PRINTER' | 'SCANNER' | 'PROJECTOR'
  | 'CAR_ELECTRONICS' | 'ACCESSORY' | 'OTHER';

export type ElectronicsConditionType = 'NEW' | 'REFURBISHED' | 'USED_LIKE_NEW' | 'USED_GOOD' | 'USED_FAIR' | 'OPEN_BOX';

export interface ElectronicsProductProfile {
  id: string;
  productId: string;
  brandId?: string;
  categoryType?: ElectronicsCategoryType;
  conditionType?: ElectronicsConditionType;
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

  remove: (id: string) =>
    apiClient.delete('/electronics/products/' + id).then(unwrap),
};
