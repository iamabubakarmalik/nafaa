import { apiClient } from '@core/api/client';

export type CategoryType = 'CEMENT' | 'STEEL_REBAR' | 'STEEL_SHEET' | 'STEEL_PIPE' | 'BRICKS' | 'BLOCKS'
  | 'SAND' | 'GRAVEL' | 'CRUSH' | 'TILES_FLOOR' | 'TILES_WALL' | 'MARBLE' | 'GRANITE'
  | 'SANITARY_WARE' | 'PLUMBING_PIPE' | 'PLUMBING_FITTING' | 'ELECTRIC_WIRE' | 'ELECTRIC_SWITCH'
  | 'ELECTRIC_CONDUIT' | 'PAINT' | 'PRIMER' | 'THINNER' | 'WOOD_LUMBER' | 'PLYWOOD' | 'MDF'
  | 'HARDWARE_TOOL' | 'POWER_TOOL' | 'HAND_TOOL' | 'FASTENER' | 'ADHESIVE' | 'WATERPROOFING'
  | 'INSULATION' | 'DOOR' | 'WINDOW' | 'GLASS' | 'ALUMINUM' | 'IRON_FABRICATION' | 'ROOFING'
  | 'SAFETY_EQUIPMENT' | 'OTHER';

export type Unit = 'BAG' | 'KG' | 'TON' | 'PIECE' | 'DOZEN' | 'CARTON' | 'METER' | 'FEET' | 'INCH'
  | 'SQFT' | 'SQMETER' | 'CUBIC_FEET' | 'CUBIC_METER' | 'LITER' | 'GALLON' | 'BUNDLE' | 'ROLL'
  | 'SHEET' | 'BOX' | 'SET' | 'TRIP';

export interface HardwareProduct {
  id: string;
  productId: string;
  brandId?: string;
  categoryType?: CategoryType;
  unit: Unit;
  bulkUnit?: Unit;
  bulkQuantity?: number;
  weightKg?: number;
  weightPerUnit?: number;
  volumePerUnit?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  diameterMm?: number;
  thicknessMm?: number;
  grade?: string;
  diameter?: string;
  gradeStrength?: string;
  bagWeight?: number;
  tileSize?: string;
  finishType?: string;
  piecesPerBox?: number;
  sqftPerBox?: number;
  colorCode?: string;
  colorName?: string;
  finishSheen?: string;
  coverage?: number;
  litersPerCan?: number;
  minBulkQty?: number;
  bulkPrice?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  cashPrice?: number;
  creditPrice?: number;
  requiresTruck: boolean;
  requiresCrane: boolean;
  canDeliverInCity: boolean;
  canDeliverIntercity: boolean;
  deliveryChargePerKm?: number;
  minDeliveryCharge?: number;
  requiresCoveredStorage: boolean;
  requiresDryStorage: boolean;
  shelfLifeMonths?: number;
  hasIsoCertification: boolean;
  hasPsqcaCertification: boolean;
  certificationNumbers: string[];
  manufacturingLocation?: string;
  batchTraceable: boolean;
  displayOrder: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isFastMoving: boolean;
  totalSold: number;
  totalRevenue: number;
  totalReturns: number;
  notes?: string;
  product?: any;
  brand?: any;
  bulkPricing?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const hardwareProductsApi = {
  upsert: (data: Partial<HardwareProduct>) => apiClient.post('/hardware/products', data).then(unwrap<HardwareProduct>),
  list: (params?: any) => apiClient.get('/hardware/products', { params }).then(unwrap<HardwareProduct[]>),
  byCategoryCount: () => apiClient.get('/hardware/products/by-category-count').then(unwrap<Record<string, number>>),
  byProduct: (productId: string) => apiClient.get('/hardware/products/by-product/' + productId).then(unwrap<HardwareProduct | null>),
  getOne: (id: string) => apiClient.get('/hardware/products/' + id).then(unwrap<HardwareProduct>),
  remove: (id: string, force = false) =>
    apiClient.delete(`/hardware/products/${id}${force ? '?force=true' : ''}`).then(unwrap),
};
