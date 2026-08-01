import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.optical-wizard.draft';

export type WizardStep = 1 | 2 | 3 | 4;

export interface OpticalWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  categoryType: string;
  gender: string;
  brand: string;
  modelNumber: string;
  collectionName: string;
  sku: string;
  barcode: string;
  costPrice: number | '';
  retailPrice: number | '';
  discountedPrice: number | '';
  mrp: number | '';
  taxRate: number | '';
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isDesigner: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
  tryOnUrl: string;
  notes: string;
}

export interface OpticalWizardFrame {
  frameShape: string;
  frameMaterial: string;
  frameSizeMm: number | '';
  bridgeSizeMm: number | '';
  templeLengthMm: number | '';
  lensWidthMm: number | '';
  lensHeightMm: number | '';
  frameWeightG: number | '';
  colorName: string;
  colorHex: string;
  frameColorOptions: string[];
}

export interface OpticalWizardLens {
  lensType: string;
  lensMaterial: string;
  lensIndex: string;
  lensCoatings: string[];
  hasBlueCut: boolean;
  hasAntiGlare: boolean;
  hasUvProtection: boolean;
  isPolarized: boolean;
  isPhotochromic: boolean;
  supportsMinSph: number | '';
  supportsMaxSph: number | '';
  supportsMinCyl: number | '';
  supportsMaxCyl: number | '';
  supportsProgressive: boolean;
}

export interface OpticalWizardContactLens {
  isContactLens: boolean;
  clDuration: string;
  clWaterContent: string;
  clBaseCurve: string;
  clDiameter: string;
  clUvProtection: boolean;
  clForAstigmatism: boolean;
}

export interface OpticalWizardWarranty {
  warrantyMonths: number | '';
  warrantyType: string;
}

