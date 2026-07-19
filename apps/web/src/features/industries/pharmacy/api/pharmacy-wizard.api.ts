import { productsApi } from '@/api/products.api';
import { medicinesApi } from './medicines.api';
import { saltsApi } from './salts.api';
import { batchesApi } from './batches.api';
import { substitutesApi } from './substitutes.api';
import type { PharmacyWizardDraft } from '../hooks/usePharmacyWizard';

export interface PharmacyWizardSaveResult {
  productId: string;
  medicineId?: string;
  productName: string;
  saltCount: number;
  batchCount: number;
  substituteCount: number;
  totalStock: number;
}

/**
 * Atomically create a pharmacy medicine with:
 *   • Product (base)
 *   • PharmacyMedicine (extension)
 *   • Salt assignments
 *   • Batches (optional)
 *   • Substitutes (optional)
 *
 * Rollback: deletes the product on any failure.
 */
export async function savePharmacyWizard(
  draft: PharmacyWizardDraft,
): Promise<PharmacyWizardSaveResult> {
  const { basic, clinical, inventory } = draft;

  const baselineStock = inventory.hasBatches
    ? inventory.batches.reduce((a, b) => a + Number(b.quantity || 0), 0)
    : Number(basic.currentStock || 0);

  // ─── 1. CREATE PRODUCT ─────────────────────────────────
  const product = await productsApi.create({
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    brandId: basic.brandId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: basic.unit || 'tablet',
    price: Number(basic.salePrice || 0),
    costPrice: Number(basic.costPrice || 0),
    wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
    taxRate: Number(basic.taxRate || 0),
    stock: baselineStock,
    lowStockAlert: Number(basic.lowStockAlert || 10),
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

  // ─── 2. UPSERT PHARMACY MEDICINE ───────────────────────
  let medicine: any;
  try {
    medicine = await medicinesApi.upsert({
      productId,
      registrationNumber: basic.registrationNumber || undefined,
      approvalDate: basic.approvalDate || undefined,
      dosageForm: basic.dosageForm || undefined,
      packSize: basic.packSize || undefined,
      packUnit: basic.packUnit || undefined,
      manufacturer: basic.manufacturer || undefined,
      countryOfOrigin: basic.countryOfOrigin || undefined,
      importedBy: basic.importedBy || undefined,
      indication: basic.indication || undefined,
      mechanismOfAction: clinical.mechanismOfAction || undefined,
      pharmacokinetics: clinical.pharmacokinetics || undefined,
      storageCondition: clinical.storageCondition,
      storageInstructions: clinical.storageInstructions || undefined,
      requiresColdChain: clinical.requiresColdChain,
      minTemperature: clinical.minTemperature === '' ? undefined : Number(clinical.minTemperature),
      maxTemperature: clinical.maxTemperature === '' ? undefined : Number(clinical.maxTemperature),
      scheduleClass: clinical.scheduleClass,
      requiresPrescription: clinical.requiresPrescription,
      isNarcotic: clinical.isNarcotic,
      isRefrigerated: clinical.isRefrigerated,
      color: basic.color || undefined,
      shape: basic.shape || undefined,
      markings: basic.markings || undefined,
      isGeneric: basic.isGeneric,
      brandTier: basic.brandTier || undefined,
    });
  } catch (e) {
    await rollback(e);
  }

  // ─── 3. ASSIGN SALTS ───────────────────────────────────
  let saltCount = 0;
  if (clinical.salts.length > 0) {
    try {
      const payload = clinical.salts.map((s) => ({
        saltId: s.saltId,
        strength: s.strength,
        strengthValue: s.strengthValue,
        strengthUnit: s.strengthUnit,
        isMainSalt: s.isMainSalt,
      }));
      await saltsApi.assign(productId, payload);
      saltCount = clinical.salts.length;
    } catch (e) {
      await rollback(e);
    }
  }

  // ─── 4. CREATE BATCHES ─────────────────────────────────
  let batchCount = 0;
  if (inventory.hasBatches && inventory.batches.length > 0) {
    for (const b of inventory.batches) {
      try {
        await batchesApi.create({
          productId,
          batchNumber: b.batchNumber.trim(),
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

  // ─── 5. ADD SUBSTITUTES ────────────────────────────────
  let substituteCount = 0;
  if (medicine && inventory.hasSubstitutes && inventory.substitutes.length > 0) {
    // Get medicine records for each substitute product
    for (const sub of inventory.substitutes) {
      try {
        const subMedicine = await medicinesApi.byProduct(sub.substituteProductId);
        if (subMedicine) {
          await substitutesApi.add(medicine.id, subMedicine.id, sub.notes);
          substituteCount++;
        }
      } catch {
        // Substitute product might not have pharmacy extension — skip silently
      }
    }
  }

  return {
    productId,
    medicineId: medicine?.id,
    productName: product.name,
    saltCount,
    batchCount,
    substituteCount,
    totalStock: baselineStock,
  };
}
