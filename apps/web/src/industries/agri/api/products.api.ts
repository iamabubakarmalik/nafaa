import { apiClient } from '@core/api/client';

export type AgriCategory = 'SEEDS' | 'FERTILIZER' | 'PESTICIDE' | 'HERBICIDE' | 'FUNGICIDE'
  | 'INSECTICIDE' | 'ANIMAL_FEED' | 'POULTRY_FEED' | 'CATTLE_FEED' | 'FISH_FEED'
  | 'VETERINARY_MEDICINE' | 'FARM_TOOLS' | 'IRRIGATION' | 'MACHINERY_PART'
  | 'MULCH_COVER' | 'GROWTH_HORMONE' | 'SOIL_CONDITIONER' | 'PLANT_NUTRIENT'
  | 'ORGANIC_INPUT' | 'OTHER';

export type SeedType = 'WHEAT' | 'RICE' | 'COTTON' | 'MAIZE' | 'SUGARCANE' | 'POTATO'
  | 'ONION' | 'TOMATO' | 'CHILLI' | 'PULSES' | 'VEGETABLES' | 'FRUITS' | 'FODDER' | 'OILSEEDS' | 'OTHER';

export type FertilizerType = 'UREA' | 'DAP' | 'NPK' | 'POTASH' | 'ZINC' | 'SULFUR'
  | 'BORON' | 'MICRONUTRIENT' | 'ORGANIC' | 'BIO_FERTILIZER' | 'LIQUID' | 'FOLIAR' | 'OTHER';

export type FeedType = 'STARTER' | 'GROWER' | 'FINISHER' | 'LAYER' | 'BREEDER'
  | 'MILK_REPLACER' | 'MINERAL_MIX' | 'CONCENTRATE' | 'ROUGHAGE' | 'SILAGE'
  | 'HAY' | 'BRAN' | 'OIL_CAKE' | 'MOLASSES' | 'OTHER';

export type SeasonType = 'KHARIF' | 'RABI' | 'ZAID' | 'ALL_SEASON' | 'SPRING' | 'SUMMER' | 'MONSOON' | 'WINTER';

export interface AgriProductProfile {
  id: string;
  productId: string;
  category: AgriCategory;
  subCategory?: string;
  seedType?: SeedType;
  fertilizerType?: FertilizerType;
  feedType?: FeedType;
  brand?: string;
  manufacturer?: string;
  countryOfOrigin?: string;
  npkRatio?: string;
  activeIngredient?: string;
  ingredients?: any;
  concentration?: string;
  packSize?: string;
  packUnit?: string;
  bagsPerTon?: number;
  applicationRate?: string;
  applicationMethod?: string;
  applicationInterval?: string;
  targetCrops: string[];
  targetPests: string[];
  targetAnimals: string[];
  season?: SeasonType;
  suitableFor: string[];
  cropStage?: string;
  toxicityLevel?: string;
  ppePeriod?: number;
  reEntryPeriod?: number;
  warningLabel?: string;
  hazardClass?: string;
  isOrganic: boolean;
  organicCertNumber?: string;
  govtRegNumber?: string;
  govtRegExpiry?: string;
  shelfLifeMonths?: number;
  storageTemp?: string;
  storageInstructions?: string;
  reorderLevel?: number;
  minStockAlert?: number;
  bulkDiscountThreshold?: number;
  bulkDiscountPct?: number;
  imageUrls: string[];
  descriptionLong?: string;
  usageInstructions?: string;
  precautions?: string;
  firstAid?: string;
  msdsUrl?: string;
  brochureUrl?: string;
  videoUrl?: string;
  isPopular: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isSeasonal: boolean;
  isRestricted: boolean;
  requiresLicense: boolean;
  totalSold: number;
  totalRevenue: number;
  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const agriProductsApi = {
  upsert: (data: Partial<AgriProductProfile>) => apiClient.post('/agri/products', data).then(unwrap<AgriProductProfile>),
  list: (params?: any) => apiClient.get('/agri/products', { params }).then(unwrap<AgriProductProfile[]>),
  byCategory: () => apiClient.get('/agri/products/by-category').then(unwrap<Record<string, AgriProductProfile[]>>),
  expiringCerts: (days?: number) => apiClient.get('/agri/products/expiring-certs', { params: { days } }).then(unwrap<AgriProductProfile[]>),
  byProduct: (productId: string) => apiClient.get('/agri/products/by-product/' + productId).then(unwrap<AgriProductProfile | null>),
  getOne: (id: string) => apiClient.get('/agri/products/' + id).then(unwrap<AgriProductProfile>),
  remove: (id: string) => apiClient.delete('/agri/products/' + id).then(unwrap),
};
