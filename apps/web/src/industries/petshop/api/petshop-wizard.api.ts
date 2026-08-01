import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi, type UpsertVariantPayload } from '@modules/inventory/products/api/product-variants.api';
import { petProductsApi } from './products.api';
import type { PetshopWizardDraft } from '../hooks/usePetshopWizard';

export interface PetshopWizardSaveResult {
  productId: string;
  productName: string;
  profileCreated: boolean;
  variantCount: number;
  totalStock: number;
}

export async function savePetshopWizard(draft: PetshopWizardDraft): Promise<PetshopWizardSaveResult> {
  const { basic, details, medicine, hasVariants, variants, stock } = draft;

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
    await petProductsApi.upsert({
      productId,
      categoryType: basic.categoryType as any,
      species: basic.species as any,
      lifeStage: basic.lifeStage as any,
      brand: basic.brand || undefined,
      breedSpecific: basic.breedSpecific || undefined,

      weightGrams: details.weightGrams === '' ? undefined : Number(details.weightGrams),
      weightKg: details.weightKg === '' ? undefined : Number(details.weightKg),
      packSize: details.packSize || undefined,
      flavor: details.flavor || undefined,
      proteinSource: details.proteinSource || undefined,
      proteinPct: details.proteinPct === '' ? undefined : Number(details.proteinPct),
      fatPct: details.fatPct === '' ? undefined : Number(details.fatPct),
      fiberPct: details.fiberPct === '' ? undefined : Number(details.fiberPct),
      moisturePct: details.moisturePct === '' ? undefined : Number(details.moisturePct),
      ingredients: details.ingredients || undefined,
      isGrainFree: details.isGrainFree,
      isOrganic: details.isOrganic,
      isHypoallergenic: details.isHypoallergenic,
      benefits: details.benefits,
      suitedForBreedSizes: details.suitedForBreedSizes,
      suitedForAges: details.suitedForAges || undefined,

      size: details.size || undefined,
      dimensions: details.dimensions || undefined,
      color: details.color || undefined,
      material: details.material || undefined,

      tankCapacityLiters: details.tankCapacityLiters === '' ? undefined : Number(details.tankCapacityLiters),
      tankShape: details.tankShape || undefined,
      filterCapacity: details.filterCapacity || undefined,
      wattage: details.wattage || undefined,

      isPrescriptionOnly: medicine.isPrescriptionOnly,
      activeIngredient: medicine.activeIngredient || undefined,
      dosageForm: medicine.dosageForm || undefined,
      dosageStrength: medicine.dosageStrength || undefined,
      administrationRoute: medicine.administrationRoute || undefined,
      storageInstructions: medicine.storageInstructions || undefined,
      expiryDate: medicine.expiryDate || undefined,
      batchNumber: medicine.batchNumber || undefined,

      mrp: basic.mrp === '' ? undefined : Number(basic.mrp),
      costPrice: Number(basic.costPrice || 0),
      retailPrice: Number(basic.retailPrice || 0),
      discountedPrice: basic.discountedPrice === '' ? undefined : Number(basic.discountedPrice),

      isFeatured: basic.isFeatured,
      isBestSeller: basic.isBestSeller,
      isNewArrival: basic.isNewArrival,
      isOnSale: basic.isOnSale,

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
