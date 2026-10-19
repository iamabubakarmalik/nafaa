import { apiClient } from '@core/api/client';

export type PartCategory = 'ENGINE' | 'TRANSMISSION' | 'BRAKES' | 'SUSPENSION' | 'ELECTRICAL'
  | 'BATTERY' | 'COOLING' | 'EXHAUST' | 'FUEL_SYSTEM' | 'BODY' | 'INTERIOR' | 'LIGHTING'
  | 'TIRES_WHEELS' | 'FILTERS' | 'OILS_FLUIDS' | 'BELTS_HOSES' | 'IGNITION' | 'AC_HEATING'
  | 'STEERING' | 'DRIVETRAIN' | 'BEARINGS' | 'GASKETS' | 'SENSORS' | 'ACCESSORIES'
  | 'TOOLS' | 'CONSUMABLES' | 'OTHER';

export type PartCondition = 'NEW' | 'USED' | 'REFURBISHED' | 'GENUINE' | 'OEM' | 'AFTERMARKET' | 'LOCAL';

export interface PartFitment { makeId?: string; makeName?: string; modelId?: string; modelName?: string; yearFrom?: number | null; yearTo?: number | null; notes?: string }

export interface PartProfile {
  id: string;
  productId: string;
  partNumber?: string;
  oemNumber?: string;
  alternateNumbers: string[];
  category: PartCategory;
  subCategory?: string;
  condition: PartCondition;
  brand?: string;
  countryOfOrigin?: string;
  manufacturer?: string;
  weightGrams?: number;
  dimensions?: string;
  color?: string;
  material?: string;
  warrantyMonths: number;
  warrantyKm?: number;
  warrantyNotes?: string;
  installationMinutes?: number;
  requiresSpecialTool: boolean;
  installationDifficulty?: string;
  compatibility?: { isUniversal?: boolean; fitments?: PartFitment[] } | null;
  minStockAlert: number;
  isFastMoving: boolean;
  isCritical: boolean;
  totalSold: number;
  totalInstalled: number;
  createdAt: string;
  updatedAt: string;
}

/** One light row per part: numbers, brand, condition and the vehicles it fits. */
export interface PartFacts {
  productId: string; partNumber?: string | null; oemNumber?: string | null; alternateNumbers: string[]; brand?: string | null;
  condition: PartCondition; category: PartCategory; warrantyMonths: number; isFastMoving: boolean; isCritical: boolean;
  universal: boolean; fitment: string;
  fits: Array<{ makeId: string | null; modelId: string | null; makeName: string | null; modelName: string | null; yearFrom: number | null; yearTo: number | null }>;
}

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const partProfilesApi = {
  upsert: (data: Partial<Omit<PartProfile, 'id' | 'product' | 'createdAt' | 'updatedAt' | 'totalSold' | 'totalInstalled'>> & { productId: string }) =>
    apiClient.post('/autoparts/part-profiles', data).then(unwrap<PartProfile>),
  facts: () => apiClient.get('/autoparts/part-profiles/facts').then(unwrap<PartFacts[]>),
  byProduct: (productId: string) => apiClient.get('/autoparts/part-profiles/by-product/' + productId).then(unwrap<PartProfile | null>),
};
