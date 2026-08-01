import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.florist-wizard.draft';

export type WizardStep = 1 | 2 | 3 | 4;

export interface FloristWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  categoryType: string;
  freshnessGrade: string;
  sku: string;
  barcode: string;
  unit: string;
  costPrice: number | '';
  retailPrice: number | '';
  wholesalePrice: number | '';
  weddingPrice: number | '';
  mrp: number | '';
  taxRate: number | '';
  isFeatured: boolean;
  isBestSeller: boolean;
  isSeasonalSpecial: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
  notes: string;
}

export interface FloristWizardDetails {
  flowerType: string;
  color: string;
  colorHex: string;
  stemLengthCm: number | '';
  isImported: boolean;
  origin: string;
  season: string[];
  arrivalDate: string;
  freshUntil: string;
  daysToWither: number | '';
  isPreArranged: boolean;
  bouquetSize: string;
  stemCount: number | '';
  wrapType: string;
  ribbonColor: string;
  hasVase: boolean;
}

export interface FloristWizardOccasions {
  occasions: string[];
  meaning: string;
  careInstructions: string;
  isCustomizable: boolean;
  customizationOptions: string[];
  minLeadTimeHours: number | '';
}

export interface FloristWizardVariant {
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

export interface FloristWizardStock {
  currentStock: number;
  lowStockAlert: number;
  rackNumber: string;
}

export interface FloristWizardDraft {
  step: WizardStep;
  hasVariants: boolean;
  basic: FloristWizardBasic;
  details: FloristWizardDetails;
  occasions: FloristWizardOccasions;
  variants: FloristWizardVariant[];
  stock: FloristWizardStock;
  savedAt: number;
}

const emptyBasic = (): FloristWizardBasic => ({
  name: '', description: '', categoryId: '',
  categoryType: 'BOUQUET', freshnessGrade: 'PREMIUM_A',
  sku: '', barcode: '', unit: 'pcs',
  costPrice: '', retailPrice: '', wholesalePrice: '', weddingPrice: '', mrp: '',
  taxRate: '',
  isFeatured: false, isBestSeller: false, isSeasonalSpecial: false, isActive: true,
  imageUrls: [], tagIds: [], notes: '',
});

const emptyDetails = (): FloristWizardDetails => ({
  flowerType: '', color: '', colorHex: '',
  stemLengthCm: '', isImported: false, origin: '',
  season: [], arrivalDate: '', freshUntil: '', daysToWither: 5,
  isPreArranged: true, bouquetSize: '', stemCount: '',
  wrapType: '', ribbonColor: '', hasVase: false,
});

const emptyOccasions = (): FloristWizardOccasions => ({
  occasions: [], meaning: '', careInstructions: '',
  isCustomizable: false, customizationOptions: [], minLeadTimeHours: 2,
});

const emptyDraft = (): FloristWizardDraft => ({
  step: 1,
  hasVariants: false,
  basic: emptyBasic(),
  details: emptyDetails(),
  occasions: emptyOccasions(),
  variants: [],
  stock: { currentStock: 0, lowStockAlert: 3, rackNumber: '' },
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const isBouquetCategory = (c: string) =>
  ['BOUQUET', 'BRIDAL_BOUQUET', 'ARRANGEMENT', 'BASKET', 'WREATH', 'CENTERPIECE', 'CHOCOLATE_BOUQUET', 'BALLOON_BOUQUET'].includes(c);
export const isFreshFlowerCategory = (c: string) =>
  ['FRESH_FLOWER_STEM', 'BOUQUET', 'BRIDAL_BOUQUET', 'BOUTONNIERE', 'CORSAGE', 'FLOWER_CROWN', 'ARRANGEMENT', 'CENTERPIECE', 'WREATH', 'GARLAND'].includes(c);
export const isPlantCategory = (c: string) =>
  ['POTTED_PLANT', 'INDOOR_PLANT', 'OUTDOOR_PLANT', 'SUCCULENT', 'CACTUS'].includes(c);

interface Opts { autoLoadDraft?: boolean; onDraftLoaded?: () => void }

export function useFloristWizard(opts: Opts = {}) {
  const [draft, setDraft] = useState<FloristWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FloristWizardDraft;
        if (parsed?.basic) {
          setDraft({
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            details: { ...emptyDetails(), ...parsed.details },
            occasions: { ...emptyOccasions(), ...parsed.occasions },
            variants: parsed.variants ?? [],
            stock: parsed.stock ?? { currentStock: 0, lowStockAlert: 3, rackNumber: '' },
          });
          setDraftRestored(true);
          opts.onDraftLoaded?.();
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() })); } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [draft]);

  const goToStep = useCallback((step: WizardStep) => setDraft((d) => ({ ...d, step })), []);
  const nextStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step < 4 ? d.step + 1 : 4) as WizardStep })), []);
  const prevStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step > 1 ? d.step - 1 : 1) as WizardStep })), []);

  const updateBasic = useCallback((patch: Partial<FloristWizardBasic>) =>
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } })), []);
  const updateDetails = useCallback((patch: Partial<FloristWizardDetails>) =>
    setDraft((d) => ({ ...d, details: { ...d.details, ...patch } })), []);
  const updateOccasions = useCallback((patch: Partial<FloristWizardOccasions>) =>
    setDraft((d) => ({ ...d, occasions: { ...d.occasions, ...patch } })), []);

  const setHasVariants = useCallback((v: boolean) =>
    setDraft((d) => (v ? { ...d, hasVariants: true } : { ...d, hasVariants: false, variants: [] })), []);

  const addVariant = useCallback((v: Omit<FloristWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) =>
    setDraft((d) => ({
      ...d,
      variants: [...d.variants, { ...v, tempId: genId(), sortOrder: d.variants.length, isActive: true }],
    })), []);
  const updateVariant = useCallback((tempId: string, patch: Partial<FloristWizardVariant>) =>
    setDraft((d) => ({ ...d, variants: d.variants.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)) })), []);
  const removeVariant = useCallback((tempId: string) =>
    setDraft((d) => ({ ...d, variants: d.variants.filter((v) => v.tempId !== tempId) })), []);

  const updateStock = useCallback((patch: Partial<FloristWizardStock>) =>
    setDraft((d) => ({ ...d, stock: { ...d.stock, ...patch } })), []);

  const reset = useCallback(() => {
    setDraft(emptyDraft());
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setDraftRestored(false);
  }, []);

  const validation = useMemo(() => {
    const s1: string[] = [];
    if (!draft.basic.name.trim()) s1.push('Product name required');
    if (!draft.basic.retailPrice || Number(draft.basic.retailPrice) <= 0) s1.push('Retail price required');
    if (!draft.basic.categoryType) s1.push('Category type required');

    const s2: string[] = [];
    if (isFreshFlowerCategory(draft.basic.categoryType)) {
      if (draft.details.daysToWither !== '' && Number(draft.details.daysToWither) < 0) s2.push('Days to wither cannot be negative');
    }

    const s3: string[] = [];

    const s4: string[] = [];
    if (draft.hasVariants && draft.variants.length === 0) s4.push('Add at least one variant, or switch off variants');
    const skuSet = new Set<string>();
    draft.variants.forEach((v) => {
      if (!v.name.trim()) s4.push('Empty variant name found');
      if (v.sku?.trim()) {
        const k = v.sku.trim().toLowerCase();
        if (skuSet.has(k)) s4.push(`Duplicate variant SKU: ${v.sku}`);
        else skuSet.add(k);
      }
    });

    return {
      step1: { valid: s1.length === 0, errors: s1 },
      step2: { valid: s2.length === 0, errors: s2 },
      step3: { valid: s3.length === 0, errors: s3 },
      step4: { valid: s4.length === 0, errors: s4 },
      allValid: [s1, s2, s3, s4].every((x) => x.length === 0),
    };
  }, [draft]);

  const stats = useMemo(() => {
    const variantCount = draft.variants.length;
    const variantStock = draft.variants.reduce((a, v) => a + Number(v.stock || 0), 0);
    const totalStock = draft.hasVariants ? variantStock : Number(draft.stock.currentStock || 0);
    const retail = Number(draft.basic.retailPrice || 0);
    const cost = Number(draft.basic.costPrice || 0);
    const stockValue = totalStock * retail;
    const stockCost = totalStock * cost;
    const potentialProfit = stockValue - stockCost;
    const profitMargin = stockValue > 0 ? (potentialProfit / stockValue) * 100 : 0;
    return { variantCount, totalStock, stockValue, stockCost, potentialProfit, profitMargin };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateDetails, updateOccasions,
    setHasVariants, addVariant, updateVariant, removeVariant,
    updateStock, reset,
  };
}