export interface OpticalWizardVariant {
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

export interface OpticalWizardStock {
  currentStock: number;
  lowStockAlert: number;
  rackNumber: string;
}

export interface OpticalWizardDraft {
  step: WizardStep;
  hasVariants: boolean;
  basic: OpticalWizardBasic;
  frame: OpticalWizardFrame;
  lens: OpticalWizardLens;
  contactLens: OpticalWizardContactLens;
  warranty: OpticalWizardWarranty;
  variants: OpticalWizardVariant[];
  stock: OpticalWizardStock;
  savedAt: number;
}

export const isFrameCategory = (c: string) =>
  ['EYEGLASSES_FRAME', 'SUNGLASSES', 'READING_GLASSES', 'SPORTS_EYEWEAR', 'SAFETY_GOGGLES', 'KIDS_EYEWEAR'].includes(c);
export const isLensCategory = (c: string) =>
  ['PRESCRIPTION_LENS', 'PROGRESSIVE_LENS', 'BIFOCAL_LENS', 'BLUE_CUT_LENS', 'PHOTOCHROMIC_LENS'].includes(c);
export const isContactLensCategory = (c: string) => c === 'CONTACT_LENS';

const emptyBasic = (): OpticalWizardBasic => ({
  name: '', description: '', categoryId: '',
  categoryType: 'EYEGLASSES_FRAME', gender: 'UNISEX',
  brand: '', modelNumber: '', collectionName: '',
  sku: '', barcode: '',
  costPrice: '', retailPrice: '', discountedPrice: '', mrp: '', taxRate: '',
  isFeatured: false, isBestSeller: false, isNewArrival: true, isDesigner: false, isActive: true,
  imageUrls: [], tagIds: [], tryOnUrl: '', notes: '',
});

const emptyFrame = (): OpticalWizardFrame => ({
  frameShape: '', frameMaterial: '',
  frameSizeMm: '', bridgeSizeMm: '', templeLengthMm: '', lensWidthMm: '', lensHeightMm: '', frameWeightG: '',
  colorName: '', colorHex: '', frameColorOptions: [],
});

const emptyLens = (): OpticalWizardLens => ({
  lensType: '', lensMaterial: '', lensIndex: '', lensCoatings: [],
  hasBlueCut: false, hasAntiGlare: false, hasUvProtection: false,
  isPolarized: false, isPhotochromic: false,
  supportsMinSph: '', supportsMaxSph: '', supportsMinCyl: '', supportsMaxCyl: '',
  supportsProgressive: false,
});

const emptyContactLens = (): OpticalWizardContactLens => ({
  isContactLens: false, clDuration: '', clWaterContent: '', clBaseCurve: '', clDiameter: '',
  clUvProtection: false, clForAstigmatism: false,
});

const emptyWarranty = (): OpticalWizardWarranty => ({
  warrantyMonths: 12, warrantyType: 'Manufacturer',
});

const emptyDraft = (): OpticalWizardDraft => ({
  step: 1, hasVariants: false,
  basic: emptyBasic(),
  frame: emptyFrame(),
  lens: emptyLens(),
  contactLens: emptyContactLens(),
  warranty: emptyWarranty(),
  variants: [],
  stock: { currentStock: 0, lowStockAlert: 3, rackNumber: '' },
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface Opts { autoLoadDraft?: boolean; onDraftLoaded?: () => void }

export function useOpticalWizard(opts: Opts = {}) {
  const [draft, setDraft] = useState<OpticalWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OpticalWizardDraft;
        if (parsed?.basic) {
          setDraft({
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            frame: { ...emptyFrame(), ...parsed.frame },
            lens: { ...emptyLens(), ...parsed.lens },
            contactLens: { ...emptyContactLens(), ...parsed.contactLens },
            warranty: { ...emptyWarranty(), ...parsed.warranty },
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

  const updateBasic = useCallback((patch: Partial<OpticalWizardBasic>) => {
    setDraft((d) => {
      const next = { ...d, basic: { ...d.basic, ...patch } };
      if (patch.categoryType) {
        if (isContactLensCategory(patch.categoryType)) {
          next.contactLens = { ...next.contactLens, isContactLens: true };
        } else if (isFrameCategory(patch.categoryType) || isLensCategory(patch.categoryType)) {
          next.contactLens = { ...next.contactLens, isContactLens: false };
        }
      }
      return next;
    });
  }, []);

  const updateFrame = useCallback((patch: Partial<OpticalWizardFrame>) =>
    setDraft((d) => ({ ...d, frame: { ...d.frame, ...patch } })), []);
  const updateLens = useCallback((patch: Partial<OpticalWizardLens>) =>
    setDraft((d) => ({ ...d, lens: { ...d.lens, ...patch } })), []);
  const updateContactLens = useCallback((patch: Partial<OpticalWizardContactLens>) =>
    setDraft((d) => ({ ...d, contactLens: { ...d.contactLens, ...patch } })), []);
  const updateWarranty = useCallback((patch: Partial<OpticalWizardWarranty>) =>
    setDraft((d) => ({ ...d, warranty: { ...d.warranty, ...patch } })), []);

  const setHasVariants = useCallback((v: boolean) =>
    setDraft((d) => (v ? { ...d, hasVariants: true } : { ...d, hasVariants: false, variants: [] })), []);

  const addVariant = useCallback((v: Omit<OpticalWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) =>
    setDraft((d) => ({
      ...d,
      variants: [...d.variants, { ...v, tempId: genId(), sortOrder: d.variants.length, isActive: true }],
    })), []);
  const updateVariant = useCallback((tempId: string, patch: Partial<OpticalWizardVariant>) =>
    setDraft((d) => ({ ...d, variants: d.variants.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)) })), []);
  const removeVariant = useCallback((tempId: string) =>
    setDraft((d) => ({ ...d, variants: d.variants.filter((v) => v.tempId !== tempId) })), []);

  const updateStock = useCallback((patch: Partial<OpticalWizardStock>) =>
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
    const s3: string[] = [];
    if (draft.lens.supportsMinSph !== '' && draft.lens.supportsMaxSph !== '') {
      if (Number(draft.lens.supportsMinSph) > Number(draft.lens.supportsMaxSph)) {
        s3.push('Min SPH cannot be greater than max SPH');
      }
    }

    const s4: string[] = [];
    if (draft.hasVariants && draft.variants.length === 0) s4.push('Add at least one variant, or turn off variants');
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
    updateBasic, updateFrame, updateLens, updateContactLens, updateWarranty,
    setHasVariants, addVariant, updateVariant, removeVariant,
    updateStock, reset,
  };
}
