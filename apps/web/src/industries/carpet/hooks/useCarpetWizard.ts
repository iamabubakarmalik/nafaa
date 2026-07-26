import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

/**
 * useCarpetWizard — Central state manager for the 3-step Carpet Product Wizard.
 *
 * Handles:
 *   • Draft persistence (localStorage auto-save)
 *   • Validation per step + overall
 *   • CRUD helpers for variants, rolls, pieces, ft-stock
 *   • Live stats (sqft, cost, sale, profit)
 *   • Mixed stock types (product-level + per-variant override)
 */

export type CarpetStockType = 'ROLLS' | 'PIECES' | 'FT' | 'MIXED';
export type CarpetUnit = 'sqft' | 'sqm' | 'sqyd';
export type WizardStep = 1 | 2 | 3;

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface CarpetWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  designCode: string;
  sku: string;
  barcode: string;
  unit: CarpetUnit;
  stockType: CarpetStockType;
  costPricePerSqft: number | '';
  salePricePerSqft: number | '';
  wholesalePricePerSqft: number | '';
  taxRate: number | '';
  isFeatured: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
}

export interface CarpetWizardVariant {
  tempId: string;
  name: string;
  color: string;
  colorHex: string;
  designCode?: string;
  sku?: string;
  barcode?: string;
  costPriceOverride?: number;
  salePriceOverride?: number;
  wholesalePriceOverride?: number;
  stockTypeOverride?: CarpetStockType;  // For MIXED mode
  imageUrl?: string;
  notes?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CarpetWizardRoll {
  tempId: string;
  variantTempId: string | null;
  rollNumber: string;
  widthFt: number;
  widthInch: number;
  lengthFt: number;
  lengthInch: number;
  costPerSqft: number;
  salePricePerSqft: number;
  wholesalePricePerSqft: number;
  rackNumber: string;
  quality: string;
  pile: string;
  notes: string;
}

export interface CarpetWizardPieceLine {
  tempId: string;
  variantTempId: string | null;
  pieceCode: string;
  widthFt: number;
  widthInch: number;
  lengthFt: number;
  lengthInch: number;
  quantity: number;
  costPricePerPiece: number;
  salePricePerPiece: number;
  wholesalePricePerPiece: number;
  rackNumber: string;
  condition: string;
  notes: string;
}

export interface CarpetWizardFtStock {
  variantTempId: string | null;
  currentFt: number;
  lowStockAlertFt: number;
  costPerFt: number;
  salePricePerFt: number;
  wholesalePricePerFt: number;
  rackNumber: string;
  notes: string;
}

export interface CarpetWizardDraft {
  step: WizardStep;
  basic: CarpetWizardBasic;
  hasVariants: boolean;
  variants: CarpetWizardVariant[];
  rolls: CarpetWizardRoll[];
  pieceLines: CarpetWizardPieceLine[];
  ftStock: CarpetWizardFtStock[];
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const DRAFT_KEY = 'nafaa.carpet-wizard.draft-v2';

const emptyBasic = (): CarpetWizardBasic => ({
  name: '',
  description: '',
  categoryId: '',
  brandId: '',
  designCode: '',
  sku: '',
  barcode: '',
  unit: 'sqft',
  stockType: 'ROLLS',
  costPricePerSqft: '',
  salePricePerSqft: '',
  wholesalePricePerSqft: '',
  taxRate: '',
  isFeatured: false,
  isActive: true,
  imageUrls: [],
  tagIds: [],
});

const emptyDraft = (): CarpetWizardDraft => ({
  step: 1,
  basic: emptyBasic(),
  hasVariants: false,
  variants: [],
  rolls: [],
  pieceLines: [],
  ftStock: [],
});

/**
 * Resolve effective stock type for a variant.
 * If product is MIXED, use variant's override (default ROLLS).
 * Otherwise use product's stock type.
 */
export function resolveVariantStockType(
  basic: CarpetWizardBasic,
  variant?: CarpetWizardVariant,
): 'ROLLS' | 'PIECES' | 'FT' {
  if (basic.stockType === 'MIXED') {
    const override = variant?.stockTypeOverride;
    if (override && override !== 'MIXED') return override;
    return 'ROLLS';
  }
  return basic.stockType;
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

export function useCarpetWizard(opts?: { autoLoadDraft?: boolean }) {
  const autoLoadDraft = opts?.autoLoadDraft !== false;

  const [draft, setDraft] = useState<CarpetWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);
  const loadedRef = useRef(false);

  // ─── Load draft on mount ────────────────────────────
  useEffect(() => {
    if (!autoLoadDraft || loadedRef.current) return;
    loadedRef.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CarpetWizardDraft;
      if (parsed?.basic?.name || parsed?.rolls?.length || parsed?.pieceLines?.length) {
        setDraft(parsed);
        setDraftRestored(true);
      }
    } catch {
      // ignore corrupted draft
    }
  }, [autoLoadDraft]);

