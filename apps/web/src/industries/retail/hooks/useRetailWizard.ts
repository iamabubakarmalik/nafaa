import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.retail-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export interface RetailWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  sku: string;
  barcode: string;
  baseUnit: string;
  costPrice: number | '';
  salePrice: number | '';
  wholesalePrice: number | '';
  mrpPrice: number | '';
  taxRate: number | '';
  isFeatured: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
}

export interface RetailWizardUnit {
  tempId: string;
  unitName: string;
  unitLabel: string;
  conversionType: 'BASE' | 'PACK' | 'BOX' | 'DOZEN' | 'CARTON' | 'CUSTOM';
  conversionRate: number;
  price: number;
  costPrice: number;
  wholesalePrice?: number;
  mrpPrice?: number;
  barcode?: string;
  sku?: string;
  isBase: boolean;
  isDefault: boolean;
  isActive: boolean;
}

export interface RetailWizardVariant {
  tempId: string;
  name: string;
  sku?: string;
  barcode?: string;
  priceOverride?: number;
  costOverride?: number;
  stock: number;
  lowStockAlert: number;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface RetailWizardBatch {
  tempId: string;
  variantTempId: string | null;
  batchNumber: string;
  manufactureDate?: string;
  expiryDate?: string;
  quantity: number;
  costPrice: number;
  notes?: string;
}

export interface RetailWizardStock {
  currentStock: number;
  lowStockAlert: number;
  rackNumber: string;
}

export interface RetailWizardDraft {
  step: WizardStep;
  hasVariants: boolean;
  hasMultiUnits: boolean;
  trackBatches: boolean;
  basic: RetailWizardBasic;
  units: RetailWizardUnit[];
  variants: RetailWizardVariant[];
  batches: RetailWizardBatch[];
  stock: RetailWizardStock;
  savedAt: number;
}

const emptyBasic = (): RetailWizardBasic => ({
  name: '', description: '', categoryId: '', brandId: '',
  sku: '', barcode: '', baseUnit: 'pcs',
  costPrice: '', salePrice: '', wholesalePrice: '', mrpPrice: '',
  taxRate: '',
  isFeatured: false, isActive: true,
  imageUrls: [], tagIds: [],
});

const emptyDraft = (): RetailWizardDraft => ({
  step: 1,
  hasVariants: false,
  hasMultiUnits: false,
  trackBatches: false,
  basic: emptyBasic(),
  units: [],
  variants: [],
  batches: [],
  stock: { currentStock: 0, lowStockAlert: 5, rackNumber: '' },
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface UseRetailWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useRetailWizard(opts: UseRetailWizardOpts = {}) {
  const [draft, setDraft] = useState<RetailWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RetailWizardDraft;
        if (parsed && parsed.basic) {
          const safe: RetailWizardDraft = {
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            units: parsed.units ?? [],
            variants: parsed.variants ?? [],
            batches: parsed.batches ?? [],
            stock: parsed.stock ?? { currentStock: 0, lowStockAlert: 5, rackNumber: '' },
          };
          setDraft(safe);
          setDraftRestored(true);
          opts.onDraftLoaded?.();
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [draft]);

  const goToStep = useCallback((step: WizardStep) => {
    setDraft((d) => ({ ...d, step }));
  }, []);
  const nextStep = useCallback(() => {
    setDraft((d) => ({ ...d, step: (d.step < 3 ? d.step + 1 : 3) as WizardStep }));
  }, []);
  const prevStep = useCallback(() => {
    setDraft((d) => ({ ...d, step: (d.step > 1 ? d.step - 1 : 1) as WizardStep }));
  }, []);

  const updateBasic = useCallback((patch: Partial<RetailWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const setHasVariants = useCallback((v: boolean) => {
    setDraft((d) => (v ? { ...d, hasVariants: true } : { ...d, hasVariants: false, variants: [] }));
  }, []);

  const setHasMultiUnits = useCallback((v: boolean) => {
    setDraft((d) => {
      if (!v) return { ...d, hasMultiUnits: false, units: [] };
      // Auto-seed base unit
      if (d.units.length === 0) {
        return {
          ...d,
          hasMultiUnits: true,
          units: [{
            tempId: genId(),
            unitName: d.basic.baseUnit || 'pcs',
            unitLabel: `Base (${d.basic.baseUnit || 'pcs'})`,
            conversionType: 'BASE',
            conversionRate: 1,
            price: Number(d.basic.salePrice || 0),
            costPrice: Number(d.basic.costPrice || 0),
            wholesalePrice: d.basic.wholesalePrice ? Number(d.basic.wholesalePrice) : undefined,
            mrpPrice: d.basic.mrpPrice ? Number(d.basic.mrpPrice) : undefined,
            isBase: true,
            isDefault: true,
            isActive: true,
          }],
        };
      }
      return { ...d, hasMultiUnits: true };
    });
  }, []);

  const setTrackBatches = useCallback((v: boolean) => {
    setDraft((d) => (v ? { ...d, trackBatches: true } : { ...d, trackBatches: false, batches: [] }));
  }, []);

  const addUnit = useCallback((u: Omit<RetailWizardUnit, 'tempId' | 'isBase' | 'isDefault' | 'isActive'>) => {
    setDraft((d) => {
      const exists = d.units.some((x) => x.unitName.toLowerCase() === u.unitName.toLowerCase());
      if (exists) return d;
      return {
        ...d,
        units: [...d.units, { ...u, tempId: genId(), isBase: false, isDefault: false, isActive: true }],
      };
    });
  }, []);

  const updateUnit = useCallback((tempId: string, patch: Partial<RetailWizardUnit>) => {
    setDraft((d) => ({
      ...d,
      units: d.units.map((u) => (u.tempId === tempId ? { ...u, ...patch } : u)),
    }));
  }, []);

  const removeUnit = useCallback((tempId: string) => {
    setDraft((d) => {
      const target = d.units.find((u) => u.tempId === tempId);
      if (target?.isBase) return d; // Can't remove base
      return { ...d, units: d.units.filter((u) => u.tempId !== tempId) };
    });
  }, []);

  const addVariant = useCallback((v: Omit<RetailWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) => {
    setDraft((d) => ({
      ...d,
      variants: [...d.variants, { ...v, tempId: genId(), sortOrder: d.variants.length, isActive: true }],
    }));
  }, []);

  const updateVariant = useCallback((tempId: string, patch: Partial<RetailWizardVariant>) => {
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)),
    }));
  }, []);

