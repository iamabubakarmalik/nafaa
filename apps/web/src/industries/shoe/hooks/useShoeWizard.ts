import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.shoe-wizard.draft';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface ShoeWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  categoryType: string;
  gender: string;
  ageGroup: string;
  sku: string;
  barcode: string;
  modelName: string;
  modelCode: string;
  collection: string;
  season: string;
  colorName: string;
  colorHex: string;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  isBridal: boolean;
  isEidSpecial: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
  notes: string;
}

export interface ShoeWizardMaterials {
  upperMaterial: string;
  soleMaterial: string;
  innerMaterial: string;
  liningMaterial: string;
  patternType: string;
  closureType: string;
  toeShape: string;
  heelHeight: string;
  heelType: string;
  soleType: string;
}

export interface ShoeWizardSizing {
  sizeSystem: string;
  width: string;
  runsLarge: boolean;
  runsSmall: boolean;
  sizingNotes: string;
}

export interface ShoeWizardFeatures {
  isWaterproof: boolean;
  isBreathable: boolean;
  hasAirCushion: boolean;
  hasArchSupport: boolean;
  isOrthopedic: boolean;
  isVegan: boolean;
  isHandmade: boolean;
  sport: string;
  playingSurface: string[];
}

export interface ShoeWizardWarranty {
  warrantyMonths: number | '';
  warrantyDetails: string;
  careInstructions: string;
  cleaningRecommendation: string;
  includesBox: boolean;
  includesDustBag: boolean;
  includesExtraLaces: boolean;
  boxColor: string;
}

export interface ShoeWizardPricing {
  costPrice: number | '';
  retailPrice: number | '';
  wholesalePrice: number | '';
  memberPrice: number | '';
  mrp: number | '';
  taxRate: number | '';
}

export interface ShoeWizardSizeVariant {
  tempId: string;
  size: string;
  sku?: string;
  barcode?: string;
  boxNumber?: string;
  shelfLocation?: string;
  stock: number;
  lowStockAlert: number;
  priceOverride?: number;
  costOverride?: number;
  isActive: boolean;
}

export interface ShoeWizardDraft {
  step: WizardStep;
  basic: ShoeWizardBasic;
  materials: ShoeWizardMaterials;
  sizing: ShoeWizardSizing;
  features: ShoeWizardFeatures;
  warranty: ShoeWizardWarranty;
  pricing: ShoeWizardPricing;
  sizeVariants: ShoeWizardSizeVariant[];
  savedAt: number;
}

const emptyBasic = (): ShoeWizardBasic => ({
  name: '', description: '', categoryId: '', brandId: '',
  categoryType: 'MEN_CASUAL', gender: 'MEN', ageGroup: '',
  sku: '', barcode: '', modelName: '', modelCode: '',
  collection: '', season: '',
  colorName: '', colorHex: '',
  isFeatured: false, isBestSeller: false, isNewArrival: true,
  isTrending: false, isBridal: false, isEidSpecial: false, isActive: true,
  imageUrls: [], tagIds: [], notes: '',
});

const emptyMaterials = (): ShoeWizardMaterials => ({
  upperMaterial: '', soleMaterial: '', innerMaterial: '', liningMaterial: '',
  patternType: '', closureType: '', toeShape: '', heelHeight: '', heelType: '', soleType: '',
});

const emptySizing = (): ShoeWizardSizing => ({
  sizeSystem: 'UK', width: 'REGULAR',
  runsLarge: false, runsSmall: false, sizingNotes: '',
});

const emptyFeatures = (): ShoeWizardFeatures => ({
  isWaterproof: false, isBreathable: false, hasAirCushion: false,
  hasArchSupport: false, isOrthopedic: false, isVegan: false, isHandmade: false,
  sport: '', playingSurface: [],
});

const emptyWarranty = (): ShoeWizardWarranty => ({
  warrantyMonths: '', warrantyDetails: '',
  careInstructions: '', cleaningRecommendation: '',
  includesBox: true, includesDustBag: false, includesExtraLaces: false, boxColor: '',
});

const emptyPricing = (): ShoeWizardPricing => ({
  costPrice: '', retailPrice: '', wholesalePrice: '',
  memberPrice: '', mrp: '', taxRate: '',
});

