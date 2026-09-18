import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi, type UpsertVariantPayload } from '@modules/inventory/products/api/product-variants.api';
import { productBatchesApi } from '@modules/inventory/products/api/product-batches.api';
import { productUnitsApi } from './product-units.api';
import type { RetailWizardDraft } from '../hooks/useRetailWizard';


/**
 * On edit: strip SKU/barcode if unchanged from original, so backend
 * unique constraint doesn't false-fire on the product's own values.
 */
function cleanUniqueFields<T extends { sku?: string | null; barcode?: string | null }>(
  payload: T,
  original?: { sku?: string | null; barcode?: string | null } | null,
): T {
  if (!original) return payload;
  const out: T = { ...payload };
  if ((out.sku ?? '') === (original.sku ?? '')) delete (out as any).sku;
  if ((out.barcode ?? '') === (original.barcode ?? '')) delete (out as any).barcode;
  return out;
}

export interface RetailWizardSaveResult {
  productId: string;
  productName: string;
  unitCount: number;
  variantCount: number;
  batchCount: number;
  totalStock: number;
}

/**
 * Atomically create a retail product with:
 *   • Multi-units (piece/dozen/carton with per-unit pricing)
 *   • Variants (optional flavor/size)
 *   • Batches (optional expiry tracking)
 *
 * Rollback: deletes the product if any subsequent step fails.
 */
/**
 * Wizard ka draft save karta hai — naya product banata hai, ya
 * `existingId` diya ho to usi ko badalta hai.
 *
 * Pehle yahan sirf `create` tha. Matlab product "edit" karne par
 * naya product ban jata tha aur purana waise ka waisa para rehta
 * tha — ek hi cheez do dafa, do alag stock aur do alag rate ke
 * sath. Dukaan-daar ko pata bhi nahi chalta tha ke kaun sa asli
 * hai, aur POS par dono nazar aate thay.
 */
export async function saveRetailWizard(
  draft: RetailWizardDraft,
  existingId?: string,
): Promise<RetailWizardSaveResult> {
  const { basic, hasVariants, hasMultiUnits, trackBatches, units, variants, batches, stock } = draft;

  const baselineStock = hasVariants
    ? variants.reduce((a, v) => a + Number(v.stock || 0), 0)
    : trackBatches
      ? batches.reduce((a, b) => a + Number(b.quantity || 0), 0)
      : Number(stock.currentStock || 0);

  // ─── 1. PRODUCT — naya banayein ya mojooda badlein ─────
  const isEdit = !!existingId;

  const productPayload = {
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    brandId: basic.brandId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: basic.baseUnit || 'pcs',
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
  };

  const product = isEdit
    ? await productsApi.update(existingId!, productPayload)
    : await productsApi.create(productPayload);

  const productId = product.id;

  /**
   * Naya product banate waqt kuch aage ghalat ho jaye to adhoora
   * product mita dete hain. Magar EDIT me aisa hargiz nahi —
   * warna dukaan-daar ka mojooda product, uski saari bikri ka
   * rishta aur stock sab mit jata.
   */
  const rollback = async (reason: unknown) => {
    if (!isEdit) {
      try { await productsApi.remove(productId); } catch { /* pehle hi ja chuka */ }
    }
    throw reason;
  };

  // ─── 2. VARIANTS ───────────────────────────────────────
  let createdVariants: any[] = [];
  if (hasVariants && variants.length > 0) {
    const variantPayloads: UpsertVariantPayload[] = variants.map((v, i) => ({
      name: v.name.trim(),
      sku: v.sku?.trim() || undefined,
      barcode: v.barcode?.trim() || undefined,
      unit: basic.baseUnit || 'pcs',
      price: v.priceOverride ?? Number(basic.salePrice || 0),
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

  const variantIdByTempId = new Map<string, string>();
  if (hasVariants && createdVariants.length === variants.length) {
    variants.forEach((v, i) => variantIdByTempId.set(v.tempId, createdVariants[i].id));
  }

  // ─── 3. MULTI-UNITS ────────────────────────────────────
  let unitCount = 0;
  if (hasMultiUnits && units.length > 0) {
    for (const u of units) {
      try {
        await productUnitsApi.create({
          productId,
          unitName: u.unitName,
          unitLabel: u.unitLabel,
          conversionType: u.conversionType,
          conversionRate: u.conversionRate,
          price: u.price,
          costPrice: u.costPrice,
          wholesalePrice: u.wholesalePrice,
          mrpPrice: u.mrpPrice,
          barcode: u.barcode?.trim() || undefined,
          sku: u.sku?.trim() || undefined,
          isBase: u.isBase,
          isDefault: u.isDefault,
          isActive: u.isActive,
        });
        unitCount++;
      } catch (e) {
        await rollback(e);
      }
    }
  }

  // ─── 4. BATCHES ────────────────────────────────────────
  let batchCount = 0;
  if (trackBatches && batches.length > 0) {
    for (const b of batches) {
      const variantId = b.variantTempId ? variantIdByTempId.get(b.variantTempId) : undefined;
      try {
        await productBatchesApi.create(productId, {
          batchNumber: b.batchNumber.trim(),
          variantId,
          manufactureDate: b.manufactureDate || undefined,
          expiryDate: b.expiryDate || undefined,
          quantity: Number(b.quantity || 0),
          costPrice: Number(b.costPrice || 0),
          notes: b.notes?.trim() || undefined,
        });
        batchCount++;
      } catch (e) {
        await rollback(e);
      }
    }
  }

  return {
    productId,
    productName: product.name,
    unitCount,
    variantCount: createdVariants.length,
    batchCount,
    totalStock: baselineStock,
  };
}
