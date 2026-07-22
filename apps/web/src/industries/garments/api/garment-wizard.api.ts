import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi, type UpsertVariantPayload } from '@modules/inventory/products/api/product-variants.api';
import { garmentProductsApi } from './products.api';
import type { GarmentWizardDraft } from '../hooks/useGarmentWizard';

export interface GarmentWizardSaveResult {
  productId: string;
  productName: string;
  variantCount: number;
  uniqueSizes: number;
  uniqueColors: number;
  totalStock: number;
}

/**
 * Atomically create a garment product with:
 *   • Product (base entity)
 *   • Garment profile (industry-specific meta)
 *   • Variants (size × color with per-variant SKU/barcode/stock)
 *   • Variant profiles (garment-specific per-variant meta)
 */
export async function saveGarmentWizard(
  draft: GarmentWizardDraft,
): Promise<GarmentWizardSaveResult> {
  const { basic, hasVariants, variants, stock } = draft;

  const baselineStock = hasVariants
    ? variants.reduce((a, v) => a + Number(v.stock || 0), 0)
    : Number(stock.currentStock || 0);

  // ─── 1. CREATE PRODUCT ─────────────────────────────────
  const product = await productsApi.create({
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    brandId: basic.brandId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: basic.unit || 'pcs',
    price: Number(basic.salePrice || 0),
    costPrice: Number(basic.costPrice || 0),
    wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
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

  // ─── 2. CREATE GARMENT PROFILE ─────────────────────────
  try {
    await garmentProductsApi.upsert({
      productId,
      collectionId: basic.collectionId || undefined,
      sizeChartId: basic.sizeChartId || undefined,
      gender: basic.gender || undefined,
      categoryType: basic.categoryType || undefined,
      season: basic.season,
      fabricType: basic.fabricType || undefined,
      fabricBlend: basic.fabricBlend || undefined,
      workType: basic.workType,
      fitType: basic.fitType,
      neckline: basic.neckline || undefined,
      sleeveType: basic.sleeveType || undefined,
      sleeveLength: basic.sleeveLength || undefined,
      pattern: basic.pattern || undefined,
      careInstructions: basic.careInstructions || undefined,
      countryOfOrigin: basic.countryOfOrigin || undefined,
      manufacturer: basic.manufacturer || undefined,
      designer: basic.designer || undefined,
      styleCode: basic.styleCode || undefined,
      isReadyMade: basic.isReadyMade,
      isStitchable: basic.isStitchable,
      isFabricOnly: basic.isFabricOnly,
      allowAlteration: basic.allowAlteration,
      allowReservation: basic.allowReservation,
      allowLayaway: basic.allowLayaway,
      minAlterationDays: basic.minAlterationDays === '' ? undefined : Number(basic.minAlterationDays),
      defaultStitchingDays: basic.defaultStitchingDays === '' ? undefined : Number(basic.defaultStitchingDays),
      isNewArrival: basic.isNewArrival,
      isBestSeller: basic.isBestSeller,
      isOnSale: basic.isOnSale,
      isFeatured: basic.isFeatured,
    });
  } catch (e) {
    await rollback(e);
  }

  // ─── 3. CREATE VARIANTS ────────────────────────────────
  let createdVariants: any[] = [];
  if (hasVariants && variants.length > 0) {
    const baseSku = basic.sku.trim();
    const variantPayloads: UpsertVariantPayload[] = variants.map((v, i) => ({
      name: [v.size, v.colorName].filter(Boolean).join(' / ') || `Variant ${i + 1}`,
      sku: v.skuSuffix?.trim() ? (baseSku ? `${baseSku}-${v.skuSuffix.trim()}` : v.skuSuffix.trim()) : undefined,
      barcode: v.barcode?.trim() || undefined,
      unit: basic.unit || 'pcs',
      price: v.priceOverride ?? Number(basic.salePrice || 0),
      costPrice: v.costOverride ?? Number(basic.costPrice || 0),
      stock: Number(v.stock || 0),
      lowStockAlert: Number(v.lowStockAlert || 5),
      imageUrl: v.imageUrl || undefined,
      size: v.size || undefined,
      colorHex: v.colorHex || undefined,
      isActive: true,
      sortOrder: i,
    }));

    try {
      createdVariants = await productVariantsApi.bulkCreate(productId, variantPayloads);
    } catch (e) {
      await rollback(e);
    }

    // ─── 4. VARIANT PROFILES (per-variant garment meta) ──
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const created = createdVariants[i];
      if (!created) continue;
      try {
        await garmentProductsApi.upsertVariant({
          productId,
          variantId: created.id,
          size: v.size || undefined,
          colorName: v.colorName || undefined,
          colorHex: v.colorHex || undefined,
          colorFamily: v.colorFamily || undefined,
          skuSuffix: v.skuSuffix || undefined,
          barcode: v.barcode || undefined,
          chest: v.chest,
          waist: v.waist,
          hip: v.hip,
          shoulder: v.shoulder,
          length: v.length,
          sleeveLength: v.sleeveLength,
          inseam: v.inseam,
          displayOrder: i,
          isFeaturedColor: v.isFeaturedColor,
          isAvailable: true,
        });
      } catch {
        // Non-fatal — variant exists, just missing profile
      }
    }
  }

  const uniqueSizes = new Set(variants.map((v) => v.size).filter(Boolean)).size;
  const uniqueColors = new Set(variants.map((v) => v.colorName.toLowerCase()).filter(Boolean)).size;

  return {
    productId,
    productName: product.name,
    variantCount: createdVariants.length,
    uniqueSizes,
    uniqueColors,
    totalStock: baselineStock,
  };
}
