import { productsApi } from '@modules/inventory/products/api/products.api';
import { shoeProductsApi } from './products.api';
import { shoeSizeVariantsApi } from './size-variants.api';
import { stockAdjustmentsApi } from '@modules/inventory/stock-adjustments/api/stock-adjustments.api';
import type { ShoeWizardDraft } from '../hooks/useShoeWizard';

export interface ShoeWizardSaveResult {
  productId: string;
  productName: string;
  profileCreated: boolean;
  sizeVariantsCreated: number;
  totalStock: number;
}

export async function saveShoeWizard(
draft: ShoeWizardDraft,
  /** Diya ho to isi product ko badla jayega, naya nahi banega */
  existingId?: string,
): Promise<ShoeWizardSaveResult> {
  const { basic, materials, sizing, features, warranty, pricing, sizeVariants } = draft;

  const totalStock = sizeVariants.reduce((a, v) => a + Number(v.stock || 0), 0);

  /* Pehle yahan sirf `create` tha: product "edit" karne par naya
     product ban jata tha aur purana waise ka waisa para rehta —
     ek hi cheez do dafa, do alag stock ke sath. */
  const _payload = {
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: 'pair',
    price: Number(pricing.retailPrice || 0),
    costPrice: Number(pricing.costPrice || 0),
    wholesalePrice: pricing.wholesalePrice === '' ? undefined : Number(pricing.wholesalePrice),
    taxRate: Number(pricing.taxRate || 0),
    // Stock lives on the sizes: each size's count is booked as a stock
    // adjustment when the sizes are saved below, so the product starts at 0.
    ...(existingId ? {} : { stock: 0 }),
    lowStockAlert: 2,
    isActive: basic.isActive,
    isFeatured: basic.isFeatured,
    tagIds: basic.tagIds,
    imageUrls: basic.imageUrls,
  };

  const product = existingId
    ? await productsApi.update(existingId, _payload as any)
    : await productsApi.create(_payload as any);;

  const productId = product.id;
  const rollback = async (reason: unknown) => {
    // EDIT me hargiz nahi — warna dukaan-daar ka mojooda product,
    // uski saari bikri ka rishta aur stock sab mit jata.
    if (existingId) throw reason;
    try { await productsApi.remove(productId); } catch {}
    throw reason;
  };

  let profileCreated = false;
  try {
    await shoeProductsApi.upsert({
      productId,
      brandId: basic.brandId || undefined,
      categoryType: basic.categoryType as any,
      gender: basic.gender as any,
      ageGroup: basic.ageGroup || undefined,
      modelName: basic.modelName || undefined,
      modelCode: basic.modelCode || undefined,
      collection: basic.collection || undefined,
      season: basic.season || undefined,

      upperMaterial: materials.upperMaterial || undefined,
      soleMaterial: materials.soleMaterial || undefined,
      innerMaterial: materials.innerMaterial || undefined,
      liningMaterial: materials.liningMaterial || undefined,

      colorName: basic.colorName || undefined,
      colorHex: basic.colorHex || undefined,
      patternType: materials.patternType || undefined,
      closureType: materials.closureType || undefined,
      toeShape: materials.toeShape || undefined,
      heelHeight: materials.heelHeight || undefined,
      heelType: materials.heelType || undefined,
      soleType: materials.soleType || undefined,

      sizeSystem: sizing.sizeSystem as any,
      availableSizes: sizeVariants.map((v) => v.size),
      width: sizing.width as any,
      runsLarge: sizing.runsLarge,
      runsSmall: sizing.runsSmall,
      sizingNotes: sizing.sizingNotes || undefined,

      isWaterproof: features.isWaterproof,
      isBreathable: features.isBreathable,
      hasAirCushion: features.hasAirCushion,
      hasArchSupport: features.hasArchSupport,
      isOrthopedic: features.isOrthopedic,
      isVegan: features.isVegan,
      isHandmade: features.isHandmade,

      sport: features.sport || undefined,
      playingSurface: features.playingSurface,

      careInstructions: warranty.careInstructions || undefined,
      cleaningRecommendation: warranty.cleaningRecommendation || undefined,
      warrantyMonths: warranty.warrantyMonths ? Number(warranty.warrantyMonths) : undefined,
      warrantyDetails: warranty.warrantyDetails || undefined,

      includesBox: warranty.includesBox,
      includesDustBag: warranty.includesDustBag,
      includesExtraLaces: warranty.includesExtraLaces,
      boxColor: warranty.boxColor || undefined,

      mrp: pricing.mrp === '' ? undefined : Number(pricing.mrp),
      costPrice: Number(pricing.costPrice || 0),
      wholesalePrice: pricing.wholesalePrice === '' ? undefined : Number(pricing.wholesalePrice),
      retailPrice: Number(pricing.retailPrice || 0),
      memberPrice: pricing.memberPrice === '' ? undefined : Number(pricing.memberPrice),

      isFeatured: basic.isFeatured,
      isBestSeller: basic.isBestSeller,
      isNewArrival: basic.isNewArrival,
      isTrending: basic.isTrending,
      isBridal: basic.isBridal,
      isEidSpecial: basic.isEidSpecial,

      notes: basic.notes || undefined,
    });
    profileCreated = true;
  } catch (e) {
    await rollback(e);
  }

  let sizeVariantsCreated = 0;
  if (existingId && sizeVariants.length > 0) {
    // A changed count on a size that already has stock is a stock
    // correction: it goes on record as a stock adjustment first.
    const live = await shoeSizeVariantsApi.byProduct(productId);
    const key = (size: string, system: string, width: string) => `${size}|${system}|${width}`;
    const byKey = new Map(live.map((v) => [key(v.size, v.sizeSystem, v.width), v]));
    const items = sizeVariants.flatMap((v) => {
      const cur = byKey.get(key(v.size, sizing.sizeSystem || 'UK', sizing.width || 'REGULAR'));
      if (!cur?.variantId) return [];
      const delta = Math.round(Number(v.stock || 0) - Number(cur.stock || 0));
      return delta === 0 ? [] : [{ productId, variantId: cur.variantId, type: (delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT') as 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT', quantity: Math.abs(delta) }];
    });
    if (items.length) await stockAdjustmentsApi.batch({ reason: 'Size ki ginti theek ki', note: 'Joota edit', items });
  }
  if (sizeVariants.length > 0) {
    try {
      const result = await shoeSizeVariantsApi.bulkUpsert({
        productId,
        variants: sizeVariants.map((v) => ({
          size: v.size,
          sizeSystem: sizing.sizeSystem as any,
          width: sizing.width as any,
          sku: v.sku || undefined,
          barcode: v.barcode || undefined,
          boxNumber: v.boxNumber || undefined,
          shelfLocation: v.shelfLocation || undefined,
          stock: Number(v.stock || 0),
          lowStockAlert: Number(v.lowStockAlert || 1),
          priceOverride: v.priceOverride,
          costOverride: v.costOverride,
          isActive: v.isActive,
        })),
      });
      sizeVariantsCreated = result.count;
    } catch (e) {
      await rollback(e);
    }
  }

  return {
    productId,
    productName: product.name,
    profileCreated,
    sizeVariantsCreated,
    totalStock,
  };
}
