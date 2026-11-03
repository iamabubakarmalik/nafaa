/**
 * What an industry can add to the shared products list, product editor and
 * product detail (same idea and names as the web ProductsPageConfig,
 * EditorConfig and DetailConfig). An industry never gets its own copy of
 * these screens; it adds config. See ../README.md.
 */

import type { LucideIcon } from 'lucide-react-native';
import type { ComponentType, ReactNode } from 'react';
import type { Option, SwipeAction, StatusTone } from '@/design';
import type { CatalogFilters, CatalogItem, CatalogPage, CatalogSort } from '../api/catalog';
import type { Product, ProductUnit, ProductInsights } from '../api/products';
import type { CoreDraft, EditorDraft, Errors } from '../screens/editor/types';

export interface GuideStep { icon: LucideIcon; title: string; text: string }

/* ───────────── products list ───────────── */

export interface ProductExtras {
  /** Small badges next to the name. */
  badges?: Array<{ label: string; tone?: StatusTone }>;
  /** Chips under the name. */
  chips?: string[];
  /** One muted line under the name, e.g. "Samsung · SM-A15". */
  line?: string;
  /** Replaces the stock status pill when set (null hides it). */
  ribbon?: { text: string; tone: StatusTone } | null;
  /** Extra swipe actions on the row. */
  actions?: SwipeAction[];
}

export type IndustryFilter = 'tags' | 'kind' | 'condition' | 'etype' | 'serial';

export interface HeaderAction {
  icon: LucideIcon;
  label: string;
  /** Route to open, or a handler. */
  href?: string;
  onPress?: () => void;
  permission?: string;
}

export interface ProductsListConfig {
  /** What products are called here (one of PRODUCT_NOUNS so it translates), e.g. "maal", "item". */
  noun?: string;
  /** Industry filters to show under "Filters", in order. */
  filters?: IndustryFilter[];
  /** Labels for industry filter values; unknown values show as they are. */
  facetLabels?: Partial<Record<'condition' | 'etype' | 'kind', Record<string, string>>>;
  /** Extra sort options. */
  sorts?: Array<Option<CatalogSort>>;
  /** Per-product additions to the row. */
  extras?: (item: CatalogItem, ctx: { costHidden: boolean; source?: unknown }) => ProductExtras;
  /** Hook that loads per-product industry data (e.g. a facts map); its result reaches `extras` as `ctx.source`. */
  useSource?: () => unknown;
  /** Industry warnings above the list. */
  Banners?: ComponentType<{ data: CatalogPage; setFilter: <K extends keyof CatalogFilters>(k: K, v: CatalogFilters[K]) => void }>;
  /** An extra tab next to Products and Analytics (bakery raw materials, restaurant menu). */
  extraTab?: { id: string; label: string; icon: LucideIcon; Component: ComponentType; initial?: boolean };
  /** Buttons in the More sheet of the products list (quick setup, serials, ingredients). */
  actions?: HeaderAction[];
  /** A scanned code that matches no product; return true when handled. */
  onScanMiss?: (code: string) => Promise<boolean>;
  /** Quick quantities in the stock sheet for this product. */
  stockChips?: (item: CatalogItem) => number[];
  /** Reason the stock sheet is closed for this product (stock comes from elsewhere, e.g. carpet rolls); null when open. */
  stockLocked?: (item: CatalogItem) => string | null;
  /** Steps added to the guide. */
  guide?: GuideStep[];
}

/* ───────────── product editor ───────────── */

export interface StepContext<X> {
  draft: EditorDraft<X>;
  isEdit: boolean;
  productId?: string;
  setCore: (patch: Partial<CoreDraft>) => void;
  setExtra: (patch: Partial<X>) => void;
  errors: Errors;
  online: boolean;
}

export interface StepDef<X> {
  id: string;
  title: string;
  icon: LucideIcon;
  render: (ctx: StepContext<X>) => ReactNode;
  validate?: (draft: EditorDraft<X>, isEdit: boolean) => Errors;
  /** Hide the step for some drafts (e.g. recipe only for made items). */
  when?: (draft: EditorDraft<X>) => boolean;
}

export interface CoreOptions {
  /** Unit tiles in the basic step (labels are raw text). */
  units: Array<{ value: string; label: string }>;
  skuPrefix: string;
  /** Multi-unit packs (ProductUnit). */
  packs?: boolean;
  variants?: { presets: Array<{ group: string; values: string[] }> } | false;
  batches?: boolean;
  /** Markup chips on the price step. */
  markups?: number[];
}

export interface EditorConfig<X = Record<string, unknown>> {
  core: CoreOptions;
  extra: {
    initial: X;
    /** Loads industry data for an existing product. */
    load?: (productId: string) => Promise<Partial<X>>;
    /** Saves industry data after the product is saved (online only). */
    save?: (productId: string, draft: EditorDraft<X>, ctx: { isEdit: boolean; shopId?: string | null }) => Promise<void>;
    /** Adjusts the product payload before it is sent (e.g. stock from a serial count). */
    product?: (draft: EditorDraft<X>, payload: Record<string, unknown>) => Record<string, unknown>;
  };
  /** Steps in order. Use the core step builders (basicStep, priceStep, stockStep) for the shared ones. */
  steps: Array<StepDef<X>>;
  /** Extra lines in the summary card. */
  summary?: (draft: EditorDraft<X>) => Array<[string, string]>;
}

/* ───────────── product detail ───────────── */

export interface DetailContext<X = unknown> {
  product: Product;
  units: ProductUnit[];
  insights?: ProductInsights;
  extra?: X;
  stock: number;
  costHidden: boolean;
  refresh: () => void;
}

export interface DetailConfig<X = unknown> {
  /** Industry data for this product (profile, serials…). */
  extra?: { key: string; load: (id: string) => Promise<X> };
  badges?: (ctx: DetailContext<X>) => Array<{ label: string; tone?: StatusTone }>;
  /** Extra facts in the overview, as label/value pairs. */
  facts?: (ctx: DetailContext<X>) => Array<[string, string]>;
  /** Replaces the last stat tile (e.g. serials on shelf, freshness). */
  tile?: (ctx: DetailContext<X>) => { label: string; value: string; hint?: string } | null;
  alerts?: (ctx: DetailContext<X>) => ReactNode;
  tabs?: Array<{ id: string; label: string; icon: LucideIcon; when?: (ctx: DetailContext<X>) => boolean; render: (ctx: DetailContext<X>) => ReactNode }>;
  stockChips?: number[];
}

/* ───────────── one industry ───────────── */

export interface InventoryIndustryConfig {
  /** Industry identity id (src/design/industries/identities.ts), e.g. 'retail', 'bakery'. */
  id: string;
  /** Business type shown in headings, raw text, e.g. "Retail". */
  label: string;
  list?: ProductsListConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor?: EditorConfig<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detail?: DetailConfig<any>;
  /** Own routes when the industry has its own product screens (default /products/…). */
  routes?: { detail?: (id: string) => string; edit?: (id: string) => string; create?: string };
}
