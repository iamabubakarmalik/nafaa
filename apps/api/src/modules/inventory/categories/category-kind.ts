/**
 * Category "kind": the industry behaviour of a shop category (for agri: seeds,
 * fertilizer, spray ...). The shop has ONE category system; a category, or the
 * nearest parent above it, may carry a kind and products inherit it on save.
 * Pure helpers here; the registry lists which industries use kinds.
 */
import {
  AgriCategory, ApplianceCategoryType, BakeryCategory, DairyProductType, ElectronicsCategoryType, FloristCategoryType, FurnitureCategoryType, GamingCategoryType,
  GarmentCategoryType, HardwareCategoryType, JewelryCategory, MeatAnimalType, OpticalCategoryType, PetCategoryType, ShoeCategoryType, SportsCategoryType, ToyCategoryType,
} from '@prisma/client';

export interface KindNode { id: string; parentId: string | null; kind?: string | null }

/**
 * Allowed kinds per tenant business type (upper case). An industry that is not
 * listed does not use kinds, so any kind sent for it is dropped (stored as null).
 * Packs add their own enum here when their product type is derived from the category.
 */
export const CATEGORY_KIND_VALUES: Record<string, readonly string[]> = {
  AGRI: Object.values(AgriCategory),
  JEWELRY: Object.values(JewelryCategory),
  BAKERY: Object.values(BakeryCategory),
  HARDWARE: Object.values(HardwareCategoryType),
  ELECTRONICS: Object.values(ElectronicsCategoryType),
  APPLIANCES: Object.values(ApplianceCategoryType),
  GAMING: Object.values(GamingCategoryType),
  FLORIST: Object.values(FloristCategoryType),
  FURNITURE: Object.values(FurnitureCategoryType),
  OPTICAL: Object.values(OpticalCategoryType),
  PETSHOP: Object.values(PetCategoryType),
  SHOE: Object.values(ShoeCategoryType),
  SPORTS: Object.values(SportsCategoryType),
  TOYSTORE: Object.values(ToyCategoryType),
  CLOTHING: Object.values(GarmentCategoryType),
  MEAT: Object.values(MeatAnimalType),
  DAIRY: Object.values(DairyProductType),
};

/** Allowed kinds for a tenant's industry, or null when the industry does not use kinds. */
export function kindValuesFor(businessType: string | null | undefined): readonly string[] | null {
  const type = (businessType ?? '').trim().toUpperCase();
  if (!type) return null;
  const key = CATEGORY_KIND_VALUES[type] ? type : Object.keys(CATEGORY_KIND_VALUES).find((k) => type.includes(k));
  return key ? CATEGORY_KIND_VALUES[key] : null;
}

/**
 * Normalises a kind coming from a form. Empty means "no kind". For an industry
 * without kinds the value is ignored (null); for one with kinds an unknown value is
 * returned as `invalid` so the caller can answer with a clear message.
 */
export function checkKind(allowed: readonly string[] | null, raw: unknown): { kind: string | null; invalid: boolean } {
  const v = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (!v || !allowed) return { kind: null, invalid: false };
  return allowed.includes(v) ? { kind: v, invalid: false } : { kind: null, invalid: true };
}

/**
 * The kind of a category: its own, else the nearest parent that has one.
 * Null when the chain has none (or the category is unknown). Loop-safe.
 */
export function nearestKind(rows: readonly KindNode[], categoryId: string | null | undefined, allowed?: readonly string[] | null): string | null {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const seen = new Set<string>();
  let cur = categoryId ? byId.get(categoryId) : undefined;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    if (cur.kind && (!allowed || allowed.includes(cur.kind))) return cur.kind;
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return null;
}

/**
 * Type a product should be saved with: the category kind (nearest parent), else the
 * value the product already has (nothing is rewritten for old products), else `fallback`.
 */
export function deriveProductKind(rows: readonly KindNode[], categoryId: string | null | undefined, existing: string | null | undefined, fallback: string, allowed?: readonly string[] | null): string {
  return nearestKind(rows, categoryId, allowed) ?? existing ?? fallback;
}
