import { apiClient } from '@core/api/client';

export type PetCategoryType =
  | 'DRY_FOOD' | 'WET_FOOD' | 'TREATS' | 'SUPPLEMENTS' | 'PRESCRIPTION_DIET'
  | 'TOYS' | 'BEDS' | 'CARRIERS' | 'LEASHES_COLLARS' | 'CLOTHING'
  | 'GROOMING_SUPPLIES' | 'HYGIENE' | 'TRAINING' | 'LITTER'
  | 'AQUARIUM_TANK' | 'AQUARIUM_FILTER' | 'AQUARIUM_DECOR' | 'AQUARIUM_FOOD' | 'AQUARIUM_MEDICINE'
  | 'BIRD_CAGE' | 'BIRD_FOOD' | 'BIRD_ACCESSORIES'
  | 'REPTILE_HABITAT' | 'REPTILE_FOOD' | 'REPTILE_HEATING'
  | 'VET_MEDICINE' | 'VET_VACCINE' | 'FIRST_AID' | 'OTHER';

export type PetSpeciesType =
  | 'DOG' | 'CAT' | 'BIRD' | 'FISH' | 'RABBIT' | 'HAMSTER' | 'GUINEA_PIG'
  | 'TURTLE' | 'REPTILE' | 'PARROT' | 'HORSE' | 'FARM_ANIMAL' | 'OTHER' | 'ALL';

export type PetLifeStage = 'PUPPY_KITTEN' | 'JUNIOR' | 'ADULT' | 'SENIOR' | 'ALL_STAGES';

export interface PetProductProfile {
  id: string;
  productId: string;
  categoryType?: PetCategoryType;
  species?: PetSpeciesType;
  lifeStage?: PetLifeStage;
  brand?: string;
  breedSpecific?: string;
  weightGrams?: number;
  weightKg?: number;
  packSize?: string;
  flavor?: string;
  proteinSource?: string;
  proteinPct?: number;
  fatPct?: number;
  fiberPct?: number;
  moisturePct?: number;
  ingredients?: string;
  isGrainFree: boolean;
  isOrganic: boolean;
  isHypoallergenic: boolean;
  benefits: string[];
  suitedForBreedSizes: string[];
  suitedForAges?: string;
  size?: string;
  dimensions?: string;
  color?: string;
  material?: string;
  tankCapacityLiters?: number;
  tankShape?: string;
  filterCapacity?: string;
  wattage?: string;
  isPrescriptionOnly: boolean;
  activeIngredient?: string;
  dosageForm?: string;
  dosageStrength?: string;
  administrationRoute?: string;
  storageInstructions?: string;
  expiryDate?: string;
  batchNumber?: string;
  mrp?: number;
  costPrice?: number;
  retailPrice?: number;
  discountedPrice?: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isOnSale: boolean;
  totalSold: number;
  totalRevenue: number;
  notes?: string;
  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const petProductsApi = {
  upsert: (data: Partial<PetProductProfile>) =>
    apiClient.post('/petshop/products', data).then(unwrap<PetProductProfile>),

  list: (params?: {
    categoryType?: string; species?: string; lifeStage?: string; brand?: string;
    grainFree?: boolean; organic?: boolean; hypoallergenic?: boolean; prescriptionOnly?: boolean;
    featured?: boolean; bestSeller?: boolean; newArrival?: boolean; onSale?: boolean;
    minPrice?: number; maxPrice?: number; search?: string;
  }) => apiClient.get('/petshop/products', { params }).then(unwrap<PetProductProfile[]>),

  forPet: (species: string, lifeStage?: string) =>
    apiClient.get('/petshop/products/for-pet', { params: { species, lifeStage } }).then(unwrap<PetProductProfile[]>),

  expiringSoon: (days = 90) =>
    apiClient.get('/petshop/products/expiring-soon', { params: { days } }).then(unwrap<any[]>),

  expired: () =>
    apiClient.get('/petshop/products/expired').then(unwrap<any[]>),

  byCategory: () =>
    apiClient.get('/petshop/products/by-category-count').then(unwrap<{ byCategory: Record<string, number>; bySpecies: Record<string, number> }>),

  brands: () =>
    apiClient.get('/petshop/products/brands').then(unwrap<Array<{ brand: string; count: number; revenue: number }>>),

  byProduct: (productId: string) =>
    apiClient.get('/petshop/products/by-product/' + productId).then(unwrap<PetProductProfile | null>),

  getOne: (id: string) =>
    apiClient.get('/petshop/products/' + id).then(unwrap<PetProductProfile>),

  remove: (id: string) =>
    apiClient.delete('/petshop/products/' + id).then(unwrap),
};
