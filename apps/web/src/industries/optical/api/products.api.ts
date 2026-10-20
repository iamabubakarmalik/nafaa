import { apiClient } from '@core/api/client';

export type OpticalCategoryType =
  | 'FRAME_FULL_RIM' | 'FRAME_HALF_RIM' | 'FRAME_RIMLESS' | 'FRAME_SPORTS' | 'FRAME_KIDS' | 'FRAME_READING'
  | 'SUNGLASSES' | 'SUNGLASSES_POLARIZED' | 'SUNGLASSES_KIDS'
  | 'LENS_SINGLE_VISION' | 'LENS_BIFOCAL' | 'LENS_PROGRESSIVE' | 'LENS_PHOTOCHROMIC' | 'LENS_BLUE_CUT' | 'LENS_ANTI_GLARE' | 'LENS_CYLINDRICAL' | 'LENS_SPHERICAL'
  | 'CONTACT_LENS_MONTHLY' | 'CONTACT_LENS_DAILY' | 'CONTACT_LENS_YEARLY' | 'CONTACT_LENS_COLORED' | 'CONTACT_LENS_TORIC' | 'CONTACT_LENS_MULTIFOCAL'
  | 'CLEANING_SOLUTION' | 'LENS_CASE' | 'ACCESSORY' | 'OTHER';
export type OpticalFrameShape = 'ROUND' | 'SQUARE' | 'RECTANGLE' | 'OVAL' | 'CAT_EYE' | 'AVIATOR' | 'WAYFARER' | 'BROWLINE' | 'GEOMETRIC' | 'BUTTERFLY' | 'HEART' | 'OTHER';
export type OpticalFrameMaterial = 'ACETATE' | 'METAL' | 'TITANIUM' | 'STAINLESS_STEEL' | 'PLASTIC' | 'TR90' | 'WOOD' | 'ALUMINIUM' | 'MIXED' | 'OTHER';
export type OpticalGender = 'MENS' | 'WOMENS' | 'UNISEX' | 'KIDS' | 'KIDS_BOYS' | 'KIDS_GIRLS';

/** What the products page, editor, detail and counter read per product. */
export interface OpticalFacts {
  productId: string;
  categoryType: OpticalCategoryType | null;
  brand: string | null; modelNumber: string | null; colorName: string | null; colorHex: string | null;
  frameShape: OpticalFrameShape | null; frameMaterial: OpticalFrameMaterial | null; gender: OpticalGender | null;
  frameSizeMm: number | null; bridgeSizeMm: number | null; templeLengthMm: number | null;
  lensType: string | null; lensIndex: string | null; lensCoatings: string[];
  hasBlueCut: boolean; isPhotochromic: boolean; isPolarized: boolean;
  isContactLens: boolean; clDuration: string | null; clBaseCurve: string | null; clDiameter: string | null; clForAstigmatism: boolean;
  supportsMinSph: number | null; supportsMaxSph: number | null; supportsMaxCyl: number | null; supportsProgressive: boolean;
  warrantyMonths: number;
}

/** Fields kept on the full profile besides the facts. */
export interface OpticalProfileMore { collectionName?: string | null; lensMaterial?: string | null; clWaterContent?: string | null; hasUvProtection?: boolean; notes?: string | null }

type OpticalProfileInput = Partial<Omit<OpticalFacts, 'productId'>> & Omit<OpticalProfileMore, 'notes'> & { productId: string; notes?: string; retailPrice?: number; costPrice?: number };

const unwrap = <T,>(res: { data: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const opticalProductsApi = {
  upsert: (data: OpticalProfileInput) => apiClient.post('/optical/products', data).then(unwrap<OpticalFacts>),
  facts: () => apiClient.get('/optical/products/facts').then(unwrap<OpticalFacts[]>),
  byProduct: (productId: string) => apiClient.get('/optical/products/by-product/' + productId).then(unwrap<(OpticalFacts & OpticalProfileMore & { id: string }) | null>),
};
