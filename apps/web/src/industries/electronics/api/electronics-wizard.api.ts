import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi, type UpsertVariantPayload } from '@modules/inventory/products/api/product-variants.api';
import { electronicsProductsApi } from './products.api';
import { serialTrackingApi } from './serial-tracking.api';
import type { ElectronicsWizardDraft } from '../hooks/useElectronicsWizard';

export interface ElectronicsWizardSaveResult {
  productId: string;
  productName: string;
  profileCreated: boolean;
  variantCount: number;
  serialsCreated: number;
  totalStock: number;
}

export async function saveElectronicsWizard(
  draft: ElectronicsWizardDraft,
): Promise<ElectronicsWizardSaveResult> {
  const { basic, specs, warranty, hasVariants, variants, hasSerials, serials, stock } = draft;

  const baselineStock = hasVariants
    ? variants.reduce((a, v) => a + Number(v.stock || 0), 0)
    : hasSerials
      ? serials.length
      : Number(stock.currentStock || 0);

  const product = await productsApi.create({
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    brandId: undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: 'pcs',
    price: Number(basic.retailPrice || 0),
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

  // Create Electronics profile
  let profileCreated = false;
  try {
    await electronicsProductsApi.upsert({
      productId,
      brandId: basic.electronicsBrandId || undefined,
      categoryType: basic.categoryType as any,
      conditionType: basic.conditionType as any,
      modelNumber: basic.modelNumber || undefined,
      partNumber: basic.partNumber || undefined,
      colorName: basic.colorName || undefined,
      colorHex: basic.colorHex || undefined,
      connectivity: specs.connectivity,
      powerRating: specs.powerRating || undefined,
      batteryCapacity: specs.batteryCapacity || undefined,
      batteryLifeHours: specs.batteryLifeHours ? Number(specs.batteryLifeHours) : undefined,
      chargingTimeMinutes: specs.chargingTimeMinutes ? Number(specs.chargingTimeMinutes) : undefined,
      operatingRange: specs.operatingRange || undefined,
      waterResistance: specs.waterResistance || undefined,
      screenSize: specs.screenSize || undefined,
      resolution: specs.resolution || undefined,
      refreshRate: specs.refreshRate || undefined,
      compatibleWith: specs.compatibleWith,
      compatibleOS: specs.compatibleOS,
      weightGrams: specs.weightGrams ? Number(specs.weightGrams) : undefined,
      warrantyMonths: warranty.warrantyMonths ? Number(warranty.warrantyMonths) : undefined,
      warrantyType: warranty.warrantyType || undefined,
      hasInternationalWarranty: warranty.hasInternationalWarranty,
      requiresSerial: hasSerials,
      hasImei: warranty.hasImei,
      boxContents: warranty.boxContents,
      hasManual: warranty.hasManual,
      hasWarrantyCard: warranty.hasWarrantyCard,
      mrp: basic.mrp === '' ? undefined : Number(basic.mrp),
      costPrice: Number(basic.costPrice || 0),
      wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
      retailPrice: Number(basic.retailPrice || 0),
      isFeatured: basic.isFeatured,
      isBestSeller: basic.isBestSeller,
      isNewArrival: basic.isNewArrival,
      isTrending: basic.isTrending,
    });
    profileCreated = true;
  } catch (e) {
    await rollback(e);
  }

  // Variants (color options for phones etc.)
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
      lowStockAlert: Number(v.lowStockAlert || 5),
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

  // Serial numbers (IMEI/S/N tracking)
  let serialsCreated = 0;
  if (hasSerials && serials.length > 0) {
    const serialNumbers = serials.map((s) => s.serialNumber).filter(Boolean);
    if (serialNumbers.length > 0) {
      try {
        const result = await serialTrackingApi.bulkCreate({
          productId,
          serialNumbers,
          purchasePrice: Number(basic.costPrice || 0),
          warrantyStartDate: warranty.warrantyStartDate,
          warrantyEndDate: warranty.warrantyEndDate,
        });
        serialsCreated = result.created;

        // Update individual serials with IMEI/MAC if provided
        for (const s of serials) {
          if (s.imei || s.imei2 || s.macAddress) {
            try {
              const list = await serialTrackingApi.list({ productId, search: s.serialNumber });
              const found = list.find((x) => x.serialNumber === s.serialNumber);
              if (found) {
                await serialTrackingApi.update(found.id, {
                  imei: s.imei || undefined,
                  imei2: s.imei2 || undefined,
                  macAddress: s.macAddress || undefined,
                });
              }
            } catch {}
          }
        }
      } catch (e) {
        await rollback(e);
      }
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
