import { productsApi } from '@/api/products.api';
import { productVariantsApi, type UpsertVariantPayload } from '@/api/product-variants.api';
import { imeiApi, type BulkImeiItem } from './imei.api';
import type { MobileWizardDraft } from '../hooks/useMobileWizard';
import { resolveVariantProductType } from '../hooks/useMobileWizard';

export interface MobileWizardSaveResult {
  productId: string;
  productName: string;
  variantCount: number;
  imeiCount: number;
  accessoryUnits: number;
}

/**
 * Atomically create a mobile product with:
 *   • Variants (with per-variant price + SKU overrides + accessory stock baked into variant.stock)
 *   • IMEIs (bulk per variant, PTA + warranty)
 *
 * Rollback: deletes the product if any subsequent step fails.
 */
export async function saveMobileWizard(
  draft: MobileWizardDraft,
): Promise<MobileWizardSaveResult> {
  const { basic, hasVariants, variants, imeiLines, accessoryStock } = draft;

  // ─── 1. CREATE PRODUCT ─────────────────────────────────
  const product = await productsApi.create({
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    brandId: basic.brandId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: 'pcs',
    price: Number(basic.salePrice || 0),
    costPrice: Number(basic.costPrice || 0),
    wholesalePrice:
      basic.wholesalePrice === '' || basic.wholesalePrice === undefined
        ? undefined
        : Number(basic.wholesalePrice),
    taxRate: Number(basic.taxRate || 0),
    stock: 0,
    lowStockAlert: 0,
    isActive: basic.isActive,
    isFeatured: basic.isFeatured,
    tagIds: basic.tagIds,
    imageUrls: basic.imageUrls,
    metaTitle: basic.modelNumber ? `${basic.name} — ${basic.modelNumber}` : undefined,
  });

  const productId = product.id;

  const rollback = async (reason: unknown) => {
    try { await productsApi.remove(productId); } catch { /* best-effort */ }
    throw reason;
  };

  // ─── 2. VARIANTS (with per-variant overrides + accessory stock baseline) ─
  let createdVariants: any[] = [];
  if (hasVariants && variants.length > 0) {
    // Pre-compute accessory stock per variant tempId
    const accByVariantId = new Map<string | null, number>();
    for (const s of accessoryStock) accByVariantId.set(s.variantTempId, Number(s.currentStock || 0));

    const variantPayloads: UpsertVariantPayload[] = variants.map((v, i) => {
      const effType = resolveVariantProductType(basic, v);
      const salePrice = v.salePriceOverride ?? Number(basic.salePrice || 0);
      const costPrice = v.costPriceOverride ?? Number(basic.costPrice || 0);
      const wholesalePrice =
        v.wholesalePriceOverride ??
        (basic.wholesalePrice === '' || basic.wholesalePrice === undefined
          ? undefined
          : Number(basic.wholesalePrice));

      // For ACCESSORY variants, seed stock. For PHONE variants, stock will come from IMEIs.
      const baselineStock = effType === 'ACCESSORY' ? (accByVariantId.get(v.tempId) ?? 0) : 0;
      const accEntry = effType === 'ACCESSORY' ? accessoryStock.find((s) => s.variantTempId === v.tempId) : undefined;

      return {
        name: v.name.trim(),
        sku: v.sku?.trim() || undefined,
        barcode: v.barcode?.trim() || undefined,
        color: v.color?.trim() || undefined,
        colorHex: v.colorHex || undefined,
        size: v.storage?.trim() || undefined,
        unit: 'pcs',
        price: salePrice,
        costPrice: costPrice,
        wholesalePrice: wholesalePrice,
        stock: baselineStock,
        lowStockAlert: effType === 'ACCESSORY' ? (accEntry?.lowStockAlert ?? 5) : 0,
        imageUrl: v.imageUrl || undefined,
        isActive: v.isActive,
        sortOrder: i,
      };
    });

    try {
      createdVariants = await productVariantsApi.bulkCreate(productId, variantPayloads);
    } catch (e) {
      await rollback(e);
    }
  } else if (accessoryStock.length > 0) {
    // No variants but accessory stock at product level
    const totalStock = accessoryStock.reduce((a, s) => a + Number(s.currentStock || 0), 0);
    if (totalStock > 0) {
      try {
        await productsApi.update(productId, { stock: totalStock });
      } catch (e) {
        await rollback(e);
      }
    }
  }

  // Map wizard variant tempId → real variantId
  const variantIdByTempId = new Map<string, string>();
  if (hasVariants && createdVariants.length === variants.length) {
    variants.forEach((v, i) => {
      variantIdByTempId.set(v.tempId, createdVariants[i].id);
    });
  }

  // ─── 3. IMEIs — grouped per variant, bulk create ─────
  let imeiCount = 0;
  if (imeiLines.length > 0) {
    // Group by variantTempId (or null for product-level)
    const groups = new Map<string | null, typeof imeiLines>();
    for (const l of imeiLines) {
      if (!l.imei1?.trim() || l.imei1.length !== 15) continue;
      const key = l.variantTempId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(l);
    }

    for (const [variantTempId, lines] of groups.entries()) {
      const variantId = variantTempId ? variantIdByTempId.get(variantTempId) : undefined;
      const items: BulkImeiItem[] = lines.map((l) => ({
        imei1: l.imei1,
        imei2: l.imei2?.trim() || undefined,
        serialNumber: l.serialNumber?.trim() || undefined,
        color: l.color?.trim() || undefined,
        ptaStatus: l.ptaStatus,
        ptaTaxPaid: l.ptaTaxPaid ?? 0,
        notes: l.notes?.trim() || undefined,
      }));

      // Cost price for the batch (use first line's override or basic cost)
      const firstLine = lines[0];
      const variant = variants.find((v) => v.tempId === variantTempId);
      const batchCost =
        firstLine.costPriceOverride ??
        variant?.costPriceOverride ??
        Number(basic.costPrice || 0);
      const batchWarranty =
        firstLine.warrantyMonthsOverride ??
        Number(basic.warrantyMonths || 12);

      try {
        const result = await imeiApi.bulkCreate({
          productId,
          variantId,
          costPrice: batchCost,
          warrantyMonths: batchWarranty,
          imeis: items,
        });
        imeiCount += result.count;
      } catch (e) {
        await rollback(e);
      }
    }
  }

  const accessoryUnits = accessoryStock.reduce((a, s) => a + Number(s.currentStock || 0), 0);

  return {
    productId,
    productName: product.name,
    variantCount: createdVariants.length,
    imeiCount,
    accessoryUnits,
  };
}