  const removeVariant = useCallback((tempId: string) => {
    setDraft((d) => ({
      ...d,
      variants: d.variants.filter((v) => v.tempId !== tempId),
      batches: d.batches.filter((b) => b.variantTempId !== tempId),
    }));
  }, []);

  const addBatch = useCallback((variantTempId: string | null, seed: Partial<RetailWizardBatch> = {}) => {
    setDraft((d) => {
      const idx = d.batches.length + 1;
      return {
        ...d,
        batches: [...d.batches, {
          tempId: genId(),
          variantTempId,
          batchNumber: seed.batchNumber ?? `B-${String(idx).padStart(3, '0')}`,
          manufactureDate: seed.manufactureDate,
          expiryDate: seed.expiryDate,
          quantity: seed.quantity ?? 0,
          costPrice: seed.costPrice ?? Number(d.basic.costPrice || 0),
          notes: seed.notes,
        }],
      };
    });
  }, []);

  const updateBatch = useCallback((tempId: string, patch: Partial<RetailWizardBatch>) => {
    setDraft((d) => ({
      ...d,
      batches: d.batches.map((b) => (b.tempId === tempId ? { ...b, ...patch } : b)),
    }));
  }, []);

  const removeBatch = useCallback((tempId: string) => {
    setDraft((d) => ({ ...d, batches: d.batches.filter((b) => b.tempId !== tempId) }));
  }, []);

