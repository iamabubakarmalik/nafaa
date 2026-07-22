import { productsApi } from '@modules/inventory/products/api/products.api';
import { partProfilesApi } from './part-profiles.api';
import type { AutoPartsWizardDraft } from '../hooks/useAutoPartsWizard';

export interface AutoPartsWizardSaveResult {
  productId: string;
  partProfileId: string;
  productName: string;
  alternateNumberCount: number;
  fitmentCount: number;
  isUniversal: boolean;
}

/**
 * Atomically create an auto part with:
 *   • Product (base entity)
 *   • Part profile (auto-parts-specific meta)
 *   • Vehicle compatibility/fitments
 *
 * Rollback: deletes the product if any subsequent step fails.
 */
export async function saveAutoPartsWizard(
  draft: AutoPartsWizardDraft,
): Promise<AutoPartsWizardSaveResult> {
  const { basic, details, compatibility } = draft;

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
    stock: Number(basic.stock || 0),
    lowStockAlert: Number(basic.lowStockAlert || 5),
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

  // ─── 2. CREATE PART PROFILE ────────────────────────────
  let partProfile: any;

  // Build compatibility JSON
  const compatibilityData: any = {
    isUniversal: compatibility.isUniversal,
    fitments: compatibility.fitments.map((f) => ({
      makeId: f.makeId,
      makeName: f.makeName,
      modelId: f.modelId,
      modelName: f.modelName,
      yearFrom: f.yearFrom ? Number(f.yearFrom) : null,
      yearTo: f.yearTo ? Number(f.yearTo) : null,
      engineOptions: f.engineOptions,
      notes: f.notes || undefined,
    })),
  };

  try {
    partProfile = await partProfilesApi.upsert({
      productId,
      partNumber: details.partNumber.trim() || undefined,
      oemNumber: details.oemNumber.trim() || undefined,
      alternateNumbers: details.alternateNumbers,
      category: basic.partCategory,
      subCategory: basic.subCategory.trim() || undefined,
      condition: details.condition,
      brand: details.brand.trim() || undefined,
      countryOfOrigin: details.countryOfOrigin.trim() || undefined,
      manufacturer: details.manufacturer.trim() || undefined,
      weightGrams: details.weightGrams ? Number(details.weightGrams) : undefined,
      dimensions: details.dimensions.trim() || undefined,
      color: details.color.trim() || undefined,
      material: details.material.trim() || undefined,
      warrantyMonths: Number(details.warrantyMonths || 0),
      warrantyKm: details.warrantyKm ? Number(details.warrantyKm) : undefined,
      warrantyNotes: details.warrantyNotes.trim() || undefined,
      installationMinutes: details.installationMinutes ? Number(details.installationMinutes) : undefined,
      installationDifficulty: details.installationDifficulty || undefined,
      requiresSpecialTool: details.requiresSpecialTool,
      minStockAlert: Number(details.minStockAlert || 5),
      isFastMoving: details.isFastMoving,
      isCritical: details.isCritical,
      compatibility: compatibility.hasFitment ? compatibilityData : undefined,
    });
  } catch (e) {
    await rollback(e);
  }

  return {
    productId,
    partProfileId: partProfile.id,
    productName: product.name,
    alternateNumberCount: details.alternateNumbers.length,
    fitmentCount: compatibility.fitments.length,
    isUniversal: compatibility.isUniversal,
  };
}
