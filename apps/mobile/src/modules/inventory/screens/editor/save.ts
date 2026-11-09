/**
 * Saves the editor draft. The product itself goes through the offline
 * engine (so a new product is sellable and scannable at once, with or
 * without internet). When online, the save waits for the server's answer and
 * then creates or updates the parts the engine does not carry: photos,
 * packs, variants, batches and the industry's own data. Same rules as the
 * web: saved packs and variants are switched off, never deleted; stock is
 * sent only when creating; a new product whose parts fail is removed again.
 */

import { openingStock } from '@nafaa/core/inventory';
import { t } from '@/core/i18n';
import { enqueueProductCreate, enqueueProductUpdate, offline, OfflineRuleError } from '@/core/offline';
import { productSuppliersApi, type SupplierLinkPayload } from '../../api/suppliers';
import { batchesApi, imagesApi, productsApi, unitsApi, variantsApi, type VariantPayload } from '../../api/products';
import type { EditorConfig } from '../../industry/types';
import { withBaseFromProduct } from './draft';
import type { BatchDraft, CoreDraft, EditorDraft, SupplierLinkDraft, UnitDraft, VariantDraft } from './types';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const blank = (v: string) => (v.trim() ? v.trim() : undefined);

export function productPayload(core: CoreDraft, isEdit: boolean): Record<string, unknown> {
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
    // With variants the opening stock is booked per variant, so the product's own row starts at 0.
    ...(isEdit ? {} : { stock: core.variants.length ? 0 : openingStock(core), imageUrls: core.images.map((i) => i.url) }),
  };
}

const variantPayload = (v: VariantDraft, core: CoreDraft, i: number, withStock: boolean, shopId?: string | null): VariantPayload => ({
  name: v.name.trim(), sku: blank(v.sku), barcode: blank(v.barcode), colorHex: v.colorHex || undefined, unit: core.unit,
  price: v.price ?? core.price, costPrice: v.costPrice ?? core.costPrice, isActive: v.isActive, sortOrder: i,
  lowStockAlert: core.lowStockAlert, ...(withStock ? { stock: Number(v.stock) || 0, ...(shopId ? { shopId } : {}) } : {}),
});

const supplierPayload = (l: SupplierLinkDraft): SupplierLinkPayload => ({
  supplierId: l.supplierId, supplierSku: blank(l.supplierSku),
  ...(l.costPrice != null && l.costPrice >= 0 ? { costPrice: l.costPrice } : {}),
  ...(l.minOrderQty ? { minOrderQty: l.minOrderQty } : {}), ...(l.leadDays ? { leadDays: l.leadDays } : {}),
  ...(l.unitId ? { unitId: l.unitId } : {}), isPreferred: l.isPreferred, notes: blank(l.notes),
});

/** The base pack is default only when no other pack was chosen as default (elsewhere or here). */
const unitPayload = (u: UnitDraft, productId: string, i: number, otherDefault: boolean) => ({
  productId, unitName: u.unitName.trim(), conversionType: u.conversionType, conversionRate: Number(u.conversionRate) || 1,
  isBase: u.isBase, isDefault: u.isBase ? !otherDefault : u.isDefault, price: Number(u.price) || 0, costPrice: Number(u.costPrice) || 0,
  wholesalePrice: u.wholesalePrice || null, creditPrice: u.creditPrice || null, mrpPrice: u.mrpPrice ?? undefined,
  barcode: blank(u.barcode), sku: blank(u.sku), isActive: u.isActive, sortOrder: i,
});

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

/** Parts that changed and need the server (photos, packs, variants, batches, suppliers, industry data). */
export function pendingParts<X>(config: EditorConfig<X>, core: CoreDraft, prev?: CoreDraft): string[] {
  const out: string[] = [];
  const changed = <K extends keyof CoreDraft>(k: K) => !same(core[k], prev?.[k] ?? []);
  if (prev && changed('images')) out.push(t('Tasveerein'));
  // Packs compare with their automatic prices filled, so a piece price change counts.
  const packs = (d?: CoreDraft) => (d ? withBaseFromProduct(d).filter((u) => !u.isBase) : []);
  if (changed('units') || !same(packs(core), packs(prev))) out.push(t('Packing'));
  if (changed('variants')) out.push(t('Variants'));
  if (changed('batches')) out.push(t('Batches'));
  if (changed('suppliers')) out.push(t('Suppliers'));
  if (config.extra.save) out.push(t('Baqi details'));
  return out;
}

export interface SaveResult {
  id: string;
  /** Saved on the phone; the server gets it when online. */
  queued: boolean;
  /** Parts that were not saved because there is no internet. */
  skipped: string[];
}

