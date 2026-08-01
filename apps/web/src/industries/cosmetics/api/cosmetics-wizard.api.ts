import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi, type UpsertVariantPayload } from '@modules/inventory/products/api/product-variants.api';
import { cosmeticsProductsApi } from './products.api';
import { cosmeticsBatchesApi } from './batches.api';
import type { CosmeticsWizardDraft } from '../hooks/useCosmeticsWizard';

export interface CosmeticsWizardSaveResult {
  productId: string;
  productName: string;
  profileCreated: boolean;
  variantCount: number;
  batchCount: number;
  totalStock: number;
}

export async function saveCosmeticsWizard(draft: CosmeticsWizardDraft): Promise<CosmeticsWizardSaveResult> {
  const { basic, ingredients, fragrance, certifications, batch, hasVariants, variants, stock } = draft;

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
    lowStockAlert: Number(stock.lowStockAlert || 3),
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
    await cosmeticsProductsApi.upsert({
      productId,
      brandId: basic.brandId || undefined,
      categoryType: basic.categoryType as any,
      shadeName: basic.shadeName || undefined,
      shadeCode: basic.shadeCode || undefined,
      shadeHex: basic.shadeHex || undefined,
      finish: basic.finish as any,
      skinType: ingredients.skinType as any,
      skinTone: ingredients.skinTone as any,
      skinConcerns: ingredients.skinConcerns,
      sizeMl: ingredients.sizeMl === '' ? undefined : Number(ingredients.sizeMl),
      sizeGrams: ingredients.sizeGrams === '' ? undefined : Number(ingredients.sizeGrams),
      sizeDisplay: ingredients.sizeDisplay || undefined,
      keyIngredients: ingredients.keyIngredients,
      fullIngredients: ingredients.fullIngredients || undefined,
      spfRating: ingredients.spfRating || undefined,
      isCrueltyFree: certifications.isCrueltyFree,
      isVegan: certifications.isVegan,
      isOrganic: certifications.isOrganic,
      isHypoallergenic: certifications.isHypoallergenic,
      isFragranceFree: certifications.isFragranceFree,
      isSulfateFree: certifications.isSulfateFree,
      isParabenFree: certifications.isParabenFree,
      isNoncomedogenic: certifications.isNoncomedogenic,
      isHalalCertified: certifications.isHalalCertified,
      isDermatologistTested: certifications.isDermatologistTested,
      fragranceFamily: fragrance.fragranceFamily || undefined,
      topNotes: fragrance.topNotes,
      middleNotes: fragrance.middleNotes,
      baseNotes: fragrance.baseNotes,
      longevityHours: fragrance.longevityHours || undefined,
      sillage: fragrance.sillage || undefined,
      season: fragrance.season,
      occasion: fragrance.occasion,
      howToUse: ingredients.howToUse || undefined,
      benefits: ingredients.benefits,
      warnings: ingredients.warnings || undefined,
      requiresBatchTracking: batch.requiresBatchTracking,
      shelfLifeMonths: batch.shelfLifeMonths === '' ? undefined : Number(batch.shelfLifeMonths),
      mrp: basic.mrp === '' ? undefined : Number(basic.mrp),
      costPrice: Number(basic.costPrice || 0),
      wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
      retailPrice: Number(basic.retailPrice || 0),
      isFeatured: basic.isFeatured,
      isBestSeller: basic.isBestSeller,
      isNewArrival: basic.isNewArrival,
      isLimitedEdition: basic.isLimitedEdition,
      isViral: basic.isViral,
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
      lowStockAlert: Number(v.lowStockAlert || 3),
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

  let batchCount = 0;
  if (batch.requiresBatchTracking && batch.initialBatchNumber?.trim() && baselineStock > 0) {
    try {
      await cosmeticsBatchesApi.create({
        productId,
        batchNumber: batch.initialBatchNumber.trim(),
        manufactureDate: batch.manufactureDate || undefined,
        expiryDate: batch.expiryDate || undefined,
        quantity: baselineStock,
        costPrice: Number(basic.costPrice || 0),
        supplierRef: batch.supplierRef || undefined,
      });
      batchCount = 1;
    } catch {}
  }

  return {
    productId,
    productName: product.name,
    profileCreated,
    variantCount: createdVariants.length,
    batchCount,
    totalStock: baselineStock,
  };
}
