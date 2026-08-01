import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.cosmetics-wizard.draft';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface CosmeticsWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  categoryType: string;
  shadeName: string;
  shadeCode: string;
  shadeHex: string;
  finish: string;
  sku: string;
  barcode: string;
  costPrice: number | '';
  retailPrice: number | '';
  wholesalePrice: number | '';
  mrp: number | '';
  taxRate: number | '';
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isLimitedEdition: boolean;
  isViral: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
  notes: string;
}

export interface CosmeticsWizardIngredients {
  skinType: string[];
  skinTone: string[];
  skinConcerns: string[];
  sizeMl: number | '';
  sizeGrams: number | '';
  sizeDisplay: string;
  keyIngredients: string[];
  fullIngredients: string;
  spfRating: string;
  howToUse: string;
  benefits: string[];
  warnings: string;
}

export interface CosmeticsWizardFragrance {
  fragranceFamily: string;
  topNotes: string[];
  middleNotes: string[];
  baseNotes: string[];
  longevityHours: string;
  sillage: string;
  season: string[];
  occasion: string[];
}

export interface CosmeticsWizardCertifications {
  isCrueltyFree: boolean;
  isVegan: boolean;
  isOrganic: boolean;
  isHypoallergenic: boolean;
  isFragranceFree: boolean;
  isSulfateFree: boolean;
  isParabenFree: boolean;
  isNoncomedogenic: boolean;
  isHalalCertified: boolean;
  isDermatologistTested: boolean;
}

export interface CosmeticsWizardBatch {
  requiresBatchTracking: boolean;
  shelfLifeMonths: number | '';
  initialBatchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  supplierRef: string;
}

