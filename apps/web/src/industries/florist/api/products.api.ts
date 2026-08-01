import { apiClient } from '@core/api/client';

export type FloristCategoryType =
  | 'FRESH_FLOWER_STEM' | 'BOUQUET' | 'ARRANGEMENT' | 'BASKET' | 'WREATH' | 'GARLAND'
  | 'CENTERPIECE' | 'BRIDAL_BOUQUET' | 'BOUTONNIERE' | 'CORSAGE' | 'FLOWER_CROWN'
  | 'POTTED_PLANT' | 'INDOOR_PLANT' | 'OUTDOOR_PLANT' | 'SUCCULENT' | 'CACTUS'
  | 'DRIED_FLOWER' | 'PRESERVED_FLOWER' | 'ARTIFICIAL_FLOWER' | 'SILK_FLOWER'
  | 'FLOWER_GIFT_BOX' | 'CHOCOLATE_BOUQUET' | 'BALLOON_BOUQUET' | 'CAKE_ADDON'
  | 'VASE' | 'PLANTER' | 'FLORAL_FOAM' | 'RIBBON' | 'WRAPPING_PAPER' | 'CARD'
  | 'ACCESSORY' | 'OTHER';

export type FloristFreshnessGrade = 'PREMIUM_A' | 'GRADE_A' | 'GRADE_B' | 'CLEARANCE' | 'WITHERED';

export interface FloristProductProfile {
  id: string;
  productId: string;
  categoryType?: FloristCategoryType;
  freshnessGrade: FloristFreshnessGrade;
  flowerType?: string;
  color?: string;
  colorHex?: string;
  stemLengthCm?: number;
  isImported: boolean;
  origin?: string;
  season: string[];
  arrivalDate?: string;
  freshUntil?: string;
  daysToWither?: number;
  isPreArranged: boolean;
  bouquetSize?: string;
  stemCount?: number;
  composition?: any;
  wrapType?: string;
  ribbonColor?: string;
  hasVase: boolean;
  occasions: string[];
  meaning?: string;
  careInstructions?: string;
  isCustomizable: boolean;
  customizationOptions: string[];
  minLeadTimeHours?: number;
  mrp?: number;
  costPrice?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  weddingPrice?: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isSeasonalSpecial: boolean;
  totalSold: number;
  notes?: string;
  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const floristProductsApi = {
  upsert: (data: Partial<FloristProductProfile>) =>
    apiClient.post('/florist/products', data).then(unwrap<FloristProductProfile>),

  list: (params?: {
    categoryType?: string; freshnessGrade?: string; flowerType?: string; color?: string;
    occasion?: string; isImported?: boolean; isPreArranged?: boolean; isCustomizable?: boolean;
    featured?: boolean; bestSeller?: boolean; seasonalSpecial?: boolean; search?: string;
  }) => apiClient.get('/florist/products', { params }).then(unwrap<FloristProductProfile[]>),

  byProduct: (productId: string) =>
    apiClient.get('/florist/products/by-product/' + productId).then(unwrap<FloristProductProfile | null>),

  freshnessAlerts: () =>
    apiClient.get('/florist/products/freshness-alerts').then(unwrap<any>),

  byCategory: () =>
    apiClient.get('/florist/products/by-category-count').then(unwrap<Record<string, number>>),

  byOccasion: (occasion: string) =>
    apiClient.get('/florist/products/by-occasion/' + occasion).then(unwrap<FloristProductProfile[]>),

  getOne: (id: string) =>
    apiClient.get('/florist/products/' + id).then(unwrap<FloristProductProfile>),

  remove: (id: string) =>
    apiClient.delete('/florist/products/' + id).then(unwrap),
};
