/**
 * POS counter setup the owner sets for the whole shop (saved on the server,
 * read by every counter through /settings/counter). Same fields and
 * defaults as the web; older servers send nothing.
 */

import { msg } from '@/core/i18n';

export type PriceTier = 'RETAIL' | 'WHOLESALE' | 'CREDIT';
export const PRICE_TIERS: PriceTier[] = ['RETAIL', 'WHOLESALE', 'CREDIT'];
export const PRICE_TIER_LABEL: Record<PriceTier, string> = { RETAIL: msg('Retail'), WHOLESALE: msg('Wholesale'), CREDIT: msg('Credit') };
const isPriceTier = (v: unknown): v is PriceTier => PRICE_TIERS.includes(v as PriceTier);

export type PosLayout = 'classic' | 'express' | 'cartfocus' | 'touch';
export type PosDensity = 'compact' | 'comfortable';

export interface PosCounterConfig {
  layout: PosLayout;
  density: PosDensity;
  showImages: boolean; showCategories: boolean; showQuickKeys: boolean; showReceiver: boolean; showDelivery: boolean; showDiscount: boolean;
  lineNotes: boolean; priceEdit: boolean; sounds: boolean; autoPrint: boolean; showStock: boolean; recentItems: boolean; changeDue: boolean;
  quickDiscounts: number[];
  priceTiers: boolean;
  priceTierList: PriceTier[];
  defaultPriceTier: PriceTier;
  tierCreditOnUdhaar: boolean; tierFromCustomer: boolean; tierLineOverride: boolean; tierOnReceipt: boolean;
}

export const POS_COUNTER_DEFAULTS: PosCounterConfig = {
  layout: 'classic', density: 'compact',
  showImages: true, showCategories: true, showQuickKeys: true, showReceiver: true, showDelivery: true, showDiscount: true,
  lineNotes: false, priceEdit: true, sounds: false, autoPrint: true, showStock: true, recentItems: true, changeDue: true,
  quickDiscounts: [5, 10],
  priceTiers: false, priceTierList: [...PRICE_TIERS], defaultPriceTier: 'RETAIL',
  tierCreditOnUdhaar: true, tierFromCustomer: true, tierLineOverride: true, tierOnReceipt: false,
};

export const POS_LAYOUTS: Array<{ id: PosLayout; label: string; hint: string }> = [
  { id: 'classic', label: msg('Classic'), hint: msg('Products baayen, bill daayen') },
  { id: 'express', label: msg('Express'), hint: msg('Bara search, neeche bill ki table — barcode aur keyboard ke liye') },
  { id: 'cartfocus', label: msg('Bill bara'), hint: msg('Bara bill baayen, patli product list daayen') },
  { id: 'touch', label: msg('Touch'), hint: msg('Bare tiles aur buttons — tablet ke liye') },
];

const isLayout = (v: unknown): v is PosLayout => POS_LAYOUTS.some((l) => l.id === v);

/** Server value with defaults filled in. */
export function normalizePosCounter(raw: unknown): PosCounterConfig {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = { ...POS_COUNTER_DEFAULTS } as Record<string, unknown>;
  for (const [k, v] of Object.entries(POS_COUNTER_DEFAULTS)) if (typeof v === 'boolean' && typeof s[k] === 'boolean') out[k] = s[k];
  if (isLayout(s.layout)) out.layout = s.layout;
  if (s.density === 'compact' || s.density === 'comfortable') out.density = s.density;
  if (Array.isArray(s.quickDiscounts)) out.quickDiscounts = s.quickDiscounts.map(Number).filter((n) => n > 0 && n <= 100);
  if (isPriceTier(s.defaultPriceTier)) out.defaultPriceTier = s.defaultPriceTier;
  if (Array.isArray(s.priceTierList)) {
    const list = PRICE_TIERS.filter((t) => (s.priceTierList as unknown[]).includes(t));
    out.priceTierList = list.length ? list : [...PRICE_TIERS];
  }
  const list = out.priceTierList as PriceTier[];
  if (!list.includes(out.defaultPriceTier as PriceTier)) out.priceTierList = PRICE_TIERS.filter((t) => t === out.defaultPriceTier || list.includes(t));
  return out as unknown as PosCounterConfig;
}
