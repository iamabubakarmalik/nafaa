import { productsApi } from '@modules/inventory/products/api/products.api';
import { dairyProductsApi } from './products.api';
import type { DairyWizardDraft } from '../hooks/useDairyWizard';

export interface DairyWizardSaveResult {
  productId: string;
  dairyProductId: string;
  productName: string;
  productType: string;
  hasComposition: boolean;
  qualityBadges: number;
  slotCount: number;
}

/**
 * Atomically create a dairy product with:
 *   • Product (base entity)
 *   • Dairy product (dairy-specific meta: composition, availability, slots)
 *
 * Rollback: deletes the product if dairy profile save fails.
 */
export async function saveDairyWizard(
  draft: DairyWizardDraft,
): Promise<DairyWizardSaveResult> {
  const { basic, composition, availability } = draft;

  // ─── 1. CREATE PRODUCT ─────────────────────────────────
  const product = await productsApi.create({
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    brandId: basic.brandId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: (basic.unit as string).toLowerCase(),
    price: Number(basic.salePrice || 0),
    costPrice: Number(basic.costPrice || 0),
    wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
    taxRate: Number(basic.taxRate || 0),
    stock: Number(availability.initialStock || 0),
    lowStockAlert: Number(availability.lowStockAlert || 5),
    isActive: basic.isActive,
    isFeatured: basic.isFeatured,
    tagIds: basic.tagIds,
    imageUrls: basic.imageUrls,
  });

  const productId = product.id;

  const rollback = async (reason: unknown) => {
    try { await productsApi.remove(productId); } catch {}
    throw reason;
  };

  // ─── 2. CREATE DAIRY PROFILE ───────────────────────────
  let dairyProduct: any;
  try {
    dairyProduct = await dairyProductsApi.upsert({
      productId,
      productType: basic.productType,
      unit: basic.unit,
      fatContent: composition.fatContent === '' ? undefined : Number(composition.fatContent),
      snfContent: composition.snfContent === '' ? undefined : Number(composition.snfContent),
      proteinContent: composition.proteinContent === '' ? undefined : Number(composition.proteinContent),
      waterAdded: composition.waterAdded,
      quality: composition.quality || undefined,
      isPasteurized: composition.isPasteurized,
      isHomogenized: composition.isHomogenized,
      isRaw: composition.isRaw,
      isOrganic: composition.isOrganic,
      isFresh: composition.isFresh,
      productionDate: composition.productionDate || undefined,
      bestBeforeHours: composition.bestBeforeHours === '' ? undefined : Number(composition.bestBeforeHours),
      shelfLifeHours: composition.shelfLifeHours === '' ? undefined : Number(composition.shelfLifeHours),
      requiresRefrigeration: composition.requiresRefrigeration,
      storageTempMin: composition.storageTempMin === '' ? undefined : Number(composition.storageTempMin),
      storageTempMax: composition.storageTempMax === '' ? undefined : Number(composition.storageTempMax),
      farmSource: basic.farmSource || undefined,
      cattleType: basic.cattleType || undefined,
      morningPrice: availability.morningPrice === '' ? undefined : Number(availability.morningPrice),
      eveningPrice: availability.eveningPrice === '' ? undefined : Number(availability.eveningPrice),
      bulkPrice: availability.bulkPrice === '' ? undefined : Number(availability.bulkPrice),
      minBulkQty: availability.minBulkQty === '' ? undefined : Number(availability.minBulkQty),
      homeDeliveryPrice: availability.homeDeliveryPrice === '' ? undefined : Number(availability.homeDeliveryPrice),
      wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
      retailPrice: basic.retailPrice === '' ? undefined : Number(basic.retailPrice),
      availableMorning: availability.availableMorning,
      availableEvening: availability.availableEvening,
      homeDeliveryAvailable: availability.homeDeliveryAvailable,
      isFeatured: basic.isFeatured,
      isBestSeller: basic.isBestSeller,
      displayOrder: availability.displayOrder,
      notes: basic.notes || undefined,
    });
  } catch (e) {
    await rollback(e);
  }

  const qualityBadges = [
    composition.isPasteurized, composition.isHomogenized, composition.isRaw,
    composition.isOrganic, composition.isFresh,
  ].filter(Boolean).length;

  const slotCount = [
    availability.availableMorning, availability.availableEvening, availability.homeDeliveryAvailable,
  ].filter(Boolean).length;

  return {
    productId,
    dairyProductId: dairyProduct.id,
    productName: product.name,
    productType: basic.productType,
    hasComposition: composition.fatContent !== '' || composition.snfContent !== '',
    qualityBadges,
    slotCount,
  };
}
