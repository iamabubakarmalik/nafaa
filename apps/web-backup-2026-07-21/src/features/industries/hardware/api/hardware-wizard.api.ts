import { productsApi } from '@/api/products.api';
import { bulkPricingApi } from './bulk-pricing.api';
import { reorderRulesApi } from './reorder-rules.api';
import type { HardwareWizardDraft } from '../hooks/useHardwareWizard';

export interface HardwareWizardSaveResult {
  productId: string;
  productName: string;
  bulkTierCount: number;
  hasReorderRule: boolean;
  initialStock: number;
}

/**
 * Atomically create a hardware product with:
 *   • Product (base entity with all specs stored in description/metadata)
 *   • Bulk pricing tiers
 *   • Reorder rules (optional)
 *
 * Rollback: deletes the product if any subsequent step fails.
 */
export async function saveHardwareWizard(
  draft: HardwareWizardDraft,
): Promise<HardwareWizardSaveResult> {
  const { basic, specs, bulkTiers, reorder } = draft;

  // Build a rich description including all specs
  const specLines: string[] = [];
  if (basic.description) specLines.push(basic.description);
  if (specs.grade) specLines.push(`Grade: ${specs.grade}`);
  if (specs.cementType) specLines.push(`Type: ${specs.cementType}`);
  if (specs.bagWeight) specLines.push(`Bag Weight: ${specs.bagWeight}kg`);
  if (specs.steelGrade) specLines.push(`Steel Grade: ${specs.steelGrade}`);
  if (specs.diameter) specLines.push(`Diameter: ${specs.diameter}`);
  if (specs.gauge) specLines.push(`Gauge: ${specs.gauge}`);
  if (specs.length) specLines.push(`Length: ${specs.length}`);
  if (specs.weightPerPiece) specLines.push(`Weight/Piece: ${specs.weightPerPiece}kg`);
  if (specs.tileSize) specLines.push(`Size: ${specs.tileSize}`);
  if (specs.finish) specLines.push(`Finish: ${specs.finish}`);
  if (specs.colorName) specLines.push(`Color: ${specs.colorName}`);
  if (specs.thickness) specLines.push(`Thickness: ${specs.thickness}`);
  if (specs.sqftPerBox) specLines.push(`Sq Ft/Box: ${specs.sqftPerBox}`);
  if (specs.piecesPerBox) specLines.push(`Pieces/Box: ${specs.piecesPerBox}`);
  if (specs.model) specLines.push(`Model: ${specs.model}`);
  if (specs.material) specLines.push(`Material: ${specs.material}`);
  if (specs.pipeSize) specLines.push(`Pipe Size: ${specs.pipeSize}`);
  if (specs.wireGauge) specLines.push(`Wire Gauge: ${specs.wireGauge}`);
  if (specs.wireCore) specLines.push(`Wire Core: ${specs.wireCore}`);
  if (specs.paintFinish) specLines.push(`Paint Finish: ${specs.paintFinish}`);
  if (specs.litersPerCan) specLines.push(`Liters/Can: ${specs.litersPerCan}L`);
  if (specs.coverage) specLines.push(`Coverage: ${specs.coverage}`);
  if (specs.woodType) specLines.push(`Wood Type: ${specs.woodType}`);
  if (specs.toolType) specLines.push(`Tool Type: ${specs.toolType}`);
  if (specs.powerRating) specLines.push(`Power: ${specs.powerRating}`);
  if (specs.originCountry) specLines.push(`Origin: ${specs.originCountry}`);
  if (specs.warrantyMonths) specLines.push(`Warranty: ${specs.warrantyMonths} months`);
  if (specs.specifications) specLines.push(specs.specifications);

  const fullDescription = specLines.join(' | ');

  // ─── 1. CREATE PRODUCT ─────────────────────────────────
  const product = await productsApi.create({
    name: basic.name.trim(),
    description: fullDescription || undefined,
    categoryId: basic.categoryId || undefined,
    brandId: basic.brandId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: basic.unit || 'pcs',
    price: Number(basic.salePrice || 0),
    costPrice: Number(basic.costPrice || 0),
    wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
    taxRate: Number(basic.taxRate || 0),
    stock: Number(basic.initialStock || 0),
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

  // ─── 2. CREATE BULK PRICING TIERS ──────────────────────
  let bulkTierCount = 0;
  if (bulkTiers.length > 0) {
    for (const tier of bulkTiers) {
      try {
        await bulkPricingApi.create({
          productId,
          minQuantity: tier.minQuantity,
          maxQuantity: tier.maxQuantity,
          price: tier.price,
          discountPct: tier.discountPct,
          label: tier.label,
          isActive: true,
        });
        bulkTierCount++;
      } catch (e) {
        await rollback(e);
      }
    }
  }

  // ─── 3. CREATE REORDER RULE ────────────────────────────
  let hasReorderRule = false;
  if (reorder.enabled) {
    try {
      await reorderRulesApi.upsert({
        productId,
        minStock: reorder.minStock,
        reorderPoint: reorder.reorderPoint,
        reorderQty: reorder.reorderQty,
        maxStock: reorder.maxStock === '' ? undefined : Number(reorder.maxStock),
        preferredSupplier: reorder.preferredSupplier || undefined,
        leadTimeDays: reorder.leadTimeDays === '' ? undefined : Number(reorder.leadTimeDays),
        emergencyContact: reorder.emergencyContact || undefined,
        autoAlert: reorder.autoAlert,
        isActive: true,
      });
      hasReorderRule = true;
    } catch (e) {
      await rollback(e);
    }
  }

  return {
    productId,
    productName: product.name,
    bulkTierCount,
    hasReorderRule,
    initialStock: Number(basic.initialStock || 0),
  };
}