export interface CosmeticsWizardVariant {
  tempId: string;
  name: string;
  sku?: string;
  barcode?: string;
  shadeHex?: string;
  priceOverride?: number;
  costOverride?: number;
  stock: number;
  lowStockAlert: number;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CosmeticsWizardStock {
  currentStock: number;
  lowStockAlert: number;
  rackNumber: string;
}

export interface CosmeticsWizardDraft {
  step: WizardStep;
  hasVariants: boolean;
  basic: CosmeticsWizardBasic;
  ingredients: CosmeticsWizardIngredients;
  fragrance: CosmeticsWizardFragrance;
  certifications: CosmeticsWizardCertifications;
  batch: CosmeticsWizardBatch;
  variants: CosmeticsWizardVariant[];
  stock: CosmeticsWizardStock;
  savedAt: number;
}

const emptyBasic = (): CosmeticsWizardBasic => ({
  name: '', description: '', categoryId: '', brandId: '',
  categoryType: 'FOUNDATION',
  shadeName: '', shadeCode: '', shadeHex: '', finish: '',
  sku: '', barcode: '',
  costPrice: '', retailPrice: '', wholesalePrice: '', mrp: '',
  taxRate: '',
  isFeatured: false, isBestSeller: false, isNewArrival: true,
  isLimitedEdition: false, isViral: false, isActive: true,
  imageUrls: [], tagIds: [], notes: '',
});

const emptyIngredients = (): CosmeticsWizardIngredients => ({
  skinType: [], skinTone: [], skinConcerns: [],
  sizeMl: '', sizeGrams: '', sizeDisplay: '',
  keyIngredients: [], fullIngredients: '', spfRating: '',
  howToUse: '', benefits: [], warnings: '',
});

const emptyFragrance = (): CosmeticsWizardFragrance => ({
  fragranceFamily: '', topNotes: [], middleNotes: [], baseNotes: [],
  longevityHours: '', sillage: '', season: [], occasion: [],
});

const emptyCertifications = (): CosmeticsWizardCertifications => ({
  isCrueltyFree: false, isVegan: false, isOrganic: false,
  isHypoallergenic: false, isFragranceFree: false, isSulfateFree: false,
  isParabenFree: false, isNoncomedogenic: false,
  isHalalCertified: false, isDermatologistTested: false,
});

const emptyBatch = (): CosmeticsWizardBatch => ({
  requiresBatchTracking: true, shelfLifeMonths: 24,
  initialBatchNumber: '', manufactureDate: '', expiryDate: '',
  supplierRef: '',
});

const emptyDraft = (): CosmeticsWizardDraft => ({
  step: 1,
  hasVariants: false,
  basic: emptyBasic(),
  ingredients: emptyIngredients(),
  fragrance: emptyFragrance(),
  certifications: emptyCertifications(),
  batch: emptyBatch(),
  variants: [],
  stock: { currentStock: 0, lowStockAlert: 3, rackNumber: '' },
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const isFragranceCategory = (c: string) =>
  ['PERFUME', 'EAU_DE_TOILETTE', 'BODY_MIST', 'ATTAR', 'FRAGRANCE_GIFT_SET', 'DEODORANT'].includes(c);

export const isMakeupCategory = (c: string) =>
  ['FOUNDATION', 'CONCEALER', 'POWDER', 'BLUSH', 'BRONZER', 'HIGHLIGHTER',
   'EYESHADOW', 'EYELINER', 'MASCARA', 'LIPSTICK', 'LIP_GLOSS', 'LIP_LINER',
   'MAKEUP_PALETTE'].includes(c);

interface Opts { autoLoadDraft?: boolean; onDraftLoaded?: () => void }

export function useCosmeticsWizard(opts: Opts = {}) {
  const [draft, setDraft] = useState<CosmeticsWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CosmeticsWizardDraft;
        if (parsed?.basic) {
          setDraft({
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            ingredients: { ...emptyIngredients(), ...parsed.ingredients },
            fragrance: { ...emptyFragrance(), ...parsed.fragrance },
            certifications: { ...emptyCertifications(), ...parsed.certifications },
            batch: { ...emptyBatch(), ...parsed.batch },
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
  const nextStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step < 5 ? d.step + 1 : 5) as WizardStep })), []);
  const prevStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step > 1 ? d.step - 1 : 1) as WizardStep })), []);

  const updateBasic = useCallback((patch: Partial<CosmeticsWizardBasic>) =>
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } })), []);
  const updateIngredients = useCallback((patch: Partial<CosmeticsWizardIngredients>) =>
    setDraft((d) => ({ ...d, ingredients: { ...d.ingredients, ...patch } })), []);
  const updateFragrance = useCallback((patch: Partial<CosmeticsWizardFragrance>) =>
    setDraft((d) => ({ ...d, fragrance: { ...d.fragrance, ...patch } })), []);
  const updateCertifications = useCallback((patch: Partial<CosmeticsWizardCertifications>) =>
    setDraft((d) => ({ ...d, certifications: { ...d.certifications, ...patch } })), []);
  const updateBatch = useCallback((patch: Partial<CosmeticsWizardBatch>) =>
    setDraft((d) => ({ ...d, batch: { ...d.batch, ...patch } })), []);
  const setHasVariants = useCallback((v: boolean) =>
    setDraft((d) => (v ? { ...d, hasVariants: true } : { ...d, hasVariants: false, variants: [] })), []);
  const addVariant = useCallback((v: Omit<CosmeticsWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) =>
    setDraft((d) => ({
      ...d,
      variants: [...d.variants, { ...v, tempId: genId(), sortOrder: d.variants.length, isActive: true }],
    })), []);
  const updateVariant = useCallback((tempId: string, patch: Partial<CosmeticsWizardVariant>) =>
    setDraft((d) => ({ ...d, variants: d.variants.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)) })), []);
  const removeVariant = useCallback((tempId: string) =>
    setDraft((d) => ({ ...d, variants: d.variants.filter((v) => v.tempId !== tempId) })), []);
  const updateStock = useCallback((patch: Partial<CosmeticsWizardStock>) =>
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
    const s4: string[] = [];

    if (draft.batch.requiresBatchTracking && draft.batch.initialBatchNumber?.trim() && !draft.batch.expiryDate) {
      s4.push('Expiry date required when creating a batch');
    }

    const s5: string[] = [];
    if (draft.hasVariants && draft.variants.length === 0) s5.push('Add at least one variant, or switch off variants');
    const skuSet = new Set<string>();
    draft.variants.forEach((v) => {
      if (!v.name.trim()) s5.push('Empty variant name found');
      if (v.sku?.trim()) {
        const k = v.sku.trim().toLowerCase();
        if (skuSet.has(k)) s5.push(`Duplicate variant SKU: ${v.sku}`);
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
    const variantCount = draft.variants.length;
    const variantStock = draft.variants.reduce((a, v) => a + Number(v.stock || 0), 0);
    const totalStock = draft.hasVariants ? variantStock : Number(draft.stock.currentStock || 0);
    const retail = Number(draft.basic.retailPrice || 0);
    const cost = Number(draft.basic.costPrice || 0);
    const stockValue = totalStock * retail;
    const stockCost = totalStock * cost;
    const potentialProfit = stockValue - stockCost;
    const profitMargin = stockValue > 0 ? (potentialProfit / stockValue) * 100 : 0;
    const certCount = Object.values(draft.certifications).filter(Boolean).length;
    return { variantCount, totalStock, stockValue, stockCost, potentialProfit, profitMargin, certCount };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateIngredients, updateFragrance, updateCertifications, updateBatch,
    setHasVariants, addVariant, updateVariant, removeVariant,
    updateStock, reset,
  };
}
