import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

/** Sports details kept next to a product. */
export interface SportsProductProfile {
  id: string;
  productId: string;
  categoryType?: string | null;
  sport?: string | null;
  ageGroup: string;
  genderTarget: string;
  batWood?: string | null;
  batWeightGrams?: number | null;
  batGrade?: string | null;
  batSize?: string | null;
  handleType?: string | null;
  ballType?: string | null;
  ballWeight?: string | null;
  size?: string | null;
  material?: string | null;
  fit?: string | null;
  hasCustomization: boolean;
  weight?: string | null;
  color?: string | null;
  isTeamOrderable: boolean;
  minTeamOrder?: number | null;
  bulkDiscountPct?: number | null;
  teamPrice?: number | null;
  warrantyMonths: number;
  warrantyType?: string | null;
  mrp?: number | null;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isProfessional: boolean;
  careInstructions?: string | null;
}

/** The small set of sports facts the POS and lists need for every product. */
export interface SportsMeta {
  productId: string; categoryType: string | null; sport: string | null; ageGroup: string; genderTarget: string;
  size: string | null; color: string | null; isTeamOrderable: boolean; minTeamOrder: number | null; teamPrice: number | null;
  bulkDiscountPct: number | null; hasCustomization: boolean; mrp: number | null; isNewArrival: boolean; isBestSeller: boolean;
  isProfessional: boolean; warrantyMonths: number;
}

export const sportsProductsApi = {
  upsert: (data: Partial<SportsProductProfile> & { productId: string }) => apiClient.post('/sports/products', data).then(unwrap<SportsProductProfile>),
  byProduct: (productId: string) => apiClient.get('/sports/products/by-product/' + productId).then(unwrap<SportsProductProfile | null>),
  meta: () => apiClient.get('/sports/products/meta').then(unwrap<{ items: SportsMeta[] }>),
  splitVariantStock: (productId: string) => apiClient.post(`/sports/products/${productId}/variant-stock-split`).then(unwrap),
  syncBrands: () => apiClient.post('/sports/products/brands/sync').then(unwrap<{ brands: number; products: number }>),
};
