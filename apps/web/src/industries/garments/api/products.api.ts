import { apiClient } from '@core/api/client';

export type GarmentGender = 'MEN' | 'WOMEN' | 'BOYS' | 'GIRLS' | 'UNISEX' | 'KIDS' | 'BABY';
export type GarmentCategoryType = 'SHIRT' | 'T_SHIRT' | 'POLO' | 'KURTA' | 'KURTA_SHALWAR'
  | 'SHALWAR_KAMEEZ' | 'SUIT' | 'THREE_PIECE' | 'TWO_PIECE' | 'WAISTCOAT' | 'TROUSER'
  | 'JEANS' | 'SHORTS' | 'SKIRT' | 'TOP' | 'FROCK' | 'GOWN' | 'ABAYA' | 'HIJAB'
  | 'DUPATTA' | 'SAREE' | 'LEHENGA' | 'MAXI' | 'JACKET' | 'COAT' | 'SWEATER'
  | 'HOODIE' | 'TRACK_SUIT' | 'NIGHTWEAR' | 'UNDERGARMENT' | 'SOCKS' | 'SHOES'
  | 'SANDALS' | 'ACCESSORY' | 'FABRIC' | 'OTHER';
export type GarmentFabricType = 'COTTON' | 'LAWN' | 'LINEN' | 'KHADDAR' | 'KARANDI' | 'SILK'
  | 'CHIFFON' | 'ORGANZA' | 'VELVET' | 'DENIM' | 'JERSEY' | 'WOOL' | 'POLYESTER'
  | 'VISCOSE' | 'CAMBRIC' | 'NET' | 'GEORGETTE' | 'LEATHER' | 'MIXED' | 'OTHER';
export type GarmentWorkType = 'PLAIN' | 'PRINTED' | 'EMBROIDERED' | 'HAND_EMBROIDERED'
  | 'BLOCK_PRINTED' | 'DIGITAL_PRINTED' | 'SEQUIN_WORK' | 'ZARI_WORK' | 'MIRROR_WORK'
  | 'PEARL_WORK' | 'STONE_WORK' | 'LACE_WORK' | 'PATCH_WORK' | 'OTHER';
export type GarmentFitType = 'SLIM' | 'REGULAR' | 'RELAXED' | 'OVERSIZED' | 'SKINNY'
  | 'STRAIGHT' | 'BOOTCUT' | 'FLARED' | 'CUSTOM';

export interface GarmentProductProfile {
  id: string;
  productId: string;
  collectionId?: string;
  sizeChartId?: string;
  gender?: GarmentGender;
  categoryType?: GarmentCategoryType;
  season: string;
  fabricType?: GarmentFabricType;
  fabricBlend?: string;
  workType: GarmentWorkType;
  fitType: GarmentFitType;
  neckline?: string;
  sleeveType?: string;
  sleeveLength?: string;
  pattern?: string;
  careInstructions?: string;
  countryOfOrigin?: string;
  manufacturer?: string;
  designer?: string;
  modelHeight?: string;
  modelWearingSize?: string;
  styleCode?: string;
  lookBookUrl?: string;
  videoUrl?: string;
  isReadyMade: boolean;
  isStitchable: boolean;
  isFabricOnly: boolean;
  allowAlteration: boolean;
  allowReservation: boolean;
  allowLayaway: boolean;
  minAlterationDays?: number;
  defaultStitchingDays?: number;
  isNewArrival: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isOnSale: boolean;
  totalSold: number;
  totalReturns: number;
  totalAlterations: number;
  product?: any;
  variantProfiles?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface VariantProfile {
  id: string;
  productId: string;
  variantId: string;
  size?: string;
  colorName?: string;
  colorHex?: string;
  colorFamily?: string;
  skuSuffix?: string;
  barcode?: string;
  chest?: number;
  waist?: number;
  hip?: number;
  shoulder?: number;
  length?: number;
  sleeveLength?: number;
  inseam?: number;
  weightGrams?: number;
  fabricMeters?: number;
  displayOrder: number;
  isAvailable: boolean;
  isFeaturedColor: boolean;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const garmentProductsApi = {
  upsert: (data: Partial<GarmentProductProfile>) =>
    apiClient.post('/garments/products', data).then(unwrap<GarmentProductProfile>),
  list: (params?: any) =>
    apiClient.get('/garments/products', { params }).then(unwrap<GarmentProductProfile[]>),
  byProduct: (productId: string) =>
    apiClient.get('/garments/products/by-product/' + productId).then(unwrap<GarmentProductProfile | null>),
  getOne: (id: string) =>
    apiClient.get('/garments/products/' + id).then(unwrap<GarmentProductProfile>),
  remove: (id: string, force = false) =>
    apiClient.delete(`/garments/products/${id}${force ? '?force=true' : ''}`).then(unwrap),

  upsertVariant: (data: Partial<VariantProfile>) =>
    apiClient.post('/garments/products/variant-profile', data).then(unwrap<VariantProfile>),
  variantProfiles: (productId: string) =>
    apiClient.get('/garments/products/variant-profiles/' + productId).then(unwrap<VariantProfile[]>),
  removeVariant: (id: string) =>
    apiClient.delete('/garments/products/variant-profile/' + id).then(unwrap),
};
