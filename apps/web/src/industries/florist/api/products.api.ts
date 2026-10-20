import { apiClient } from '@core/api/client';

/** Same values as the server enums. */
export type FloristCategoryType =
  | 'ROSE_RED' | 'ROSE_WHITE' | 'ROSE_PINK' | 'ROSE_YELLOW' | 'ROSE_MIXED' | 'TULIP' | 'LILY' | 'ORCHID' | 'SUNFLOWER'
  | 'CARNATION' | 'GERBERA' | 'CHRYSANTHEMUM' | 'DAISY' | 'JASMINE' | 'MARIGOLD' | 'IRIS' | 'HYDRANGEA' | 'PEONY'
  | 'ANTHURIUM' | 'BIRD_OF_PARADISE' | 'BABY_BREATH' | 'GREENERY_FILLER'
  | 'BOUQUET_BIRTHDAY' | 'BOUQUET_ANNIVERSARY' | 'BOUQUET_WEDDING' | 'BOUQUET_ROMANCE' | 'BOUQUET_CONDOLENCE' | 'BOUQUET_GET_WELL'
  | 'BOUQUET_CONGRATULATIONS' | 'BOUQUET_MIXED' | 'BASKET_ARRANGEMENT' | 'VASE_ARRANGEMENT' | 'BOX_ARRANGEMENT' | 'TABLE_CENTREPIECE'
  | 'STANDING_ARRANGEMENT' | 'WEDDING_GARLAND' | 'BRIDAL_BOUQUET' | 'BOUTONNIERE' | 'CAR_DECORATION' | 'STAGE_DECORATION'
  | 'MEHNDI_DECORATION' | 'FUNERAL_WREATH' | 'SYMPATHY_ARRANGEMENT'
  | 'POTTED_PLANT_INDOOR' | 'POTTED_PLANT_OUTDOOR' | 'SUCCULENT' | 'BONSAI' | 'AIR_PLANT'
  | 'CHOCOLATE_BOX' | 'TEDDY_BEAR' | 'BALLOON' | 'GREETING_CARD' | 'GIFT_ITEM' | 'VASE_EMPTY' | 'RIBBON' | 'WRAPPING_PAPER' | 'FLORAL_FOAM' | 'OTHER';

export type FloristFreshnessGrade = 'A_PREMIUM' | 'B_STANDARD' | 'C_ECONOMY' | 'IMPORTED' | 'LOCAL';

export interface FloristProductProfile {
  id: string;
  productId: string;
  categoryType?: FloristCategoryType;
  freshnessGrade: FloristFreshnessGrade;
  flowerType?: string;
  color?: string;
  colorHex?: string;
  stemLengthCm?: number;
  isImported: boolean;
  origin?: string;
  season: string[];
  arrivalDate?: string;
  freshUntil?: string;
  daysToWither?: number;
  isPreArranged: boolean;
  bouquetSize?: string;
  stemCount?: number;
  composition?: any;
  wrapType?: string;
  ribbonColor?: string;
  hasVase: boolean;
  occasions: string[];
  meaning?: string;
  careInstructions?: string;
  isCustomizable: boolean;
  customizationOptions: string[];
  minLeadTimeHours?: number;
  mrp?: number;
  costPrice?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  weddingPrice?: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isSeasonalSpecial: boolean;
  totalSold: number;
  notes?: string;
  product?: any;
  createdAt: string;
  updatedAt: string;
}

export interface FreshnessRow extends FloristProductProfile {
  product: { id: string; name: string; unit: string; stock: number; costPrice: number; price: number } | null;
}
interface FreshnessAlerts { witheringToday: FreshnessRow[]; witheringSoon: FreshnessRow[]; witheringLater: FreshnessRow[] }

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- axios envelope varies by endpoint
const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const floristProductsApi = {
  upsert: (data: Partial<FloristProductProfile>) =>
    apiClient.post('/florist/products', data).then(unwrap<FloristProductProfile>),

  list: (params?: {
    categoryType?: string; freshnessGrade?: string; flowerType?: string; color?: string;
    occasion?: string; isImported?: boolean; isPreArranged?: boolean; isCustomizable?: boolean;
    featured?: boolean; bestSeller?: boolean; seasonalSpecial?: boolean; search?: string;
  }) => apiClient.get('/florist/products', { params }).then(unwrap<FloristProductProfile[]>),

  byProduct: (productId: string) =>
    apiClient.get('/florist/products/by-product/' + productId).then(unwrap<FloristProductProfile | null>),

  freshnessAlerts: () =>
    apiClient.get('/florist/products/freshness-alerts').then(unwrap<FreshnessAlerts>),
};
