import { apiClient } from '@core/api/client';

/** Same values as the server enums. */
export type PetCategoryType =
  | 'DOG_FOOD_DRY' | 'DOG_FOOD_WET' | 'DOG_TREATS' | 'DOG_ACCESSORY' | 'DOG_TOY' | 'DOG_LEASH_COLLAR' | 'DOG_BED'
  | 'CAT_FOOD_DRY' | 'CAT_FOOD_WET' | 'CAT_TREATS' | 'CAT_LITTER' | 'CAT_ACCESSORY' | 'CAT_TOY' | 'CAT_BED' | 'CAT_SCRATCH_POST'
  | 'BIRD_FOOD' | 'BIRD_CAGE' | 'BIRD_ACCESSORY' | 'FISH_FOOD'
  | 'AQUARIUM_TANK' | 'AQUARIUM_FILTER' | 'AQUARIUM_DECOR' | 'AQUARIUM_PLANT' | 'AQUARIUM_HEATER' | 'AQUARIUM_LIGHT' | 'AQUARIUM_ACCESSORY'
  | 'RABBIT_FOOD' | 'RABBIT_ACCESSORY' | 'HAMSTER_FOOD' | 'HAMSTER_CAGE' | 'REPTILE_FOOD' | 'REPTILE_ACCESSORY'
  | 'LIVE_ANIMAL_DOG' | 'LIVE_ANIMAL_CAT' | 'LIVE_ANIMAL_BIRD' | 'LIVE_ANIMAL_FISH' | 'LIVE_ANIMAL_RABBIT' | 'LIVE_ANIMAL_HAMSTER' | 'LIVE_ANIMAL_REPTILE' | 'LIVE_ANIMAL_OTHER'
  | 'VET_MEDICINE' | 'VET_VACCINE' | 'VET_DEWORMER' | 'VET_SUPPLEMENT' | 'VET_SHAMPOO' | 'VET_GROOMING' | 'VET_HYGIENE'
  | 'TRAINING_TREATS' | 'TRAINING_TOOL' | 'CARRIER' | 'TRANSPORT_CAGE' | 'OTHER';

export type PetSpeciesType =
  | 'DOG' | 'CAT' | 'BIRD' | 'FISH' | 'RABBIT' | 'HAMSTER' | 'GUINEA_PIG' | 'REPTILE' | 'TURTLE' | 'SNAKE' | 'FERRET' | 'OTHER';

export type PetLifeStage = 'PUPPY' | 'KITTEN' | 'ADULT' | 'SENIOR' | 'ALL_STAGES';

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

  byProduct: (productId: string) =>
    apiClient.get('/petshop/products/by-product/' + productId).then(unwrap<PetProductProfile | null>),
};
