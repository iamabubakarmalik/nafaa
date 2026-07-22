import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AnimalType, CutCategory, FreshnessType, SlaughterMethod,
  QualityGrade, SaleUnit,
} from '../api/products.api';

const DRAFT_KEY = 'nafaa.meat-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export interface MeatWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  sku: string;
  barcode: string;
  animalType: AnimalType;
  cutCategory: CutCategory;
  freshnessType: FreshnessType;
  saleUnit: SaleUnit;
  pricePerKg: number | '';
  pricePerPiece: number | '';
  costPrice: number | '';
  wholesalePrice: number | '';
  taxRate: number | '';
  minOrderKg: number | '';
  maxOrderKg: number | '';
  weightVariancePct: number | '';
  isBoneless: boolean;
  isBoneIn: boolean;
  isSkinless: boolean;
  isFeatured: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
}

export interface MeatWizardHalalQuality {
  slaughterMethod: SlaughterMethod;
  qualityGrade: QualityGrade;
  isHalalCertified: boolean;
  halalCertNumber: string;
  halalCertBy: string;
  halalCertExpiry: string;
  otherCerts: string[];
  isOrganic: boolean;
  isFreeRange: boolean;
  isGrainFed: boolean;
  isGrassFed: boolean;
  isFrozen: boolean;
  isMarinated: boolean;
  marinationType: string;
  storageTempMin: number | '';
  storageTempMax: number | '';
  shelfLifeDays: number | '';
  packagingType: string;
  packagingWeight: number | '';
}

export interface MeatWizardOrigin {
  farmName: string;
  farmLocation: string;
  slaughterhouseName: string;
  slaughterhouseLic: string;
  countryOfOrigin: string;
  breed: string;
  animalAge: string;
  animalSex: string;
  batchNumber: string;
  cuttingStyle: string;
  cleaningLevel: string;
  cookingSuggestions: string;
  descriptionLong: string;
  isPopular: boolean;
  isNewArrival: boolean;
  isOnSale: boolean;
  // Nutrition (per 100g)
  nutritionCalories: number | '';
  nutritionProtein: number | '';
  nutritionFat: number | '';
  nutritionCarbs: number | '';
  nutritionCholesterol: number | '';
  nutritionSodium: number | '';
}

export interface MeatWizardDraft {
  step: WizardStep;
  basic: MeatWizardBasic;
  halalQuality: MeatWizardHalalQuality;
  origin: MeatWizardOrigin;
  savedAt: number;
}

const emptyBasic = (): MeatWizardBasic => ({
  name: '', description: '', categoryId: '', brandId: '',
  sku: '', barcode: '',
  animalType: 'BEEF', cutCategory: 'RETAIL_CUT',
  freshnessType: 'FRESH_CHILLED', saleUnit: 'KG',
  pricePerKg: '', pricePerPiece: '',
  costPrice: '', wholesalePrice: '', taxRate: '',
  minOrderKg: 0.25, maxOrderKg: '', weightVariancePct: 5,
  isBoneless: false, isBoneIn: false, isSkinless: false,
  isFeatured: false, isActive: true,
  imageUrls: [], tagIds: [],
});

const emptyHalalQuality = (): MeatWizardHalalQuality => ({
  slaughterMethod: 'HALAL_HAND',
  qualityGrade: 'GRADE_A',
  isHalalCertified: true,
  halalCertNumber: '', halalCertBy: '', halalCertExpiry: '',
  otherCerts: [],
  isOrganic: false, isFreeRange: false,
  isGrainFed: false, isGrassFed: false,
  isFrozen: false, isMarinated: false, marinationType: '',
  storageTempMin: 0, storageTempMax: 4,
  shelfLifeDays: 3, packagingType: '',
  packagingWeight: '',
});

