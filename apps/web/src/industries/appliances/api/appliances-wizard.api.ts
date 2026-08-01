import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi, type UpsertVariantPayload } from '@modules/inventory/products/api/product-variants.api';
import { applianceProductsApi } from './products.api';
import { applianceSerialApi } from './serial-tracking.api';
import type { ApplianceWizardDraft } from '../hooks/useApplianceWizard';

export interface ApplianceWizardSaveResult {
  productId: string;
  productName: string;
  profileCreated: boolean;
  variantCount: number;
  serialsCreated: number;
  totalStock: number;
}

export async function saveApplianceWizard(
  draft: ApplianceWizardDraft,
): Promise<ApplianceWizardSaveResult> {
  const { basic, specs, warranty, installation, hasVariants, variants, hasSerials, serials, stock } = draft;

  const baselineStock = hasVariants
    ? variants.reduce((a, v) => a + Number(v.stock || 0), 0)
    : hasSerials
      ? serials.length
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
    await applianceProductsApi.upsert({
      productId,
      brandId: basic.applianceBrandId || undefined,
      categoryType: basic.categoryType as any,
      modelNumber: basic.modelNumber || undefined,
      modelYear: basic.modelYear ? Number(basic.modelYear) : undefined,
      colorName: basic.colorName || undefined,
      colorHex: basic.colorHex || undefined,
      capacity: specs.capacity || undefined,
      powerConsumption: specs.powerConsumption || undefined,
      voltage: specs.voltage || undefined,
      frequency: specs.frequency || undefined,
      weightKg: specs.weightKg ? Number(specs.weightKg) : undefined,
      dimensions: specs.dimensions || undefined,
      energyRating: specs.energyRating as any,
      isEnergyStar: specs.isEnergyStar,
      isInverter: specs.isInverter,
      acTonnage: specs.acTonnage || undefined,
      acType: specs.acType || undefined,
      coolingCapacity: specs.coolingCapacity || undefined,
      refrigerantType: specs.refrigerantType || undefined,
      fridgeCapacityLiters: specs.fridgeCapacityLiters ? Number(specs.fridgeCapacityLiters) : undefined,
      refrigeratorType: specs.refrigeratorType || undefined,
      doorCount: specs.doorCount ? Number(specs.doorCount) : undefined,
      compressorType: specs.compressorType || undefined,
      washingCapacityKg: specs.washingCapacityKg ? Number(specs.washingCapacityKg) : undefined,
      washingType: specs.washingType || undefined,
      rpm: specs.rpm ? Number(specs.rpm) : undefined,
      screenSizeInch: specs.screenSizeInch ? Number(specs.screenSizeInch) : undefined,
      displayType: specs.displayType || undefined,
      resolution: specs.resolution || undefined,
      smartOS: specs.smartOS || undefined,
      features: specs.features,
      smartFeatures: specs.smartFeatures,
      safetyFeatures: specs.safetyFeatures,
      warrantyMonths: warranty.warrantyMonths ? Number(warranty.warrantyMonths) : 12,
      compressorWarrantyMonths: warranty.compressorWarrantyMonths ? Number(warranty.compressorWarrantyMonths) : undefined,
      motorWarrantyMonths: warranty.motorWarrantyMonths ? Number(warranty.motorWarrantyMonths) : undefined,
      warrantyType: warranty.warrantyType || undefined,
      boxContents: warranty.boxContents,
      requiresInstallation: installation.requiresInstallation,
      installationCharge: Number(installation.installationCharge || 0),
      installationCovered: installation.installationCovered,
      installationTimeHours: installation.installationTimeHours ? Number(installation.installationTimeHours) : undefined,
      requiresPlumbing: installation.requiresPlumbing,
      requiresGasConnection: installation.requiresGasConnection,
      requiresElectrician: installation.requiresElectrician,
      requiresLargeVehicle: installation.requiresLargeVehicle,
      freeDelivery: installation.freeDelivery,
      deliveryChargePerKm: installation.deliveryChargePerKm ? Number(installation.deliveryChargePerKm) : undefined,
      mrp: basic.mrp === '' ? undefined : Number(basic.mrp),
      costPrice: Number(basic.costPrice || 0),
      retailPrice: Number(basic.retailPrice || 0),
      wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
      emiStartingFrom: basic.emiStartingFrom === '' ? undefined : Number(basic.emiStartingFrom),
      cashDiscount: Number(basic.cashDiscount || 0),
      requiresSerial: hasSerials,
      isFeatured: basic.isFeatured,
      isBestSeller: basic.isBestSeller,
      isNewArrival: basic.isNewArrival,
    });
    profileCreated = true;
  } catch (e) {
    await rollback(e);
  }

  let createdVariants: any[] = [];
  if (hasVariants && variants.length > 0) {
    const variantPayloads: UpsertVariantPayload[] = variants.map((v, i) => ({
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
      createdVariants = await productVariantsApi.bulkCreate(productId, variantPayloads);
    } catch (e) {
      await rollback(e);
    }
  }

  let serialsCreated = 0;
  if (hasSerials && serials.length > 0) {
    for (const s of serials) {
      if (!s.serialNumber.trim()) continue;
      try {
        await applianceSerialApi.create({
          productId,
          serialNumber: s.serialNumber.trim(),
          modelNumber: s.modelNumber || undefined,
          batchNumber: s.batchNumber || undefined,
          manufactureDate: s.manufactureDate || undefined,
          purchasePrice: Number(basic.costPrice || 0),
          warrantyStartDate: warranty.warrantyStartDate || undefined,
          warrantyEndDate: warranty.warrantyEndDate || undefined,
          installationRequired: installation.requiresInstallation,
        });
        serialsCreated++;
      } catch {}
    }
  }

  return {
    productId,
    productName: product.name,
    profileCreated,
    variantCount: createdVariants.length,
    serialsCreated,
    totalStock: baselineStock,
  };
}
