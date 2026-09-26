import {
  Banknote, Smartphone, Zap, CreditCard, Building2,
} from 'lucide-react';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

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

  comboItems?: any[];
  savings?: number;
}

export interface PosHeldCart {
  id: string;
  lines: PosCartLine[];
  customerId: string;
  total: number;
  heldAt: number;
}

export const posLineId = () => `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export const posHeldId = () => `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export interface PosPaymentMethodOption {
  id: PaymentMethod;
  label: string;
  icon: any;
  /** Tailwind gradient — chuna hua button isi rang ka hota hai */
  bg: string;
}

export const POS_PAYMENT_METHODS: PosPaymentMethodOption[] = [
  { id: 'CASH',          label: 'Cash',      icon: Banknote,   bg: 'from-emerald-500 to-green-600' },
  { id: 'JAZZCASH',      label: 'JazzCash',  icon: Smartphone, bg: 'from-orange-500 to-orange-600' },
  { id: 'EASYPAISA',     label: 'EasyPaisa', icon: Zap,        bg: 'from-green-500 to-lime-600' },
  { id: 'CARD',          label: 'Card',      icon: CreditCard, bg: 'from-blue-500 to-blue-700' },
  { id: 'BANK_TRANSFER', label: 'Bank',      icon: Building2,  bg: 'from-violet-500 to-purple-700' },
];

/** Cash ke aam note — counter par sab se zyada yehi chalte hain. */
export const POS_QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
