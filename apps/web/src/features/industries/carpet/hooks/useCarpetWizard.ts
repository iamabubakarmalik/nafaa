import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.carpet-wizard.draft';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type WizardStep = 1 | 2 | 3;

/**
 * Stock type controls how inventory is entered in Step 3:
 *   ROLLS  → per-roll width × length table (bade carpet)
 *   PIECES → discrete pieces / mats / centre pieces / rugs / prayer mats
 *   FT     → simple running-feet stock (linear)
 *   MIXED  → per-variant override — each variant can pick its own
 */
export type CarpetStockType = 'ROLLS' | 'PIECES' | 'FT' | 'MIXED';

export interface CarpetWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  designCode: string;
  sku: string;
  barcode: string;
  unit: 'sqft' | 'sqm' | 'sqyd' | 'ft' | 'pcs';
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
  // Per-variant price overrides — undefined means "use product default"
  costPriceOverride?: number;
  salePriceOverride?: number;
  wholesalePriceOverride?: number;
  // Per-variant stock type — only used when basic.stockType === 'MIXED'
  stockTypeOverride?: CarpetStockType;
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

/**
 * Discrete-piece stock line (mats, rugs, centre pieces, prayer mats).
 * Each row represents a batch of identical pieces at the same price.
 */
export interface CarpetWizardPieceLine {
  tempId: string;
  variantTempId: string | null;
  pieceCode: string;
  widthFt: number;
  widthInch: number;
  lengthFt: number;
  lengthInch: number;
  quantity: number;              // how many identical pieces
  costPricePerPiece: number;
  salePricePerPiece: number;
  wholesalePricePerPiece: number;
  rackNumber: string;
  condition: string;             // Good / Used / Sample
  notes: string;
}

/**
 * Simple linear-ft stock (per variant totals).
 * One line per variant — user just enters current stock in ft.
 */
export interface CarpetWizardFtStock {
  tempId: string;
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
  hasVariants: boolean;
  basic: CarpetWizardBasic;
  variants: CarpetWizardVariant[];
  rolls: CarpetWizardRoll[];
  pieceLines: CarpetWizardPieceLine[];
  ftStock: CarpetWizardFtStock[];
  savedAt: number;
}

