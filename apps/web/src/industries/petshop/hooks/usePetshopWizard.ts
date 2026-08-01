import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.petshop-wizard.draft';

export type WizardStep = 1 | 2 | 3 | 4;

export interface PetshopWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  categoryType: string;
  species: string;
  lifeStage: string;
  brand: string;
  breedSpecific: string;
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
  isOnSale: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
  notes: string;
}

export interface PetshopWizardDetails {
  // Food
  weightGrams: number | '';
  weightKg: number | '';
  packSize: string;
  flavor: string;
  proteinSource: string;
  proteinPct: number | '';
  fatPct: number | '';
  fiberPct: number | '';
  moisturePct: number | '';
  ingredients: string;
  isGrainFree: boolean;
  isOrganic: boolean;
  isHypoallergenic: boolean;
  benefits: string[];
  suitedForBreedSizes: string[];
  suitedForAges: string;

  // Accessory
  size: string;
  dimensions: string;
  color: string;
  material: string;

  // Aquarium
  tankCapacityLiters: number | '';
  tankShape: string;
  filterCapacity: string;
  wattage: string;
}

export interface PetshopWizardMedicine {
  isPrescriptionOnly: boolean;
  activeIngredient: string;
  dosageForm: string;
  dosageStrength: string;
  administrationRoute: string;
  storageInstructions: string;
  expiryDate: string;
  batchNumber: string;
}

export interface PetshopWizardVariant {
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

export interface PetshopWizardStock {
  currentStock: number;
  lowStockAlert: number;
  rackNumber: string;
}

export interface PetshopWizardDraft {
  step: WizardStep;
  hasVariants: boolean;
  basic: PetshopWizardBasic;
  details: PetshopWizardDetails;
  medicine: PetshopWizardMedicine;
  variants: PetshopWizardVariant[];
  stock: PetshopWizardStock;
  savedAt: number;
}

const emptyBasic = (): PetshopWizardBasic => ({
  name: '', description: '', categoryId: '',
  categoryType: 'DRY_FOOD', species: 'DOG', lifeStage: 'ADULT',
  brand: '', breedSpecific: '',
  sku: '', barcode: '',
  costPrice: '', retailPrice: '', discountedPrice: '', mrp: '', taxRate: '',
  isFeatured: false, isBestSeller: false, isNewArrival: true, isOnSale: false, isActive: true,
  imageUrls: [], tagIds: [], notes: '',
});

const emptyDetails = (): PetshopWizardDetails => ({
  weightGrams: '', weightKg: '', packSize: '', flavor: '',
  proteinSource: '', proteinPct: '', fatPct: '', fiberPct: '', moisturePct: '',
  ingredients: '', isGrainFree: false, isOrganic: false, isHypoallergenic: false,
  benefits: [], suitedForBreedSizes: [], suitedForAges: '',
  size: '', dimensions: '', color: '', material: '',
  tankCapacityLiters: '', tankShape: '', filterCapacity: '', wattage: '',
});

const emptyMedicine = (): PetshopWizardMedicine => ({
  isPrescriptionOnly: false,
  activeIngredient: '', dosageForm: '', dosageStrength: '',
  administrationRoute: '', storageInstructions: '',
  expiryDate: '', batchNumber: '',
});

const emptyDraft = (): PetshopWizardDraft => ({
  step: 1,
  hasVariants: false,
  basic: emptyBasic(),
  details: emptyDetails(),
  medicine: emptyMedicine(),
  variants: [],
  stock: { currentStock: 0, lowStockAlert: 5, rackNumber: '' },
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Category helpers
export const isFoodCategory = (c: string) =>
  ['DRY_FOOD', 'WET_FOOD', 'TREATS', 'SUPPLEMENTS', 'PRESCRIPTION_DIET', 'BIRD_FOOD', 'AQUARIUM_FOOD', 'REPTILE_FOOD'].includes(c);
export const isAccessoryCategory = (c: string) =>
  ['TOYS', 'BEDS', 'CARRIERS', 'LEASHES_COLLARS', 'CLOTHING', 'GROOMING_SUPPLIES', 'HYGIENE', 'TRAINING', 'BIRD_CAGE', 'BIRD_ACCESSORIES'].includes(c);
export const isAquariumCategory = (c: string) =>
  ['AQUARIUM_TANK', 'AQUARIUM_FILTER', 'AQUARIUM_DECOR'].includes(c);
export const isMedicineCategory = (c: string) =>
  ['VET_MEDICINE', 'VET_VACCINE', 'FIRST_AID', 'AQUARIUM_MEDICINE'].includes(c);

interface Opts { autoLoadDraft?: boolean; onDraftLoaded?: () => void }

export function usePetshopWizard(opts: Opts = {}) {
  const [draft, setDraft] = useState<PetshopWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PetshopWizardDraft;
        if (parsed?.basic) {
          setDraft({
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            details: { ...emptyDetails(), ...parsed.details },
            medicine: { ...emptyMedicine(), ...parsed.medicine },
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

  const updateBasic = useCallback((patch: Partial<PetshopWizardBasic>) =>
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } })), []);
  const updateDetails = useCallback((patch: Partial<PetshopWizardDetails>) =>
    setDraft((d) => ({ ...d, details: { ...d.details, ...patch } })), []);
  const updateMedicine = useCallback((patch: Partial<PetshopWizardMedicine>) =>
    setDraft((d) => ({ ...d, medicine: { ...d.medicine, ...patch } })), []);

  const setHasVariants = useCallback((v: boolean) =>
    setDraft((d) => (v ? { ...d, hasVariants: true } : { ...d, hasVariants: false, variants: [] })), []);

  const addVariant = useCallback((v: Omit<PetshopWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) =>
    setDraft((d) => ({
      ...d,
      variants: [...d.variants, { ...v, tempId: genId(), sortOrder: d.variants.length, isActive: true }],
    })), []);
  const updateVariant = useCallback((tempId: string, patch: Partial<PetshopWizardVariant>) =>
    setDraft((d) => ({ ...d, variants: d.variants.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)) })), []);
  const removeVariant = useCallback((tempId: string) =>
    setDraft((d) => ({ ...d, variants: d.variants.filter((v) => v.tempId !== tempId) })), []);

  const updateStock = useCallback((patch: Partial<PetshopWizardStock>) =>
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
    if (!draft.basic.species) s1.push('Species required');

    const s2: string[] = [];
    const s3: string[] = [];
    if (isMedicineCategory(draft.basic.categoryType)) {
      if (!draft.medicine.expiryDate) s3.push('Expiry date required for medicine');
      if (!draft.medicine.batchNumber.trim()) s3.push('Batch number required for medicine');
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
    updateBasic, updateDetails, updateMedicine,
    setHasVariants, addVariant, updateVariant, removeVariant,
    updateStock, reset,
  };
}
