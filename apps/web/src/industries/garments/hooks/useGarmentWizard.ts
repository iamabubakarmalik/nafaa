import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  GarmentGender, GarmentCategoryType, GarmentFabricType,
  GarmentWorkType, GarmentFitType,
} from '../api/products.api';

const DRAFT_KEY = 'nafaa.garment-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export interface GarmentWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  sku: string;
  barcode: string;
  unit: string;
  costPrice: number | '';
  salePrice: number | '';
  wholesalePrice: number | '';
  taxRate: number | '';
  isFeatured: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
  // Garment profile
  gender: GarmentGender | '';
  categoryType: GarmentCategoryType | '';
  fabricType: GarmentFabricType | '';
  fabricBlend: string;
  workType: GarmentWorkType;
  fitType: GarmentFitType;
  season: string;
  neckline: string;
  sleeveType: string;
  sleeveLength: string;
  pattern: string;
  careInstructions: string;
  countryOfOrigin: string;
  manufacturer: string;
  designer: string;
  styleCode: string;
  collectionId: string;
  sizeChartId: string;
  // Type flags
  isReadyMade: boolean;
  isStitchable: boolean;
  isFabricOnly: boolean;
  allowAlteration: boolean;
  allowReservation: boolean;
  allowLayaway: boolean;
  minAlterationDays: number | '';
  defaultStitchingDays: number | '';
  // Marketing flags
  isNewArrival: boolean;
  isBestSeller: boolean;
  isOnSale: boolean;
}

export interface GarmentWizardVariant {
  tempId: string;
  size: string;
  colorName: string;
  colorHex: string;
  colorFamily: string;
  skuSuffix: string;
  barcode: string;
  priceOverride?: number;
  costOverride?: number;
  stock: number;
  lowStockAlert: number;
  imageUrl?: string;
  isFeaturedColor: boolean;
  // Measurements
  chest?: number;
  waist?: number;
  hip?: number;
  shoulder?: number;
  length?: number;
  sleeveLength?: number;
  inseam?: number;
}

export interface GarmentWizardStock {
  currentStock: number;
  lowStockAlert: number;
  rackNumber: string;
}

export interface GarmentWizardDraft {
  step: WizardStep;
  hasVariants: boolean;
  basic: GarmentWizardBasic;
  variants: GarmentWizardVariant[];
  stock: GarmentWizardStock;
  savedAt: number;
}

const emptyBasic = (): GarmentWizardBasic => ({
  name: '', description: '', categoryId: '', brandId: '',
  sku: '', barcode: '', unit: 'pcs',
  costPrice: '', salePrice: '', wholesalePrice: '', taxRate: '',
  isFeatured: false, isActive: true,
  imageUrls: [], tagIds: [],
  gender: '', categoryType: '', fabricType: '',
  fabricBlend: '', workType: 'PLAIN', fitType: 'REGULAR',
  season: 'ALL_SEASON', neckline: '', sleeveType: '', sleeveLength: '',
  pattern: '', careInstructions: '', countryOfOrigin: 'Pakistan',
  manufacturer: '', designer: '', styleCode: '',
  collectionId: '', sizeChartId: '',
  isReadyMade: true, isStitchable: false, isFabricOnly: false,
  allowAlteration: true, allowReservation: true, allowLayaway: false,
  minAlterationDays: 2, defaultStitchingDays: 7,
  isNewArrival: false, isBestSeller: false, isOnSale: false,
});

