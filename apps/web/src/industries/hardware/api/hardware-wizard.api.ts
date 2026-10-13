import { productsApi } from '@modules/inventory/products/api/products.api';
import { bulkPricingApi } from './bulk-pricing.api';
import { reorderRulesApi } from './reorder-rules.api';
import { hardwareProductsApi, type HardwareProduct, type Unit } from './products.api';
import type { HardwareWizardDraft } from '../hooks/useHardwareWizard';

/** Product unit (lowercase, shared catalog) to the hardware profile unit. */
const PROFILE_UNIT: Record<string, Unit> = {
  bag: 'BAG', ton: 'TON', kg: 'KG', pcs: 'PIECE', bundle: 'BUNDLE', meter: 'METER', feet: 'FEET',
  sqft: 'SQFT', sqm: 'SQMETER', cft: 'CUBIC_FEET', liter: 'LITER', gallon: 'GALLON',
  sheet: 'SHEET', box: 'BOX', trip: 'TRIP',
};

const num = (v: number | string | '' | undefined) => {
  if (v === '' || v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const text = (v?: string) => (v && v.trim() ? v.trim() : undefined);
/** "350 sqft per gallon" → 350 */
const leadingNumber = (v?: string) => {
  const m = v?.match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : undefined;
};

/** Hardware profile: brand, category type, specs and flags the hardware pages filter on. */
function buildProfile(productId: string, draft: HardwareWizardDraft): Partial<HardwareProduct> {
  const { basic, specs } = draft;
  const profile: Record<string, unknown> = {
    productId,
    brandId: basic.hardwareBrandId || undefined,
    categoryType: basic.categoryType,
    unit: PROFILE_UNIT[basic.unit] ?? 'PIECE',
    gradeStrength: text(specs.grade),
    bagWeight: num(specs.bagWeight),
    grade: text(specs.steelGrade),
    diameter: text(specs.diameter),
    weightPerUnit: num(specs.weightPerPiece),
    tileSize: text(specs.tileSize),
    finishType: text(specs.finish),
    piecesPerBox: num(specs.piecesPerBox) !== undefined ? Math.round(Number(specs.piecesPerBox)) : undefined,
    sqftPerBox: num(specs.sqftPerBox),
    colorName: text(specs.colorName),
    colorCode: text(specs.colorHex),
    finishSheen: text(specs.paintFinish),
    coverage: leadingNumber(specs.coverage),
    litersPerCan: num(specs.litersPerCan),
    manufacturingLocation: text(specs.originCountry),
    isFeatured: basic.isFeatured,
    isBestSeller: basic.isBestSeller,
    isFastMoving: basic.isFastMoving,
    requiresTruck: basic.requiresTruck,
    hasIsoCertification: basic.hasIsoCertification,
  };
  // Leave out empty fields so the strict API validation passes.
  return Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== undefined)) as Partial<HardwareProduct>;
}

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
  /** Diya ho to isi product ko badla jayega, naya nahi banega */
  existingId?: string,
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
  /* Pehle yahan sirf `create` tha: product "edit" karne par naya
     product ban jata tha aur purana waise ka waisa para rehta —
     ek hi cheez do dafa, do alag stock ke sath. */
  const _payload = {
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
    // Stock is set only when the product is created; later changes go through
    // stock adjustment so the movement and its reason are recorded.
    ...(existingId ? {} : { stock: Number(basic.initialStock || 0) }),
    lowStockAlert: Number(basic.lowStockAlert || 10),
    isActive: basic.isActive,
    isFeatured: basic.isFeatured,
    tagIds: basic.tagIds,
    imageUrls: basic.imageUrls,
  };

  const product = existingId
    ? await productsApi.update(existingId, _payload as any)
    : await productsApi.create(_payload as any);

  const productId = product.id;

  const rollback = async (reason: unknown) => {
    // EDIT me hargiz nahi — warna dukaan-daar ka mojooda product,
    // uski saari bikri ka rishta aur stock sab mit jata.
    if (existingId) throw reason;
    try { await productsApi.remove(productId); } catch {}
    throw reason;
  };

  // ─── 2. HARDWARE PROFILE ───────────────────────────────
  // The hardware Products page lists these profiles; without one the product never shows there.
  try {
    await hardwareProductsApi.upsert(buildProfile(productId, draft));
  } catch (e) {
    await rollback(e);
  }

  // ─── 3. BULK PRICING TIERS ─────────────────────────────
  // On edit the saved tiers are updated, removed ones deleted and new ones added,
  // so saving twice never doubles the tiers.
  let bulkTierCount = 0;
  const existingTiers = existingId ? await bulkPricingApi.listByProduct(productId).catch(() => []) : [];
  const keptIds = new Set(bulkTiers.map((t) => t.id).filter(Boolean));
  for (const old of existingTiers) {
    if (!keptIds.has(old.id)) await bulkPricingApi.remove(old.id).catch(() => undefined);
  }
  for (const tier of bulkTiers) {
    const body = {
      productId,
      minQuantity: tier.minQuantity,
      maxQuantity: tier.maxQuantity,
      price: tier.price,
      discountPct: tier.discountPct,
      label: tier.label,
      isActive: true,
    };
    try {
      if (tier.id && existingTiers.some((t) => t.id === tier.id)) await bulkPricingApi.update(tier.id, body);
      else await bulkPricingApi.create(body);
      bulkTierCount++;
    } catch (e) {
      await rollback(e);
    }
  }

  // ─── 4. REORDER RULE ───────────────────────────────────
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
