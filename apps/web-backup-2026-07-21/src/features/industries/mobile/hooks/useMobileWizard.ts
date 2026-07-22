import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PtaStatus } from '../api/imei.api';

const DRAFT_KEY = 'nafaa.mobile-wizard.draft';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type WizardStep = 1 | 2 | 3;

/**
 * Product type controls Step 3 layout:
 *   PHONE       → per-variant IMEI table (dual-SIM, PTA)
 *   ACCESSORY   → simple quantity stock per variant (chargers, cases)
 *   MIXED       → per-variant override
 */
export type MobileProductType = 'PHONE' | 'ACCESSORY' | 'MIXED';

export interface MobileWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  modelNumber: string;
  sku: string;
  barcode: string;
  productType: MobileProductType;
  costPrice: number | '';
  salePrice: number | '';
  wholesalePrice: number | '';
  taxRate: number | '';
  warrantyMonths: number | '';
  defaultPtaStatus: PtaStatus;
  isFeatured: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
}

export interface MobileWizardVariant {
  tempId: string;
  name: string;              // e.g. "Titanium Black 256GB"
  color: string;             // "Titanium Black"
  colorHex: string;
  storage?: string;          // "256GB"
  ram?: string;              // "8GB"
  sku?: string;
  barcode?: string;
  // Per-variant price overrides
  costPriceOverride?: number;
  salePriceOverride?: number;
  wholesalePriceOverride?: number;
  // Per-variant product type override (for MIXED)
  productTypeOverride?: 'PHONE' | 'ACCESSORY';
  imageUrl?: string;
  notes?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface MobileWizardImeiLine {
  tempId: string;
  variantTempId: string | null;
  imei1: string;
  imei2?: string;            // dual-SIM secondary
  serialNumber?: string;
  color?: string;            // per-IMEI color override
  ptaStatus: PtaStatus;
  ptaTaxPaid?: number;
  costPriceOverride?: number;
  warrantyMonthsOverride?: number;
  notes?: string;
}

/**
 * Simple-stock line for ACCESSORY variants (chargers, cases, cables).
 * One row per variant — user enters current stock in units.
 */
export interface MobileWizardAccessoryStock {
  tempId: string;
  variantTempId: string | null;
  currentStock: number;
  lowStockAlert: number;
  rackNumber: string;
  notes: string;
}

export interface MobileWizardDraft {
  step: WizardStep;
  hasVariants: boolean;
  basic: MobileWizardBasic;
  variants: MobileWizardVariant[];
  imeiLines: MobileWizardImeiLine[];
  accessoryStock: MobileWizardAccessoryStock[];
  savedAt: number;
}

// ═══════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════

const emptyBasic = (): MobileWizardBasic => ({
  name: '',
  description: '',
  categoryId: '',
  brandId: '',
  modelNumber: '',
  sku: '',
  barcode: '',
  productType: 'PHONE',
  costPrice: '',
  salePrice: '',
  wholesalePrice: '',
  taxRate: '',
  warrantyMonths: 12,
  defaultPtaStatus: 'APPROVED',
  isFeatured: false,
  isActive: true,
  imageUrls: [],
  tagIds: [],
});

const emptyDraft = (): MobileWizardDraft => ({
  step: 1,
  hasVariants: true,
  basic: emptyBasic(),
  variants: [],
  imeiLines: [],
  accessoryStock: [],
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ═══════════════════════════════════════════════════════════
// HELPER — resolve effective product type for a variant
// ═══════════════════════════════════════════════════════════
export function resolveVariantProductType(
  basic: MobileWizardBasic,
  variant: MobileWizardVariant | undefined,
): 'PHONE' | 'ACCESSORY' {
  if (basic.productType === 'MIXED') {
    return variant?.productTypeOverride ?? 'PHONE';
  }
  return basic.productType as 'PHONE' | 'ACCESSORY';
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

interface UseMobileWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useMobileWizard(opts: UseMobileWizardOpts = {}) {
  const [draft, setDraft] = useState<MobileWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  // ─── LOAD DRAFT ──────────────────────────────────────
  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MobileWizardDraft;
        if (parsed && parsed.basic) {
          const safe: MobileWizardDraft = {
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            imeiLines: parsed.imeiLines ?? [],
            accessoryStock: parsed.accessoryStock ?? [],
          };
          setDraft(safe);
          setDraftRestored(true);
          opts.onDraftLoaded?.();
        }
      }
    } catch { /* corrupted */ }
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
  const updateBasic = useCallback((patch: Partial<MobileWizardBasic>) => {
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
    (v: Omit<MobileWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) => {
      setDraft((d) => {
        const exists = d.variants.some(
          (x) => x.name.trim().toLowerCase() === v.name.trim().toLowerCase(),
        );
        if (exists) return d;
        return {
          ...d,
          variants: [
            ...d.variants,
            { ...v, tempId: genId(), sortOrder: d.variants.length, isActive: true },
          ],
        };
      });
    },
    [],
  );

  const addVariantsMatrix = useCallback(
    (colors: Array<{ name: string; hex: string }>, storages: string[]) => {
      setDraft((d) => {
        const existingNames = new Set(d.variants.map((v) => v.name.trim().toLowerCase()));
        const additions: MobileWizardVariant[] = [];
        let order = d.variants.length;

        for (const c of colors) {
          for (const s of storages) {
            const name = s ? `${c.name} ${s}` : c.name;
            if (existingNames.has(name.trim().toLowerCase())) continue;
            existingNames.add(name.trim().toLowerCase());
            additions.push({
              tempId: genId(),
              name,
              color: c.name,
              colorHex: c.hex,
              storage: s || undefined,
              sortOrder: order++,
              isActive: true,
            });
          }
        }
        return { ...d, variants: [...d.variants, ...additions] };
      });
    },
    [],
  );

  const updateVariant = useCallback(
    (tempId: string, patch: Partial<MobileWizardVariant>) => {
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
      imeiLines: d.imeiLines.filter((l) => l.variantTempId !== tempId),
      accessoryStock: d.accessoryStock.filter((s) => s.variantTempId !== tempId),
    }));
  }, []);

