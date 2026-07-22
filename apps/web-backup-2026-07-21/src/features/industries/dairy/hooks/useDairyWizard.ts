import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DairyProductType, DairyUnit, MilkQuality } from '../api/products.api';

const DRAFT_KEY = 'nafaa.dairy-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export interface DairyWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  sku: string;
  barcode: string;
  productType: DairyProductType;
  unit: DairyUnit;
  costPrice: number | '';
  salePrice: number | '';
  wholesalePrice: number | '';
  retailPrice: number | '';
  taxRate: number | '';
  isFeatured: boolean;
  isBestSeller: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
  farmSource: string;
  cattleType: string;
  notes: string;
}

export interface DairyWizardComposition {
  fatContent: number | '';
  snfContent: number | '';
  proteinContent: number | '';
  waterAdded: boolean;
  quality: MilkQuality | '';
  isPasteurized: boolean;
  isHomogenized: boolean;
  isRaw: boolean;
  isOrganic: boolean;
  isFresh: boolean;
  requiresRefrigeration: boolean;
  storageTempMin: number | '';
  storageTempMax: number | '';
  productionDate: string;
  bestBeforeHours: number | '';
  shelfLifeHours: number | '';
}

export interface DairyWizardAvailability {
  morningPrice: number | '';
  eveningPrice: number | '';
  bulkPrice: number | '';
  minBulkQty: number | '';
  homeDeliveryPrice: number | '';
  availableMorning: boolean;
  availableEvening: boolean;
  homeDeliveryAvailable: boolean;
  displayOrder: number;
  initialStock: number;
  lowStockAlert: number;
}

export interface DairyWizardDraft {
  step: WizardStep;
  basic: DairyWizardBasic;
  composition: DairyWizardComposition;
  availability: DairyWizardAvailability;
  savedAt: number;
}

const emptyBasic = (): DairyWizardBasic => ({
  name: '', description: '', categoryId: '', brandId: '',
  sku: '', barcode: '',
  productType: 'FRESH_MILK', unit: 'LITER',
  costPrice: '', salePrice: '', wholesalePrice: '', retailPrice: '',
  taxRate: '',
  isFeatured: false, isBestSeller: false, isActive: true,
  imageUrls: [], tagIds: [],
  farmSource: '', cattleType: '', notes: '',
});

const emptyComposition = (): DairyWizardComposition => ({
  fatContent: '', snfContent: '', proteinContent: '',
  waterAdded: false, quality: '',
  isPasteurized: false, isHomogenized: false, isRaw: true, isOrganic: false, isFresh: true,
  requiresRefrigeration: true,
  storageTempMin: 2, storageTempMax: 8,
  productionDate: '', bestBeforeHours: 24, shelfLifeHours: 48,
});

const emptyAvailability = (): DairyWizardAvailability => ({
  morningPrice: '', eveningPrice: '', bulkPrice: '', minBulkQty: '',
  homeDeliveryPrice: '',
  availableMorning: true, availableEvening: true, homeDeliveryAvailable: true,
  displayOrder: 0,
  initialStock: 0, lowStockAlert: 5,
});

const emptyDraft = (): DairyWizardDraft => ({
  step: 1,
  basic: emptyBasic(),
  composition: emptyComposition(),
  availability: emptyAvailability(),
  savedAt: Date.now(),
});

interface UseDairyWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useDairyWizard(opts: UseDairyWizardOpts = {}) {
  const [draft, setDraft] = useState<DairyWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DairyWizardDraft;
        if (parsed && parsed.basic) {
          const safe: DairyWizardDraft = {
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            composition: { ...emptyComposition(), ...parsed.composition },
            availability: { ...emptyAvailability(), ...parsed.availability },
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

  const updateBasic = useCallback((patch: Partial<DairyWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const updateComposition = useCallback((patch: Partial<DairyWizardComposition>) => {
    setDraft((d) => ({ ...d, composition: { ...d.composition, ...patch } }));
  }, []);

  const updateAvailability = useCallback((patch: Partial<DairyWizardAvailability>) => {
    setDraft((d) => ({ ...d, availability: { ...d.availability, ...patch } }));
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
    if (!draft.basic.productType) step1Errors.push('Product type required');
    if (!draft.basic.unit) step1Errors.push('Unit required');

    const step2Errors: string[] = [];
    if (draft.composition.fatContent !== '' && Number(draft.composition.fatContent) < 0) {
      step2Errors.push('Fat content cannot be negative');
    }

    const step3Errors: string[] = [];
    if (draft.availability.initialStock < 0) step3Errors.push('Stock cannot be negative');

    return {
      step1: { valid: step1Errors.length === 0, errors: step1Errors },
      step2: { valid: step2Errors.length === 0, errors: step2Errors },
      step3: { valid: step3Errors.length === 0, errors: step3Errors },
      allValid: step1Errors.length === 0 && step2Errors.length === 0 && step3Errors.length === 0,
    };
  }, [draft]);

  const stats = useMemo(() => {
    const salePrice = Number(draft.basic.salePrice || 0);
    const costPrice = Number(draft.basic.costPrice || 0);
    const profit = salePrice - costPrice;
    const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
    const stockValue = Number(draft.availability.initialStock || 0) * salePrice;

    return {
      profit, margin, stockValue,
      hasFat: draft.composition.fatContent !== '' && Number(draft.composition.fatContent) > 0,
      hasSnf: draft.composition.snfContent !== '' && Number(draft.composition.snfContent) > 0,
      qualityBadges: [
        draft.composition.isPasteurized && 'Pasteurized',
        draft.composition.isHomogenized && 'Homogenized',
        draft.composition.isRaw && 'Raw',
        draft.composition.isOrganic && 'Organic',
        draft.composition.isFresh && 'Fresh',
      ].filter(Boolean) as string[],
      slotBadges: [
        draft.availability.availableMorning && 'Morning',
        draft.availability.availableEvening && 'Evening',
        draft.availability.homeDeliveryAvailable && 'Home Delivery',
      ].filter(Boolean) as string[],
    };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateComposition, updateAvailability,
    reset,
  };
}