  // ─── Auto-save draft ────────────────────────────────
  useEffect(() => {
    // Skip empty draft
    const isEmpty = !draft.basic.name && draft.variants.length === 0 &&
                    draft.rolls.length === 0 && draft.pieceLines.length === 0;
    if (isEmpty) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // storage full - ignore
    }
  }, [draft]);

  // ─── Navigation ─────────────────────────────────────
  const goToStep = useCallback((step: WizardStep) => {
    setDraft((d) => ({ ...d, step }));
    // Scroll to top for better UX
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const nextStep = useCallback(() => {
    setDraft((d) => ({ ...d, step: Math.min(3, d.step + 1) as WizardStep }));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const prevStep = useCallback(() => {
    setDraft((d) => ({ ...d, step: Math.max(1, d.step - 1) as WizardStep }));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // ─── Basic ──────────────────────────────────────────
  const updateBasic = useCallback((patch: Partial<CarpetWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  // ─── Variants ───────────────────────────────────────
  const setHasVariants = useCallback((v: boolean) => {
    setDraft((d) => ({
      ...d,
      hasVariants: v,
      // When toggling OFF, keep variants array but they won't be created
    }));
  }, []);

  const addVariant = useCallback(
    (v: Omit<CarpetWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) => {
      setDraft((d) => ({
        ...d,
        variants: [
          ...d.variants,
          {
            ...v,
            tempId: genId(),
            sortOrder: d.variants.length,
            isActive: true,
          },
        ],
      }));
    },
    [],
  );

  const updateVariant = useCallback((tempId: string, patch: Partial<CarpetWizardVariant>) => {
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)),
    }));
  }, []);

  const removeVariant = useCallback((tempId: string) => {
    setDraft((d) => ({
      ...d,
      variants: d.variants.filter((v) => v.tempId !== tempId),
      // Also cascade — remove rolls/pieces/ft for this variant
      rolls: d.rolls.filter((r) => r.variantTempId !== tempId),
      pieceLines: d.pieceLines.filter((p) => p.variantTempId !== tempId),
      ftStock: d.ftStock.filter((f) => f.variantTempId !== tempId),
    }));
  }, []);

  // ─── Rolls ──────────────────────────────────────────
  const addRoll = useCallback(
    (variantTempId: string | null, seed?: Partial<CarpetWizardRoll>) => {
      setDraft((d) => {
        const nextNumber = d.rolls.length + 1;
        const cost = Number(d.basic.costPricePerSqft || 0);
        const sale = Number(d.basic.salePricePerSqft || 0);
        const wholesale = Number(d.basic.wholesalePricePerSqft || 0);

        // If variant exists, prefer variant's overrides
        const variant = variantTempId ? d.variants.find((v) => v.tempId === variantTempId) : null;
        const effCost = variant?.costPriceOverride ?? cost;
        const effSale = variant?.salePriceOverride ?? sale;
        const effWholesale = variant?.wholesalePriceOverride ?? wholesale;

        return {
          ...d,
          rolls: [
            ...d.rolls,
            {
              tempId: genId(),
              variantTempId,
              rollNumber: `R-${String(nextNumber).padStart(3, '0')}`,
              widthFt: 12,
              widthInch: 0,
              lengthFt: 0,
              lengthInch: 0,
              costPerSqft: effCost,
              salePricePerSqft: effSale,
              wholesalePricePerSqft: effWholesale,
              rackNumber: '',
              quality: '',
              pile: '',
              notes: '',
              ...seed,
            },
          ],
        };
      });
    },
    [],
  );

  const duplicateRoll = useCallback((tempId: string) => {
    setDraft((d) => {
      const roll = d.rolls.find((r) => r.tempId === tempId);
      if (!roll) return d;
      const nextNumber = d.rolls.length + 1;
      return {
        ...d,
        rolls: [
          ...d.rolls,
          {
            ...roll,
            tempId: genId(),
            rollNumber: `R-${String(nextNumber).padStart(3, '0')}`,
          },
        ],
      };
    });
  }, []);

  const updateRoll = useCallback((tempId: string, patch: Partial<CarpetWizardRoll>) => {
    setDraft((d) => ({
      ...d,
      rolls: d.rolls.map((r) => (r.tempId === tempId ? { ...r, ...patch } : r)),
    }));
  }, []);

  const removeRoll = useCallback((tempId: string) => {
    setDraft((d) => ({ ...d, rolls: d.rolls.filter((r) => r.tempId !== tempId) }));
  }, []);

  // ─── Piece lines ────────────────────────────────────
  const addPieceLine = useCallback(
    (variantTempId: string | null, seed?: Partial<CarpetWizardPieceLine>) => {
      setDraft((d) => {
        const variant = variantTempId ? d.variants.find((v) => v.tempId === variantTempId) : null;
        const effCost = variant?.costPriceOverride ?? Number(d.basic.costPricePerSqft || 0);
        const effSale = variant?.salePriceOverride ?? Number(d.basic.salePricePerSqft || 0);
        const effWholesale = variant?.wholesalePriceOverride ?? Number(d.basic.wholesalePricePerSqft || 0);

        // Approximate defaults for piece pricing (using sqft rate × 6 sqft = 3x2 mat)
        return {
          ...d,
          pieceLines: [
            ...d.pieceLines,
            {
              tempId: genId(),
              variantTempId,
              pieceCode: `P-${String(d.pieceLines.length + 1).padStart(3, '0')}`,
              widthFt: 2,
              widthInch: 0,
              lengthFt: 3,
              lengthInch: 0,
              quantity: 1,
              costPricePerPiece: effCost * 6,
              salePricePerPiece: effSale * 6,
              wholesalePricePerPiece: effWholesale * 6,
              rackNumber: '',
              condition: 'Good',
              notes: '',
              ...seed,
            },
          ],
        };
      });
    },
    [],
  );

  const updatePieceLine = useCallback(
    (tempId: string, patch: Partial<CarpetWizardPieceLine>) => {
      setDraft((d) => ({
        ...d,
        pieceLines: d.pieceLines.map((p) => (p.tempId === tempId ? { ...p, ...patch } : p)),
      }));
    },
    [],
  );

  const duplicatePieceLine = useCallback((tempId: string) => {
    setDraft((d) => {
      const line = d.pieceLines.find((p) => p.tempId === tempId);
      if (!line) return d;
      return {
        ...d,
        pieceLines: [
          ...d.pieceLines,
          {
            ...line,
            tempId: genId(),
            pieceCode: `P-${String(d.pieceLines.length + 1).padStart(3, '0')}`,
          },
        ],
      };
    });
  }, []);

  const removePieceLine = useCallback((tempId: string) => {
    setDraft((d) => ({
      ...d,
      pieceLines: d.pieceLines.filter((p) => p.tempId !== tempId),
    }));
  }, []);

  // ─── FT stock ───────────────────────────────────────
  const upsertFtStock = useCallback(
    (variantTempId: string | null, patch: Partial<CarpetWizardFtStock>) => {
      setDraft((d) => {
        const existing = d.ftStock.find((f) => f.variantTempId === variantTempId);
        if (existing) {
          return {
            ...d,
            ftStock: d.ftStock.map((f) =>
              f.variantTempId === variantTempId ? { ...f, ...patch } : f,
            ),
          };
        }
        const variant = variantTempId ? d.variants.find((v) => v.tempId === variantTempId) : null;
        const effCost = variant?.costPriceOverride ?? Number(d.basic.costPricePerSqft || 0);
        const effSale = variant?.salePriceOverride ?? Number(d.basic.salePricePerSqft || 0);
        const effWholesale = variant?.wholesalePriceOverride ?? Number(d.basic.wholesalePricePerSqft || 0);
        return {
          ...d,
          ftStock: [
            ...d.ftStock,
            {
              variantTempId,
              currentFt: 0,
              lowStockAlertFt: 5,
              costPerFt: effCost,
              salePricePerFt: effSale,
              wholesalePricePerFt: effWholesale,
              rackNumber: '',
              notes: '',
              ...patch,
            },
          ],
        };
      });
    },
    [],
  );

  // ─── Direct setter (for edit mode hydration) ────────
  const setDraftDirect = useCallback((next: CarpetWizardDraft) => {
    setDraft(next);
    setDraftRestored(false);
  }, []);

  // ─── Reset ──────────────────────────────────────────
  const reset = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setDraft(emptyDraft());
    setDraftRestored(false);
  }, []);

  // ─── Validation ─────────────────────────────────────
  const validation = useMemo(() => {
    const step1Errors: string[] = [];
    if (!draft.basic.name.trim()) step1Errors.push('Product name is required');
    if (!draft.basic.salePricePerSqft || Number(draft.basic.salePricePerSqft) <= 0) {
      step1Errors.push('Sale price must be greater than 0');
    }
    if (draft.basic.costPricePerSqft !== '' && Number(draft.basic.costPricePerSqft) < 0) {
      step1Errors.push('Cost cannot be negative');
    }

    const step2Errors: string[] = [];
    if (draft.hasVariants) {
      if (draft.variants.length === 0) {
        step2Errors.push('Add at least one variant (or turn off variants)');
      }
      const names = new Set<string>();
      for (const v of draft.variants) {
        if (!v.name.trim()) {
          step2Errors.push('Variant name cannot be empty');
          break;
        }
        const key = v.name.trim().toLowerCase();
        if (names.has(key)) {
          step2Errors.push(`Duplicate variant name: ${v.name}`);
          break;
        }
        names.add(key);
      }
    }

    const step3Errors: string[] = [];
    // Validate rolls
    for (const r of draft.rolls) {
      if (!r.rollNumber.trim()) {
        step3Errors.push(`Roll #${draft.rolls.indexOf(r) + 1}: number required`);
        continue;
      }
      if (Number(r.widthFt) <= 0 && Number(r.widthInch) <= 0) {
        step3Errors.push(`Roll ${r.rollNumber}: width required`);
      }
      if (Number(r.lengthFt) <= 0 && Number(r.lengthInch) <= 0) {
        step3Errors.push(`Roll ${r.rollNumber}: length required`);
      }
    }
    // Validate pieces
    for (const p of draft.pieceLines) {
      if (Number(p.quantity) <= 0) {
        step3Errors.push(`Piece line ${p.pieceCode}: quantity required`);
      }
      if (Number(p.widthFt) <= 0 && Number(p.widthInch) <= 0) {
        step3Errors.push(`Piece ${p.pieceCode}: width required`);
      }
      if (Number(p.lengthFt) <= 0 && Number(p.lengthInch) <= 0) {
        step3Errors.push(`Piece ${p.pieceCode}: length required`);
      }
    }

    return {
      step1: { valid: step1Errors.length === 0, errors: step1Errors },
      step2: { valid: step2Errors.length === 0, errors: step2Errors },
      step3: { valid: step3Errors.length === 0, errors: step3Errors },
    };
  }, [draft]);

  // ─── Stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    let totalSqft = 0;
    let totalCost = 0;
    let totalSaleValue = 0;
    let pieceCount = 0;

    // Rolls
    for (const r of draft.rolls) {
      const w = Number(r.widthFt) + Number(r.widthInch || 0) / 12;
      const l = Number(r.lengthFt) + Number(r.lengthInch || 0) / 12;
      const sqft = w * l;
      totalSqft += sqft;
      totalCost += sqft * Number(r.costPerSqft || 0);
      totalSaleValue += sqft * Number(r.salePricePerSqft || 0);
    }

    // Pieces
    for (const p of draft.pieceLines) {
      const w = Number(p.widthFt) + Number(p.widthInch || 0) / 12;
      const l = Number(p.lengthFt) + Number(p.lengthInch || 0) / 12;
      const qty = Number(p.quantity || 0);
      totalSqft += w * l * qty;
      totalCost += Number(p.costPricePerPiece || 0) * qty;
      totalSaleValue += Number(p.salePricePerPiece || 0) * qty;
      pieceCount += qty;
    }

    // FT stock
    let ftTotal = 0;
    for (const f of draft.ftStock) {
      const ft = Number(f.currentFt || 0);
      ftTotal += ft;
      totalCost += ft * Number(f.costPerFt || 0);
      totalSaleValue += ft * Number(f.salePricePerFt || 0);
    }

    const potentialProfit = totalSaleValue - totalCost;
    const profitMargin = totalSaleValue > 0 ? (potentialProfit / totalSaleValue) * 100 : 0;

    return {
      variantCount: draft.hasVariants ? draft.variants.length : 0,
      rollCount: draft.rolls.length,
      pieceCount,
      pieceLineCount: draft.pieceLines.length,
      ftTotal,
      totalSqft,
      totalCost,
      totalSaleValue,
      potentialProfit,
      profitMargin,
    };
  }, [draft]);

  return {
    draft,
    draftRestored,
    validation,
    stats,
    goToStep,
    nextStep,
    prevStep,
    updateBasic,
    setHasVariants,
    addVariant,
    updateVariant,
    removeVariant,
    addRoll,
    duplicateRoll,
    updateRoll,
    removeRoll,
    addPieceLine,
    updatePieceLine,
    duplicatePieceLine,
    removePieceLine,
    upsertFtStock,
    reset,
    setDraftDirect,
  };
}
