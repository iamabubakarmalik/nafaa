/** Empty drafts and loading an existing product into a draft. */

import { productsApi } from '@modules/inventory/products/api/products.api';
import { productImagesApi } from '@modules/inventory/products/api/product-images.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { productUnitsApi } from '@modules/inventory/products/api/product-units.api';
import { productBatchesApi } from '@modules/inventory/products/api/product-batches.api';
import { productSuppliersApi } from '@modules/inventory/products/api/product-suppliers.api';
import { inferPackAuto } from '@nafaa/core/inventory';
import type { CoreDraft, EditorDraft, SupplierLinkDraft, UnitDraft } from './types';

export const emptyCore = (unit = 'pcs'): CoreDraft => ({
  name: '', description: '', categoryId: null, brandId: null, sku: '', barcode: '', unit,
  price: 0, costPrice: 0, wholesalePrice: null, creditPrice: null, taxRate: 0, stock: 0, lowStockAlert: 5,
  isActive: true, isFeatured: false, isRawMaterial: false, expiryTracked: false, weight: null, productType: null,
  tagIds: [], images: [], units: [], variants: [], batches: [], suppliers: [],
});

const day = (v?: string | null) => (v ? v.slice(0, 10) : '');
const num = (v: unknown) => Number(v ?? 0);

/** Loads the product and every sub-record so edits update them instead of adding copies. */
export async function loadCore(id: string): Promise<CoreDraft> {
  const [p, images, variants, units, batches, links] = await Promise.all([
    productsApi.getOne(id),
    productImagesApi.list(id).catch(() => []),
    productVariantsApi.list(id).catch(() => []),
    productUnitsApi.byProduct(id).catch(() => []),
    productBatchesApi.list(id).catch(() => []),
    productSuppliersApi.list(id).then((r) => r.items).catch(() => []),
  ]);
  const any = p as unknown as Record<string, any>;
  const piece = { price: num(any.price), costPrice: num(any.costPrice), wholesalePrice: any.wholesalePrice ?? null, creditPrice: any.creditPrice ?? null };
  return {
    name: p.name ?? '', description: any.description ?? '', categoryId: any.categoryId ?? any.category?.id ?? null,
    brandId: any.brandId ?? any.brand?.id ?? null, sku: any.sku ?? '', barcode: any.barcode ?? '', unit: any.unit ?? 'pcs',
    price: num(any.price), costPrice: num(any.costPrice), wholesalePrice: any.wholesalePrice ?? null, creditPrice: any.creditPrice ?? null, taxRate: num(any.taxRate),
    stock: num(any.stock), lowStockAlert: num(any.lowStockAlert ?? 5), isActive: any.isActive !== false, isFeatured: !!any.isFeatured, isRawMaterial: !!any.isRawMaterial,
    expiryTracked: !!any.expiryTracked, weight: any.weight ?? null, productType: any.productType ?? null,
    tagIds: (any.tags ?? []).map((t: any) => t.tagId ?? t.tag?.id ?? t.id).filter(Boolean),
    images: [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder).map((i) => ({ id: i.id, url: i.url })),
    // Each pack tier is automatic again when its saved value still matches piece x size.
    units: units.map((u): UnitDraft => ({ id: u.id, unitName: u.unitName, conversionType: (u.conversionType as UnitDraft['conversionType']) ?? 'CUSTOM',
      conversionRate: num(u.conversionRate), isBase: u.isBase, isDefault: !!u.isDefault, price: num(u.price), costPrice: num(u.costPrice),
      wholesalePrice: u.wholesalePrice ?? null, creditPrice: u.creditPrice ?? null, mrpPrice: u.mrpPrice ?? null, barcode: u.barcode ?? '', sku: u.sku ?? '', isActive: u.isActive !== false,
    })).map((u) => (u.isBase ? u : { ...u, ...inferPackAuto(piece, u) })),
    variants: variants.map((v) => {
      const a = v as unknown as Record<string, any>;
      return {
        id: v.id, name: v.name, sku: a.sku ?? '', barcode: a.barcode ?? '', colorHex: a.colorHex ?? '',
        price: v.price === num(any.price) ? null : num(v.price), costPrice: num(v.costPrice) || null, stock: num(v.stock), isActive: v.isActive,
      };
    }),
    suppliers: links.map((l): SupplierLinkDraft => ({
      supplierId: l.supplierId, supplierName: l.supplier?.name ?? '', supplierSku: l.supplierSku ?? '',
      // Absent when costs are hidden: left undefined so a save keeps the stored cost.
      ...('costPrice' in l ? { costPrice: l.costPrice ?? null } : {}),
      minOrderQty: l.minOrderQty ?? null, leadDays: l.leadDays ?? null, unitId: l.unitId ?? null, isPreferred: l.isPreferred, notes: l.notes ?? '',
      lastPurchasePrice: l.lastPurchasePrice ?? null, lastPurchasedAt: l.lastPurchasedAt ?? null,
    })),
    batches: batches.map((b) => {
      const a = b as unknown as Record<string, any>;
      return { id: b.id, batchNumber: a.batchNumber ?? '', manufactureDate: day(a.manufactureDate), expiryDate: day(a.expiryDate), quantity: num(b.quantity), costPrice: num(b.costPrice), notes: a.notes ?? '' };
    }),
  };
}

export const freshDraft = <X,>(initial: X, unit?: string): EditorDraft<X> => ({ core: emptyCore(unit), extra: structuredClone(initial) });

/** "Atta Fine 1kg" + prefix → "ATTA-FINE-4821". */
export function autoSku(name: string, prefix: string) {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.slice(0, 4));
  return `${words.length ? words.join('-') : prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}