  // ─── IMEI LINES ──────────────────────────────────────
  const addImeiLine = useCallback(
    (variantTempId: string | null, seed: Partial<MobileWizardImeiLine> = {}) => {
      setDraft((d) => {
        const variant = d.variants.find((v) => v.tempId === variantTempId);
        const line: MobileWizardImeiLine = {
          tempId: genId(),
          variantTempId,
          imei1: seed.imei1 ?? '',
          imei2: seed.imei2,
          serialNumber: seed.serialNumber,
          color: seed.color ?? variant?.color,
          ptaStatus: seed.ptaStatus ?? d.basic.defaultPtaStatus,
          ptaTaxPaid: seed.ptaTaxPaid,
          costPriceOverride: seed.costPriceOverride,
          warrantyMonthsOverride: seed.warrantyMonthsOverride,
          notes: seed.notes,
        };
        return { ...d, imeiLines: [...d.imeiLines, line] };
      });
    },
    [],
  );

  const addImeisBulk = useCallback(
    (variantTempId: string | null, imeiList: string[]) => {
      setDraft((d) => {
        const variant = d.variants.find((v) => v.tempId === variantTempId);
        const existing = new Set(d.imeiLines.map((l) => l.imei1).filter(Boolean));
        const additions: MobileWizardImeiLine[] = [];
        for (const raw of imeiList) {
          const imei = raw.replace(/\D/g, '').slice(0, 15);
          if (imei.length !== 15) continue;
          if (existing.has(imei)) continue;
          existing.add(imei);
          additions.push({
            tempId: genId(),
            variantTempId,
            imei1: imei,
            color: variant?.color,
            ptaStatus: d.basic.defaultPtaStatus,
          });
        }
        return { ...d, imeiLines: [...d.imeiLines, ...additions] };
      });
    },
    [],
  );

  const updateImeiLine = useCallback(
    (tempId: string, patch: Partial<MobileWizardImeiLine>) => {
      setDraft((d) => ({
        ...d,
        imeiLines: d.imeiLines.map((l) => (l.tempId === tempId ? { ...l, ...patch } : l)),
      }));
    },
    [],
  );

  const removeImeiLine = useCallback((tempId: string) => {
    setDraft((d) => ({ ...d, imeiLines: d.imeiLines.filter((l) => l.tempId !== tempId) }));
  }, []);

  const applyPtaToAll = useCallback((status: PtaStatus) => {
    setDraft((d) => ({
      ...d,
      imeiLines: d.imeiLines.map((l) => ({ ...l, ptaStatus: status })),
    }));
  }, []);

