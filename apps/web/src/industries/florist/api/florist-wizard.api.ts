import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi, type UpsertVariantPayload } from '@modules/inventory/products/api/product-variants.api';
import { floristProductsApi } from './products.api';
import type { FloristWizardDraft } from '../hooks/useFloristWizard';

export interface FloristWizardSaveResult {
  productId: string;
  productName: string;
  profileCreated: boolean;
  variantCount: number;
  totalStock: number;
}

export async function saveFloristWizard(draft: FloristWizardDraft): Promise<FloristWizardSaveResult> {
  const { basic, details, occasions, hasVariants, variants, stock } = draft;

  const baselineStock = hasVariants
    ? variants.reduce((a, v) => a + Number(v.stock || 0), 0)
    : Number(stock.currentStock || 0);

  const product = await productsApi.create({
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: basic.unit || 'pcs',
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
    await floristProductsApi.upsert({
      productId,
      categoryType: basic.categoryType as any,
      freshnessGrade: basic.freshnessGrade as any,
      flowerType: details.flowerType || undefined,
      color: details.color || undefined,
      colorHex: details.colorHex || undefined,
      stemLengthCm: details.stemLengthCm === '' ? undefined : Number(details.stemLengthCm),
      isImported: details.isImported,
      origin: details.origin || undefined,
      season: details.season,
      arrivalDate: details.arrivalDate || undefined,
      freshUntil: details.freshUntil || undefined,
      daysToWither: details.daysToWither === '' ? undefined : Number(details.daysToWither),
      isPreArranged: details.isPreArranged,
      bouquetSize: details.bouquetSize || undefined,
      stemCount: details.stemCount === '' ? undefined : Number(details.stemCount),
      wrapType: details.wrapType || undefined,
      ribbonColor: details.ribbonColor || undefined,
      hasVase: details.hasVase,
      occasions: occasions.occasions,
      meaning: occasions.meaning || undefined,
      careInstructions: occasions.careInstructions || undefined,
      isCustomizable: occasions.isCustomizable,
      customizationOptions: occasions.customizationOptions,
      minLeadTimeHours: occasions.minLeadTimeHours === '' ? undefined : Number(occasions.minLeadTimeHours),
      mrp: basic.mrp === '' ? undefined : Number(basic.mrp),
      costPrice: Number(basic.costPrice || 0),
      wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
      retailPrice: Number(basic.retailPrice || 0),
      weddingPrice: basic.weddingPrice === '' ? undefined : Number(basic.weddingPrice),
      isFeatured: basic.isFeatured,
      isBestSeller: basic.isBestSeller,
      isSeasonalSpecial: basic.isSeasonalSpecial,
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
      unit: basic.unit || 'pcs',
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
