import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PartCategory, PartCondition } from '../api/part-profiles.api';

const DRAFT_KEY = 'nafaa.autoparts-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export interface AutoPartsWizardBasic {
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
  stock: number | '';
  lowStockAlert: number | '';
  isFeatured: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
  // Auto parts specific
  partCategory: PartCategory;
  subCategory: string;
}

export interface AutoPartsWizardDetails {
  partNumber: string;
  oemNumber: string;
  alternateNumbers: string[];
  condition: PartCondition;
  brand: string;
  countryOfOrigin: string;
  manufacturer: string;
  weightGrams: number | '';
  dimensions: string;
  color: string;
  material: string;
  warrantyMonths: number | '';
  warrantyKm: number | '';
  warrantyNotes: string;
  installationMinutes: number | '';
  installationDifficulty: string;
  requiresSpecialTool: boolean;
  isFastMoving: boolean;
  isCritical: boolean;
  minStockAlert: number | '';
}

export interface AutoPartsWizardFitment {
  tempId: string;
  makeId: string;
  makeName: string;
  modelId: string;
  modelName: string;
  yearFrom: number | '';
  yearTo: number | '';
  engineOptions: string[];
  notes: string;
}

export interface AutoPartsWizardCompatibility {
  hasFitment: boolean;
  isUniversal: boolean;
  fitments: AutoPartsWizardFitment[];
}

export interface AutoPartsWizardDraft {
  step: WizardStep;
  basic: AutoPartsWizardBasic;
  details: AutoPartsWizardDetails;
  compatibility: AutoPartsWizardCompatibility;
  savedAt: number;
}

const emptyBasic = (): AutoPartsWizardBasic => ({
  name: '', description: '', categoryId: '', brandId: '',
  sku: '', barcode: '', unit: 'pcs',
  costPrice: '', salePrice: '', wholesalePrice: '', taxRate: '',
  stock: 0, lowStockAlert: 5,
  isFeatured: false, isActive: true,
  imageUrls: [], tagIds: [],
  partCategory: 'ENGINE', subCategory: '',
});

const emptyDetails = (): AutoPartsWizardDetails => ({
  partNumber: '', oemNumber: '', alternateNumbers: [],
  condition: 'NEW', brand: '', countryOfOrigin: '', manufacturer: '',
  weightGrams: '', dimensions: '', color: '', material: '',
  warrantyMonths: 6, warrantyKm: '', warrantyNotes: '',
  installationMinutes: '', installationDifficulty: 'MEDIUM',
  requiresSpecialTool: false,
  isFastMoving: false, isCritical: false,
  minStockAlert: 5,
});

const emptyCompatibility = (): AutoPartsWizardCompatibility => ({
  hasFitment: false, isUniversal: false, fitments: [],
});

const emptyDraft = (): AutoPartsWizardDraft => ({
  step: 1,
  basic: emptyBasic(),
  details: emptyDetails(),
  compatibility: emptyCompatibility(),
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface UseAutoPartsWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useAutoPartsWizard(opts: UseAutoPartsWizardOpts = {}) {
  const [draft, setDraft] = useState<AutoPartsWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AutoPartsWizardDraft;
        if (parsed && parsed.basic) {
          const safe: AutoPartsWizardDraft = {
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            details: { ...emptyDetails(), ...parsed.details },
            compatibility: { ...emptyCompatibility(), ...parsed.compatibility },
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

  const updateBasic = useCallback((patch: Partial<AutoPartsWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const updateDetails = useCallback((patch: Partial<AutoPartsWizardDetails>) => {
    setDraft((d) => ({ ...d, details: { ...d.details, ...patch } }));
  }, []);

  const addAlternateNumber = useCallback((num: string) => {
    const trimmed = num.trim();
    if (!trimmed) return;
    setDraft((d) => ({
      ...d,
      details: {
        ...d.details,
        alternateNumbers: d.details.alternateNumbers.includes(trimmed)
          ? d.details.alternateNumbers
          : [...d.details.alternateNumbers, trimmed],
      },
    }));
  }, []);

  const removeAlternateNumber = useCallback((num: string) => {
    setDraft((d) => ({
      ...d,
      details: {
        ...d.details,
        alternateNumbers: d.details.alternateNumbers.filter((n) => n !== num),
      },
    }));
  }, []);

  const setHasFitment = useCallback((v: boolean) => {
    setDraft((d) => (v ? { ...d, compatibility: { ...d.compatibility, hasFitment: true } } : { ...d, compatibility: emptyCompatibility() }));
  }, []);

  const setIsUniversal = useCallback((v: boolean) => {
    setDraft((d) => ({ ...d, compatibility: { ...d.compatibility, isUniversal: v, fitments: v ? [] : d.compatibility.fitments } }));
  }, []);

  const addFitment = useCallback((fit: Omit<AutoPartsWizardFitment, 'tempId'>) => {
    setDraft((d) => ({
      ...d,
      compatibility: {
        ...d.compatibility,
        fitments: [...d.compatibility.fitments, { ...fit, tempId: genId() }],
      },
    }));
  }, []);

  const updateFitment = useCallback((tempId: string, patch: Partial<AutoPartsWizardFitment>) => {
    setDraft((d) => ({
      ...d,
      compatibility: {
        ...d.compatibility,
        fitments: d.compatibility.fitments.map((f) => (f.tempId === tempId ? { ...f, ...patch } : f)),
      },
    }));
  }, []);

  const removeFitment = useCallback((tempId: string) => {
    setDraft((d) => ({
      ...d,
      compatibility: {
        ...d.compatibility,
        fitments: d.compatibility.fitments.filter((f) => f.tempId !== tempId),
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
    if (!draft.basic.name.trim()) step1Errors.push('Part name required');
    if (!draft.basic.salePrice || Number(draft.basic.salePrice) <= 0) step1Errors.push('Sale price required');
    if (!draft.basic.partCategory) step1Errors.push('Part category required');

    const step2Errors: string[] = [];
    if (!draft.details.condition) step2Errors.push('Condition required');

    const step3Errors: string[] = [];
    if (draft.compatibility.hasFitment && !draft.compatibility.isUniversal) {
      if (draft.compatibility.fitments.length === 0) {
        step3Errors.push('Add at least one vehicle fitment or mark as Universal');
      }
      draft.compatibility.fitments.forEach((f, idx) => {
        if (!f.makeId) step3Errors.push(`Fitment #${idx + 1}: Make required`);
        if (!f.modelId) step3Errors.push(`Fitment #${idx + 1}: Model required`);
      });
    }

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
    const stock = Number(draft.basic.stock || 0);
    const stockValue = stock * salePrice;
    const stockCost = stock * costPrice;

    return {
      profit, margin, stock, stockValue, stockCost,
      alternateNumberCount: draft.details.alternateNumbers.length,
      fitmentCount: draft.compatibility.fitments.length,
      isUniversal: draft.compatibility.isUniversal,
    };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateDetails,
    addAlternateNumber, removeAlternateNumber,
    setHasFitment, setIsUniversal,
    addFitment, updateFitment, removeFitment,
    reset,
  };
}
