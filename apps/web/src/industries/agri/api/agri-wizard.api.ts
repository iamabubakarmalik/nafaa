import { productsApi } from '@modules/inventory/products/api/products.api';
import { agriProductsApi } from './products.api';
import type { AgriWizardDraft } from '../hooks/useAgriWizard';

export interface AgriWizardSaveResult {
  productId: string;
  profileId: string;
  productName: string;
  agriCategory: string;
  targetCropCount: number;
  isOrganic: boolean;
  isRestricted: boolean;
}

/**
 * Atomically create an agri product with:
 *   • Base product entity
 *   • Agri product profile (specs, certs, targets, safety)
 *
 * Rollback: deletes the product if profile creation fails.
 */
export async function saveAgriWizard(
  draft: AgriWizardDraft,
): Promise<AgriWizardSaveResult> {
  const { basic, profile, safety } = draft;

  // ─── 1. CREATE PRODUCT ─────────────────────────────────
  const product = await productsApi.create({
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    brandId: basic.brandId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: basic.baseUnit || 'bag',
    price: Number(basic.salePrice || 0),
    costPrice: Number(basic.costPrice || 0),
    wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
    taxRate: Number(basic.taxRate || 0),
    stock: Number(safety.currentStock || 0),
    lowStockAlert: Number(safety.minStockAlert || 5),
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

  // ─── 2. CREATE AGRI PROFILE ────────────────────────────
  let agriProfile: any;
  try {
    agriProfile = await agriProductsApi.upsert({
      productId,
      category: basic.agriCategory,
      subCategory: basic.subCategory || undefined,
      seedType: basic.seedType || undefined,
      fertilizerType: basic.fertilizerType || undefined,
      feedType: basic.feedType || undefined,
      brand: profile.brand || undefined,
      manufacturer: profile.manufacturer || undefined,
      countryOfOrigin: profile.countryOfOrigin || undefined,
      npkRatio: profile.npkRatio || undefined,
      activeIngredient: profile.activeIngredient || undefined,
      concentration: profile.concentration || undefined,
      packSize: profile.packSize || undefined,
      packUnit: profile.packUnit || undefined,
      bagsPerTon: profile.bagsPerTon ? Number(profile.bagsPerTon) : undefined,
      applicationRate: profile.applicationRate || undefined,
      applicationMethod: profile.applicationMethod || undefined,
      applicationInterval: profile.applicationInterval || undefined,
      targetCrops: profile.targetCrops,
      targetPests: profile.targetPests,
      targetAnimals: profile.targetAnimals,
      season: profile.season || undefined,
      suitableFor: profile.suitableFor,
      cropStage: profile.cropStage || undefined,
      toxicityLevel: safety.toxicityLevel || undefined,
      ppePeriod: safety.ppePeriod ? Number(safety.ppePeriod) : undefined,
      reEntryPeriod: safety.reEntryPeriod ? Number(safety.reEntryPeriod) : undefined,
      warningLabel: safety.warningLabel || undefined,
      hazardClass: safety.hazardClass || undefined,
      isOrganic: profile.isOrganic,
      organicCertNumber: profile.isOrganic ? (profile.organicCertNumber || undefined) : undefined,
      govtRegNumber: profile.govtRegNumber || undefined,
      govtRegExpiry: profile.govtRegExpiry || undefined,
      shelfLifeMonths: profile.shelfLifeMonths ? Number(profile.shelfLifeMonths) : undefined,
      storageTemp: profile.storageTemp || undefined,
      storageInstructions: profile.storageInstructions || undefined,
      reorderLevel: safety.reorderLevel ? Number(safety.reorderLevel) : undefined,
      minStockAlert: safety.minStockAlert ? Number(safety.minStockAlert) : undefined,
      bulkDiscountThreshold: safety.bulkDiscountThreshold ? Number(safety.bulkDiscountThreshold) : undefined,
      bulkDiscountPct: safety.bulkDiscountPct ? Number(safety.bulkDiscountPct) : undefined,
      isRestricted: safety.isRestricted,
      requiresLicense: safety.requiresLicense,
      isPopular: safety.isPopular,
      isBestSeller: safety.isBestSeller,
      isSeasonal: safety.isSeasonal,
      isFeatured: basic.isFeatured,
      descriptionLong: profile.descriptionLong || undefined,
      usageInstructions: profile.usageInstructions || undefined,
      precautions: safety.precautions || undefined,
      firstAid: safety.firstAid || undefined,
      msdsUrl: safety.msdsUrl || undefined,
      imageUrls: basic.imageUrls,
    });
  } catch (e) {
    await rollback(e);
  }

  return {
    productId,
    profileId: agriProfile.id,
    productName: product.name,
    agriCategory: basic.agriCategory,
    targetCropCount: profile.targetCrops.length,
    isOrganic: profile.isOrganic,
    isRestricted: safety.isRestricted,
  };
}
