import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi, type UpsertVariantPayload } from '@modules/inventory/products/api/product-variants.api';
import { toyProductsApi } from './products.api';
import type { ToyWizardDraft } from '../hooks/useToyWizard';

export interface ToyWizardSaveResult {
  productId: string;
  productName: string;
  profileCreated: boolean;
  variantCount: number;
  totalStock: number;
}

export async function saveToyWizard(draft: ToyWizardDraft): Promise<ToyWizardSaveResult> {
  const { basic, details, safety, hasVariants, variants, stock } = draft;

  const baselineStock = hasVariants
    ? variants.reduce((a, v) => a + Number(v.stock || 0), 0)
    : Number(stock.currentStock || 0);

  const product = await productsApi.create({
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: 'pcs',
    price: Number(basic.retailPrice || 0),
    costPrice: Number(basic.costPrice || 0),
    taxRate: Number(basic.taxRate || 0),
    stock: baselineStock,
    lowStockAlert: Number(stock.lowStockAlert || 5),
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

  let profileCreated = false;
  try {
    await toyProductsApi.upsert({
      productId,
      categoryType: basic.categoryType as any,
      ageGroup: basic.ageGroup as any,
      ageGroups: basic.ageGroups as any,
      ageMinYears: basic.ageMinYears === '' ? undefined : Number(basic.ageMinYears),
      ageMaxYears: basic.ageMaxYears === '' ? undefined : Number(basic.ageMaxYears),
      genderTarget: basic.genderTarget as any,

      brand: basic.brand || undefined,
      characterFranchise: basic.characterFranchise || undefined,
      themeCategory: basic.themeCategory || undefined,

      isEducational: details.isEducational,
      learningAreas: details.learningAreas,
      developmentSkills: details.developmentSkills,
      cognitiveCategory: details.cognitiveCategory || undefined,

      material: details.material || undefined,
      materialsUsed: details.materialsUsed,
      colorName: details.colorName || undefined,
      colorHex: details.colorHex || undefined,
      size: details.size || undefined,
      dimensions: details.dimensions || undefined,
      weightGrams: details.weightGrams === '' ? undefined : Number(details.weightGrams),
      numberOfPieces: details.numberOfPieces === '' ? undefined : Number(details.numberOfPieces),

      requiresBatteries: details.requiresBatteries,
      batteriesIncluded: details.batteriesIncluded,
      batteryType: details.batteryType || undefined,
      batteryQuantity: details.batteryQuantity === '' ? undefined : Number(details.batteryQuantity),

      isRemoteControlled: details.isRemoteControlled,
      rcRange: details.rcRange || undefined,
      rcChargingTime: details.rcChargingTime || undefined,
      rcRunTime: details.rcRunTime || undefined,
      rcFrequency: details.rcFrequency || undefined,

      safetyCertifications: safety.safetyCertifications as any,
      safetyWarnings: safety.safetyWarnings,
      chokingHazard: safety.chokingHazard,
      smallPartsWarning: safety.smallPartsWarning,
      isNonToxic: safety.isNonToxic,
      isBpaFree: safety.isBpaFree,
      isPhthalateFree: safety.isPhthalateFree,

      playerCount: details.playerCount || undefined,
      playDurationMinutes: details.playDurationMinutes === '' ? undefined : Number(details.playDurationMinutes),
      isMultiplayer: details.isMultiplayer,
      hasSound: details.hasSound,
      hasLights: details.hasLights,
      hasMotor: details.hasMotor,
      isCollectible: details.isCollectible,

      languagesSupported: details.languagesSupported,
      isMontessoriApproved: details.isMontessoriApproved,
      isWaldorfApproved: details.isWaldorfApproved,

      mrp: basic.mrp === '' ? undefined : Number(basic.mrp),
      costPrice: Number(basic.costPrice || 0),
      retailPrice: Number(basic.retailPrice || 0),
      discountedPrice: basic.discountedPrice === '' ? undefined : Number(basic.discountedPrice),

      isFeatured: basic.isFeatured,
      isBestSeller: basic.isBestSeller,
      isNewArrival: basic.isNewArrival,
      isTrending: basic.isTrending,
      isBirthdayGift: basic.isBirthdayGift,
      isEidGift: basic.isEidGift,
      isChristmasGift: basic.isChristmasGift,

      warrantyMonths: basic.warrantyMonths === '' ? undefined : Number(basic.warrantyMonths),
      hasReplacementParts: details.hasReplacementParts,
      giftWrapAvailable: basic.giftWrapAvailable,
      giftMessageAvailable: basic.giftMessageAvailable,

      videoUrl: details.videoUrl || undefined,
      instructionUrl: details.instructionUrl || undefined,
      notes: basic.notes || undefined,
    });
    profileCreated = true;
  } catch (e) {
    await rollback(e);
  }

  let createdVariants: any[] = [];
  if (hasVariants && variants.length > 0) {
    const payloads: UpsertVariantPayload[] = variants.map((v, i) => ({
      name: v.name.trim(),
      sku: v.sku?.trim() || undefined,
      barcode: v.barcode?.trim() || undefined,
      unit: 'pcs',
      price: v.priceOverride ?? Number(basic.retailPrice || 0),
      costPrice: v.costOverride ?? Number(basic.costPrice || 0),
      stock: Number(v.stock || 0),
      lowStockAlert: Number(v.lowStockAlert || 5),
      imageUrl: v.imageUrl || undefined,
      isActive: v.isActive,
      sortOrder: i,
    }));
    try {
      createdVariants = await productVariantsApi.bulkCreate(productId, payloads);
    } catch (e) {
      await rollback(e);
    }
  }

  return {
    productId,
    productName: product.name,
    profileCreated,
    variantCount: createdVariants.length,
    totalStock: baselineStock,
  };
}
