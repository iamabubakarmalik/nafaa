import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.sports-wizard.draft';

export type WizardStep = 1 | 2 | 3 | 4;

export interface SportsWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  categoryType: string;
  sport: string;
  ageGroup: string;
  genderTarget: string;
  sku: string;
  barcode: string;
  color: string;
  colorHex: string;
  countryOfMake: string;
  costPrice: number | '';
  retailPrice: number | '';
  wholesalePrice: number | '';
  mrp: number | '';
  taxRate: number | '';
  warrantyMonths: number | '';
  warrantyType: string;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isProfessional: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
  notes: string;
  careInstructions: string;
}

export interface SportsWizardSpecs {
  // Cricket bat
  batWood: string;
  batWeightGrams: number | '';
  batGrade: string;
  batSize: string;
  handleType: string;
  // Ball
  ballType: string;
  ballWeight: string;
  ballCircumference: string;
  ballMaterial: string;
  // Apparel
  size: string;
  material: string;
  fit: string;
  hasCustomization: boolean;
  // Shoe
  shoeSize: string;
  soleType: string;
  studType: string;
  // Gym
  weight: string;
  maxUserWeight: string;
  dimensions: string;
  powerRating: string;
  motorType: string;
  foldable: boolean;
  // General
  material2: string;
  certifications: string[];
}

export interface SportsWizardTeam {
  isTeamOrderable: boolean;
  minTeamOrder: number | '';
  bulkDiscountPct: number | '';
  teamPrice: number | '';
  customizationOptions: string[];
}

export interface SportsWizardVariant {
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

export interface SportsWizardStock {
  currentStock: number;
  lowStockAlert: number;
  rackNumber: string;
}

export interface SportsWizardDraft {
  step: WizardStep;
  hasVariants: boolean;
  basic: SportsWizardBasic;
  specs: SportsWizardSpecs;
  team: SportsWizardTeam;
  variants: SportsWizardVariant[];
  stock: SportsWizardStock;
  savedAt: number;
}

const emptyBasic = (): SportsWizardBasic => ({
  name: '', description: '', categoryId: '', brandId: '',
  categoryType: 'CRICKET_BAT', sport: 'Cricket',
  ageGroup: 'ADULT', genderTarget: 'UNISEX',
  sku: '', barcode: '', color: '', colorHex: '',
  countryOfMake: '', costPrice: '', retailPrice: '', wholesalePrice: '', mrp: '',
  taxRate: '', warrantyMonths: '', warrantyType: '',
  isFeatured: false, isBestSeller: false, isNewArrival: true, isProfessional: false, isActive: true,
  imageUrls: [], tagIds: [], notes: '', careInstructions: '',
});

const emptySpecs = (): SportsWizardSpecs => ({
  batWood: '', batWeightGrams: '', batGrade: '', batSize: '', handleType: '',
  ballType: '', ballWeight: '', ballCircumference: '', ballMaterial: '',
  size: '', material: '', fit: '', hasCustomization: false,
  shoeSize: '', soleType: '', studType: '',
  weight: '', maxUserWeight: '', dimensions: '', powerRating: '', motorType: '', foldable: false,
  material2: '', certifications: [],
});

const emptyTeam = (): SportsWizardTeam => ({
  isTeamOrderable: false, minTeamOrder: '', bulkDiscountPct: '', teamPrice: '',
  customizationOptions: [],
});

const emptyDraft = (): SportsWizardDraft => ({
  step: 1,
  hasVariants: false,
  basic: emptyBasic(),
  specs: emptySpecs(),
  team: emptyTeam(),
  variants: [],
  stock: { currentStock: 0, lowStockAlert: 3, rackNumber: '' },
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Category helpers
export const isCricketBatCategory = (c: string) => c === 'CRICKET_BAT';
export const isBallCategory = (c: string) =>
  ['CRICKET_BALL', 'FOOTBALL', 'BASKETBALL', 'VOLLEYBALL', 'TENNIS_BALL', 'BADMINTON_SHUTTLECOCK', 'TABLE_TENNIS_BALL'].includes(c);
export const isApparelCategory = (c: string) =>
  c.includes('JERSEY') || c.includes('KIT') || c === 'SWIMSUIT';
export const isShoeCategory = (c: string) =>
  c.includes('SHOES') || c === 'FOOTBALL_STUDS' || c === 'CRICKET_SPIKES';
export const isGymCategory = (c: string) =>
  ['DUMBBELL', 'BARBELL', 'WEIGHT_PLATE', 'KETTLEBELL', 'BENCH_PRESS', 'TREADMILL',
   'EXERCISE_BIKE', 'ELLIPTICAL', 'ROWING_MACHINE', 'YOGA_MAT', 'PUNCHING_BAG'].includes(c);

interface Opts { autoLoadDraft?: boolean; onDraftLoaded?: () => void }

export function useSportsWizard(opts: Opts = {}) {
  const [draft, setDraft] = useState<SportsWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SportsWizardDraft;
        if (parsed?.basic) {
          setDraft({
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            specs: { ...emptySpecs(), ...parsed.specs },
            team: { ...emptyTeam(), ...parsed.team },
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

  const updateBasic = useCallback((patch: Partial<SportsWizardBasic>) =>
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } })), []);
  const updateSpecs = useCallback((patch: Partial<SportsWizardSpecs>) =>
    setDraft((d) => ({ ...d, specs: { ...d.specs, ...patch } })), []);
  const updateTeam = useCallback((patch: Partial<SportsWizardTeam>) =>
    setDraft((d) => ({ ...d, team: { ...d.team, ...patch } })), []);

  const setHasVariants = useCallback((v: boolean) =>
    setDraft((d) => (v ? { ...d, hasVariants: true } : { ...d, hasVariants: false, variants: [] })), []);

  const addVariant = useCallback((v: Omit<SportsWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) =>
    setDraft((d) => ({
      ...d,
      variants: [...d.variants, { ...v, tempId: genId(), sortOrder: d.variants.length, isActive: true }],
    })), []);
  const updateVariant = useCallback((tempId: string, patch: Partial<SportsWizardVariant>) =>
    setDraft((d) => ({ ...d, variants: d.variants.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)) })), []);
  const removeVariant = useCallback((tempId: string) =>
    setDraft((d) => ({ ...d, variants: d.variants.filter((v) => v.tempId !== tempId) })), []);

  const updateStock = useCallback((patch: Partial<SportsWizardStock>) =>
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
    if (!draft.basic.sport.trim()) s1.push('Sport required');

    const s2: string[] = [];

    const s3: string[] = [];
    if (draft.team.isTeamOrderable) {
      if (!draft.team.minTeamOrder || Number(draft.team.minTeamOrder) < 2) s3.push('Min team order must be >= 2');
    }

    const s4: string[] = [];
    if (draft.hasVariants && draft.variants.length === 0) s4.push('Add at least one variant');
    const skuSet = new Set<string>();
    draft.variants.forEach((v) => {
      if (!v.name.trim()) s4.push('Empty variant name');
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
    updateBasic, updateSpecs, updateTeam,
    setHasVariants, addVariant, updateVariant, removeVariant,
    updateStock, reset,
  };
}
