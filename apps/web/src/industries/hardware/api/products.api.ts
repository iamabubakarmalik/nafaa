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
  bulkPricing?: Array<{ id: string; minQuantity: number; maxQuantity?: number | null; price: number; label?: string | null }>;
  createdAt: string;
  updatedAt: string;
}

/** The light facts every list and the counter show (size, shade, pack). */
export type HardwareFacts = Pick<HardwareProduct, 'productId' | 'categoryType' | 'unit' | 'grade' | 'diameter' | 'gradeStrength' | 'bagWeight'
  | 'tileSize' | 'finishType' | 'piecesPerBox' | 'sqftPerBox' | 'colorCode' | 'colorName' | 'finishSheen' | 'coverage' | 'litersPerCan'
  | 'requiresTruck' | 'isFastMoving' | 'manufacturingLocation'>;

const unwrap = <T,>(res: { data: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const hardwareProductsApi = {
  upsert: (data: Partial<HardwareProduct>) => apiClient.post('/hardware/products', data).then(unwrap<HardwareProduct>),
  facts: () => apiClient.get('/hardware/products/facts').then(unwrap<HardwareFacts[]>),
  byProduct: (productId: string) => apiClient.get('/hardware/products/by-product/' + productId).then(unwrap<HardwareProduct | null>),
};
