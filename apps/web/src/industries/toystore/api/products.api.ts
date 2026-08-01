import { apiClient } from '@core/api/client';

export type ToyCategoryType =
  | 'ACTION_FIGURE' | 'DOLL' | 'PLUSH_TOY' | 'BUILDING_BLOCKS' | 'LEGO'
  | 'PUZZLE' | 'BOARD_GAME' | 'CARD_GAME' | 'EDUCATIONAL_TOY'
  | 'STEM_TOY' | 'MONTESSORI' | 'ART_CRAFT' | 'MUSICAL_INSTRUMENT'
  | 'RC_CAR' | 'RC_DRONE' | 'RC_HELICOPTER' | 'DIE_CAST_CAR'
  | 'TRAIN_SET' | 'DOLL_HOUSE' | 'KITCHEN_SET' | 'PRETEND_PLAY'
  | 'OUTDOOR_TOY' | 'RIDE_ON' | 'BIKE_TRIKE' | 'BALL_SPORTS'
  | 'WATER_TOY' | 'BEACH_TOY' | 'SAND_TOY'
  | 'BABY_TOY' | 'RATTLE' | 'TEETHER' | 'STACKING_TOY'
  | 'SOFT_TOY' | 'STUFFED_ANIMAL' | 'CHARACTER_TOY'
  | 'SCIENCE_KIT' | 'CHEMISTRY_SET' | 'MICROSCOPE' | 'TELESCOPE'
  | 'ROBOTICS_KIT' | 'CODING_TOY'
  | 'PARTY_SUPPLIES' | 'COSTUMES' | 'MAGIC_TRICKS'
  | 'BUBBLE_TOY' | 'SLIME_PUTTY' | 'YO_YO' | 'FIDGET_TOY'
  | 'COLLECTIBLE' | 'TRADING_CARDS' | 'OTHER';

export type ToyAgeGroup =
  | 'NEWBORN_0_6M' | 'INFANT_6_12M' | 'TODDLER_1_2Y' | 'TODDLER_2_3Y'
  | 'PRESCHOOL_3_5Y' | 'KIDS_5_8Y' | 'KIDS_8_12Y' | 'TWEEN_12_14Y'
  | 'TEEN_14_PLUS' | 'ALL_AGES';

export type ToyGenderTarget = 'BOYS' | 'GIRLS' | 'UNISEX';

export type ToySafetyCertification =
  | 'CE' | 'ASTM' | 'CPSC' | 'EN71' | 'ISO_8124' | 'BIS' | 'PSA' | 'OTHER';

export interface ToyProductProfile {
  id: string;
  productId: string;
  categoryType?: ToyCategoryType;
  ageGroup: ToyAgeGroup;
  ageGroups: ToyAgeGroup[];
  ageMinYears?: number;
  ageMaxYears?: number;
  genderTarget: ToyGenderTarget;

  brand?: string;
  characterFranchise?: string;
  themeCategory?: string;

  isEducational: boolean;
  learningAreas: string[];
  developmentSkills: string[];
  cognitiveCategory?: string;

  material?: string;
  materialsUsed: string[];
  colorName?: string;
  colorHex?: string;
  size?: string;
  dimensions?: string;
  weightGrams?: number;
  numberOfPieces?: number;

  requiresBatteries: boolean;
  batteriesIncluded: boolean;
  batteryType?: string;
  batteryQuantity?: number;

  isRemoteControlled: boolean;
  rcRange?: string;
  rcChargingTime?: string;
  rcRunTime?: string;
  rcFrequency?: string;

  safetyCertifications: ToySafetyCertification[];
  safetyWarnings: string[];
  chokingHazard: boolean;
  smallPartsWarning: boolean;
  isNonToxic: boolean;
  isBpaFree: boolean;
  isPhthalateFree: boolean;

  playerCount?: string;
  playDurationMinutes?: number;
  isMultiplayer: boolean;
  hasSound: boolean;
  hasLights: boolean;
  hasMotor: boolean;
  isCollectible: boolean;

  languagesSupported: string[];
  isMontessoriApproved: boolean;
  isWaldorfApproved: boolean;

  mrp?: number;
  costPrice?: number;
  retailPrice?: number;
  discountedPrice?: number;

  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  isBirthdayGift: boolean;
  isEidGift: boolean;
  isChristmasGift: boolean;

  totalSold: number;
  totalRevenue: number;

  warrantyMonths?: number;
  hasReplacementParts: boolean;
  giftWrapAvailable: boolean;
  giftMessageAvailable: boolean;

  videoUrl?: string;
  instructionUrl?: string;
  notes?: string;
  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const toyProductsApi = {
  upsert: (data: Partial<ToyProductProfile>) =>
    apiClient.post('/toystore/products', data).then(unwrap<ToyProductProfile>),

  list: (params?: {
    categoryType?: string; ageGroup?: string; genderTarget?: string;
    brand?: string; franchise?: string;
    educational?: boolean; rc?: boolean; requiresBatteries?: boolean;
    montessori?: boolean; collectible?: boolean; multiplayer?: boolean;
    noChokingHazard?: boolean;
    featured?: boolean; bestSeller?: boolean; newArrival?: boolean; trending?: boolean;
    birthdayGift?: boolean; eidGift?: boolean;
    minPrice?: number; maxPrice?: number; search?: string;
  }) => apiClient.get('/toystore/products', { params }).then(unwrap<ToyProductProfile[]>),

  forAge: (params: {
    years: number; gender?: string; maxBudget?: number;
    educationalOnly?: boolean; safeOnly?: boolean;
  }) => apiClient.get('/toystore/products/for-age', { params }).then(unwrap<any>),

  safetyReview: () =>
    apiClient.get('/toystore/products/safety-review').then(unwrap<any[]>),

  batteryUpsell: () =>
    apiClient.get('/toystore/products/battery-upsell').then(unwrap<any[]>),

  counts: () => apiClient.get('/toystore/products/counts').then(unwrap<any>),

  brands: () => apiClient.get('/toystore/products/brands').then(unwrap<any>),

  byProduct: (productId: string) =>
    apiClient.get('/toystore/products/by-product/' + productId).then(unwrap<ToyProductProfile | null>),

  getOne: (id: string) =>
    apiClient.get('/toystore/products/' + id).then(unwrap<ToyProductProfile>),

  remove: (id: string) =>
    apiClient.delete('/toystore/products/' + id).then(unwrap),
};
