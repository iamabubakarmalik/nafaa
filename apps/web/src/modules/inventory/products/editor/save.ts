/**
 * Saves the editor draft. On edit it compares with what was loaded and only
 * creates or updates what changed, so images, variants, packs and batches
 * are never duplicated. Saved variants, packs and batches are never deleted
 * here (they carry stock and history); variants and packs are switched off
 * instead. Stock is sent only when creating; after that it changes through
 * adjustments and purchases, which keep a record.
 */

import { productsApi } from '@modules/inventory/products/api/products.api';
import { productImagesApi } from '@modules/inventory/products/api/product-images.api';
import { productVariantsApi, type UpsertVariantPayload } from '@modules/inventory/products/api/product-variants.api';
import { productUnitsApi } from '@modules/inventory/products/api/product-units.api';
import { productBatchesApi } from '@modules/inventory/products/api/product-batches.api';
import { productSuppliersApi } from '@modules/inventory/products/api/product-suppliers.api';
import type { BatchDraft, CoreDraft, EditorConfig, EditorDraft, SupplierLinkDraft, UnitDraft, VariantDraft } from './types';
import { t } from '@core/i18n';
import { applyAutoPrices } from '@nafaa/core/inventory';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const blank = (v: string) => (v.trim() ? v.trim() : undefined);

/** Opening stock: variants and batches carry their own, otherwise the simple count. */
export function openingStock(core: CoreDraft) {
  if (core.variants.length) return core.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  if (core.batches.length) return core.batches.reduce((s, b) => s + (Number(b.quantity) || 0), 0);
  return Number(core.stock) || 0;
}

function productPayload(core: CoreDraft, isEdit: boolean) {
  return {
    name: core.name.trim(),
    description: core.description.trim() || undefined,
    categoryId: core.categoryId ?? undefined,
    brandId: core.brandId ?? undefined,
    sku: blank(core.sku),
    barcode: blank(core.barcode),
    unit: core.unit,
    price: Number(core.price) || 0,
    costPrice: Number(core.costPrice) || 0,
    // null clears a price on edit, so the retail price applies again.
    wholesalePrice: core.wholesalePrice || null,
    creditPrice: core.creditPrice || null,
    taxRate: Number(core.taxRate) || 0,
    lowStockAlert: Number(core.lowStockAlert) || 0,
    isActive: core.isActive,
    isFeatured: core.isFeatured,
    isRawMaterial: core.isRawMaterial,
    expiryTracked: core.expiryTracked || core.batches.length > 0,
    weight: core.weight ?? undefined,
    productType: core.productType ?? undefined,
    tagIds: core.tagIds,
    // With variants the opening stock is booked per variant; the product's
    // own row starts at 0 so the total is not counted twice.
    ...(isEdit ? {} : { stock: core.variants.length ? 0 : openingStock(core), imageUrls: core.images.map((i) => i.url) }),
  };
}

const variantPayload = (v: VariantDraft, core: CoreDraft, i: number, withStock: boolean): UpsertVariantPayload => ({
  name: v.name.trim(), sku: blank(v.sku), barcode: blank(v.barcode), colorHex: v.colorHex || undefined, unit: core.unit,
  price: v.price ?? core.price, costPrice: v.costPrice ?? core.costPrice, isActive: v.isActive, sortOrder: i,
  lowStockAlert: core.lowStockAlert, ...(withStock ? { stock: Number(v.stock) || 0 } : {}),
});

/**
 * The base row is the product in pack form, so its name and prices always come
 * from the product. Other packs get their automatic price tiers from the piece
 * (piece x size, less the pack discount); tiers typed by hand are kept. A
 * switched-off pack stays off. The default POS pack is kept as loaded; the base
 * row is the default only when no pack is.
 */
export const syncBaseRow = (units: UnitDraft[], core: CoreDraft): UnitDraft[] => units.map((u) => (u.isBase ? {
  ...u, unitName: core.unit, conversionType: 'BASE', conversionRate: 1, price: Number(core.price) || 0, costPrice: Number(core.costPrice) || 0,
  wholesalePrice: core.wholesalePrice, creditPrice: core.creditPrice, isActive: true,
} : applyAutoPrices(core, u, u.manual, u.discountPct)));

const unitPayload = (u: UnitDraft, productId: string, i: number, units: UnitDraft[]) => ({
  productId, unitName: u.unitName.trim(), conversionType: u.conversionType, conversionRate: u.isBase ? 1 : Number(u.conversionRate) || 1,
  isBase: u.isBase, isDefault: u.isDefault ?? (u.isBase && !units.some((x) => x.isDefault)),
  price: Number(u.price) || 0, costPrice: Math.round((Number(u.costPrice) || 0) * 100) / 100,
  wholesalePrice: u.wholesalePrice || null, creditPrice: u.creditPrice || null, mrpPrice: u.mrpPrice ?? undefined, barcode: blank(u.barcode), sku: blank(u.sku),
  isActive: u.isBase ? true : u.isActive, sortOrder: i,
});

