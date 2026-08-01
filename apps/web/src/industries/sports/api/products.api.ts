import { apiClient } from '@core/api/client';

export type SportsCategoryType =
  | 'CRICKET_BAT' | 'CRICKET_BALL' | 'CRICKET_HELMET' | 'CRICKET_PADS' | 'CRICKET_GLOVES'
  | 'CRICKET_KIT_BAG' | 'CRICKET_STUMPS' | 'CRICKET_JERSEY' | 'CRICKET_SHOES' | 'CRICKET_GUARD'
  | 'FOOTBALL' | 'FOOTBALL_JERSEY' | 'FOOTBALL_SHOES' | 'FOOTBALL_KIT' | 'SHIN_GUARDS'
  | 'GOALKEEPER_GLOVES' | 'GOAL_POST'
  | 'BASKETBALL' | 'BASKETBALL_JERSEY' | 'BASKETBALL_SHOES' | 'BASKETBALL_HOOP'
  | 'VOLLEYBALL' | 'VOLLEYBALL_NET' | 'NETBALL'
  | 'BADMINTON_RACKET' | 'BADMINTON_SHUTTLECOCK' | 'TENNIS_RACKET' | 'TENNIS_BALL'
  | 'TABLE_TENNIS_BAT' | 'TABLE_TENNIS_BALL' | 'SQUASH_RACKET'
  | 'DUMBBELL' | 'BARBELL' | 'WEIGHT_PLATE' | 'KETTLEBELL' | 'BENCH_PRESS'
  | 'TREADMILL' | 'EXERCISE_BIKE' | 'ELLIPTICAL' | 'ROWING_MACHINE'
  | 'YOGA_MAT' | 'RESISTANCE_BAND' | 'SKIPPING_ROPE' | 'BOXING_GLOVES' | 'PUNCHING_BAG'
  | 'PROTEIN_SUPPLEMENT' | 'GYM_ACCESSORY'
  | 'SWIMMING_GOGGLES' | 'SWIMSUIT' | 'SWIMMING_CAP'
  | 'CAMPING_TENT' | 'SLEEPING_BAG' | 'HIKING_BAG' | 'CYCLING_HELMET' | 'BICYCLE'
  | 'TROPHY' | 'MEDAL' | 'WHISTLE' | 'STOPWATCH' | 'UMPIRE_GEAR' | 'OTHER';

export type SportsAgeGroup = 'KIDS' | 'YOUTH' | 'ADULT' | 'SENIOR' | 'UNIVERSAL';
export type SportsGenderTarget = 'MALE' | 'FEMALE' | 'UNISEX' | 'KIDS';

export interface SportsProductProfile {
  id: string;
  productId: string;
  brandId?: string;
  categoryType?: SportsCategoryType;
  sport?: string;
  ageGroup: SportsAgeGroup;
  genderTarget: SportsGenderTarget;

  batWood?: string;
  batWeightGrams?: number;
  batGrade?: string;
  batSize?: string;
  handleType?: string;

  ballType?: string;
  ballWeight?: string;
  ballCircumference?: string;
  ballMaterial?: string;

  size?: string;
  material?: string;
  fit?: string;
  hasCustomization: boolean;

  shoeSize?: string;
  soleType?: string;
  studType?: string;

  weight?: string;
  maxUserWeight?: string;
  dimensions?: string;
  powerRating?: string;
  motorType?: string;
  foldable: boolean;

  color?: string;
  colorHex?: string;
  material2?: string;
  countryOfMake?: string;
  certifications: string[];

  isTeamOrderable: boolean;
  minTeamOrder?: number;
  bulkDiscountPct?: number;
  customizationOptions: string[];

  warrantyMonths: number;
  warrantyType?: string;

  mrp?: number;
  costPrice?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  teamPrice?: number;

  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isProfessional: boolean;

  totalSold: number;
  totalRevenue: number;
  avgRating?: number;
  totalReviews: number;

  notes?: string;
  careInstructions?: string;
  product?: any;
  brand?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const sportsProductsApi = {
  upsert: (data: Partial<SportsProductProfile>) =>
    apiClient.post('/sports/products', data).then(unwrap<SportsProductProfile>),

  list: (params?: {
    brandId?: string; categoryType?: string; sport?: string;
    ageGroup?: string; genderTarget?: string;
    featured?: boolean; bestSeller?: boolean; newArrival?: boolean;
    professional?: boolean; teamOrderable?: boolean; search?: string;
  }) => apiClient.get('/sports/products', { params }).then(unwrap<SportsProductProfile[]>),

  byProduct: (productId: string) =>
    apiClient.get('/sports/products/by-product/' + productId).then(unwrap<SportsProductProfile | null>),

  byCategory: () =>
    apiClient.get('/sports/products/by-category-count').then(unwrap<Record<string, number>>),

  bySport: () =>
    apiClient.get('/sports/products/by-sport-count').then(unwrap<Record<string, number>>),

  teamOrderable: () =>
    apiClient.get('/sports/products/team-orderable').then(unwrap<SportsProductProfile[]>),

  getOne: (id: string) =>
    apiClient.get('/sports/products/' + id).then(unwrap<SportsProductProfile>),

  remove: (id: string) =>
    apiClient.delete('/sports/products/' + id).then(unwrap),
};
