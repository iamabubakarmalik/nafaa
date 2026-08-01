import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi, type UpsertVariantPayload } from '@modules/inventory/products/api/product-variants.api';
import { furnitureProductsApi } from './products.api';
import type { FurnitureWizardDraft } from '../hooks/useFurnitureWizard';

export interface FurnitureWizardSaveResult {
  productId: string;
  productName: string;
  profileCreated: boolean;
  variantCount: number;
  totalStock: number;
}

export async function saveFurnitureWizard(draft: FurnitureWizardDraft): Promise<FurnitureWizardSaveResult> {
  const { basic, dimensions, materials, delivery, hasVariants, variants, stock } = draft;

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
    wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
    taxRate: Number(basic.taxRate || 0),
    stock: baselineStock,
    lowStockAlert: Number(stock.lowStockAlert || 2),
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
    await furnitureProductsApi.upsert({
      productId,
      categoryType: basic.categoryType as any,
      conditionType: basic.conditionType as any,
      primaryMaterial: materials.primaryMaterial as any,
      secondaryMaterials: materials.secondaryMaterials as any,
      modelNumber: basic.modelNumber || undefined,
      collectionName: basic.collectionName || undefined,
      designerName: basic.designerName || undefined,
      countryOfOrigin: basic.countryOfOrigin || undefined,
      brand: basic.brand || undefined,

      lengthCm: dimensions.lengthCm === '' ? undefined : Number(dimensions.lengthCm),
      widthCm: dimensions.widthCm === '' ? undefined : Number(dimensions.widthCm),
      heightCm: dimensions.heightCm === '' ? undefined : Number(dimensions.heightCm),
      depthCm: dimensions.depthCm === '' ? undefined : Number(dimensions.depthCm),
      seatHeightCm: dimensions.seatHeightCm === '' ? undefined : Number(dimensions.seatHeightCm),
      weightKg: dimensions.weightKg === '' ? undefined : Number(dimensions.weightKg),

      seatingCapacity: dimensions.seatingCapacity === '' ? undefined : Number(dimensions.seatingCapacity),
      storageCompartments: dimensions.storageCompartments === '' ? undefined : Number(dimensions.storageCompartments),
      drawersCount: dimensions.drawersCount === '' ? undefined : Number(dimensions.drawersCount),
      shelvesCount: dimensions.shelvesCount === '' ? undefined : Number(dimensions.shelvesCount),

      woodType: materials.woodType || undefined,
      woodFinish: materials.woodFinish || undefined,
      polishType: materials.polishType || undefined,
      colorName: materials.colorName || undefined,
      colorHex: materials.colorHex || undefined,
      upholsteryFabric: materials.upholsteryFabric || undefined,
      cushionFilling: materials.cushionFilling || undefined,
      cushionDensity: materials.cushionDensity || undefined,

      requiresAssembly: delivery.requiresAssembly,
      assemblyTimeMinutes: delivery.assemblyTimeMinutes === '' ? undefined : Number(delivery.assemblyTimeMinutes),
      assemblyPartsCount: delivery.assemblyPartsCount === '' ? undefined : Number(delivery.assemblyPartsCount),
      assemblyToolsIncluded: delivery.assemblyToolsIncluded,
      assemblyChargeExtra: delivery.assemblyChargeExtra === '' ? undefined : Number(delivery.assemblyChargeExtra),

      isCustomizable: delivery.isCustomizable,
      customLeadTimeDays: delivery.customLeadTimeDays === '' ? undefined : Number(delivery.customLeadTimeDays),

      warrantyMonths: Number(delivery.warrantyMonths || 12),
      warrantyType: delivery.warrantyType || undefined,
      careInstructions: delivery.careInstructions || undefined,
      isWaterResistant: delivery.isWaterResistant,
      isTermiteProof: delivery.isTermiteProof,

      requiresLargeVehicle: delivery.requiresLargeVehicle,
      requiresMultipleHelpers: delivery.requiresMultipleHelpers,
      helpersNeeded: Number(delivery.helpersNeeded || 2),
      deliveryChargeBase: delivery.deliveryChargeBase === '' ? undefined : Number(delivery.deliveryChargeBase),
      freeDeliveryRadius: delivery.freeDeliveryRadius === '' ? undefined : Number(delivery.freeDeliveryRadius),

      mrp: basic.mrp === '' ? undefined : Number(basic.mrp),
      costPrice: Number(basic.costPrice || 0),
      wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
      retailPrice: Number(basic.retailPrice || 0),
      discountedPrice: basic.discountedPrice === '' ? undefined : Number(basic.discountedPrice),
      emiStartingFrom: basic.emiStartingFrom === '' ? undefined : Number(basic.emiStartingFrom),

      isFeatured: basic.isFeatured,
      isBestSeller: basic.isBestSeller,
      isNewArrival: basic.isNewArrival,
      isCustomMade: basic.isCustomMade,
      isEcoFriendly: basic.isEcoFriendly,

      showroomLocation: basic.showroomLocation || undefined,
      showroomFloor: basic.showroomFloor || undefined,
      displayZone: basic.displayZone || undefined,

      images3d: basic.images3d,
      ar_model_url: basic.ar_model_url || undefined,
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
      lowStockAlert: Number(v.lowStockAlert || 2),
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
