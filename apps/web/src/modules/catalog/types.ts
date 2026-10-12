/**
 * Shapes for the shared catalog page. Every industry turns its own data
 * (products, menu items, services, plans) into `CatalogEntry` rows through a
 * data source, so one page can show, filter, share and print all of them.
 * Entries never carry cost or wholesale prices.
 */

import type { LucideIcon } from 'lucide-react';

export type Tone = 'green' | 'red' | 'amber' | 'blue' | 'violet' | 'slate' | 'pink';

export interface EntryBadge { label: string; tone: Tone }

export interface CatalogEntry {
  id: string;
  /** Product id for the detail view (images, variants); absent for services. */
  productId?: string;
  name: string;
  price: number;
  /** Shown after the price, e.g. "kg", "mahina", "30 din". */
  per?: string;
  /** Price before discount or MRP; shown struck through when higher. */
  oldPrice?: number | null;
  /** Replaces the price text, e.g. "Rate poochein". */
  priceNote?: string;
  /** Other prices for the detail view, e.g. follow-up or emergency rates. */
  priceTiers?: Array<{ label: string; price: number }>;
  image?: string | null;
  images?: string[];
  /** Fallback picture when there is no image. */
  emoji?: string;
  description?: string | null;
  category?: { id: string; name: string; color?: string } | null;
  brand?: string | null;
  featured: boolean;
  /** null when stock does not apply (services, plans). */
  inStock: boolean | null;
  /** Short stock line, e.g. "3 mojood", "Aaj bani". */
  stockNote?: string;
  variantCount?: number;
  createdAt?: string;
  /** Over the picture (top right). */
  badges?: EntryBadge[];
  /** Under the name. */
  chips?: EntryBadge[];
  /** Detail rows, also printed: [label, value]. */
  specs?: Array<[string, string]>;
  /** Checklist in the detail view: what is included. */
  includes?: string[];
  /** Values for config facets; one entry may match several values. */
  facets?: Record<string, string | string[]>;
  /** Extra words that search should match (SKU, model, code). */
  keywords?: string;
}

/** A filter built from entry facets, e.g. Karat, PTA, Season. */
interface FacetDef {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Labels for raw values; unknown values show as-is. */
  labels?: Record<string, string>;
}

/** One-tap filters shown as chips, e.g. "Veg", "Aaj bani", "24/7". */
interface QuickFilter {
  id: string;
  label: string;
  icon?: LucideIcon;
  test: (e: CatalogEntry) => boolean;
}

export type CatalogMode = 'grid' | 'list' | 'menu';

/** Loads the catalog; each industry brings its own. */
export interface CatalogSource {
  /** React Query key part; change when the data shape changes. */
  key: string;
  load: (ctx: { shopId?: string }) => Promise<CatalogEntry[]>;
}

/** One collection of the catalog, e.g. gym plans, trainers and classes. */
interface CatalogSection {
  id: string;
  label: string;
  icon: LucideIcon;
  source: CatalogSource;
}

export interface CatalogConfig {
  /** Business type shown in the header. */
  label: string;
  /** Page title, e.g. "Menu", "Catalog", "Services". */
  title: string;
  /** What one entry is called, e.g. "cheezein", "dishes", "plans". */
  noun: string;
  /** First section is the default; more sections show as tabs. */
  sections: CatalogSection[];
  /** Views offered; the first is the default. */
  modes: CatalogMode[];
  facets?: FacetDef[];
  quick?: QuickFilter[];
  /** Price range chips (upper bounds exclusive). */
  priceBands?: Array<[number, number]>;
  /** False hides stock lines and the "in stock" filter. */
  stock?: boolean;
  /** Label of the customer pick list, e.g. "Order list", "Pasand". */
  listLabel?: string;
  /** Hero line under the title in customer view. */
  tagline?: string;
}
