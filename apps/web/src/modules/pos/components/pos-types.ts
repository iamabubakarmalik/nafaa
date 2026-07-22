import type { ProductImei } from '@industries/mobile/api/imei.api';

export type CartItem = {
  cartLineId: string;
  productId: string;
  variantId?: string;

  // Mobile / IMEI
  imeiId?: string;
  imeiNumber?: string;

  // Carpet - Rolls
  rollId?: string;
  rollNumber?: string;
  cutPieceId?: string;
  cutPieceCode?: string;

  // Cut dimensions with ft + inch precision
  cutWidthFt?: number;
  cutWidthInch?: number;
  cutLengthFt?: number;
  cutLengthInch?: number;
  cutLengthReal?: number; // decimal feet (for calculations)
  cutWidthReal?: number;  // decimal feet
  cutSqft?: number;

  createLeftover?: boolean;
  rollCustomerWidthFt?: number;
  rollFullWidthFt?: number;

  // Display
  name: string;
  variantName?: string;
  variantImage?: string;
  variantColor?: string;
  variantColorHex?: string;
  variantSize?: string;

  // Pricing
  basePrice: number;
  wholesalePrice?: number | null;
  stock: number;
  quantity: number;
  unit: string;

  category?: { name: string; color: string } | null;
  useWholesale: boolean;
  priceOverride?: number;
  lineDiscount: number;
  note?: string;
  internalNote?: string;
};

export type SaleMode = 'FULL_PAYMENT' | 'PARTIAL_CREDIT' | 'FULL_CREDIT';

export type HeldCart = {
  id: string;
  items: CartItem[];
  customerId: string;
  customerName: string;
  total: number;
  heldAt: number;
};

export const HOLD_KEY = 'nafaa.pos.held-carts';
export const LW_UNITS = new Set(['sqft', 'sqm', 'meter', 'ft', 'yard', 'gaj']);
export const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);
export const MOBILE_KEYWORDS = [
  'mobile', 'phone', 'smartphone', 'iphone', 'samsung', 'oppo',
  'vivo', 'realme', 'xiaomi', 'tecno', 'infinix',
];
export const PAGE_SIZE = 60;

export const loadHeldCarts = (): HeldCart[] => {
  try {
    const raw = localStorage.getItem(HOLD_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

export const saveHeldCarts = (carts: HeldCart[]) => {
  try {
    localStorage.setItem(HOLD_KEY, JSON.stringify(carts));
  } catch {}
};

export const cartLineId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ─── Format helpers for ft + inch ─────────────────────────
export const formatFtInch = (ft: number, inch = 0): string => {
  const f = Math.floor(ft);
  const i = Math.round(inch);
  if (i === 0) return `${f}ft`;
  return `${f}ft ${i}in`;
};

export const ftInchToDecimal = (ft: number, inch = 0): number => {
  return Number(ft) + Number(inch || 0) / 12;
};

export const decimalToFtInch = (decimal: number): { ft: number; inch: number } => {
  const ft = Math.floor(decimal);
  const inch = Math.round((decimal - ft) * 12);
  if (inch === 12) return { ft: ft + 1, inch: 0 };
  return { ft, inch };
};

export type { ProductImei };