const supplierPayload = (l: SupplierLinkDraft) => ({
  supplierId: l.supplierId, supplierSku: l.supplierSku.trim() || null,
  ...(l.costPrice !== undefined && { costPrice: l.costPrice }),
  minOrderQty: l.minOrderQty, leadDays: l.leadDays, unitId: l.unitId, isPreferred: l.isPreferred, notes: l.notes.trim() || null,
});

/** A saved batch's quantity follows sales and purchases, so updates never send it. */
const batchPayload = (b: BatchDraft, withQuantity: boolean) => ({
  batchNumber: b.batchNumber.trim(), manufactureDate: b.manufactureDate || undefined, expiryDate: b.expiryDate || undefined,
  ...(withQuantity ? { quantity: Number(b.quantity) || 0 } : {}), costPrice: Number(b.costPrice) || 0, notes: b.notes.trim() || undefined,
});

/** Creates new records and updates changed ones; records missing from the draft are left alone. */
async function sync<T extends { id?: string }>(next: T[], prev: T[], ops: {
  create: (items: Array<{ item: T; index: number }>) => Promise<unknown>;
  update: (item: T & { id: string }, index: number) => Promise<unknown>;
}) {
  const before = new Map(prev.filter((p) => p.id).map((p) => [p.id!, p]));
  const created = next.map((item, index) => ({ item, index })).filter((x) => !x.item.id);
  if (created.length) await ops.create(created);
  for (const [index, item] of next.entries()) {
    if (item.id && !same(item, before.get(item.id))) await ops.update(item as T & { id: string }, index);
  }
}

export async function saveProduct<X>(config: EditorConfig<X>, draft: EditorDraft<X>, opts: {
  existingId?: string; original?: CoreDraft; shopId?: string; onStep?: (label: string) => void;
}): Promise<string> {
  const { core } = draft;
  const isEdit = !!opts.existingId;
  const step = opts.onStep ?? (() => undefined);
  let payload: Record<string, unknown> = productPayload(core, isEdit);
  if (config.extra.product) payload = config.extra.product(draft, payload);

  step(t('Product save ho raha hai'));
  const product = isEdit
    ? await productsApi.update(opts.existingId!, payload as never)
    : await productsApi.create(payload as never);
  const id = (product as { id: string }).id ?? opts.existingId!;
  const prev = opts.original;

  try {
    if (isEdit && prev) {
      step(t('Tasveerein'));
      const prevIds = prev.images.map((i) => i.id).filter(Boolean) as string[];
      const keep = new Set(core.images.map((i) => i.id).filter(Boolean));
      for (const imgId of prevIds) if (!keep.has(imgId)) await productImagesApi.remove(id, imgId);
      const ids: string[] = [];
      for (const [i, img] of core.images.entries()) {
        if (img.id) ids.push(img.id);
        else ids.push((await productImagesApi.add(id, { url: img.url, isPrimary: i === 0, sortOrder: i }) as { id: string }).id);
      }
      if (ids.length && !same(ids, prevIds)) {
        await productImagesApi.reorder(id, ids);
        await productImagesApi.setPrimary(id, ids[0]);
      }
    }

    if (core.variants.length || prev?.variants.length) {
      step(t('Variants'));
      await sync(core.variants, prev?.variants ?? [], {
        create: (items) => productVariantsApi.bulkCreate(id, items.map(({ item, index }) => variantPayload(item, core, index, true))),
        update: (v, i) => productVariantsApi.update(id, v.id, variantPayload(v, core, i, false)),
      });
    }
    if (core.units.length || prev?.units.length) {
      step(t('Packing'));
      const units = syncBaseRow(core.units, core);
      await sync(units, prev ? syncBaseRow(prev.units, prev) : [], {
        create: async (items) => { for (const { item, index } of items) await productUnitsApi.create(unitPayload(item, id, index, units) as never); },
        update: (u, i) => productUnitsApi.update(u.id, unitPayload(u, id, i, units) as never),
      });
    }
    if (core.suppliers.length || prev?.suppliers.length) {
      const next = core.suppliers.map(supplierPayload);
      if (!same(next, (prev?.suppliers ?? []).map(supplierPayload))) {
        step(t('Suppliers'));
        await productSuppliersApi.replace(id, next);
      }
    }
    if (core.batches.length || prev?.batches.length) {
      step(t('Batches'));
      await sync(core.batches, prev?.batches ?? [], {
        create: async (items) => { for (const { item } of items) await productBatchesApi.create(id, batchPayload(item, true)); },
        update: (b) => productBatchesApi.update(id, b.id, batchPayload(b, false)),
      });
    }
    if (config.extra.save) {
      step(t('{{label}} ki details', { label: config.label }));
      await config.extra.save(id, draft, { isEdit, shopId: opts.shopId });
    }
  } catch (e) {
    // A half-made new product is worse than none; an edit keeps what was saved.
    if (!isEdit) await productsApi.remove(id, false).catch(() => undefined);
    throw e;
  }
  return id;
}
