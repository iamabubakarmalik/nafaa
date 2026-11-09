/** Product editor draft: the shared core and the industry's own part. */

import type { PackKind, PackManual } from '@nafaa/core/inventory';
import type { ImageDraft } from '../../components/PhotoField';

export type { ImageDraft };

export interface UnitDraft {
  id?: string;
  unitName: string;
  conversionType: PackKind;
  conversionRate: number;
  isBase: boolean;
  /** The pack the counter picks first; kept as loaded so it is never reset from here. */
  isDefault: boolean;
  price: number;
  costPrice: number;
  wholesalePrice: number | null;
  creditPrice: number | null;
  mrpPrice: number | null;
  barcode: string;
  sku: string;
  /** Saved packs are switched off, never deleted. */
  isActive: boolean;
  /** Price tiers typed by hand; the others follow the piece price x size. Editor only, not saved. */
  manual?: PackManual;
  /** Discount on the automatic sale tiers of this pack, in percent. Editor only, not saved. */
  discountPct?: number;
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
  /** Opening stock; only for variants added now. */
  stock: number;
  isActive: boolean;
}

export interface BatchDraft {
  id?: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  /** Opening quantity; never sent again once saved. */
  quantity: number;
  costPrice: number;
  notes: string;
}

/** One supplier of the product. Costs are per base unit. */
export interface SupplierLinkDraft {
  supplierId: string;
  supplierName: string;
  supplierSku: string;
  /** Usual cost of one base unit; null when not set (or hidden without cost.view). */
  costPrice: number | null;
  /** In base units. */
  minOrderQty: number | null;
  leadDays: number | null;
  unitId: string | null;
  isPreferred: boolean;
  notes: string;
  /** Shown only. */
  lastPurchasePrice: number | null;
  lastPurchasedAt: string | null;
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
  creditPrice: number | null;
  taxRate: number;
  /** Opening stock on create; read-only on edit. */
  stock: number;
  lowStockAlert: number;
  isActive: boolean;
  isFeatured: boolean;
  isRawMaterial: boolean;
  expiryTracked: boolean;
  weight: number | null;
  productType: string | null;
  tagIds: string[];
  images: ImageDraft[];
  units: UnitDraft[];
  variants: VariantDraft[];
  batches: BatchDraft[];
  suppliers: SupplierLinkDraft[];
}

export interface EditorDraft<X = Record<string, unknown>> {
  core: CoreDraft;
  extra: X;
}

export type Errors = Record<string, string>;
