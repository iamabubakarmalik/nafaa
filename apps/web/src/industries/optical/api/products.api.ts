import { apiClient } from '@core/api/client';

export type OpticalCategoryType =
  | 'EYEGLASSES_FRAME' | 'PRESCRIPTION_LENS' | 'CONTACT_LENS' | 'SUNGLASSES'
  | 'READING_GLASSES' | 'SPORTS_EYEWEAR' | 'SAFETY_GOGGLES' | 'KIDS_EYEWEAR'
  | 'PROGRESSIVE_LENS' | 'BIFOCAL_LENS' | 'BLUE_CUT_LENS' | 'PHOTOCHROMIC_LENS'
  | 'ACCESSORY' | 'CLEANING_KIT' | 'CASE' | 'CHAIN' | 'OTHER';

export type OpticalFrameShape =
  | 'ROUND' | 'SQUARE' | 'RECTANGLE' | 'OVAL' | 'CAT_EYE'
  | 'AVIATOR' | 'WAYFARER' | 'CLUBMASTER' | 'GEOMETRIC' | 'RIMLESS'
  | 'SEMI_RIMLESS' | 'BROWLINE' | 'BUTTERFLY' | 'OTHER';

export type OpticalFrameMaterial =
  | 'METAL' | 'PLASTIC' | 'ACETATE' | 'TITANIUM' | 'STAINLESS_STEEL'
  | 'WOOD' | 'BAMBOO' | 'TR90' | 'ULTEM' | 'MIXED' | 'OTHER';

export type OpticalGender = 'MEN' | 'WOMEN' | 'UNISEX' | 'KIDS';

export interface OpticalProductProfile {
  id: string;
  productId: string;
  categoryType?: OpticalCategoryType;
  frameShape?: OpticalFrameShape;
  frameMaterial?: OpticalFrameMaterial;
  gender?: OpticalGender;
  brand?: string;
  modelNumber?: string;
  collectionName?: string;
  frameSizeMm?: number;
  bridgeSizeMm?: number;
  templeLengthMm?: number;
  lensWidthMm?: number;
  lensHeightMm?: number;
  frameWeightG?: number;
  colorName?: string;
  colorHex?: string;
  frameColorOptions: string[];
  lensType?: string;
  lensMaterial?: string;
  lensIndex?: string;
  lensCoatings: string[];
  hasBlueCut: boolean;
  hasAntiGlare: boolean;
  hasUvProtection: boolean;
  isPolarized: boolean;
  isPhotochromic: boolean;
  isContactLens: boolean;
  clDuration?: string;
  clWaterContent?: string;
  clBaseCurve?: string;
  clDiameter?: string;
  clUvProtection: boolean;
  clForAstigmatism: boolean;
  supportsMinSph?: number;
  supportsMaxSph?: number;
  supportsMinCyl?: number;
  supportsMaxCyl?: number;
  supportsProgressive: boolean;
  warrantyMonths?: number;
  warrantyType?: string;
  mrp?: number;
  costPrice?: number;
  retailPrice?: number;
  discountedPrice?: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isDesigner: boolean;
  totalSold: number;
  totalRevenue: number;
  imageUrls3d: string[];
  tryOnUrl?: string;
  notes?: string;
  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const opticalProductsApi = {
  upsert: (data: Partial<OpticalProductProfile>) =>
    apiClient.post('/optical/products', data).then(unwrap<OpticalProductProfile>),

  list: (params?: {
    categoryType?: string; frameShape?: string; frameMaterial?: string; gender?: string;
    brand?: string; contactLensOnly?: boolean;
    blueCut?: boolean; polarized?: boolean; photochromic?: boolean; progressive?: boolean;
    featured?: boolean; bestSeller?: boolean; newArrival?: boolean; designer?: boolean;
    minPrice?: number; maxPrice?: number; search?: string;
  }) => apiClient.get('/optical/products', { params }).then(unwrap<OpticalProductProfile[]>),

  matchPrescription: (params: { sph: number; cyl?: number; progressive?: boolean; contactLens?: boolean }) =>
    apiClient.get('/optical/products/match-prescription', { params }).then(unwrap<OpticalProductProfile[]>),

  byCategory: () =>
    apiClient.get('/optical/products/by-category-count').then(unwrap<Record<string, number>>),

  brands: () =>
    apiClient.get('/optical/products/brands').then(unwrap<Array<{ brand: string; count: number; revenue: number }>>),

  byProduct: (productId: string) =>
    apiClient.get('/optical/products/by-product/' + productId).then(unwrap<OpticalProductProfile | null>),

  getOne: (id: string) =>
    apiClient.get('/optical/products/' + id).then(unwrap<OpticalProductProfile>),

  remove: (id: string, force = false) =>
    apiClient.delete(`/optical/products/${id}${force ? '?force=true' : ''}`).then(unwrap),
};
