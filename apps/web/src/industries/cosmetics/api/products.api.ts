import { apiClient } from '@core/api/client';

export type CosmeticsCategoryType =
  | 'FOUNDATION' | 'CONCEALER' | 'POWDER' | 'BLUSH' | 'BRONZER' | 'HIGHLIGHTER'
  | 'EYESHADOW' | 'EYELINER' | 'MASCARA' | 'EYEBROW'
  | 'LIPSTICK' | 'LIP_GLOSS' | 'LIP_LINER' | 'LIP_BALM'
  | 'MAKEUP_PALETTE' | 'MAKEUP_BRUSH' | 'MAKEUP_REMOVER'
  | 'FACE_WASH' | 'CLEANSER' | 'TONER' | 'SERUM'
  | 'MOISTURIZER' | 'DAY_CREAM' | 'NIGHT_CREAM' | 'EYE_CREAM'
  | 'FACE_MASK' | 'SHEET_MASK' | 'EXFOLIATOR' | 'SUNSCREEN'
  | 'BODY_LOTION' | 'BODY_WASH' | 'BODY_SCRUB' | 'BODY_OIL'
  | 'HAND_CREAM' | 'FOOT_CREAM'
  | 'PERFUME' | 'EAU_DE_TOILETTE' | 'BODY_MIST' | 'DEODORANT' | 'ATTAR' | 'FRAGRANCE_GIFT_SET'
  | 'SHAMPOO' | 'CONDITIONER' | 'HAIR_OIL' | 'HAIR_MASK' | 'HAIR_SERUM' | 'HAIR_COLOR' | 'HAIR_STYLING'
  | 'NAIL_POLISH' | 'NAIL_REMOVER' | 'NAIL_ART' | 'NAIL_TOOLS'
  | 'SHAVING_CREAM' | 'AFTER_SHAVE' | 'BEARD_OIL' | 'BEARD_TRIMMER'
  | 'HAIR_DRYER' | 'STRAIGHTENER' | 'CURLING_IRON' | 'BEAUTY_TOOL'
  | 'SOAP' | 'BATH_BOMB' | 'GIFT_SET' | 'OTHER';

export type CosmeticsSkinType = 'DRY' | 'OILY' | 'COMBINATION' | 'NORMAL' | 'SENSITIVE' | 'ACNE_PRONE' | 'MATURE' | 'ALL_TYPES';
export type CosmeticsSkinTone = 'FAIR' | 'LIGHT' | 'MEDIUM' | 'TAN' | 'DEEP' | 'DARK' | 'UNIVERSAL';
export type CosmeticsFinish = 'MATTE' | 'DEWY' | 'SATIN' | 'GLOSSY' | 'SHIMMER' | 'NATURAL' | 'METALLIC';

export interface CosmeticsProductProfile {
  id: string;
  productId: string;
  brandId?: string;
  categoryType?: CosmeticsCategoryType;
  shadeName?: string;
  shadeCode?: string;
  shadeHex?: string;
  finish?: CosmeticsFinish;
  skinType: CosmeticsSkinType[];
  skinTone: CosmeticsSkinTone[];
  skinConcerns: string[];
  sizeMl?: number;
  sizeGrams?: number;
  sizeDisplay?: string;
  keyIngredients: string[];
  fullIngredients?: string;
  spfRating?: string;
  isCrueltyFree: boolean;
  isVegan: boolean;
  isOrganic: boolean;
  isHypoallergenic: boolean;
  isFragranceFree: boolean;
  isSulfateFree: boolean;
  isParabenFree: boolean;
  isNoncomedogenic: boolean;
  isHalalCertified: boolean;
  isDermatologistTested: boolean;
  fragranceFamily?: string;
  topNotes: string[];
  middleNotes: string[];
  baseNotes: string[];
  longevityHours?: string;
  sillage?: string;
  season: string[];
  occasion: string[];
  howToUse?: string;
  benefits: string[];
  warnings?: string;
  requiresBatchTracking: boolean;
  shelfLifeMonths?: number;
  mrp?: number;
  costPrice?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isLimitedEdition: boolean;
  isViral: boolean;
  totalSold: number;
  totalRevenue: number;
  avgRating?: number;
  totalReviews: number;
  notes?: string;
  product?: any;
  brand?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const cosmeticsProductsApi = {
  upsert: (data: Partial<CosmeticsProductProfile>) =>
    apiClient.post('/cosmetics/products', data).then(unwrap<CosmeticsProductProfile>),

  list: (params?: {
    brandId?: string; categoryType?: string; skinType?: string; skinTone?: string;
    finish?: string; fragranceFamily?: string;
    isHalal?: boolean; isCrueltyFree?: boolean; isVegan?: boolean; isOrganic?: boolean;
    featured?: boolean; bestSeller?: boolean; newArrival?: boolean;
    limitedEdition?: boolean; viral?: boolean; search?: string;
  }) => apiClient.get('/cosmetics/products', { params }).then(unwrap<CosmeticsProductProfile[]>),

  byProduct: (productId: string) =>
    apiClient.get('/cosmetics/products/by-product/' + productId).then(unwrap<CosmeticsProductProfile | null>),

  byCategory: () => apiClient.get('/cosmetics/products/by-category-count').then(unwrap<Record<string, number>>),

  shadeMatcher: (params: { skinTone?: string; categoryType?: string }) =>
    apiClient.get('/cosmetics/products/shade-matcher', { params }).then(unwrap<CosmeticsProductProfile[]>),

  fragranceRecommender: (params: { family?: string; season?: string; occasion?: string }) =>
    apiClient.get('/cosmetics/products/fragrance-recommender', { params }).then(unwrap<CosmeticsProductProfile[]>),

  getOne: (id: string) => apiClient.get('/cosmetics/products/' + id).then(unwrap<CosmeticsProductProfile>),

  remove: (id: string) => apiClient.delete('/cosmetics/products/' + id).then(unwrap),
};
