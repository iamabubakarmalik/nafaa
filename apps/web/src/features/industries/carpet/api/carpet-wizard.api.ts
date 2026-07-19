import { productsApi } from '@/api/products.api';
import { productVariantsApi, type UpsertVariantPayload } from '@/api/product-variants.api';
import { carpetRollsApi, type CreateCarpetRollPayload } from './carpet-rolls.api';
import { carpetCutPiecesApi, type CreateCutPiecePayload } from './carpet-cut-pieces.api';
import type { CarpetWizardDraft } from '../hooks/useCarpetWizard';
import { resolveVariantStockType } from '../hooks/useCarpetWizard';

export interface CarpetWizardSaveResult {
  productId: string;
  productName: string;
  variantCount: number;
  rollCount: number;
  pieceCount: number;
  ftTotal: number;
  totalSqft: number;
}

/**
 * Atomically create a carpet product with:
 *   • Variants (with per-variant price + code overrides)
 *   • Rolls (for ROLLS stock type)
 *   • Individual cut pieces (for PIECES stock type — one row per unit)
 *   • Baseline product stock (for FT stock type — stored on variant.stock)
 *
 * Rollback: deletes the product if any subsequent step fails.
 */
export async function saveCarpetWizard(
  draft: CarpetWizardDraft,
): Promise<CarpetWizardSaveResult> {
  const { basic, hasVariants, variants, rolls, pieceLines, ftStock } = draft;

  // ─── 1. CREATE PRODUCT ─────────────────────────────────
  const product = await productsApi.create({
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    brandId: basic.brandId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: basic.unit,
    price: Number(basic.salePricePerSqft || 0),
    costPrice: Number(basic.costPricePerSqft || 0),
    wholesalePrice:
      basic.wholesalePricePerSqft === '' || basic.wholesalePricePerSqft === undefined
        ? undefined
        : Number(basic.wholesalePricePerSqft),
    taxRate: Number(basic.taxRate || 0),
    stock: 0,
    lowStockAlert: 0,
    isActive: basic.isActive,
    isFeatured: basic.isFeatured,
    tagIds: basic.tagIds,
    imageUrls: basic.imageUrls,
    metaTitle: basic.designCode ? `${basic.name} — ${basic.designCode}` : undefined,
  });

  const productId = product.id;

  const rollback = async (reason: unknown) => {
    try { await productsApi.remove(productId); } catch { /* best-effort */ }
    throw reason;
  };

  // ─── 2. VARIANTS (with per-variant overrides + ft-stock baseline) ─
  let createdVariants: any[] = [];
  if (hasVariants && variants.length > 0) {
    // Pre-compute per-variant baseline stock (only used for FT type)
    const ftByVariantId = new Map<string | null, number>();
    for (const f of ftStock) ftByVariantId.set(f.variantTempId, Number(f.currentFt || 0));

    const variantPayloads: UpsertVariantPayload[] = variants.map((v, i) => {
      const effType = resolveVariantStockType(basic, v);
      const salePrice = v.salePriceOverride ?? Number(basic.salePricePerSqft || 0);
      const costPrice = v.costPriceOverride ?? Number(basic.costPricePerSqft || 0);
      const wholesalePrice =
        v.wholesalePriceOverride ??
        (basic.wholesalePricePerSqft === '' || basic.wholesalePricePerSqft === undefined
          ? undefined
          : Number(basic.wholesalePricePerSqft));

      // For FT variants, seed stock into variant.stock so POS / low-stock
      // work out of the box. Rolls/Pieces variants stay at 0 (their real
      // stock is in the rolls / cut-pieces tables).
      const baselineStock = effType === 'FT' ? (ftByVariantId.get(v.tempId) ?? 0) : 0;
      const ftEntry = effType === 'FT' ? ftStock.find((f) => f.variantTempId === v.tempId) : undefined;

      return {
        name: v.name.trim(),
        sku: v.sku?.trim() || undefined,
        barcode: v.barcode?.trim() || undefined,
        color: v.color?.trim() || undefined,
        colorHex: v.colorHex || undefined,
        size: v.designCode?.trim() || undefined,
        unit: effType === 'FT' ? 'ft' : basic.unit,
        price: effType === 'FT' ? (ftEntry?.salePricePerFt ?? salePrice) : salePrice,
        costPrice: effType === 'FT' ? (ftEntry?.costPerFt ?? costPrice) : costPrice,
        wholesalePrice: effType === 'FT'
          ? (ftEntry?.wholesalePricePerFt ?? wholesalePrice)
          : wholesalePrice,
        stock: baselineStock,
        lowStockAlert: effType === 'FT' ? (ftEntry?.lowStockAlertFt ?? 5) : 0,
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
  } else if (ftStock.length > 0) {
    // No variants but user entered ft stock at product level — bake it in
    const totalFt = ftStock.reduce((a, f) => a + Number(f.currentFt || 0), 0);
    if (totalFt > 0) {
      try {
        await productsApi.update(productId, { stock: totalFt });
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

  // ─── 3. ROLLS ──────────────────────────────────────────
  let totalSqft = 0;
  let rollCount = 0;
  if (rolls.length > 0) {
    const rollPayloads: CreateCarpetRollPayload[] = rolls.map((r) => {
      const w = Number(r.widthFt) + Number(r.widthInch || 0) / 12;
      const l = Number(r.lengthFt) + Number(r.lengthInch || 0) / 12;
      totalSqft += w * l;
      // Resolve variantId: prefer explicit mapping, else fall back to
      // the first created variant when the wizard has variants
      // (prevents "No variant" orphans when the user was clicked the
      // top-level Add Roll button by mistake).
      let resolvedVariantId: string | undefined;
      if (r.variantTempId && variantIdByTempId.has(r.variantTempId)) {
        resolvedVariantId = variantIdByTempId.get(r.variantTempId);
      } else if (hasVariants && createdVariants.length > 0) {
        // Orphan roll but wizard has variants → attach to first variant
        resolvedVariantId = createdVariants[0].id;
      }
      return {
        productId,
        variantId: resolvedVariantId,
        rollNumber: r.rollNumber.trim() || undefined,
        designCode: basic.designCode.trim() || undefined,
        widthFt: Number(r.widthFt),
        widthInch: Number(r.widthInch || 0),
        originalLengthFt: Number(r.lengthFt),
        originalLengthInch: Number(r.lengthInch || 0),
        costPerSqft: Number(r.costPerSqft || basic.costPricePerSqft || 0),
        salePricePerSqft: Number(r.salePricePerSqft || basic.salePricePerSqft || 0),
        wholesalePricePerSqft:
          r.wholesalePricePerSqft > 0 ? Number(r.wholesalePricePerSqft) : undefined,
        sourceType: 'OPENING_STOCK',
        rackNumber: r.rackNumber.trim() || undefined,
        quality: r.quality.trim() || undefined,
        pile: r.pile.trim() || undefined,
        notes: r.notes.trim() || undefined,
      };
    });

    try {
      await carpetRollsApi.bulkOpening(rollPayloads);
      rollCount = rollPayloads.length;
    } catch (e) {
      await rollback(e);
    }
  }

  // ─── 4. PIECES (one cut piece per unit in the line qty) ─
  let pieceCount = 0;
  if (pieceLines.length > 0) {
    // Cut-pieces API doesn't have a bulk endpoint, so we do them one-by-one
    for (const line of pieceLines) {
      const qty = Math.max(0, Math.floor(Number(line.quantity || 0)));
      if (qty === 0) continue;
      for (let i = 0; i < qty; i++) {
        const payload: CreateCutPiecePayload = {
          productId,
          variantId: (() => {
            if (line.variantTempId && variantIdByTempId.has(line.variantTempId)) {
              return variantIdByTempId.get(line.variantTempId);
            }
            if (hasVariants && createdVariants.length > 0) {
              return createdVariants[0].id; // orphan → first variant
            }
            return undefined;
          })(),
          pieceCode:
            qty === 1
              ? (line.pieceCode.trim() || undefined)
              : `${line.pieceCode.trim() || 'P'}-${String(i + 1).padStart(2, '0')}`,
          widthFt: Number(line.widthFt),
          widthInch: Number(line.widthInch || 0),
          lengthFt: Number(line.lengthFt),
          lengthInch: Number(line.lengthInch || 0),
          costAmount: Number(line.costPricePerPiece || 0),
          salePrice: Number(line.salePricePerPiece || 0),
          sourceType: 'OPENING_STOCK',
          status: 'AVAILABLE',
          condition: line.condition || undefined,
          rackNumber: line.rackNumber.trim() || undefined,
          notes: line.notes.trim() || undefined,
        };
        try {
          await carpetCutPiecesApi.create(payload);
          pieceCount++;
          const w = Number(line.widthFt) + Number(line.widthInch || 0) / 12;
          const h = Number(line.lengthFt) + Number(line.lengthInch || 0) / 12;
          totalSqft += w * h;
        } catch (e) {
          await rollback(e);
        }
      }
    }
  }

  // ─── 5. FT stock total (for return value) ──────────────
  const ftTotal = ftStock.reduce((a, f) => a + Number(f.currentFt || 0), 0);

  return {
    productId,
    productName: product.name,
    variantCount: hasVariants ? Math.max(createdVariants.length, variants.length) : 0,
    rollCount,
    pieceCount,
    ftTotal,
    totalSqft,
  };
}


// ═══════════════════════════════════════════════════════════
// EDIT MODE — Load existing product back into wizard state
// ═══════════════════════════════════════════════════════════

import { productsApi as _productsApi } from '@/api/products.api';
import { productVariantsApi as _productVariantsApi } from '@/api/product-variants.api';
import { carpetRollsApi as _carpetRollsApi } from './carpet-rolls.api';
import { carpetCutPiecesApi as _carpetCutPiecesApi } from './carpet-cut-pieces.api';

/**
 * Fetch an existing carpet product and everything under it, then
 * shape it into the wizard's draft format so CarpetProductWizardPage
 * can pre-populate all three steps for editing.
 */
export async function loadCarpetProductForEdit(productId: string) {
  const [product, variants, rolls, cutPieces] = await Promise.all([
    _productsApi.getOne(productId),
    _productVariantsApi.list(productId).catch(() => []),
    _carpetRollsApi.list({ productId, limit: 500 }).then((r) => r.items ?? []).catch(() => []),
    _carpetCutPiecesApi.list({ productId, limit: 500 }).then((r) => r.items ?? []).catch(() => []),
  ]);

  // Map real variantId → tempId used by wizard state
  const variantTempIdMap = new Map<string, string>();
  const wizardVariants = variants.map((v: any, i: number) => {
    const tempId = `edit-var-${v.id}`;
    variantTempIdMap.set(v.id, tempId);
    return {
      tempId,
      name: v.name,
      color: v.color ?? v.name,
      colorHex: v.colorHex ?? '#059669',
      designCode: v.size ?? undefined,
      sku: v.sku ?? undefined,
      barcode: v.barcode ?? undefined,
      costPriceOverride:
        v.costPrice !== product.costPrice ? Number(v.costPrice) : undefined,
      salePriceOverride:
        v.price !== product.price ? Number(v.price) : undefined,
      wholesalePriceOverride:
        v.wholesalePrice && v.wholesalePrice !== product.wholesalePrice
          ? Number(v.wholesalePrice)
          : undefined,
      imageUrl: v.imageUrl ?? undefined,
      isActive: v.isActive,
      sortOrder: i,
    };
  });

  // Attach orphan rolls (variantId=null) to FIRST variant when product
  // has variants — so they show up in Step 3 instead of vanishing.
  const firstVariantTempId =
    wizardVariants.length > 0 ? wizardVariants[0].tempId : null;

  const wizardRolls = rolls.map((r: any) => {
    let variantTempId: string | null = null;
    if (r.variantId && variantTempIdMap.has(r.variantId)) {
      variantTempId = variantTempIdMap.get(r.variantId) ?? null;
    } else if (wizardVariants.length > 0) {
      // Orphan roll but product HAS variants → attach to first
      variantTempId = firstVariantTempId;
    }
    return {
      tempId: `edit-roll-${r.id}`,
      variantTempId,
      rollNumber: r.rollNumber,
      widthFt: Number(r.widthFt),
      widthInch: Number(r.widthInch ?? 0),
      lengthFt: Number(r.remainingLengthFt ?? r.originalLengthFt),
      lengthInch: Number(r.remainingLengthInch ?? r.originalLengthInch ?? 0),
      costPerSqft: Number(r.costPerSqft),
      salePricePerSqft: Number(r.salePricePerSqft),
      wholesalePricePerSqft: Number(r.wholesalePricePerSqft ?? 0),
      rackNumber: r.rackNumber ?? '',
      quality: r.quality ?? '',
      pile: r.pile ?? '',
      notes: r.notes ?? '',
    };
  });

  // Group cut pieces by identical dimensions/price into piece-lines
  // (attach orphan pieces to first variant too)
  const pieceMap = new Map<string, any>();
  for (const p of cutPieces) {
    const pieceVariantTempId =
      p.variantId && variantTempIdMap.has(p.variantId)
        ? variantTempIdMap.get(p.variantId)!
        : (wizardVariants.length > 0 ? firstVariantTempId : null);
    const key = [
      p.variantId ?? '',
      p.widthFt, p.widthInch ?? 0,
      p.lengthFt, p.lengthInch ?? 0,
      p.salePrice,
    ].join('|');
    const existing = pieceMap.get(key);
    if (existing) {
      existing.quantity += 1;
    } else {
      pieceMap.set(key, {
        tempId: `edit-piece-${p.id}`,
        variantTempId: pieceVariantTempId,
        pieceCode: p.pieceCode,
        widthFt: Number(p.widthFt),
        widthInch: Number(p.widthInch ?? 0),
        lengthFt: Number(p.lengthFt),
        lengthInch: Number(p.lengthInch ?? 0),
        quantity: 1,
        costPricePerPiece: Number(p.costAmount ?? 0),
        salePricePerPiece: Number(p.salePrice ?? 0),
        wholesalePricePerPiece: 0,
        rackNumber: p.rackNumber ?? '',
        condition: p.condition ?? 'Good',
        notes: p.notes ?? '',
      });
    }
  }

  return {
    productId,
    basic: {
      name: product.name,
      description: product.description ?? '',
      categoryId: product.categoryId ?? '',
      brandId: product.brandId ?? '',
      designCode: (product as any).metaTitle?.split(' — ')?.[1] ?? '',
      sku: product.sku ?? '',
      barcode: product.barcode ?? '',
      unit: (product.unit as any) ?? 'sqft',
      stockType: 'ROLLS' as const,
      costPricePerSqft: Number(product.costPrice ?? 0),
      salePricePerSqft: Number(product.price ?? 0),
      wholesalePricePerSqft: product.wholesalePrice ? Number(product.wholesalePrice) : '',
      taxRate: Number(product.taxRate ?? 0),
      isFeatured: product.isFeatured,
      isActive: product.isActive,
      imageUrls: (product.images ?? []).map((im: any) => im.url),
      tagIds: (product.tags ?? []).map((t: any) => t?.tag?.id).filter(Boolean),
    },
    hasVariants: wizardVariants.length > 0,
    variants: wizardVariants,
    rolls: wizardRolls,
    pieceLines: Array.from(pieceMap.values()),
    ftStock: [],
  };
}


// ═══════════════════════════════════════════════════════════
// UPDATE MODE — Patch existing carpet product (no duplicates)
// ═══════════════════════════════════════════════════════════

/**
 * Update an existing carpet product from wizard state.
 *
 * Strategy:
 *   • Product: PATCH via productsApi.update()
 *   • Variants: For each wizard variant:
 *       - tempId starts with "edit-var-" → real variantId → UPDATE
 *       - else → CREATE new variant (bulkCreate one at a time)
 *     Variants that existed but are no longer in draft → DELETE
 *   • Rolls: New rolls (tempId starts with "tmp-") → bulkOpening
 *       Existing rolls (tempId "edit-roll-") → skip (already saved)
 *   • Pieces: New piece lines only → carpetCutPiecesApi.create per unit
 *
 * We deliberately DO NOT delete existing rolls/pieces on edit — those
 * are physical inventory. If user wants to remove them, they use the
 * rolls/pieces pages directly.
 */
export async function updateCarpetWizard(
  productId: string,
  draft: CarpetWizardDraft,
): Promise<CarpetWizardSaveResult> {
  const { basic, hasVariants, variants, rolls, pieceLines } = draft;

  // ─── 1. PATCH PRODUCT ────────────────────────────────
  const product = await _productsApi.update(productId, {
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    brandId: basic.brandId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: basic.unit,
    price: Number(basic.salePricePerSqft || 0),
    costPrice: Number(basic.costPricePerSqft || 0),
    wholesalePrice:
      basic.wholesalePricePerSqft === '' || basic.wholesalePricePerSqft === undefined
        ? undefined
        : Number(basic.wholesalePricePerSqft),
    taxRate: Number(basic.taxRate || 0),
    isActive: basic.isActive,
    isFeatured: basic.isFeatured,
    tagIds: basic.tagIds,
    imageUrls: basic.imageUrls,
    metaTitle: basic.designCode ? `${basic.name} — ${basic.designCode}` : undefined,
  });

  // ─── 2. RECONCILE VARIANTS ───────────────────────────
  const variantIdByTempId = new Map<string, string>();
  const existingVariants = await _productVariantsApi.list(productId).catch(() => []);
  const draftEditVariantIds = new Set<string>();

  if (hasVariants) {
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const salePrice = v.salePriceOverride ?? Number(basic.salePricePerSqft || 0);
      const costPrice = v.costPriceOverride ?? Number(basic.costPricePerSqft || 0);
      const wholesalePrice =
        v.wholesalePriceOverride ??
        (basic.wholesalePricePerSqft === '' || basic.wholesalePricePerSqft === undefined
          ? undefined
          : Number(basic.wholesalePricePerSqft));

      const payload = {
        name: v.name.trim(),
        sku: v.sku?.trim() || undefined,
        barcode: v.barcode?.trim() || undefined,
        color: v.color?.trim() || undefined,
        colorHex: v.colorHex || undefined,
        size: v.designCode?.trim() || undefined,
        unit: basic.unit,
        price: salePrice,
        costPrice,
        wholesalePrice,
        stock: 0,
        lowStockAlert: 0,
        imageUrl: v.imageUrl || undefined,
        isActive: v.isActive,
        sortOrder: i,
      };

      // Existing variant (loaded in edit) → UPDATE
      if (v.tempId.startsWith('edit-var-')) {
        const realId = v.tempId.replace('edit-var-', '');
        draftEditVariantIds.add(realId);
        try {
          await _productVariantsApi.update(productId, realId, payload);
          variantIdByTempId.set(v.tempId, realId);
        } catch (e) {
          console.warn('Variant update failed', e);
        }
      } else {
        // New variant → CREATE
        try {
          const created = await _productVariantsApi.create(productId, payload);
          variantIdByTempId.set(v.tempId, created.id);
        } catch (e) {
          console.warn('Variant create failed', e);
        }
      }
    }

    // Variants NOT in draft are left untouched — deleting them
    // could cascade-delete rolls, sales history, etc. Users must
    // remove variants explicitly from the product detail page.
    void draftEditVariantIds;
    void existingVariants;
  }

  // ─── 3. ADD ONLY NEW ROLLS ───────────────────────────
  let rollCount = 0;
  let totalSqft = 0;
  const newRolls = rolls.filter((r) => !r.tempId.startsWith('edit-roll-'));

  if (newRolls.length > 0) {
    const rollPayloads = newRolls.map((r) => {
      const w = Number(r.widthFt) + Number(r.widthInch || 0) / 12;
      const l = Number(r.lengthFt) + Number(r.lengthInch || 0) / 12;
      totalSqft += w * l;
      let resolvedVariantId: string | undefined;
      if (r.variantTempId && variantIdByTempId.has(r.variantTempId)) {
        resolvedVariantId = variantIdByTempId.get(r.variantTempId);
      } else if (hasVariants && variantIdByTempId.size > 0) {
        resolvedVariantId = Array.from(variantIdByTempId.values())[0];
      }
      return {
        productId,
        variantId: resolvedVariantId,
        rollNumber: r.rollNumber.trim() || undefined,
        designCode: basic.designCode.trim() || undefined,
        widthFt: Number(r.widthFt),
        widthInch: Number(r.widthInch || 0),
        originalLengthFt: Number(r.lengthFt),
        originalLengthInch: Number(r.lengthInch || 0),
        costPerSqft: Number(r.costPerSqft || basic.costPricePerSqft || 0),
        salePricePerSqft: Number(r.salePricePerSqft || basic.salePricePerSqft || 0),
        wholesalePricePerSqft:
          r.wholesalePricePerSqft > 0 ? Number(r.wholesalePricePerSqft) : undefined,
        sourceType: 'OPENING_STOCK' as const,
        rackNumber: r.rackNumber.trim() || undefined,
        quality: r.quality.trim() || undefined,
        pile: r.pile.trim() || undefined,
        notes: r.notes.trim() || undefined,
      };
    });

    try {
      await _carpetRollsApi.bulkOpening(rollPayloads);
      rollCount = rollPayloads.length;
    } catch (e) {
      console.warn('Roll bulk create failed', e);
    }
  }

  // ─── 4. ADD ONLY NEW PIECES ──────────────────────────
  let pieceCount = 0;
  const newPieceLines = pieceLines.filter((p) => !p.tempId.startsWith('edit-piece-'));

  for (const line of newPieceLines) {
    const qty = Math.max(0, Math.floor(Number(line.quantity || 0)));
    if (qty === 0) continue;
    for (let i = 0; i < qty; i++) {
      let resolvedVariantId: string | undefined;
      if (line.variantTempId && variantIdByTempId.has(line.variantTempId)) {
        resolvedVariantId = variantIdByTempId.get(line.variantTempId);
      } else if (hasVariants && variantIdByTempId.size > 0) {
        resolvedVariantId = Array.from(variantIdByTempId.values())[0];
      }
      const payload = {
        productId,
        variantId: resolvedVariantId,
        pieceCode:
          qty === 1
            ? (line.pieceCode.trim() || undefined)
            : `${line.pieceCode.trim() || 'P'}-${String(i + 1).padStart(2, '0')}`,
        widthFt: Number(line.widthFt),
        widthInch: Number(line.widthInch || 0),
        lengthFt: Number(line.lengthFt),
        lengthInch: Number(line.lengthInch || 0),
        costAmount: Number(line.costPricePerPiece || 0),
        salePrice: Number(line.salePricePerPiece || 0),
        sourceType: 'OPENING_STOCK' as const,
        status: 'AVAILABLE' as const,
        condition: line.condition || undefined,
        rackNumber: line.rackNumber.trim() || undefined,
        notes: line.notes.trim() || undefined,
      };
      try {
        await _carpetCutPiecesApi.create(payload);
        pieceCount++;
        const w = Number(line.widthFt) + Number(line.widthInch || 0) / 12;
        const h = Number(line.lengthFt) + Number(line.lengthInch || 0) / 12;
        totalSqft += w * h;
      } catch (e) {
        console.warn('Piece create failed', e);
      }
    }
  }

  return {
    productId,
    productName: product.name,
    variantCount: variantIdByTempId.size,
    rollCount,
    pieceCount,
    ftTotal: 0,
    totalSqft,
  };
}


/**
 * Silently reassign orphan carpet rolls (variantId=null) to the first
 * variant of a product that has variants. Runs during edit-mode load
 * so old data (created before the orphan-fallback fix) gets healed.
 */
export async function healOrphanCarpetRolls(productId: string): Promise<number> {
  try {
    const [variants, rollsRes] = await Promise.all([
      _productVariantsApi.list(productId),
      _carpetRollsApi.list({ productId, limit: 500 }),
    ]);
    const activeVariants = (variants ?? []).filter((v: any) => v.isActive);
    if (activeVariants.length === 0) return 0;

    const firstVariantId = activeVariants[0].id;
    const orphans = (rollsRes.items ?? []).filter(
      (r: any) => !r.variantId && r.status !== 'FINISHED',
    );
    if (orphans.length === 0) return 0;

    for (const r of orphans) {
      try {
        await _carpetRollsApi.update(r.id, { variantId: firstVariantId });
      } catch { /* best-effort */ }
    }
    return orphans.length;
  } catch {
    return 0;
  }
}