  const updateStock = useCallback((patch: Partial<RetailWizardStock>) => {
    setDraft((d) => ({ ...d, stock: { ...d.stock, ...patch } }));
  }, []);

  const reset = useCallback(() => {
    setDraft(emptyDraft());
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setDraftRestored(false);
  }, []);

  const validation = useMemo(() => {
    const step1Errors: string[] = [];
    if (!draft.basic.name.trim()) step1Errors.push('Product name required');
    if (!draft.basic.salePrice || Number(draft.basic.salePrice) <= 0) {
      step1Errors.push('Sale price required');
    }
    if (!draft.basic.baseUnit) step1Errors.push('Base unit required');

    const step2Errors: string[] = [];
    if (draft.hasMultiUnits) {
      const hasBase = draft.units.some((u) => u.isBase);
      if (!hasBase && draft.units.length > 0) step2Errors.push('At least one base unit required');
      const skuSet = new Set<string>();
      const barSet = new Set<string>();
      for (const u of draft.units) {
        if (!u.unitName.trim()) step2Errors.push('Unit name missing');
        if (u.conversionRate <= 0) step2Errors.push(`${u.unitName}: conversion rate must be > 0`);
        if (u.price <= 0) step2Errors.push(`${u.unitName}: price required`);
        if (u.sku?.trim()) {
          const k = u.sku.trim().toLowerCase();
          if (skuSet.has(k)) step2Errors.push(`Duplicate SKU: ${u.sku}`);
          skuSet.add(k);
        }
        if (u.barcode?.trim()) {
          const k = u.barcode.trim().toLowerCase();
          if (barSet.has(k)) step2Errors.push(`Duplicate barcode: ${u.barcode}`);
          barSet.add(k);
        }
      }
    }

    const step3Errors: string[] = [];
    if (draft.hasVariants && draft.variants.length === 0) {
      step3Errors.push('Add at least one variant, or switch off variants');
    }
    if (draft.trackBatches) {
      draft.batches.forEach((b) => {
        if (!b.batchNumber.trim()) step3Errors.push('Batch missing number');
        if (b.quantity <= 0) step3Errors.push(`Batch ${b.batchNumber}: quantity required`);
      });
    }

    return {
      step1: { valid: step1Errors.length === 0, errors: step1Errors },
      step2: { valid: step2Errors.length === 0, errors: step2Errors },
      step3: { valid: step3Errors.length === 0, errors: step3Errors },
      allValid: step1Errors.length === 0 && step2Errors.length === 0 && step3Errors.length === 0,
    };
  }, [draft]);

  const stats = useMemo(() => {
    const unitCount = draft.hasMultiUnits ? draft.units.length : 1;
    const variantCount = draft.variants.length;
    const batchCount = draft.batches.length;
    const batchStock = draft.batches.reduce((a, b) => a + Number(b.quantity || 0), 0);
    const variantStock = draft.variants.reduce((a, v) => a + Number(v.stock || 0), 0);
    const baseStock = draft.hasVariants || draft.trackBatches ? 0 : Number(draft.stock.currentStock || 0);
    const totalStock = baseStock + variantStock + batchStock;
    const salePrice = Number(draft.basic.salePrice || 0);
    const costPrice = Number(draft.basic.costPrice || 0);
    const stockValue = totalStock * salePrice;
    const stockCost = totalStock * costPrice;
    const potentialProfit = stockValue - stockCost;
    const profitMargin = stockValue > 0 ? (potentialProfit / stockValue) * 100 : 0;

    return {
      unitCount, variantCount, batchCount, totalStock,
      stockValue, stockCost, potentialProfit, profitMargin,
    };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic,
    setHasVariants, setHasMultiUnits, setTrackBatches,
    addUnit, updateUnit, removeUnit,
    addVariant, updateVariant, removeVariant,
    addBatch, updateBatch, removeBatch,
    updateStock,
    reset,
  };
}
