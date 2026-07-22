import { apiClient } from '@core/api/client';

export type PartCategory = 'ENGINE' | 'TRANSMISSION' | 'BRAKES' | 'SUSPENSION' | 'ELECTRICAL'
  | 'BATTERY' | 'COOLING' | 'EXHAUST' | 'FUEL_SYSTEM' | 'BODY' | 'INTERIOR' | 'LIGHTING'
  | 'TIRES_WHEELS' | 'FILTERS' | 'OILS_FLUIDS' | 'BELTS_HOSES' | 'IGNITION' | 'AC_HEATING'
  | 'STEERING' | 'DRIVETRAIN' | 'BEARINGS' | 'GASKETS' | 'SENSORS' | 'ACCESSORIES'
  | 'TOOLS' | 'CONSUMABLES' | 'OTHER';

export type PartCondition = 'NEW' | 'USED' | 'REFURBISHED' | 'GENUINE' | 'OEM' | 'AFTERMARKET' | 'LOCAL';

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
  compatibility?: any;
  minStockAlert: number;
  isFastMoving: boolean;
  isCritical: boolean;
  totalSold: number;
  totalInstalled: number;
  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const partProfilesApi = {
  upsert: (data: Partial<PartProfile>) => apiClient.post('/autoparts/part-profiles', data).then(unwrap<PartProfile>),
  list: (params?: any) => apiClient.get('/autoparts/part-profiles', { params }).then(unwrap<PartProfile[]>),
  byProduct: (productId: string) => apiClient.get('/autoparts/part-profiles/by-product/' + productId).then(unwrap<PartProfile | null>),
  byPartNumber: (partNumber: string) => apiClient.get('/autoparts/part-profiles/by-part-number/' + encodeURIComponent(partNumber)).then(unwrap<PartProfile[]>),
  compatible: (makeId: string, modelId: string, year?: number) =>
    apiClient.get('/autoparts/part-profiles/compatible/' + makeId + '/' + modelId, { params: year ? { year } : {} }).then(unwrap<PartProfile[]>),
  remove: (id: string) => apiClient.delete('/autoparts/part-profiles/' + id).then(unwrap),
};
