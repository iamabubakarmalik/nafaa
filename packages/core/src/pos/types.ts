/**
 * Shapes shared by every counter (web and mobile): a bill line, a unit/pack
 * option, payment parts and service charges. Same fields the web POS uses
 * (apps/web/src/modules/pos/lib/posCart.ts) and the server takes on POST /sales.
 */

export type PriceTier = 'RETAIL' | 'WHOLESALE' | 'CREDIT';

/** Money methods a bill can be paid with. */
export type PaymentMethod = 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'CARD' | 'BANK_TRANSFER';
/** A split part may also be goods taken toward the bill. */
export type TenderMethod = PaymentMethod | 'TRADE_IN';

export interface TierPriced {
  price: number;
  wholesalePrice?: number | null;
  creditPrice?: number | null;
}

export type PosDiscountMode = 'pct' | 'rs';
export type PosCheckoutMode = 'full' | 'partial' | 'credit';

/** A serial unit picked for one product inside a combo. */
export interface PosComboSerial {
  productId: string;
  id: string;
  serialNumber: string;
  imei?: string | null;
}

/** One product of a combo, in base units at its normal price per base unit. */
export interface PosComboPart {
  productId: string;
  variantId?: string | null;
  quantity: number;
  originalPrice: number;
}

/** A unit the item can be sold in: the base unit or a pack (dozen, carton). */
export interface PosUnitOption {
  id: string;
  unitName: string;
  label: string;
  emoji: string;
  /** One of this unit is this many base units (piece 1, dozen 12). */
  conversionRate: number;
  price: number;
  wholesalePrice?: number | null;
  creditPrice?: number | null;
  isBase?: boolean;
  /** The pack's own barcode: a scan adds this pack directly. */
  barcode?: string | null;
  sku?: string | null;
}

export interface PosCartLine {
  id: string;
  type: 'product' | 'combo';
  productId?: string;
  comboId?: string;
  name: string;
  image?: string;
  /** Unit sold in: "pcs", "dozen", "carton". */
  unitName: string;
  unitLabel: string;
  emoji: string;
  /** Rate of the unit sold (a carton's own price). */
  unitPrice: number;
  /** Rate before a hand change, to show and limit discounts. */
  basePrice: number;
  quantity: number;
  /** Quantity in base units; stock always moves in these (2 cartons × 24 = 48). */
  baseQuantity: number;
  conversionRate: number;
  baseUnit: string;
  /** Most base units that may be sold (stock, or unlimited). */
  baseStock: number;
  lineTotal: number;
  /** Notes the counter adds (pack size, serial, scheme). */
  note?: string;
  /** Note typed by the cashier, printed and saved with the line. */
  customNote?: string;
  comboItems?: PosComboPart[];
  savings?: number;
  comboSerials?: PosComboSerial[];
  variantId?: string;
  variantName?: string;
  serialId?: string;
  serialNumber?: string;
  imei?: string;
  warrantyMonths?: number;
  imeiId?: string;
  usedPhoneId?: string;
  /** Quantity cannot change (serial-tracked units, free goods). */
  lockQty?: boolean;
  batchId?: string;
  batchNumber?: string;
  priceTier?: PriceTier;
  /** Retail, wholesale and credit price of this line's unit, to re-price on a tier change. */
  tierSrc?: TierPriced;
  /** Tier picked for this line only. */
  tierLocked?: boolean;
  /** Rate typed by the cashier; kept when the tier changes. */
  priceEdited?: boolean;
  /** Rate fixed by the industry; never re-priced. */
  fixedPrice?: boolean;
  /** Distribution: priced from the customer's price list, or free goods of a scheme. */
  dist?: {
    listPrice: number;
    schemeId?: string | null;
    schemeNote?: string | null;
    schemeOff?: number;
    baseNote?: string;
    free?: boolean;
    forLineId?: string;
  };
}

/** One part of a payment, as the sale API takes it. */
export interface SalePaymentPart {
  method: TenderMethod;
  amount: number;
  reference?: string;
  note?: string;
}

/** A charge on top of the items (delivery, fitting, tax). Labels are saved as written. */
export interface ServiceChargeItem {
  type: string;
  label: string;
  amount: number;
  /** What the shop paid for it (rider, labour); kept out of profit. */
  cost?: number;
  /** Printed only: collected by someone else (an outside rider). */
  passThrough?: boolean;
  note?: string;
}

/** A bill line as POST /sales takes it. */
export interface SaleItemBody {
  productId?: string;
  variantId?: string;
  usedPhoneId?: string;
  imeiId?: string;
  serialId?: string;
  batchId?: string;
  quantity: number;
  priceOverride?: number;
  priceTier?: PriceTier;
  note?: string;
  unitName?: string;
  unitQty?: number;
  conversionRate?: number;
  schemeId?: string;
}
