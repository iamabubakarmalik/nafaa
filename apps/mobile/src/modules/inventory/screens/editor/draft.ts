/**
 * Empty drafts, and loading an existing product into a draft: from the
 * server with every part (images, packs, variants, batches), or from the
 * phone's mirror when offline (core fields, packs and variants).
 */

import { isNetworkError } from '@/core/api/errors';
import { offline } from '@/core/offline';
import { batchesApi, imagesApi, productsApi, unitsApi, variantsApi } from '../../api/products';
import type { CoreDraft, EditorDraft, UnitDraft } from './types';

export const emptyCore = (unit = 'pcs'): CoreDraft => ({
  name: '', description: '', categoryId: null, brandId: null, sku: '', barcode: '', unit,
  price: 0, costPrice: 0, wholesalePrice: null, creditPrice: null, taxRate: 0, stock: 0, lowStockAlert: 5,
  isActive: true, isFeatured: false, isRawMaterial: false, expiryTracked: false, weight: null, productType: null,
  tagIds: [], images: [], units: [], variants: [], batches: [],
});

export const freshDraft = <X,>(initial: X, unit?: string): EditorDraft<X> => ({ core: emptyCore(unit), extra: JSON.parse(JSON.stringify(initial ?? {})) as X });

const day = (v?: string | null) => (v ? v.slice(0, 10) : '');
const num = (v: unknown) => Number(v ?? 0) || 0;

/** Server copy; `fromPhone` is true when it came from the mirror (offline). */
export async function loadCore(id: string): Promise<{ core: CoreDraft; fromPhone: boolean }> {
  try {
    const [p, images, variants, units, batches] = await Promise.all([
      productsApi.getOne(id),
      imagesApi.list(id).catch(() => []),
      variantsApi.list(id).catch(() => []),
      unitsApi.byProduct(id).catch(() => []),
      batchesApi.list(id).catch(() => []),
    ]);
    const core: CoreDraft = {
      name: p.name ?? '', description: p.description ?? '', categoryId: p.categoryId ?? p.category?.id ?? null, brandId: p.brandId ?? p.brand?.id ?? null,
      sku: p.sku ?? '', barcode: p.barcode ?? '', unit: p.unit ?? 'pcs', price: num(p.price), costPrice: num(p.costPrice),
      wholesalePrice: p.wholesalePrice ?? null, creditPrice: p.creditPrice ?? null, taxRate: num(p.taxRate),
      stock: num(p.shopStock ?? p.stock), lowStockAlert: num(p.lowStockAlert ?? 5), isActive: p.isActive !== false, isFeatured: !!p.isFeatured,
      isRawMaterial: !!p.isRawMaterial, expiryTracked: !!p.expiryTracked, weight: p.weight ?? null, productType: p.productType ?? null,
      tagIds: (p.tags ?? []).map((g) => g.tag?.id).filter(Boolean) as string[],
      images: [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder).map((i) => ({ id: i.id, url: i.url })),
      units: units.map((u): UnitDraft => ({
        id: u.id, unitName: u.unitName, conversionType: u.conversionType ?? 'CUSTOM', conversionRate: num(u.conversionRate), isBase: u.isBase,
        price: num(u.price), costPrice: num(u.costPrice), wholesalePrice: u.wholesalePrice ?? null, creditPrice: u.creditPrice ?? null, mrpPrice: u.mrpPrice ?? null,
        barcode: u.barcode ?? '', sku: u.sku ?? '', isActive: u.isActive !== false,
      })),
      variants: variants.map((v) => ({
        id: v.id, name: v.name, sku: v.sku ?? '', barcode: v.barcode ?? '', colorHex: v.colorHex ?? '',
        price: num(v.price) === num(p.price) ? null : num(v.price), costPrice: num(v.costPrice) || null, stock: num(v.stock), isActive: v.isActive,
      })),
      batches: batches.map((b) => ({
        id: b.id, batchNumber: b.batchNumber ?? '', manufactureDate: day(b.manufactureDate), expiryDate: day(b.expiryDate),
        quantity: num(b.quantity), costPrice: num(b.costPrice), notes: b.notes ?? '',
      })),
    };
    return { core, fromPhone: false };
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    const p = await offline.products.get(id);
    if (!p) throw e;
    const core: CoreDraft = {
      ...emptyCore(p.unit), name: p.name, categoryId: p.categoryId, brandId: p.brandId, sku: p.sku ?? '', barcode: p.barcode ?? '',
      price: num(p.price), costPrice: num(p.costPrice), wholesalePrice: p.wholesalePrice, creditPrice: p.creditPrice, taxRate: num(p.taxRate),
      stock: num(p.stock), lowStockAlert: num(p.lowStockAlert), isActive: p.isActive, isFeatured: p.isFeatured, isRawMaterial: p.isRawMaterial,
      expiryTracked: p.expiryTracked, productType: p.productType, images: p.imageUrl ? [{ id: 'mirror', url: p.imageUrl }] : [],
      units: p.packs.map((u) => ({
        id: u.id, unitName: u.unitName, conversionType: u.isBase ? 'BASE' : 'CUSTOM', conversionRate: num(u.conversionRate), isBase: u.isBase,
        price: num(u.price), costPrice: num(u.costPrice), wholesalePrice: u.wholesalePrice, creditPrice: u.creditPrice, mrpPrice: u.mrpPrice,
        barcode: u.barcode ?? '', sku: u.sku ?? '', isActive: true,
      })),
      variants: p.variants.map((v) => ({
        id: v.id, name: v.name, sku: v.sku ?? '', barcode: v.barcode ?? '', colorHex: '', price: num(v.price) === num(p.price) ? null : num(v.price),
        costPrice: v.costPrice, stock: num(v.stock), isActive: true,
      })),
    };
    return { core, fromPhone: true };
  }
}
