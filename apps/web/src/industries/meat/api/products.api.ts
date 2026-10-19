import { apiClient } from '@core/api/client';

export type AnimalType = 'BEEF' | 'MUTTON' | 'GOAT' | 'LAMB' | 'CHICKEN' | 'DUCK' | 'TURKEY'
  | 'QUAIL' | 'CAMEL' | 'BUFFALO' | 'FISH' | 'PRAWN' | 'OTHER';

export type CutCategory = 'WHOLE_ANIMAL' | 'HALF_ANIMAL' | 'QUARTER' | 'PRIMAL_CUT' | 'RETAIL_CUT'
  | 'BONELESS' | 'WITH_BONE' | 'MINCE' | 'UNDERCUT' | 'RIBS' | 'CHOPS' | 'BREAST' | 'LEG'
  | 'THIGH' | 'WING' | 'DRUMSTICK' | 'LIVER' | 'KIDNEY' | 'HEART' | 'BRAIN' | 'TONGUE'
  | 'TROTTERS' | 'HEAD' | 'TAIL' | 'OFFAL' | 'BONES' | 'FAT' | 'SKIN' | 'OTHER';

export type FreshnessType = 'LIVE' | 'FRESH_SLAUGHTERED' | 'FRESH_CHILLED' | 'FROZEN'
  | 'PREPARED' | 'PROCESSED' | 'MARINATED' | 'SMOKED' | 'DRIED' | 'CURED';

export type SlaughterMethod = 'HALAL_HAND' | 'HALAL_MACHINE' | 'KOSHER' | 'STANDARD' | 'ORGANIC' | 'FREE_RANGE' | 'OTHER';
export type QualityGrade = 'PREMIUM' | 'GRADE_A' | 'GRADE_B' | 'GRADE_C' | 'STANDARD' | 'ECONOMY';
export type SaleUnit = 'KG' | 'GRAM' | 'POUND' | 'PIECE' | 'DOZEN' | 'WHOLE' | 'HALF' | 'QUARTER' | 'KILO_PACK';

export interface MeatProductProfile {
  id: string;
  productId: string;
  animalType: AnimalType;
  cutCategory: CutCategory;
  freshnessType: FreshnessType;
  slaughterMethod: SlaughterMethod;
  qualityGrade: QualityGrade;
  saleUnit: SaleUnit;
  pricePerKg: number;
  pricePerPiece?: number;
  minOrderKg?: number;
  maxOrderKg?: number;
  weightVariancePct: number;
  isBoneless: boolean;
  isBoneIn: boolean;
  isSkinless: boolean;
  isMarinated: boolean;
  marinationType?: string;
  isOrganic: boolean;
  isFreeRange: boolean;
  isGrainFed: boolean;
  isGrassFed: boolean;
  isFrozen: boolean;
  halalCertNumber?: string;
  halalCertBy?: string;
  halalCertExpiry?: string;
  isHalalCertified: boolean;
  otherCerts: string[];
  farmName?: string;
  farmLocation?: string;
  slaughterhouseName?: string;
  slaughterhouseLic?: string;
  countryOfOrigin?: string;
  breed?: string;
  storageTempMin?: number;
  storageTempMax?: number;
  shelfLifeDays?: number;
  packagingType?: string;
  batchNumber?: string;
  animalAge?: string;
  animalSex?: string;
  cuttingStyle?: string;
  cleaningLevel?: string;
  packagingWeight?: number;
  imageUrls: string[];
  descriptionLong?: string;
  cookingSuggestions?: string;
  nutritionInfo?: unknown;
  isPopular: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isOnSale: boolean;
  totalSoldKg: number;
  totalRevenue: number;
  product?: { id: string; name: string; price: number; unit: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DaySheetRow {
  productId: string; name: string; unit: string; animalType: string | null; cutCategory: string | null;
  price: number; wholesalePrice: number | null; costPrice: number;
  opening: number; bought: number; madeIn: number; returned: number; sold: number; cutOut: number; waste: number; otherIn: number; otherOut: number;
  closing: number; closingValue: number; now: number;
}

export interface DaySheet {
  date: string;
  rows: DaySheetRow[];
  totals: { bought: number; madeIn: number; sold: number; cutOut: number; waste: number; closing: number; closingValue: number } | null;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const meatProductsApi = {
  upsert: (data: Partial<MeatProductProfile>) => apiClient.post('/meat/products', data).then(unwrap<MeatProductProfile>),
  list: (params?: Record<string, string | undefined>) => apiClient.get('/meat/products', { params }).then(unwrap<MeatProductProfile[]>),
  byProduct: (productId: string) => apiClient.get('/meat/products/by-product/' + productId).then(unwrap<MeatProductProfile | null>),
  daySheet: (date?: string) => apiClient.get('/meat/products/day-sheet', { params: { date } }).then(unwrap<DaySheet>),
};
