/**
 * Industry configs for the one shared POS (same idea as the web
 * PosIndustryConfig): an industry changes what its scan understands, the
 * search hint, the receipt footer and which tabs show. It never gets its
 * own counter. Industry packs add their config to POS_CONFIGS.
 */

import type { LucideIcon } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { msg } from '@/core/i18n';
import type { PosCartLine } from '@nafaa/core/pos';
import type { ProductRow } from '@/core/offline';
import type { AddOptions, PosApi } from './usePos';

/** A row of filter chips on the counter shelf (toy age group, optical frame type). */
export interface PosShelfFilter {
  key: string;
  /** Shown before the chips (already translated). */
  label?: string;
  options: Array<{ value: string; label: string }>;
  /** True when the product belongs to the chosen option. */
  match: (p: ProductRow, value: string) => boolean;
}

/** What `useShelf` returns: filters and a short line under each product name. */
export interface PosShelf {
  filters?: PosShelfFilter[];
  /** Short second line on a product card and list row ("3–5 yrs", "Ray-Ban · RB2140"). Null for none. */
  subline?: (p: ProductRow) => string | null | undefined;
}

/** Goods taken toward the bill (a used phone, an old appliance). Paid as a TRADE_IN part, never as money. */
export interface PosTradeIn {
  /** Unique code of the item (used phone code, ATI-… code); sent as the payment reference. */
  code: string;
  /** Short line shown in the picker and saved as the payment note. */
  label: string;
  /** What the shop allows for it, in Rs. */
  value: number;
}

export interface PosIndustryConfig {
  id: string;
  /** Placeholder in the search box. */
  searchHint?: string;
  /** Industry codes (serial, IMEI, scale labels) tried before product barcodes. True when handled. */
  scan?: (code: string, api: PosApi) => Promise<boolean>;
  /** Step before an item goes on the bill; return 'handled' after opening the industry's own picker. */
  beforeAdd?: (productId: string, opts: AddOptions, api: PosApi) => 'continue' | 'handled';
  /** Message that stops checkout (checked when checkout opens and before the bill is sent). */
  beforeCheckout?: (api: PosApi) => string | null | undefined;
  /** Text at the bottom of every receipt. */
  receiptFooter?: string;
  /** Show the Combos and Quick keys tabs. */
  combos?: boolean;
  quickKeys?: boolean;
  /**
   * The industry's own order screen in place of the counter (web PosGate:
   * restaurants take orders with tables, KOT and add-ons). Shown after the
   * POS access and shop checks.
   */
  Screen?: ComponentType;
  /** Sheets the industry opens from beforeAdd (e.g. pharmacy prescription details); rendered on the counter. */
  Overlay?: ComponentType;
  /** Runs after a bill is saved (mark animals sold, log a school set...). Fire and forget. */
  afterSale?: (sale: { id: string; saleNumber: string; productIds: string[] }) => void;
  /** An extra tab on the counter next to Products (live animals, school sets). Renders its own list. */
  extraView?: { label: string; icon: LucideIcon; Component: ComponentType<{ padBottom: number }> };
  /** Industry block at the top of the bill (delivery card, retry notice). */
  CartExtra?: ComponentType;
  /** Products kept off the counter grid (e.g. a pet shop's per-animal lines, sold from their own tab). */
  hideProduct?: (p: { productType: string | null; sku: string | null }) => boolean;
  /**
   * Shelf additions, as a React hook so the pack can load its own product
   * data (cached, so it works offline) and return plain functions:
   *
   *   useShelf: () => {
   *     const ages = useToyAges();                       // Map<productId, '0-2' | '3-5' | …>
   *     return {
   *       filters: [{ key: 'age', options: AGE_OPTIONS, match: (p, v) => ages.get(p.id) === v }],
   *       subline: (p) => ages.get(p.id) ? t('{{age}} yrs', { age: ages.get(p.id) }) : null,
   *     };
   *   }
   *
   * Called on every counter render: keep it cheap and memoised. The functions
   * run per product while scrolling, so they must be sync lookups.
   */
  useShelf?: () => PosShelf;
  /**
   * Rate for a product line at its current quantity (bulk rates, evening rates),
   * run after every add, step and quantity change. Return the rate per unit sold
   * (`line.unitName`), or undefined to keep the line as it is. Lines whose price
   * was typed by hand or fixed are never passed in. Must be a sync lookup:
   * keep the data in the query cache from `beforeAdd`.
   */
  repriceLine?: (line: PosCartLine, productId: string) => number | undefined;
  /**
   * Items the shop took in that can pay part of this bill (web `useTradeIns`).
   * A React hook; return items not yet used on a bill. The checkout then offers
   * "Trade-in" in split payment: each pick adds a TRADE_IN part
   * `{ method, amount: value, reference: code, note: label }`, which counts as
   * paid but is not drawer money (the server links it to the item by `code`).
   */
  useTradeIns?: () => PosTradeIn[] | undefined;
}

/** Labels printed by a weighing scale (EAN-13 starting with 2) put the weighed item on the bill. */
const scaleScan: PosIndustryConfig['scan'] = (code, api) => api.addScaleLabel(code);

export const generalPos: PosIndustryConfig = {
  id: 'general',
  combos: true,
  quickKeys: true,
  scan: scaleScan,
  searchHint: msg('Search or scan'),
};

export const retailPos: PosIndustryConfig = {
  ...generalPos,
  id: 'retail',
  searchHint: msg('Name, barcode or scale label'),
};

const POS_CONFIGS: Record<string, PosIndustryConfig> = {
  general: generalPos,
  retail: retailPos,
  standard: retailPos,
};

/** Industry packs add their counter config at start (src/industries/<pack>/index.ts). */
export function registerPosIndustry(config: PosIndustryConfig, aliases: string[] = []) {
  for (const id of [config.id, ...aliases]) POS_CONFIGS[id] = config;
}

export function posConfigFor(industry: string | null | undefined): PosIndustryConfig {
  return (industry && POS_CONFIGS[industry]) || generalPos;
}
