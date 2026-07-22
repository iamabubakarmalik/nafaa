import { productsApi } from '@modules/inventory/products/api/products.api';
import { meatProductsApi } from './products.api';
import type { MeatWizardDraft } from '../hooks/useMeatWizard';

export interface MeatWizardSaveResult {
  productId: string;
  profileId: string;
  productName: string;
  isHalalCertified: boolean;
  certCount: number;
  hasFarmInfo: boolean;
}

/**
 * Atomically create a meat product with:
 *   • Product (base entity)
 *   • Meat product profile (halal, quality, origin, nutrition)
 *
 * Rollback: deletes the product if profile creation fails.
 */
export async function saveMeatWizard(
  draft: MeatWizardDraft,
): Promise<MeatWizardSaveResult> {
  const { basic, halalQuality, origin } = draft;

  // ─── 1. CREATE PRODUCT ─────────────────────────────────
  const product = await productsApi.create({
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    brandId: basic.brandId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: basic.saleUnit.toLowerCase() === 'kg' ? 'kg' : basic.saleUnit.toLowerCase(),
    price: Number(basic.pricePerKg || 0),
    costPrice: Number(basic.costPrice || 0),
    wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
    taxRate: Number(basic.taxRate || 0),
    stock: 0,
    lowStockAlert: 0,
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

  // ─── 2. CREATE MEAT PROFILE ────────────────────────────
  let profile: any;
  try {
    const nutritionInfo: any = {};
    if (origin.nutritionCalories) nutritionInfo.calories = Number(origin.nutritionCalories);
    if (origin.nutritionProtein) nutritionInfo.protein = Number(origin.nutritionProtein);
    if (origin.nutritionFat) nutritionInfo.fat = Number(origin.nutritionFat);
    if (origin.nutritionCarbs) nutritionInfo.carbs = Number(origin.nutritionCarbs);
    if (origin.nutritionCholesterol) nutritionInfo.cholesterol = Number(origin.nutritionCholesterol);
    if (origin.nutritionSodium) nutritionInfo.sodium = Number(origin.nutritionSodium);

    profile = await meatProductsApi.upsert({
      productId,
      animalType: basic.animalType,
      cutCategory: basic.cutCategory,
      freshnessType: basic.freshnessType,
      slaughterMethod: halalQuality.slaughterMethod,
      qualityGrade: halalQuality.qualityGrade,
      saleUnit: basic.saleUnit,
      pricePerKg: Number(basic.pricePerKg || 0),
      pricePerPiece: basic.pricePerPiece === '' ? undefined : Number(basic.pricePerPiece),
      minOrderKg: basic.minOrderKg === '' ? undefined : Number(basic.minOrderKg),
      maxOrderKg: basic.maxOrderKg === '' ? undefined : Number(basic.maxOrderKg),
      weightVariancePct: Number(basic.weightVariancePct || 5),
      isBoneless: basic.isBoneless,
      isBoneIn: basic.isBoneIn,
      isSkinless: basic.isSkinless,
      isMarinated: halalQuality.isMarinated,
      marinationType: halalQuality.marinationType || undefined,
      isOrganic: halalQuality.isOrganic,
      isFreeRange: halalQuality.isFreeRange,
      isGrainFed: halalQuality.isGrainFed,
      isGrassFed: halalQuality.isGrassFed,
      isFrozen: halalQuality.isFrozen,
      isHalalCertified: halalQuality.isHalalCertified,
      halalCertNumber: halalQuality.halalCertNumber || undefined,
      halalCertBy: halalQuality.halalCertBy || undefined,
      halalCertExpiry: halalQuality.halalCertExpiry || undefined,
      otherCerts: halalQuality.otherCerts,
      farmName: origin.farmName || undefined,
      farmLocation: origin.farmLocation || undefined,
      slaughterhouseName: origin.slaughterhouseName || undefined,
      slaughterhouseLic: origin.slaughterhouseLic || undefined,
      countryOfOrigin: origin.countryOfOrigin || undefined,
      breed: origin.breed || undefined,
      storageTempMin: halalQuality.storageTempMin === '' ? undefined : Number(halalQuality.storageTempMin),
      storageTempMax: halalQuality.storageTempMax === '' ? undefined : Number(halalQuality.storageTempMax),
      shelfLifeDays: halalQuality.shelfLifeDays === '' ? undefined : Number(halalQuality.shelfLifeDays),
      packagingType: halalQuality.packagingType || undefined,
      packagingWeight: halalQuality.packagingWeight === '' ? undefined : Number(halalQuality.packagingWeight),
      batchNumber: origin.batchNumber || undefined,
      animalAge: origin.animalAge || undefined,
      animalSex: origin.animalSex || undefined,
      cuttingStyle: origin.cuttingStyle || undefined,
      cleaningLevel: origin.cleaningLevel || undefined,
      descriptionLong: origin.descriptionLong || undefined,
      cookingSuggestions: origin.cookingSuggestions || undefined,
      nutritionInfo: Object.keys(nutritionInfo).length > 0 ? nutritionInfo : undefined,
      isPopular: origin.isPopular,
      isFeatured: basic.isFeatured,
      isNewArrival: origin.isNewArrival,
      isOnSale: origin.isOnSale,
      imageUrls: basic.imageUrls,
    });
  } catch (e) {
    await rollback(e);
  }

  return {
    productId,
    profileId: profile.id,
    productName: product.name,
    isHalalCertified: halalQuality.isHalalCertified,
    certCount: halalQuality.otherCerts.length + (halalQuality.isHalalCertified ? 1 : 0),
    hasFarmInfo: !!origin.farmName || !!origin.farmLocation,
  };
}
