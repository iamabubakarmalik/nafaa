import { apiClient } from '@core/api/client';

export type ShoeCategoryType =
  | 'MEN_FORMAL' | 'MEN_CASUAL' | 'MEN_SNEAKER' | 'MEN_LOAFER' | 'MEN_BOOT'
  | 'MEN_SANDAL' | 'MEN_SLIPPER' | 'MEN_KHUSSA' | 'MEN_PESHAWARI'
  | 'WOMEN_HEEL' | 'WOMEN_FLAT' | 'WOMEN_SNEAKER' | 'WOMEN_SANDAL'
  | 'WOMEN_BOOT' | 'WOMEN_KHUSSA' | 'WOMEN_BRIDAL' | 'WOMEN_PUMP'
  | 'KIDS_SCHOOL' | 'KIDS_SPORTS' | 'KIDS_CASUAL' | 'KIDS_SANDAL' | 'KIDS_INFANT'
  | 'SPORTS_RUNNING' | 'SPORTS_TRAINING' | 'SPORTS_FOOTBALL' | 'SPORTS_CRICKET'
  | 'SPORTS_BASKETBALL' | 'SPORTS_TENNIS' | 'SPORTS_HIKING' | 'SPORTS_GYM'
  | 'SAFETY_SHOE' | 'MEDICAL_SHOE' | 'ORTHOPEDIC' | 'RAIN_BOOT'
  | 'FLIP_FLOP' | 'CROCS' | 'ACCESSORIES' | 'INSOLES' | 'LACES' | 'POLISH' | 'OTHER';

export type ShoeGender = 'MEN' | 'WOMEN' | 'BOYS' | 'GIRLS' | 'INFANT' | 'UNISEX';
export type ShoeSizeSystem = 'UK' | 'US' | 'EU' | 'CM' | 'KIDS';
export type ShoeWidth = 'NARROW' | 'REGULAR' | 'WIDE' | 'EXTRA_WIDE';

export interface ShoeProductProfile {
  id: string;
  productId: string;
  brandId?: string;
  categoryType?: ShoeCategoryType;
  gender?: ShoeGender;
  ageGroup?: string;

  modelName?: string;
  modelCode?: string;
  collection?: string;
  season?: string;

  upperMaterial?: string;
  soleMaterial?: string;
  innerMaterial?: string;
  liningMaterial?: string;

  colorName?: string;
  colorHex?: string;
  patternType?: string;
  closureType?: string;
  toeShape?: string;
  heelHeight?: string;
  heelType?: string;
  soleType?: string;

  sizeSystem?: ShoeSizeSystem;
  availableSizes: string[];
  width?: ShoeWidth;
  runsLarge: boolean;
  runsSmall: boolean;
  sizingNotes?: string;

  isWaterproof: boolean;
  isBreathable: boolean;
  hasAirCushion: boolean;
  hasArchSupport: boolean;
  isOrthopedic: boolean;
  isVegan: boolean;
  isHandmade: boolean;

  sport?: string;
  playingSurface: string[];

  careInstructions?: string;
  cleaningRecommendation?: string;

  warrantyMonths?: number;
  warrantyDetails?: string;

  includesBox: boolean;
  includesDustBag: boolean;
  includesExtraLaces: boolean;
  boxColor?: string;

  mrp?: number;
  costPrice?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  memberPrice?: number;

  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  isBridal: boolean;
  isEidSpecial: boolean;

  totalSold: number;
  notes?: string;
  product?: any;
  brand?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const shoeProductsApi = {
  upsert: (data: Partial<ShoeProductProfile>) =>
    apiClient.post('/shoe/products', data).then(unwrap<ShoeProductProfile>),

  list: (params?: {
    brandId?: string; categoryType?: string; gender?: string; sizeSystem?: string;
    color?: string; sport?: string; isWaterproof?: boolean; isOrthopedic?: boolean;
    featured?: boolean; bestSeller?: boolean; newArrival?: boolean; trending?: boolean;
    bridal?: boolean; eidSpecial?: boolean; search?: string;
  }) => apiClient.get('/shoe/products', { params }).then(unwrap<ShoeProductProfile[]>),

  byProduct: (productId: string) =>
    apiClient.get('/shoe/products/by-product/' + productId).then(unwrap<ShoeProductProfile | null>),

  byCategory: () =>
    apiClient.get('/shoe/products/by-category-count').then(unwrap<Record<string, number>>),

  byGender: () =>
    apiClient.get('/shoe/products/by-gender-count').then(unwrap<any[]>),

  getOne: (id: string) =>
    apiClient.get('/shoe/products/' + id).then(unwrap<ShoeProductProfile>),

  remove: (id: string) =>
    apiClient.delete('/shoe/products/' + id).then(unwrap),
};
