import { apiClient } from '@core/api/client';

export type FurnitureCategoryType =
  | 'SOFA_SET' | 'SOFA_L_SHAPE' | 'SOFA_RECLINER' | 'SOFA_BED'
  | 'BED_SINGLE' | 'BED_DOUBLE' | 'BED_KING' | 'BED_QUEEN' | 'BED_BUNK' | 'MATTRESS'
  | 'WARDROBE' | 'DRESSING_TABLE'
  | 'DINING_TABLE' | 'DINING_CHAIR' | 'DINING_SET'
  | 'CENTER_TABLE' | 'SIDE_TABLE'
  | 'OFFICE_DESK' | 'OFFICE_CHAIR' | 'BOOKSHELF'
  | 'TV_CONSOLE' | 'ENTERTAINMENT_UNIT'
  | 'SHOE_RACK' | 'CABINET' | 'CUPBOARD'
  | 'STUDY_TABLE' | 'KIDS_FURNITURE' | 'BABY_COT'
  | 'OUTDOOR_FURNITURE' | 'GARDEN_SET'
  | 'BEAN_BAG' | 'OTTOMAN' | 'CUSTOM_FURNITURE'
  | 'CURTAINS' | 'RUG' | 'DECOR' | 'LIGHTING' | 'MIRROR' | 'OTHER';

export type FurnitureMaterialType =
  | 'SOLID_WOOD_TEAK' | 'SOLID_WOOD_SHEESHAM' | 'SOLID_WOOD_ROSEWOOD' | 'SOLID_WOOD_MANGO'
  | 'ENGINEERED_WOOD' | 'MDF' | 'PARTICLE_BOARD' | 'PLYWOOD'
  | 'METAL_IRON' | 'METAL_STEEL' | 'METAL_ALUMINIUM'
  | 'GLASS' | 'MARBLE' | 'GRANITE' | 'RATTAN' | 'BAMBOO'
  | 'FABRIC_COTTON' | 'FABRIC_LINEN' | 'FABRIC_VELVET'
  | 'LEATHER_GENUINE' | 'LEATHER_FAUX'
  | 'PLASTIC' | 'ACRYLIC' | 'MIXED' | 'OTHER';

export type FurnitureConditionType = 'BRAND_NEW' | 'DISPLAY_MODEL' | 'FLOOR_MODEL' | 'REFURBISHED' | 'PRE_OWNED' | 'CUSTOM_ORDER';

export interface FurnitureProductProfile {
  id: string;
  productId: string;
  categoryType?: FurnitureCategoryType;
  conditionType: FurnitureConditionType;
  primaryMaterial?: FurnitureMaterialType;
  secondaryMaterials: FurnitureMaterialType[];

  modelNumber?: string;
  collectionName?: string;
  designerName?: string;
  countryOfOrigin?: string;
  brand?: string;

  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  seatHeightCm?: number;
  weightKg?: number;

  seatingCapacity?: number;
  storageCompartments?: number;
  drawersCount?: number;
  shelvesCount?: number;

  woodType?: string;
  woodFinish?: string;
  polishType?: string;
  colorName?: string;
  colorHex?: string;
  upholsteryFabric?: string;
  cushionFilling?: string;
  cushionDensity?: string;

  requiresAssembly: boolean;
  assemblyTimeMinutes?: number;
  assemblyPartsCount?: number;
  assemblyToolsIncluded: boolean;
  assemblyInstructionsUrl?: string;
  assemblyChargeExtra?: number;

  isCustomizable: boolean;
  customizationOptions?: any;
  customLeadTimeDays?: number;

  warrantyMonths: number;
  warrantyType?: string;
  careInstructions?: string;
  isWaterResistant: boolean;
  isTermiteProof: boolean;

  requiresLargeVehicle: boolean;
  requiresMultipleHelpers: boolean;
  helpersNeeded: number;
  deliveryChargeBase?: number;
  freeDeliveryRadius?: number;

  mrp?: number;
  costPrice?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  discountedPrice?: number;
  emiStartingFrom?: number;

  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isCustomMade: boolean;
  isEcoFriendly: boolean;

  totalSold: number;
  totalRevenue: number;
  avgRating?: number;
  totalReviews: number;

  showroomLocation?: string;
  showroomFloor?: string;
  displayZone?: string;

  images3d: string[];
  ar_model_url?: string;
  notes?: string;

  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const furnitureProductsApi = {
  upsert: (data: Partial<FurnitureProductProfile>) =>
    apiClient.post('/furniture/products', data).then(unwrap<FurnitureProductProfile>),

  list: (params?: {
    categoryType?: string; conditionType?: string; primaryMaterial?: string;
    featured?: boolean; bestSeller?: boolean; newArrival?: boolean;
    customizable?: boolean; ecoFriendly?: boolean;
    minPrice?: number; maxPrice?: number; search?: string;
  }) => apiClient.get('/furniture/products', { params }).then(unwrap<FurnitureProductProfile[]>),

  byProduct: (productId: string) =>
    apiClient.get('/furniture/products/by-product/' + productId).then(unwrap<FurnitureProductProfile | null>),

  byCategory: () =>
    apiClient.get('/furniture/products/by-category-count').then(unwrap<Record<string, number>>),

  showroomLayout: () =>
    apiClient.get('/furniture/products/showroom-layout').then(unwrap<Record<string, FurnitureProductProfile[]>>),

  getOne: (id: string) =>
    apiClient.get('/furniture/products/' + id).then(unwrap<FurnitureProductProfile>),

  remove: (id: string, force = false) =>
    apiClient.delete(`/furniture/products/${id}${force ? '?force=true' : ''}`).then(unwrap),
};