// ═══════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════

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
  hasVariants: true,
  basic: emptyBasic(),
  variants: [],
  rolls: [],
  pieceLines: [],
  ftStock: [],
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ═══════════════════════════════════════════════════════════
// HELPER — resolve effective stock type for a variant
// ═══════════════════════════════════════════════════════════
export function resolveVariantStockType(
  basic: CarpetWizardBasic,
  variant: CarpetWizardVariant | undefined,
): 'ROLLS' | 'PIECES' | 'FT' {
  if (basic.stockType === 'MIXED') {
    const t = variant?.stockTypeOverride;
    if (t === 'ROLLS' || t === 'PIECES' || t === 'FT') return t;
    return 'ROLLS';
  }
  return basic.stockType as 'ROLLS' | 'PIECES' | 'FT';
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

interface UseCarpetWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useCarpetWizard(opts: UseCarpetWizardOpts = {}) {
  const [draft, setDraft] = useState<CarpetWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  // ─── LOAD DRAFT ──────────────────────────────────────
  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CarpetWizardDraft;
        if (parsed && parsed.basic) {
          // Backfill new fields if loaded from older draft
          const safe: CarpetWizardDraft = {
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            pieceLines: parsed.pieceLines ?? [],
            ftStock: parsed.ftStock ?? [],
          };
          setDraft(safe);
          setDraftRestored(true);
          opts.onDraftLoaded?.();
        }
      }
    } catch { /* corrupted draft */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── AUTO-SAVE ───────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
      } catch { /* quota */ }
    }, 400);
    return () => clearTimeout(t);
  }, [draft]);

  // ─── STEP NAV ────────────────────────────────────────
  const goToStep = useCallback((step: WizardStep) => {
    setDraft((d) => ({ ...d, step }));
  }, []);
  const nextStep = useCallback(() => {
    setDraft((d) => ({ ...d, step: (d.step < 3 ? d.step + 1 : 3) as WizardStep }));
  }, []);
  const prevStep = useCallback(() => {
    setDraft((d) => ({ ...d, step: (d.step > 1 ? d.step - 1 : 1) as WizardStep }));
  }, []);

  // ─── BASIC ───────────────────────────────────────────
  const updateBasic = useCallback((patch: Partial<CarpetWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  // ─── VARIANTS ────────────────────────────────────────
  const setHasVariants = useCallback((v: boolean) => {
    setDraft((d) => {
      if (!v) return { ...d, hasVariants: false, variants: [] };
      return { ...d, hasVariants: true };
    });
  }, []);

  const addVariant = useCallback(
    (v: Omit<CarpetWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) => {
      setDraft((d) => {
        const exists = d.variants.some(
          (x) => x.name.trim().toLowerCase() === v.name.trim().toLowerCase(),
        );
        if (exists) return d;
        return {
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
        };
      });
    },
    [],
  );

  const updateVariant = useCallback(
    (tempId: string, patch: Partial<CarpetWizardVariant>) => {
      setDraft((d) => ({
        ...d,
        variants: d.variants.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)),
      }));
    },
    [],
  );

  const removeVariant = useCallback((tempId: string) => {
    setDraft((d) => ({
      ...d,
      variants: d.variants.filter((v) => v.tempId !== tempId),
      rolls: d.rolls.filter((r) => r.variantTempId !== tempId),
      pieceLines: d.pieceLines.filter((p) => p.variantTempId !== tempId),
      ftStock: d.ftStock.filter((f) => f.variantTempId !== tempId),
    }));
  }, []);

  // ─── ROLLS ───────────────────────────────────────────
  const addRoll = useCallback(
    (variantTempId: string | null, seed: Partial<CarpetWizardRoll> = {}) => {
      setDraft((d) => {
        const nextIndex = d.rolls.length + 1;
        const basic = d.basic;
        const variant = d.variants.find((v) => v.tempId === variantTempId);

        const cost = variant?.costPriceOverride ?? Number(basic.costPricePerSqft || 0);
        const sale = variant?.salePriceOverride ?? Number(basic.salePricePerSqft || 0);
        const wholesale = variant?.wholesalePriceOverride ?? Number(basic.wholesalePricePerSqft || 0);

        const newRoll: CarpetWizardRoll = {
          tempId: genId(),
          variantTempId,
          rollNumber: seed.rollNumber ?? `R-${String(nextIndex).padStart(3, '0')}`,
          widthFt: seed.widthFt ?? 12,
          widthInch: seed.widthInch ?? 0,
          lengthFt: seed.lengthFt ?? 0,
          lengthInch: seed.lengthInch ?? 0,
          costPerSqft: seed.costPerSqft ?? cost,
          salePricePerSqft: seed.salePricePerSqft ?? sale,
          wholesalePricePerSqft: seed.wholesalePricePerSqft ?? wholesale,
          rackNumber: seed.rackNumber ?? '',
          quality: seed.quality ?? '',
          pile: seed.pile ?? '',
          notes: seed.notes ?? '',
        };
        return { ...d, rolls: [...d.rolls, newRoll] };
      });
    },
    [],
  );

  const duplicateRoll = useCallback((tempId: string) => {
    setDraft((d) => {
      const src = d.rolls.find((r) => r.tempId === tempId);
      if (!src) return d;
      const nextIndex = d.rolls.length + 1;
      return {
        ...d,
        rolls: [
          ...d.rolls,
          { ...src, tempId: genId(), rollNumber: `R-${String(nextIndex).padStart(3, '0')}` },
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

  // ─── PIECE LINES ─────────────────────────────────────
  const addPieceLine = useCallback(
    (variantTempId: string | null, seed: Partial<CarpetWizardPieceLine> = {}) => {
      setDraft((d) => {
        const nextIndex = d.pieceLines.length + 1;
        const basic = d.basic;
        const variant = d.variants.find((v) => v.tempId === variantTempId);
        const salePriceForArea = variant?.salePriceOverride ?? Number(basic.salePricePerSqft || 0);
        const costForArea = variant?.costPriceOverride ?? Number(basic.costPricePerSqft || 0);
        const wholesaleForArea = variant?.wholesalePriceOverride ?? Number(basic.wholesalePricePerSqft || 0);

        const line: CarpetWizardPieceLine = {
          tempId: genId(),
          variantTempId,
          pieceCode: seed.pieceCode ?? `P-${String(nextIndex).padStart(3, '0')}`,
          widthFt: seed.widthFt ?? 0,
          widthInch: seed.widthInch ?? 0,
          lengthFt: seed.lengthFt ?? 0,
          lengthInch: seed.lengthInch ?? 0,
          quantity: seed.quantity ?? 1,
          costPricePerPiece: seed.costPricePerPiece ?? costForArea,
          salePricePerPiece: seed.salePricePerPiece ?? salePriceForArea,
          wholesalePricePerPiece: seed.wholesalePricePerPiece ?? wholesaleForArea,
          rackNumber: seed.rackNumber ?? '',
          condition: seed.condition ?? 'Good',
          notes: seed.notes ?? '',
        };
        return { ...d, pieceLines: [...d.pieceLines, line] };
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
      const src = d.pieceLines.find((p) => p.tempId === tempId);
      if (!src) return d;
      const nextIndex = d.pieceLines.length + 1;
      return {
        ...d,
        pieceLines: [
          ...d.pieceLines,
          { ...src, tempId: genId(), pieceCode: `P-${String(nextIndex).padStart(3, '0')}` },
        ],
      };
    });
  }, []);

  const removePieceLine = useCallback((tempId: string) => {
    setDraft((d) => ({ ...d, pieceLines: d.pieceLines.filter((p) => p.tempId !== tempId) }));
  }, []);

  // ─── FT STOCK ────────────────────────────────────────
  const upsertFtStock = useCallback(
    (variantTempId: string | null, patch: Partial<CarpetWizardFtStock>) => {
      setDraft((d) => {
        const existing = d.ftStock.find((f) => f.variantTempId === variantTempId);
        if (existing) {
          return {
            ...d,
            ftStock: d.ftStock.map((f) =>
              f.tempId === existing.tempId ? { ...f, ...patch } : f,
            ),
          };
        }
        const basic = d.basic;
        const variant = d.variants.find((v) => v.tempId === variantTempId);
        const cost = variant?.costPriceOverride ?? Number(basic.costPricePerSqft || 0);
        const sale = variant?.salePriceOverride ?? Number(basic.salePricePerSqft || 0);
        const wholesale = variant?.wholesalePriceOverride ?? Number(basic.wholesalePricePerSqft || 0);

        const newFt: CarpetWizardFtStock = {
          tempId: genId(),
          variantTempId,
          currentFt: patch.currentFt ?? 0,
          lowStockAlertFt: patch.lowStockAlertFt ?? 5,
          costPerFt: patch.costPerFt ?? cost,
          salePricePerFt: patch.salePricePerFt ?? sale,
          wholesalePricePerFt: patch.wholesalePricePerFt ?? wholesale,
          rackNumber: patch.rackNumber ?? '',
          notes: patch.notes ?? '',
          ...patch,
        };
        return { ...d, ftStock: [...d.ftStock, newFt] };
      });
    },
    [],
  );

  // ─── RESET ───────────────────────────────────────────
  const reset = useCallback(() => {
    setDraft(emptyDraft());
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setDraftRestored(false);
  }, []);

  /** Replace the entire draft — used for edit-mode hydration */
  const setDraftDirect = useCallback((next: Partial<CarpetWizardDraft>) => {
    setDraft((d) => ({ ...d, ...next, savedAt: Date.now() }));
  }, []);

  // ─── VALIDATION ──────────────────────────────────────
  const validation = useMemo(() => {
    const step1Errors: string[] = [];
    if (!draft.basic.name.trim()) step1Errors.push('Product name required');
    if (!draft.basic.salePricePerSqft || Number(draft.basic.salePricePerSqft) <= 0) {
      step1Errors.push('Sale price required');
    }

    const step2Errors: string[] = [];
    if (draft.hasVariants && draft.variants.length === 0) {
      step2Errors.push('Add at least one color/design, or switch off variants');
    }
    // Duplicate SKU / barcode check across variants
    const skuSet = new Set<string>();
    const barSet = new Set<string>();
    for (const v of draft.variants) {
      if (v.sku?.trim()) {
        const k = v.sku.trim().toLowerCase();
        if (skuSet.has(k)) step2Errors.push(`Duplicate SKU: ${v.sku}`);
        skuSet.add(k);
      }
      if (v.barcode?.trim()) {
        const k = v.barcode.trim().toLowerCase();
        if (barSet.has(k)) step2Errors.push(`Duplicate barcode: ${v.barcode}`);
        barSet.add(k);
      }
    }

    const step3Errors: string[] = [];
    draft.rolls.forEach((r) => {
      if (!r.rollNumber.trim()) step3Errors.push(`Roll: number missing`);
      if (r.widthFt <= 0) step3Errors.push(`Roll ${r.rollNumber}: width required`);
      if (r.lengthFt <= 0) step3Errors.push(`Roll ${r.rollNumber}: length required`);
    });
    draft.pieceLines.forEach((p) => {
      if (p.quantity <= 0) step3Errors.push(`Piece ${p.pieceCode}: quantity required`);
      if (p.salePricePerPiece <= 0) step3Errors.push(`Piece ${p.pieceCode}: sale price required`);
    });

    return {
      step1: { valid: step1Errors.length === 0, errors: step1Errors },
      step2: { valid: step2Errors.length === 0, errors: step2Errors },
      step3: { valid: step3Errors.length === 0, errors: step3Errors },
      allValid:
        step1Errors.length === 0 && step2Errors.length === 0 && step3Errors.length === 0,
    };
  }, [draft]);

  // ─── STATS ───────────────────────────────────────────
  const stats = useMemo(() => {
    // Rolls
    const rollSqft = draft.rolls.reduce((acc, r) => {
      const w = Number(r.widthFt) + Number(r.widthInch || 0) / 12;
      const l = Number(r.lengthFt) + Number(r.lengthInch || 0) / 12;
      return acc + w * l;
    }, 0);
    const rollCost = draft.rolls.reduce((acc, r) => {
      const w = Number(r.widthFt) + Number(r.widthInch || 0) / 12;
      const l = Number(r.lengthFt) + Number(r.lengthInch || 0) / 12;
      return acc + w * l * Number(r.costPerSqft || 0);
    }, 0);
    const rollSale = draft.rolls.reduce((acc, r) => {
      const w = Number(r.widthFt) + Number(r.widthInch || 0) / 12;
      const l = Number(r.lengthFt) + Number(r.lengthInch || 0) / 12;
      return acc + w * l * Number(r.salePricePerSqft || 0);
    }, 0);

    // Pieces
    const pieceCount = draft.pieceLines.reduce((acc, p) => acc + Number(p.quantity || 0), 0);
    const pieceSqft = draft.pieceLines.reduce((acc, p) => {
      const w = Number(p.widthFt) + Number(p.widthInch || 0) / 12;
      const l = Number(p.lengthFt) + Number(p.lengthInch || 0) / 12;
      return acc + w * l * Number(p.quantity || 0);
    }, 0);
    const pieceCost = draft.pieceLines.reduce(
      (acc, p) => acc + Number(p.costPricePerPiece || 0) * Number(p.quantity || 0),
      0,
    );
    const pieceSale = draft.pieceLines.reduce(
      (acc, p) => acc + Number(p.salePricePerPiece || 0) * Number(p.quantity || 0),
      0,
    );

    // Ft
    const ftTotal = draft.ftStock.reduce((acc, f) => acc + Number(f.currentFt || 0), 0);
    const ftCost = draft.ftStock.reduce(
      (acc, f) => acc + Number(f.currentFt || 0) * Number(f.costPerFt || 0),
      0,
    );
    const ftSale = draft.ftStock.reduce(
      (acc, f) => acc + Number(f.currentFt || 0) * Number(f.salePricePerFt || 0),
      0,
    );

    const totalSqft = rollSqft + pieceSqft;
    const totalCost = rollCost + pieceCost + ftCost;
    const totalSaleValue = rollSale + pieceSale + ftSale;
    const potentialProfit = totalSaleValue - totalCost;
    const profitMargin = totalSaleValue > 0 ? (potentialProfit / totalSaleValue) * 100 : 0;

    return {
      variantCount: draft.variants.length,
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