export async function saveProduct<X>(config: EditorConfig<X>, draft: EditorDraft<X>, opts: {
  existingId?: string; original?: CoreDraft; shopId?: string | null; online: boolean; onStep?: (label: string) => void;
}): Promise<SaveResult> {
  const { core } = draft;
  const isEdit = !!opts.existingId;
  const step = opts.onStep ?? (() => undefined);
  let payload = productPayload(core, isEdit);
  if (config.extra.product) payload = config.extra.product(draft, payload);

  step(t('Product save ho raha hai'));
  let opId: string | null = null;
  let id = opts.existingId ?? '';
  if (isEdit) {
    const before = opts.original ? productPayload(opts.original, true) : {};
    const patch = Object.fromEntries(Object.entries(payload).filter(([k, v]) => !same(v, before[k])));
    if (Object.keys(patch).length) {
      try {
        opId = await enqueueProductUpdate(id, patch as never);
      } catch (e) {
        // Products the phone does not keep (switched off) are changed directly.
        if (!(e instanceof OfflineRuleError) || !opts.online) throw e;
        await productsApi.update(id, patch);
      }
    }
  } else {
    const r = await enqueueProductCreate({ ...(payload as { name: string; price: number }), shopId: opts.shopId ?? undefined });
    opId = r.opId;
    id = r.productId;
  }

  const parts = pendingParts(config, core, opts.original);
  if (opId) {
    const op = opts.online ? await offline.outbox.waitFor(opId, 20_000) : null;
    if (op?.status === 'issue') throw new Error(op.serverMessage || op.explanation || t('Save nahi hua'));
    if (op?.status !== 'done') return { id, queued: true, skipped: parts };
    if (!isEdit) id = String((op.result as { id?: string } | null)?.id ?? id);
  }
  if (!opts.online) return { id, queued: false, skipped: parts };

  const prev = opts.original;
  try {
    if (isEdit && prev && !same(core.images, prev.images)) {
      step(t('Tasveerein'));
      const prevIds = prev.images.map((i) => i.id).filter((x): x is string => !!x && x !== 'mirror');
      const keep = new Set(core.images.map((i) => i.id).filter(Boolean));
      for (const imgId of prevIds) if (!keep.has(imgId)) await imagesApi.remove(id, imgId);
      const ids: string[] = [];
      for (const [i, img] of core.images.entries()) {
        if (img.id && img.id !== 'mirror') ids.push(img.id);
        else if (!img.id) ids.push((await imagesApi.add(id, { url: img.url, isPrimary: i === 0, sortOrder: i })).id);
      }
      if (ids.length && !same(ids, prevIds)) {
        await imagesApi.reorder(id, ids);
        await imagesApi.setPrimary(id, ids[0]);
      }
    }
    if (core.variants.length || prev?.variants.length) {
      step(t('Variants'));
      await sync(core.variants, prev?.variants ?? [], {
        create: (items) => variantsApi.bulkCreate(id, items.map(({ item, index }) => variantPayload(item, core, index, true, opts.shopId))),
        update: (v, i) => variantsApi.update(id, v.id, variantPayload(v, core, i, false)),
      });
    }
    if (core.units.length || prev?.units.length) {
      step(t('Packing'));
      const units = withBaseFromProduct(core);
      const otherDefault = units.some((u) => !u.isBase && u.isDefault);
      await sync(units, prev?.units ?? [], {
        create: async (items) => { for (const { item, index } of items) await unitsApi.create(unitPayload(item, id, index, otherDefault) as never); },
        update: (u, i) => unitsApi.update(u.id, unitPayload(u, id, i, otherDefault) as never),
      });
    }
    if (core.batches.length || prev?.batches.length) {
      step(t('Batches'));
      await sync(core.batches, prev?.batches ?? [], {
        create: async (items) => { for (const { item } of items) await batchesApi.create(id, batchPayload(item, true)); },
        update: (b) => batchesApi.update(id, b.id, batchPayload(b, false)),
      });
    }
    if (core.suppliers.length ? !same(core.suppliers, prev?.suppliers ?? []) : !!prev?.suppliers.length) {
      step(t('Suppliers'));
      await productSuppliersApi.save(id, core.suppliers.map(supplierPayload));
    }
    if (config.extra.save) {
      step(t('Baqi details'));
      await config.extra.save(id, draft, { isEdit, shopId: opts.shopId });
    }
  } catch (e) {
    // A half-made new product is worse than none; an edit keeps what was saved.
    if (!isEdit) await productsApi.remove(id, false).catch(() => undefined);
    throw e;
  }
  return { id, queued: false, skipped: [] };
}