  // ─── ACCESSORY STOCK ─────────────────────────────────
  const upsertAccessoryStock = useCallback(
    (variantTempId: string | null, patch: Partial<MobileWizardAccessoryStock>) => {
      setDraft((d) => {
        const existing = d.accessoryStock.find((s) => s.variantTempId === variantTempId);
        if (existing) {
          return {
            ...d,
            accessoryStock: d.accessoryStock.map((s) =>
              s.tempId === existing.tempId ? { ...s, ...patch } : s,
            ),
          };
        }
        const newStock: MobileWizardAccessoryStock = {
          tempId: genId(),
          variantTempId,
          currentStock: patch.currentStock ?? 0,
          lowStockAlert: patch.lowStockAlert ?? 5,
          rackNumber: patch.rackNumber ?? '',
          notes: patch.notes ?? '',
          ...patch,
        };
        return { ...d, accessoryStock: [...d.accessoryStock, newStock] };
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

  // ─── VALIDATION ──────────────────────────────────────
  const validation = useMemo(() => {
    const step1Errors: string[] = [];
    if (!draft.basic.name.trim()) step1Errors.push('Product name required');
    if (!draft.basic.salePrice || Number(draft.basic.salePrice) <= 0) {
      step1Errors.push('Sale price required');
    }

    const step2Errors: string[] = [];
    if (draft.hasVariants && draft.variants.length === 0) {
      step2Errors.push('Add at least one variant, or switch off variants');
    }
    // Duplicate SKU / barcode check
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
    // IMEI validation
    const imeiSet = new Set<string>();
    draft.imeiLines.forEach((l) => {
      if (!l.imei1?.trim()) {
        step3Errors.push('IMEI line missing IMEI');
      } else if (l.imei1.length !== 15) {
        step3Errors.push(`IMEI must be 15 digits: ${l.imei1}`);
      } else if (imeiSet.has(l.imei1)) {
        step3Errors.push(`Duplicate IMEI: ${l.imei1}`);
      } else {
        imeiSet.add(l.imei1);
      }
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
    const imeiCount = draft.imeiLines.length;
    const validImeiCount = draft.imeiLines.filter((l) => l.imei1?.length === 15).length;
    const accessoryUnits = draft.accessoryStock.reduce(
      (a, s) => a + Number(s.currentStock || 0), 0,
    );

    // Cost / sale valuation
    const salePrice = Number(draft.basic.salePrice || 0);
    const costPrice = Number(draft.basic.costPrice || 0);

    const imeiCost = draft.imeiLines.reduce((a, l) => {
      const v = draft.variants.find((vv) => vv.tempId === l.variantTempId);
      const cost = l.costPriceOverride ?? v?.costPriceOverride ?? costPrice;
      return a + Number(cost || 0);
    }, 0);
    const imeiSale = draft.imeiLines.reduce((a, l) => {
      const v = draft.variants.find((vv) => vv.tempId === l.variantTempId);
      const sale = v?.salePriceOverride ?? salePrice;
      return a + Number(sale || 0);
    }, 0);

    const accCost = draft.accessoryStock.reduce((a, s) => {
      const v = draft.variants.find((vv) => vv.tempId === s.variantTempId);
      const cost = v?.costPriceOverride ?? costPrice;
      return a + Number(cost || 0) * Number(s.currentStock || 0);
    }, 0);
    const accSale = draft.accessoryStock.reduce((a, s) => {
      const v = draft.variants.find((vv) => vv.tempId === s.variantTempId);
      const sale = v?.salePriceOverride ?? salePrice;
      return a + Number(sale || 0) * Number(s.currentStock || 0);
    }, 0);

    const totalCost = imeiCost + accCost;
    const totalSaleValue = imeiSale + accSale;
    const potentialProfit = totalSaleValue - totalCost;
    const profitMargin = totalSaleValue > 0 ? (potentialProfit / totalSaleValue) * 100 : 0;

    // PTA breakdown
    const ptaBreakdown: Record<string, number> = {};
    draft.imeiLines.forEach((l) => {
      const key = l.ptaStatus || 'APPROVED';
      ptaBreakdown[key] = (ptaBreakdown[key] || 0) + 1;
    });

    return {
      variantCount: draft.variants.length,
      imeiCount,
      validImeiCount,
      accessoryUnits,
      totalUnits: imeiCount + accessoryUnits,
      totalCost,
      totalSaleValue,
      potentialProfit,
      profitMargin,
      ptaBreakdown,
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
    addVariantsMatrix,
    updateVariant,
    removeVariant,

    addImeiLine,
    addImeisBulk,
    updateImeiLine,
    removeImeiLine,
    applyPtaToAll,

    upsertAccessoryStock,

    reset,
  };
}
