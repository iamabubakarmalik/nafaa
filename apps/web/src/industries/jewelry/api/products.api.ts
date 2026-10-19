import { apiClient } from '@core/api/client';
import type { MetalType, Purity } from './metal-rates.api';

export type JewelryCategory = 'RING' | 'NECKLACE' | 'EARRINGS' | 'BANGLE' | 'BRACELET' | 'ANKLET'
  | 'PENDANT' | 'CHAIN' | 'NOSE_PIN' | 'NOSE_RING' | 'MAANG_TIKKA' | 'JHUMKA' | 'CHOKER'
  | 'MANGALSUTRA' | 'HAAR' | 'KUNDAN_SET' | 'BRIDAL_SET' | 'KADA' | 'PAYAL' | 'TOE_RING'
  | 'BROOCH' | 'CUFFLINK' | 'TIE_PIN' | 'WATCH' | 'COIN' | 'BAR' | 'BULLION' | 'BUTTON' | 'RAKHI' | 'OTHER';

export type JewelryStyle = 'TRADITIONAL' | 'MODERN' | 'ANTIQUE' | 'BRIDAL' | 'DAILY_WEAR' | 'PARTY_WEAR'
  | 'KUNDAN' | 'POLKI' | 'MEENAKARI' | 'JADAU' | 'TEMPLE' | 'FILIGREE' | 'HANDMADE' | 'MACHINE_MADE'
  | 'ITALIAN' | 'TURKISH' | 'DUBAI' | 'INDIAN' | 'PAKISTANI' | 'CUSTOM' | 'OTHER';

export type GemstoneType = 'DIAMOND' | 'RUBY' | 'EMERALD' | 'SAPPHIRE' | 'PEARL' | 'OPAL' | 'TOPAZ'
  | 'AMETHYST' | 'AQUAMARINE' | 'GARNET' | 'TURQUOISE' | 'CORAL' | 'ONYX' | 'JADE' | 'MOONSTONE'
  | 'CITRINE' | 'TANZANITE' | 'ZIRCON' | 'CZ' | 'KUNDAN_STONE' | 'OTHER' | 'NONE';

export interface Gemstone {
  id?: string;
  type: GemstoneType;
  count: number;
  caret: number;
  quality?: string;
  color?: string;
  clarity?: string;
  cut?: string;
  shape?: string;
  origin?: string;
  isCertified?: boolean;
  certificateNumber?: string;
  ratePerCaret?: number;
  totalValue?: number;
}

export interface JewelryProductProfile {
  id: string;
  productId: string;
  itemCode?: string;
  designNumber?: string;
  category: JewelryCategory;
  subCategory?: string;
  style: JewelryStyle;
  metalType: MetalType;
  purity: Purity;
  purityHallmark?: string;
  grossWeight: number;
  netWeight: number;
  stoneWeight: number;
  waxWeight: number;
  otherWeight: number;
  size?: string;
  length?: number;
  width?: number;
  thickness?: number;
  makingChargePerGram: number;
  makingChargeFixed: number;
  makingChargePct: number;
  wastagePct: number;
  wastageGrams: number;
  designerCharge: number;
  polishCharge: number;
  hallmarkCharge: number;
  otherCharges: number;
  hasStones: boolean;
  hasDiamond: boolean;
  hasGemstone: boolean;
  hasPearl: boolean;
  stoneCount: number;
  stoneCaret?: number;
  stoneQuality?: string;
  stoneColor?: string;
  stoneClarity?: string;
  stoneCut?: string;
  hallmarkNumber?: string;
  hallmarkAuthority?: string;
  hallmarkDate?: string;
  bisNumber?: string;
  jewellerCode?: string;
  hallmarkPhotoUrl?: string;
  designerName?: string;
  karigarName?: string;
  workshopName?: string;
  countryOfOrigin?: string;
  isCustomOrder: boolean;
  isBespoke: boolean;
  isAntique: boolean;
  isCertified: boolean;
  certificateNumber?: string;
  certificateAuthority?: string;
  certificatePhotoUrl?: string;
  isBuyBackEligible: boolean;
  buyBackPct: number;
  isReturnable: boolean;
  returnDays: number;
  currentValue?: number;
  insuredValue?: number;
  imageUrls: string[];
  videoUrl?: string;
  descriptionLong?: string;
  careInstructions?: string;
  isPopular: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isBridalCollection: boolean;
  isFestivalSpecial: boolean;
  totalSold: number;
  totalRevenue: number;
  gemstones?: Gemstone[];
  product?: any;
  createdAt: string;
  updatedAt: string;
}

/** Slim profile used by the counter and lists. */
export type JewelryFacts = Pick<JewelryProductProfile,
  'id' | 'productId' | 'itemCode' | 'designNumber' | 'category' | 'style' | 'metalType' | 'purity' | 'grossWeight' | 'netWeight' | 'stoneWeight' | 'size'
  | 'makingChargePerGram' | 'makingChargeFixed' | 'makingChargePct' | 'wastagePct' | 'wastageGrams' | 'designerCharge' | 'polishCharge' | 'hallmarkCharge'
  | 'otherCharges' | 'hasStones' | 'hasDiamond' | 'hallmarkNumber' | 'isCertified' | 'isBridalCollection' | 'isFeatured' | 'isBuyBackEligible'
  | 'buyBackPct' | 'karigarName'> & { gemstones: Array<{ totalValue?: number | null }> };

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const jewelryProductsApi = {
  upsert: (data: Partial<JewelryProductProfile>) => apiClient.post('/jewelry/products', data).then(unwrap<JewelryProductProfile>),
  list: (params?: any) => apiClient.get('/jewelry/products', { params }).then(unwrap<JewelryProductProfile[]>),
  facts: () => apiClient.get('/jewelry/products/facts').then(unwrap<JewelryFacts[]>),
  byProduct: (productId: string) => apiClient.get('/jewelry/products/by-product/' + productId).then(unwrap<JewelryProductProfile | null>),
};