const emptyDraft = (): ShoeWizardDraft => ({
  step: 1,
  basic: emptyBasic(),
  materials: emptyMaterials(),
  sizing: emptySizing(),
  features: emptyFeatures(),
  warranty: emptyWarranty(),
  pricing: emptyPricing(),
  sizeVariants: [],
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface Opts { autoLoadDraft?: boolean; onDraftLoaded?: () => void }

export function useShoeWizard(opts: Opts = {}) {
  const [draft, setDraft] = useState<ShoeWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ShoeWizardDraft;
        if (parsed?.basic) {
          setDraft({
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            materials: { ...emptyMaterials(), ...parsed.materials },
            sizing: { ...emptySizing(), ...parsed.sizing },
            features: { ...emptyFeatures(), ...parsed.features },
            warranty: { ...emptyWarranty(), ...parsed.warranty },
            pricing: { ...emptyPricing(), ...parsed.pricing },
            sizeVariants: parsed.sizeVariants ?? [],
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
  const nextStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step < 5 ? d.step + 1 : 5) as WizardStep })), []);
  const prevStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step > 1 ? d.step - 1 : 1) as WizardStep })), []);

  const updateBasic = useCallback((patch: Partial<ShoeWizardBasic>) =>
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } })), []);
  const updateMaterials = useCallback((patch: Partial<ShoeWizardMaterials>) =>
    setDraft((d) => ({ ...d, materials: { ...d.materials, ...patch } })), []);
  const updateSizing = useCallback((patch: Partial<ShoeWizardSizing>) =>
    setDraft((d) => ({ ...d, sizing: { ...d.sizing, ...patch } })), []);
  const updateFeatures = useCallback((patch: Partial<ShoeWizardFeatures>) =>
    setDraft((d) => ({ ...d, features: { ...d.features, ...patch } })), []);
  const updateWarranty = useCallback((patch: Partial<ShoeWizardWarranty>) =>
    setDraft((d) => ({ ...d, warranty: { ...d.warranty, ...patch } })), []);
  const updatePricing = useCallback((patch: Partial<ShoeWizardPricing>) =>
    setDraft((d) => ({ ...d, pricing: { ...d.pricing, ...patch } })), []);

  const addSizeVariant = useCallback((v: Omit<ShoeWizardSizeVariant, 'tempId' | 'isActive'>) =>
    setDraft((d) => ({
      ...d,
      sizeVariants: [...d.sizeVariants, { ...v, tempId: genId(), isActive: true }],
    })), []);

  const addSizeVariantsBulk = useCallback((sizes: string[]) =>
    setDraft((d) => {
      const existing = new Set(d.sizeVariants.map((v) => v.size));
      const newOnes = sizes
        .map((s) => s.trim())
        .filter((s) => s && !existing.has(s))
        .map((size) => ({
          tempId: genId(),
          size,
          stock: 0,
          lowStockAlert: 1,
          isActive: true,
        } as ShoeWizardSizeVariant));
      return { ...d, sizeVariants: [...d.sizeVariants, ...newOnes] };
    }), []);

  const updateSizeVariant = useCallback((tempId: string, patch: Partial<ShoeWizardSizeVariant>) =>
    setDraft((d) => ({
      ...d,
      sizeVariants: d.sizeVariants.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)),
    })), []);

  const removeSizeVariant = useCallback((tempId: string) =>
    setDraft((d) => ({ ...d, sizeVariants: d.sizeVariants.filter((v) => v.tempId !== tempId) })), []);

  const reset = useCallback(() => {
    setDraft(emptyDraft());
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setDraftRestored(false);
  }, []);

  const validation = useMemo(() => {
    const s1: string[] = [];
    if (!draft.basic.name.trim()) s1.push('Product name required');
    if (!draft.basic.categoryType) s1.push('Category type required');
    if (!draft.basic.gender) s1.push('Gender required');

    const s2: string[] = [];

    const s3: string[] = [];
    if (!draft.sizing.sizeSystem) s3.push('Size system required');

    const s4: string[] = [];
    if (!draft.pricing.retailPrice || Number(draft.pricing.retailPrice) <= 0) s4.push('Retail price required');

    const s5: string[] = [];
    if (draft.sizeVariants.length === 0) s5.push('Add at least one size');
    const sizeSet = new Set<string>();
    const skuSet = new Set<string>();
    draft.sizeVariants.forEach((v) => {
      if (!v.size.trim()) s5.push('Empty size found');
      else if (sizeSet.has(v.size.trim())) s5.push(`Duplicate size: ${v.size}`);
      else sizeSet.add(v.size.trim());
      if (v.sku?.trim()) {
        const k = v.sku.trim().toLowerCase();
        if (skuSet.has(k)) s5.push(`Duplicate SKU: ${v.sku}`);
        else skuSet.add(k);
      }
    });

    return {
      step1: { valid: s1.length === 0, errors: s1 },
      step2: { valid: s2.length === 0, errors: s2 },
      step3: { valid: s3.length === 0, errors: s3 },
      step4: { valid: s4.length === 0, errors: s4 },
      step5: { valid: s5.length === 0, errors: s5 },
      allValid: [s1, s2, s3, s4, s5].every((x) => x.length === 0),
    };
  }, [draft]);

  const stats = useMemo(() => {
    const sizeCount = draft.sizeVariants.length;
    const totalStock = draft.sizeVariants.reduce((a, v) => a + Number(v.stock || 0), 0);
    const retail = Number(draft.pricing.retailPrice || 0);
    const cost = Number(draft.pricing.costPrice || 0);
    const stockValue = totalStock * retail;
    const stockCost = totalStock * cost;
    const potentialProfit = stockValue - stockCost;
    const profitMargin = stockValue > 0 ? (potentialProfit / stockValue) * 100 : 0;
    return { sizeCount, totalStock, stockValue, stockCost, potentialProfit, profitMargin };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateMaterials, updateSizing, updateFeatures, updateWarranty, updatePricing,
    addSizeVariant, addSizeVariantsBulk, updateSizeVariant, removeSizeVariant,
    reset,
  };
}
