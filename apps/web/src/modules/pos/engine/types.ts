/**
 * POS engine contracts.
 *
 * One engine runs the counter for every industry: search, barcode and
 * voice, units and weights, variants, combos, hold, discount, delivery,
 * checkout (online or offline), printing. An industry supplies a
 * `PosIndustryConfig`: where its catalog comes from, what its cards show,
 * and any step it needs before an item goes on the bill (a serial number,
 * an expired-batch warning).
 */

import type { ComponentType, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { PosBadge } from '../components/PosTiles';
import type { PosCartLine, PosComboSerial } from '../lib/posCart';
import type { PosUnitOption } from '../lib/posUnits';
import type { PosTradeIn } from '../components/PosSplitTender';

/** A sellable product, normalised for the counter. */
export interface PosItem {
  id: string;
  product: Product;
  name: string;
  price: number;
  /** Sellable stock in the product's base unit (branch stock when known). */
  stock: number;
  unit: string;
  image?: string;
  categoryId?: string | null;
  categoryName?: string;
  categoryColor?: string | null;
  featured?: boolean;
  lowStock?: number;
  /** Extra words matched by search (brand, model, units' barcodes…). */
  searchText?: string;
  /** Lower comes first; ties sort by name. */
  rank?: number;
  badges?: PosBadge[];
  /** Small line under the price on the card. */
  subline?: string;
  /** Greyed out on the card. */
  dim?: boolean;
  /** Open the variant picker before adding. */
  hasVariants?: boolean;
  /** Anything the industry wants to carry for its own hooks; `service: true` hides the stock count. */
  meta?: Record<string, unknown>;
}

/** A combo/bundle sold as one line and split into its products at checkout. */
export interface PosBundle {
  id: string;
  name: string;
  price: number;
  image?: string;
  sku?: string | null;
  barcode?: string | null;
  featured?: boolean;
  savings?: number;
  savingsPct?: number;
  items: Array<{ productId: string; variantId?: string | null; quantity: number; originalPrice: number }>;
}

export interface PosFilter {
  id: string;
  label: string;
  icon?: LucideIcon;
  match: (item: PosItem) => boolean;
}

export interface AddOptions {
  unit?: PosUnitOption;
  qty?: number;
  /** Sell even though stock is zero (fresh from the oven). */
  oversell?: boolean;
  /** Skip the industry's beforeAdd checks already answered by the user. */
  confirmed?: string[];
  /** `stock` is what may be sold; `reserved` set means held pieces are already taken out of it. */
  variant?: { id: string; name: string; price?: number | null; stock?: number | null; reserved?: number | null };
  serial?: { id: string; serialNumber: string; imei?: string | null };
  /** The exact phone sold (mobile shops): quantity stays 1 and the sale carries its IMEI. */
  imei?: { id: string; imei1: string; imei2?: string | null };
  warrantyMonths?: number;
  note?: string;
  /** Rate for this line instead of the product or variant price (a phone's own price). */
  price?: number;
}

/** A line with no catalog product behind it: a used phone taken in earlier. */
export interface PosUsedPhoneLine {
  usedPhoneId: string;
  /** Shown on the bill, e.g. UP-0012. */
  code: string;
  name: string;
  price: number;
  image?: string;
  note?: string;
}

/** What `beforeAdd` can do with the engine. */
export interface PosEngineApi {
  addItem: (item: PosItem, opts?: AddOptions) => void;
  /** Show a modal/picker from the industry; `closePicker` removes it. */
  openPicker: (node: ReactNode) => void;
  closePicker: () => void;
  itemById: (id: string) => PosItem | undefined;
  /** Catalog item whose barcode or SKU equals `code`. */
  findItemByCode: (code: string) => PosItem | undefined;
  /** Puts a used phone on the bill (no catalog product, quantity 1). */
  addUsedPhone: (line: PosUsedPhoneLine) => void;
  /** Puts a combo on the bill; `serials` are the units picked for its serial products. */
  addBundle: (bundle: PosBundle, qty?: number, serials?: PosComboSerial[]) => void;
  /** The whole counter catalog, for industry scans that match on item details (IMEI). */
  items: PosItem[];
  cart: PosCartLine[];
}

export type BeforeAddResult = 'continue' | 'handled';

/** A bill the server has saved, as `POST /sales` returns it. Bills queued offline never arrive here. */
export interface PosSavedSale {
  id: string;
  saleNumber: string;
  status?: string;
  total?: number;
  creditAmount?: number;
  customerId?: string | null;
  customer?: { id: string; name: string; phone?: string | null } | null;
  items?: Array<{ productId?: string | null; usedPhoneId?: string | null; imeiId?: string | null }>;
}

export interface PosIndustryConfig {
  id: string;
  label: string;
  /** Products for the counter, plus query keys to refresh after a sale. */
  useCatalog: () => { items: PosItem[]; loading: boolean; refreshKeys: string[] };
  /** Combos/bundles; omit to hide the Combos tab. */
  useBundles?: () => PosBundle[];
  /** Show the Quick keys tab (shared quick-keys setup). */
  quickKeys?: boolean;
  /** Extra filter chips shown before categories. */
  filters?: PosFilter[];
  /** Industry step before an item goes on the bill. */
  beforeAdd?: (item: PosItem, opts: AddOptions, api: PosEngineApi) => BeforeAddResult;
  /** Industry step before a combo goes on the bill (pick serial units inside it). */
  beforeAddBundle?: (bundle: PosBundle, qty: number, api: PosEngineApi) => BeforeAddResult;
  /** Extra units on top of base + multi-units (bakery slice/pound rates). */
  extraUnits?: (item: PosItem, units: PosUnitOption[]) => PosUnitOption[];
  /** Industry barcode handling, tried first (serial/IMEI lookup). Return true when handled. */
  scan?: (code: string, api: PosEngineApi) => Promise<boolean>;
  /** Card fallback when the product has no image. */
  cardFallback?: (item: PosItem) => ReactNode;
  /** Words people say for products, for voice search. */
  voiceAliases?: Record<string, string>;
  /** Placeholder in the search box. */
  searchHint?: string;
  /** Text at the bottom of every receipt. */
  receiptFooter?: string;
  /** Optional extra block under the customer picker; gets the customer on the bill. */
  CartExtra?: ComponentType<{ customerId?: string | null }>;
  /** Rate for a product line after its quantity changes (bulk rates); undefined keeps the current rate. */
  repriceLine?: (line: PosCartLine, item: PosItem) => number | undefined;
  /** Show voice billing. */
  voice?: boolean;
  /** Goods taken toward the bill (used phones), offered as a payment at checkout. */
  useTradeIns?: () => PosTradeIn[] | undefined;
  /** Checked before checkout opens and before the bill is sent; a message stops checkout and is shown. */
  beforeCheckout?: (cart: PosCartLine[]) => string | null | undefined;
  /** Runs after the server saves a bill; not for bills queued offline. */
  onSale?: (sale: PosSavedSale) => void;
}