const emptyOrigin = (): MeatWizardOrigin => ({
  farmName: '', farmLocation: '',
  slaughterhouseName: '', slaughterhouseLic: '',
  countryOfOrigin: 'Pakistan', breed: '',
  animalAge: '', animalSex: '',
  batchNumber: '', cuttingStyle: '', cleaningLevel: '',
  cookingSuggestions: '', descriptionLong: '',
  isPopular: false, isNewArrival: false, isOnSale: false,
  nutritionCalories: '', nutritionProtein: '', nutritionFat: '',
  nutritionCarbs: '', nutritionCholesterol: '', nutritionSodium: '',
});

const emptyDraft = (): MeatWizardDraft => ({
  step: 1,
  basic: emptyBasic(),
  halalQuality: emptyHalalQuality(),
  origin: emptyOrigin(),
  savedAt: Date.now(),
});

interface UseMeatWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useMeatWizard(opts: UseMeatWizardOpts = {}) {
  const [draft, setDraft] = useState<MeatWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MeatWizardDraft;
        if (parsed && parsed.basic) {
          const safe: MeatWizardDraft = {
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            halalQuality: { ...emptyHalalQuality(), ...parsed.halalQuality },
            origin: { ...emptyOrigin(), ...parsed.origin },
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

  const updateBasic = useCallback((patch: Partial<MeatWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const updateHalalQuality = useCallback((patch: Partial<MeatWizardHalalQuality>) => {
    setDraft((d) => ({ ...d, halalQuality: { ...d.halalQuality, ...patch } }));
  }, []);

  const updateOrigin = useCallback((patch: Partial<MeatWizardOrigin>) => {
    setDraft((d) => ({ ...d, origin: { ...d.origin, ...patch } }));
  }, []);

  const addOtherCert = useCallback((cert: string) => {
    setDraft((d) => ({
      ...d,
      halalQuality: {
        ...d.halalQuality,
        otherCerts: d.halalQuality.otherCerts.includes(cert)
          ? d.halalQuality.otherCerts.filter((c) => c !== cert)
          : [...d.halalQuality.otherCerts, cert],
      },
    }));
  }, []);

  const reset = useCallback(() => {
    setDraft(emptyDraft());
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setDraftRestored(false);
  }, []);

  const validation = useMemo(() => {
    const step1Errors: string[] = [];
    if (!draft.basic.name.trim()) step1Errors.push('Product name required');
    if (!draft.basic.pricePerKg || Number(draft.basic.pricePerKg) <= 0) {
      step1Errors.push('Price per kg required');
    }
    if (!draft.basic.animalType) step1Errors.push('Animal type required');
    if (!draft.basic.cutCategory) step1Errors.push('Cut category required');

    const step2Errors: string[] = [];
    if (draft.halalQuality.isHalalCertified && !draft.halalQuality.halalCertNumber.trim()) {
      step2Errors.push('Halal cert number required (or uncheck Halal certified)');
    }

    const step3Errors: string[] = [];
    // Nothing strictly required in Step 3

    return {
      step1: { valid: step1Errors.length === 0, errors: step1Errors },
      step2: { valid: step2Errors.length === 0, errors: step2Errors },
      step3: { valid: step3Errors.length === 0, errors: step3Errors },
      allValid: step1Errors.length === 0 && step2Errors.length === 0 && step3Errors.length === 0,
    };
  }, [draft]);

  const stats = useMemo(() => {
    const pricePerKg = Number(draft.basic.pricePerKg || 0);
    const cost = Number(draft.basic.costPrice || 0);
    const profit = pricePerKg - cost;
    const margin = pricePerKg > 0 ? (profit / pricePerKg) * 100 : 0;

    return {
      pricePerKg, cost, profit, margin,
      certCount: draft.halalQuality.otherCerts.length + (draft.halalQuality.isHalalCertified ? 1 : 0),
      hasFarmInfo: !!draft.origin.farmName || !!draft.origin.farmLocation,
      hasNutrition: !!draft.origin.nutritionCalories || !!draft.origin.nutritionProtein,
    };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateHalalQuality, updateOrigin,
    addOtherCert,
    reset,
  };
}
