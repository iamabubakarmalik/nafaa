/** Product editor: the shared draft and what an industry adds to it. */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ImageDraft { id?: string; url: string }

export interface UnitDraft {
  id?: string;
  unitName: string;
  conversionType: 'BASE' | 'PACK' | 'BOX' | 'DOZEN' | 'CARTON' | 'CUSTOM';
  conversionRate: number;
  isBase: boolean;
  price: number;
  costPrice: number;
  wholesalePrice: number | null;
  mrpPrice: number | null;
  barcode: string;
  sku: string;
}

export interface VariantDraft {
  id?: string;
  name: string;
  sku: string;
  barcode: string;
  colorHex: string;
  /** Empty means "same as the product". */
  price: number | null;
  costPrice: number | null;
  /** Opening stock; only for variants added in this session. */
  stock: number;
  isActive: boolean;
}

export interface BatchDraft {
  id?: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  /** Opening quantity; fixed once saved (changes go through stock adjustments). */
  quantity: number;
  costPrice: number;
  notes: string;
}

export interface CoreDraft {
  name: string;
  description: string;
  categoryId: string | null;
  brandId: string | null;
  sku: string;
  barcode: string;
  unit: string;
  price: number;
  costPrice: number;
  wholesalePrice: number | null;
  taxRate: number;
  /** Opening stock on create; read-only on edit. */
  stock: number;
  lowStockAlert: number;
  isActive: boolean;
  isFeatured: boolean;
  expiryTracked: boolean;
  weight: number | null;
  productType: string | null;
  tagIds: string[];
  images: ImageDraft[];
  units: UnitDraft[];
  variants: VariantDraft[];
  batches: BatchDraft[];
}

export interface EditorDraft<X = Record<string, unknown>> {
  core: CoreDraft;
  /** Industry fields (profile, serials, recipe…), owned by the industry config. */
  extra: X;
}

export type Errors = Record<string, string>;

export interface StepContext<X> {
  draft: EditorDraft<X>;
  isEdit: boolean;
  productId?: string;
  setCore: (patch: Partial<CoreDraft>) => void;
  setExtra: (patch: Partial<X>) => void;
  errors: Errors;
  /** Marks a field as touched so its error shows. */
  touch: (field: string) => void;
}

export interface StepDef<X> {
  id: string;
  title: string;
  hint: string;
  icon: LucideIcon;
  render: (ctx: StepContext<X>) => ReactNode;
  validate?: (draft: EditorDraft<X>, isEdit: boolean) => Errors;
  /** Hide the step for some drafts (e.g. recipe only for made items). */
  when?: (draft: EditorDraft<X>) => boolean;
}

export interface CoreOptions {
  /** Unit tiles in the basic step. */
  units: Array<{ value: string; label: string }>;
  skuPrefix: string;
  /** Multi-unit packs (ProductUnit). */
  packs?: boolean;
  variants?: { presets: Array<{ group: string; values: string[] }> } | false;
  batches?: boolean;
  /** Markup chips on the price step. */
  markups?: number[];
}

export interface EditorConfig<X> {
  /** Industry name for headings, e.g. "Bakery". */
  label: string;
  /** Draft storage key; one per industry. */
  draftKey: string;
  paths: { list: string; detail: (id: string) => string; create: string };
  core: CoreOptions;
  extra: {
    initial: X;
    /** Loads industry data for an existing product. */
    load?: (productId: string) => Promise<Partial<X>>;
    /** Saves industry data after the product is saved. */
    save?: (productId: string, draft: EditorDraft<X>, ctx: { isEdit: boolean; shopId?: string }) => Promise<void>;
    /** Adjusts the product payload before it is sent (e.g. stock from serial count). */
    product?: (draft: EditorDraft<X>, payload: Record<string, unknown>) => Record<string, unknown>;
  };
  /** Steps in order. Use the core step builders for the shared ones. */
  steps: Array<StepDef<X>>;
  /** Extra lines in the live summary. */
  summary?: (draft: EditorDraft<X>) => ReactNode;
  /** Query keys to refresh after save. */
  refresh?: string[];
}