const emptyDraft = (): GarmentWizardDraft => ({
  step: 1,
  hasVariants: false,
  basic: emptyBasic(),
  variants: [],
  stock: { currentStock: 0, lowStockAlert: 5, rackNumber: '' },
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface UseGarmentWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useGarmentWizard(opts: UseGarmentWizardOpts = {}) {
  const [draft, setDraft] = useState<GarmentWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GarmentWizardDraft;
        if (parsed && parsed.basic) {
          const safe: GarmentWizardDraft = {
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            variants: parsed.variants ?? [],
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

  const goToStep = useCallback((step: WizardStep) => setDraft((d) => ({ ...d, step })), []);
  const nextStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step < 3 ? d.step + 1 : 3) as WizardStep })), []);
  const prevStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step > 1 ? d.step - 1 : 1) as WizardStep })), []);

  const updateBasic = useCallback((patch: Partial<GarmentWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const setHasVariants = useCallback((v: boolean) => {
    setDraft((d) => (v ? { ...d, hasVariants: true } : { ...d, hasVariants: false, variants: [] }));
  }, []);

  const addVariant = useCallback((v: Omit<GarmentWizardVariant, 'tempId'>) => {
    setDraft((d) => {
      // Check for duplicate size+color combination
      const exists = d.variants.some((x) =>
        x.size === v.size && x.colorName.toLowerCase() === v.colorName.toLowerCase()
      );
      if (exists) return d;
      return {
        ...d,
        variants: [...d.variants, { ...v, tempId: genId() }],
      };
    });
  }, []);

  const addVariantsMatrix = useCallback((sizes: string[], colors: Array<{ name: string; hex: string; family?: string }>) => {
    setDraft((d) => {
      const newVariants: GarmentWizardVariant[] = [];
      const salePrice = Number(d.basic.salePrice || 0);
      const costPrice = Number(d.basic.costPrice || 0);
      const existingKeys = new Set(d.variants.map((v) => `${v.size}::${v.colorName.toLowerCase()}`));

      for (const size of sizes) {
        for (const color of colors) {
          const key = `${size}::${color.name.toLowerCase()}`;
          if (existingKeys.has(key)) continue;
          newVariants.push({
            tempId: genId(),
            size,
            colorName: color.name,
            colorHex: color.hex,
            colorFamily: color.family || '',
            skuSuffix: `${size}-${color.name.slice(0, 3).toUpperCase()}`,
            barcode: '',
            stock: 0,
            lowStockAlert: 3,
            isFeaturedColor: false,
          });
        }
      }
      return { ...d, variants: [...d.variants, ...newVariants], hasVariants: true };
    });
  }, []);

  const updateVariant = useCallback((tempId: string, patch: Partial<GarmentWizardVariant>) => {
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)),
    }));
  }, []);

  const removeVariant = useCallback((tempId: string) => {
    setDraft((d) => ({ ...d, variants: d.variants.filter((v) => v.tempId !== tempId) }));
  }, []);

  const updateStock = useCallback((patch: Partial<GarmentWizardStock>) => {
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

    const step2Errors: string[] = [];
    if (draft.hasVariants) {
      if (draft.variants.length === 0) step2Errors.push('Add at least one variant');
      const skuSet = new Set<string>();
      const barcodeSet = new Set<string>();
      for (const v of draft.variants) {
        if (!v.size.trim() && !v.colorName.trim()) step2Errors.push('Variant needs size or color');
        if (v.skuSuffix?.trim()) {
          const k = v.skuSuffix.trim().toLowerCase();
          if (skuSet.has(k)) step2Errors.push(`Duplicate SKU suffix: ${v.skuSuffix}`);
          skuSet.add(k);
        }
        if (v.barcode?.trim()) {
          const k = v.barcode.trim().toLowerCase();
          if (barcodeSet.has(k)) step2Errors.push(`Duplicate barcode: ${v.barcode}`);
          barcodeSet.add(k);
        }
      }
    }

    const step3Errors: string[] = [];
    // Nothing strictly required in step 3

    return {
      step1: { valid: step1Errors.length === 0, errors: step1Errors },
      step2: { valid: step2Errors.length === 0, errors: step2Errors },
      step3: { valid: step3Errors.length === 0, errors: step3Errors },
      allValid: step1Errors.length === 0 && step2Errors.length === 0 && step3Errors.length === 0,
    };
  }, [draft]);

  const stats = useMemo(() => {
    const variantCount = draft.variants.length;
    const uniqueSizes = new Set(draft.variants.map((v) => v.size).filter(Boolean)).size;
    const uniqueColors = new Set(draft.variants.map((v) => v.colorName.toLowerCase()).filter(Boolean)).size;
    const variantStock = draft.variants.reduce((a, v) => a + Number(v.stock || 0), 0);
    const baseStock = draft.hasVariants ? 0 : Number(draft.stock.currentStock || 0);
    const totalStock = baseStock + variantStock;
    const salePrice = Number(draft.basic.salePrice || 0);
    const costPrice = Number(draft.basic.costPrice || 0);
    const stockValue = totalStock * salePrice;
    const stockCost = totalStock * costPrice;
    const potentialProfit = stockValue - stockCost;
    const profitMargin = stockValue > 0 ? (potentialProfit / stockValue) * 100 : 0;

    return {
      variantCount, uniqueSizes, uniqueColors, totalStock,
      stockValue, stockCost, potentialProfit, profitMargin,
    };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic,
    setHasVariants,
    addVariant, addVariantsMatrix, updateVariant, removeVariant,
    updateStock,
    reset,
  };
}
