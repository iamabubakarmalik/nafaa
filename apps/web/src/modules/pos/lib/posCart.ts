import {
  Banknote, Smartphone, Zap, CreditCard, Building2,
} from 'lucide-react';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { PriceTier, TierPriced } from '@core/lib/priceTiers';
import { t } from '@core/i18n';

/* ═════════════════════════════════════════════════════════════
   POS CART — ek hi shakal, har industry ke liye
   ─────────────────────────────────────────────────────────────
   Ye Retail POS ki cart ki shakal hai. Retail par sab se zyada
   kaam hua hai — multi-unit, combo, weigh-sale, udhaar — is liye
   yehi shakal sab ke liye standard hai.

   Purani `pos-types.ts` wali `CartItem` alag cheez hai: wo
   universal `PosPage` (carpet/mobile) ke liye bani thi. Dono ko
   zabardasti ek karne se dono jagah kuch toot-ta, is liye wo
   apni jagah hai aur ye apni.
   ═════════════════════════════════════════════════════════════ */

export type PosViewMode = 'products' | 'combos' | 'quickkeys';
export type PosDiscountMode = 'pct' | 'rs';
export type PosCheckoutMode = 'full' | 'partial' | 'credit';

/** A serial unit picked for one product inside a combo. */
export interface PosComboSerial {
  productId: string;
  id: string;
  serialNumber: string;
  imei?: string | null;
}

export interface PosCartLine {
  id: string;
  type: 'product' | 'combo';
  productId?: string;
  comboId?: string;
  name: string;
  image?: string;

  /** Jis unit me becha gaya — "pcs", "dozen", "carton" */
  unitName: string;
  unitLabel: string;
  emoji: string;

  /** Us unit ka rate (carton ka apna daam) */
  unitPrice: number;
  /** Bina badle hue rate — discount dikhane ke liye */
  basePrice: number;

  quantity: number;
  /**
   * Base units me kitna — stock hamesha isi me ginta hai.
   * 2 carton × 24 = 48 pieces stock se katte hain, 2 nahi.
   */
  baseQuantity: number;
  conversionRate: number;
  baseUnit: string;
  baseStock: number;

  lineTotal: number;
  note?: string;
  /** Note typed by the cashier for this line (printed and saved with the line). */
  customNote?: string;

  comboItems?: any[];
  savings?: number;
  /** Serial units picked for products inside this combo; such a line is one combo. */
  comboSerials?: PosComboSerial[];

  /** Size/colour variant of the product, when it has variants. */
  variantId?: string;
  variantName?: string;
  /** Serial/IMEI-tracked unit: the exact piece sold (quantity stays 1). */
  serialId?: string;
  serialNumber?: string;
  imei?: string;
  warrantyMonths?: number;
  /** Phone sold by IMEI (mobile shops); `imei` holds the number shown. */
  imeiId?: string;
  /** Used phone sold from the used stock; the line has no productId. */
  usedPhoneId?: string;
  /** Quantity cannot be changed (serial-tracked units). */
  lockQty?: boolean;
  /** Batch picked at the counter; left out, the sale takes the earliest expiry. */
  batchId?: string;
  batchNumber?: string;

  /** Price tier the line is sold at (saved on the sale line). */
  priceTier?: PriceTier;
  /** Retail, wholesale and credit price of this line's unit, to re-price it when the tier changes. */
  tierSrc?: TierPriced;
  /** Tier picked for this line only; the bill's tier does not change it. */
  tierLocked?: boolean;
  /** Rate typed by the cashier; kept when the tier changes. */
  priceEdited?: boolean;
  /** Rate fixed by the industry (bulk rate, a phone's own price); never re-priced. */
  fixedPrice?: boolean;
  /**
   * Distribution: the line is priced from the customer's price list (and a
   * trade scheme), or is free goods a scheme gave. Absent on ordinary bills.
   */
  dist?: {
    /** List rate of the pack, before any scheme. */
    listPrice: number;
    schemeId?: string | null;
    schemeNote?: string | null;
    /** Rupees the scheme took off the whole line (already inside the rate). */
    schemeOff?: number;
    /** The note the line had before a scheme note was added. */
    baseNote?: string;
    /** Free goods line, and the paid line that earned it. */
    free?: boolean;
    forLineId?: string;
  };
}

export interface PosHeldCart {
  id: string;
  lines: PosCartLine[];
  customerId: string;
  total: number;
  heldAt: number;
  /** Bill tier when it was held. */
  tier?: PriceTier;
}

export const posLineId = () => `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export const posHeldId = () => `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export interface PosPaymentMethodOption {
  id: PaymentMethod;
  label: string;
  icon: any;
  /** Brand colour of the method, used for the selected state and receipt dots. */
  color: string;
  /** Keyboard shortcut inside the checkout dialog. */
  key: string;
}

export const POS_PAYMENT_METHODS: PosPaymentMethodOption[] = [
  { id: 'CASH',          label: t('Cash'),      icon: Banknote,   color: '#16a34a', key: 'F1' },
  { id: 'JAZZCASH',      label: t('JazzCash'),  icon: Smartphone, color: '#ea580c', key: 'F3' },
  { id: 'EASYPAISA',     label: t('Easypaisa'), icon: Zap,        color: '#22c55e', key: 'F4' },
  { id: 'CARD',          label: t('Card'),      icon: CreditCard, color: '#2563eb', key: 'F5' },
  { id: 'BANK_TRANSFER', label: t('Bank'),      icon: Building2,  color: '#7c3aed', key: 'F7' },
];

