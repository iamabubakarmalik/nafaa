import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi, type UpsertVariantPayload } from '@modules/inventory/products/api/product-variants.api';
import { opticalProductsApi } from './products.api';
import type { OpticalWizardDraft } from '../hooks/useOpticalWizard';

export interface OpticalWizardSaveResult {
  productId: string;
  productName: string;
  profileCreated: boolean;
  variantCount: number;
  totalStock: number;
}

export async function saveOpticalWizard(draft: OpticalWizardDraft): Promise<OpticalWizardSaveResult> {
  const { basic, frame, lens, contactLens, warranty, hasVariants, variants, stock } = draft;

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
    await opticalProductsApi.upsert({
      productId,
      categoryType: basic.categoryType as any,
      frameShape: frame.frameShape as any,
      frameMaterial: frame.frameMaterial as any,
      gender: basic.gender as any,
      brand: basic.brand || undefined,
      modelNumber: basic.modelNumber || undefined,
      collectionName: basic.collectionName || undefined,
      frameSizeMm: frame.frameSizeMm === '' ? undefined : Number(frame.frameSizeMm),
      bridgeSizeMm: frame.bridgeSizeMm === '' ? undefined : Number(frame.bridgeSizeMm),
      templeLengthMm: frame.templeLengthMm === '' ? undefined : Number(frame.templeLengthMm),
      lensWidthMm: frame.lensWidthMm === '' ? undefined : Number(frame.lensWidthMm),
      lensHeightMm: frame.lensHeightMm === '' ? undefined : Number(frame.lensHeightMm),
      frameWeightG: frame.frameWeightG === '' ? undefined : Number(frame.frameWeightG),
      colorName: frame.colorName || undefined,
      colorHex: frame.colorHex || undefined,
      frameColorOptions: frame.frameColorOptions,
      lensType: lens.lensType || undefined,
      lensMaterial: lens.lensMaterial || undefined,
      lensIndex: lens.lensIndex || undefined,
      lensCoatings: lens.lensCoatings,
      hasBlueCut: lens.hasBlueCut,
      hasAntiGlare: lens.hasAntiGlare,
      hasUvProtection: lens.hasUvProtection,
      isPolarized: lens.isPolarized,
      isPhotochromic: lens.isPhotochromic,
      isContactLens: contactLens.isContactLens,
      clDuration: contactLens.clDuration || undefined,
      clWaterContent: contactLens.clWaterContent || undefined,
      clBaseCurve: contactLens.clBaseCurve || undefined,
      clDiameter: contactLens.clDiameter || undefined,
      clUvProtection: contactLens.clUvProtection,
      clForAstigmatism: contactLens.clForAstigmatism,
      supportsMinSph: lens.supportsMinSph === '' ? undefined : Number(lens.supportsMinSph),
      supportsMaxSph: lens.supportsMaxSph === '' ? undefined : Number(lens.supportsMaxSph),
      supportsMinCyl: lens.supportsMinCyl === '' ? undefined : Number(lens.supportsMinCyl),
      supportsMaxCyl: lens.supportsMaxCyl === '' ? undefined : Number(lens.supportsMaxCyl),
      supportsProgressive: lens.supportsProgressive,
      warrantyMonths: warranty.warrantyMonths === '' ? undefined : Number(warranty.warrantyMonths),
      warrantyType: warranty.warrantyType || undefined,
      mrp: basic.mrp === '' ? undefined : Number(basic.mrp),
      costPrice: Number(basic.costPrice || 0),
      retailPrice: Number(basic.retailPrice || 0),
      discountedPrice: basic.discountedPrice === '' ? undefined : Number(basic.discountedPrice),
      isFeatured: basic.isFeatured,
      isBestSeller: basic.isBestSeller,
      isNewArrival: basic.isNewArrival,
      isDesigner: basic.isDesigner,
      tryOnUrl: basic.tryOnUrl || undefined,
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

  return {
    productId,
    productName: product.name,
    profileCreated,
    variantCount: createdVariants.length,
    totalStock: baselineStock,
  };
}
