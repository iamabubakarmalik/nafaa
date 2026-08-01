import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.toy-wizard.draft';

export type WizardStep = 1 | 2 | 3 | 4;

export interface ToyWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  categoryType: string;
  ageGroup: string;
  ageGroups: string[];
  ageMinYears: number | '';
  ageMaxYears: number | '';
  genderTarget: string;
  brand: string;
  characterFranchise: string;
  themeCategory: string;
  sku: string;
  barcode: string;
  costPrice: number | '';
  retailPrice: number | '';
  discountedPrice: number | '';
  mrp: number | '';
  taxRate: number | '';
  warrantyMonths: number | '';
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  isBirthdayGift: boolean;
  isEidGift: boolean;
  isChristmasGift: boolean;
  isActive: boolean;
  giftWrapAvailable: boolean;
  giftMessageAvailable: boolean;
  imageUrls: string[];
  tagIds: string[];
  notes: string;
}

export interface ToyWizardDetails {
  isEducational: boolean;
  learningAreas: string[];
  developmentSkills: string[];
  cognitiveCategory: string;
  material: string;
  materialsUsed: string[];
  colorName: string;
  colorHex: string;
  size: string;
  dimensions: string;
  weightGrams: number | '';
  numberOfPieces: number | '';
  requiresBatteries: boolean;
  batteriesIncluded: boolean;
  batteryType: string;
  batteryQuantity: number | '';
  isRemoteControlled: boolean;
  rcRange: string;
  rcChargingTime: string;
  rcRunTime: string;
  rcFrequency: string;
  playerCount: string;
  playDurationMinutes: number | '';
  isMultiplayer: boolean;
  hasSound: boolean;
  hasLights: boolean;
  hasMotor: boolean;
  isCollectible: boolean;
  languagesSupported: string[];
  isMontessoriApproved: boolean;
  isWaldorfApproved: boolean;
  hasReplacementParts: boolean;
  videoUrl: string;
  instructionUrl: string;
}

export interface ToyWizardSafety {
  safetyCertifications: string[];
  safetyWarnings: string[];
  chokingHazard: boolean;
  smallPartsWarning: boolean;
  isNonToxic: boolean;
  isBpaFree: boolean;
  isPhthalateFree: boolean;
}

export interface ToyWizardVariant {
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

export interface ToyWizardStock {
  currentStock: number;
  lowStockAlert: number;
  rackNumber: string;
}

export interface ToyWizardDraft {
  step: WizardStep;
  hasVariants: boolean;
  basic: ToyWizardBasic;
  details: ToyWizardDetails;
  safety: ToyWizardSafety;
  variants: ToyWizardVariant[];
  stock: ToyWizardStock;
  savedAt: number;
}

const emptyBasic = (): ToyWizardBasic => ({
  name: '', description: '', categoryId: '',
  categoryType: 'EDUCATIONAL_TOY', ageGroup: 'KIDS_5_8Y', ageGroups: [],
  ageMinYears: '', ageMaxYears: '', genderTarget: 'UNISEX',
  brand: '', characterFranchise: '', themeCategory: '',
  sku: '', barcode: '',
  costPrice: '', retailPrice: '', discountedPrice: '', mrp: '', taxRate: '',
  warrantyMonths: '',
  isFeatured: false, isBestSeller: false, isNewArrival: true, isTrending: false,
  isBirthdayGift: false, isEidGift: false, isChristmasGift: false,
  isActive: true, giftWrapAvailable: true, giftMessageAvailable: true,
  imageUrls: [], tagIds: [], notes: '',
});

const emptyDetails = (): ToyWizardDetails => ({
  isEducational: false, learningAreas: [], developmentSkills: [],
  cognitiveCategory: '', material: '', materialsUsed: [],
  colorName: '', colorHex: '', size: '', dimensions: '',
  weightGrams: '', numberOfPieces: '',
  requiresBatteries: false, batteriesIncluded: false,
  batteryType: '', batteryQuantity: '',
  isRemoteControlled: false, rcRange: '', rcChargingTime: '',
  rcRunTime: '', rcFrequency: '',
  playerCount: '', playDurationMinutes: '',
  isMultiplayer: false, hasSound: false, hasLights: false,
  hasMotor: false, isCollectible: false,
  languagesSupported: [],
  isMontessoriApproved: false, isWaldorfApproved: false,
  hasReplacementParts: false,
  videoUrl: '', instructionUrl: '',
});

const emptySafety = (): ToyWizardSafety => ({
  safetyCertifications: [], safetyWarnings: [],
  chokingHazard: false, smallPartsWarning: false,
  isNonToxic: true, isBpaFree: true, isPhthalateFree: true,
});

const emptyDraft = (): ToyWizardDraft => ({
  step: 1,
  hasVariants: false,
  basic: emptyBasic(),
  details: emptyDetails(),
  safety: emptySafety(),
  variants: [],
  stock: { currentStock: 0, lowStockAlert: 5, rackNumber: '' },
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface Opts { autoLoadDraft?: boolean; onDraftLoaded?: () => void }

export function useToyWizard(opts: Opts = {}) {
  const [draft, setDraft] = useState<ToyWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ToyWizardDraft;
        if (parsed?.basic) {
          setDraft({
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            details: { ...emptyDetails(), ...parsed.details },
            safety: { ...emptySafety(), ...parsed.safety },
            variants: parsed.variants ?? [],
            stock: parsed.stock ?? { currentStock: 0, lowStockAlert: 5, rackNumber: '' },
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

  const updateBasic = useCallback((patch: Partial<ToyWizardBasic>) =>
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } })), []);
  const updateDetails = useCallback((patch: Partial<ToyWizardDetails>) =>
    setDraft((d) => ({ ...d, details: { ...d.details, ...patch } })), []);
  const updateSafety = useCallback((patch: Partial<ToyWizardSafety>) =>
    setDraft((d) => ({ ...d, safety: { ...d.safety, ...patch } })), []);

  const setHasVariants = useCallback((v: boolean) =>
    setDraft((d) => (v ? { ...d, hasVariants: true } : { ...d, hasVariants: false, variants: [] })), []);

  const addVariant = useCallback((v: Omit<ToyWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) =>
    setDraft((d) => ({
      ...d,
      variants: [...d.variants, { ...v, tempId: genId(), sortOrder: d.variants.length, isActive: true }],
    })), []);
  const updateVariant = useCallback((tempId: string, patch: Partial<ToyWizardVariant>) =>
    setDraft((d) => ({ ...d, variants: d.variants.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)) })), []);
  const removeVariant = useCallback((tempId: string) =>
    setDraft((d) => ({ ...d, variants: d.variants.filter((v) => v.tempId !== tempId) })), []);

  const updateStock = useCallback((patch: Partial<ToyWizardStock>) =>
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
    if (!draft.basic.categoryType) s1.push('Category required');
    if (!draft.basic.ageGroup) s1.push('Age group required');

    const s2: string[] = [];
    const s3: string[] = [];

    // Age-based safety validation
    const minAge = Number(draft.basic.ageMinYears || 0);
    if (minAge > 0 && minAge < 3 && draft.safety.chokingHazard) {
      s3.push('Warning: Choking hazard flagged for toy under 3 years — reconsider age range');
    }

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
    updateBasic, updateDetails, updateSafety,
    setHasVariants, addVariant, updateVariant, removeVariant,
    updateStock, reset,
  };
}
