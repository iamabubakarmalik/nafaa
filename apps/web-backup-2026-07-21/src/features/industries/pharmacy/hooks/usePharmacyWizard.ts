import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DrugScheduleClass } from '../api/salts.api';
import type { StorageCondition } from '../api/medicines.api';

const DRAFT_KEY = 'nafaa.pharmacy-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export interface PharmacyWizardBasic {
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
  mrpPrice: number | '';
  taxRate: number | '';
  isFeatured: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
  // Pharmacy-specific
  registrationNumber: string;
  approvalDate: string;
  dosageForm: string;
  packSize: string;
  packUnit: string;
  manufacturer: string;
  countryOfOrigin: string;
  importedBy: string;
  color: string;
  shape: string;
  markings: string;
  isGeneric: boolean;
  brandTier: string;
  indication: string;
  currentStock: number;
  lowStockAlert: number;
}

export interface PharmacyWizardSaltEntry {
  tempId: string;
  saltId: string;
  saltName: string;
  strength: string;
  strengthValue?: number;
  strengthUnit?: string;
  isMainSalt: boolean;
}

export interface PharmacyWizardClinical {
  salts: PharmacyWizardSaltEntry[];
  scheduleClass: DrugScheduleClass;
  requiresPrescription: boolean;
  isNarcotic: boolean;
  isRefrigerated: boolean;
  storageCondition: StorageCondition;
  storageInstructions: string;
  requiresColdChain: boolean;
  minTemperature: number | '';
  maxTemperature: number | '';
  mechanismOfAction: string;
  pharmacokinetics: string;
}

export interface PharmacyWizardBatch {
  tempId: string;
  batchNumber: string;
  manufactureDate?: string;
  expiryDate?: string;
  quantity: number;
  costPrice: number;
  notes?: string;
}

export interface PharmacyWizardSubstitute {
  tempId: string;
  substituteProductId: string;
  substituteName: string;
  notes?: string;
}

export interface PharmacyWizardInventory {
  hasBatches: boolean;
  batches: PharmacyWizardBatch[];
  hasSubstitutes: boolean;
  substitutes: PharmacyWizardSubstitute[];
}

export interface PharmacyWizardDraft {
  step: WizardStep;
  basic: PharmacyWizardBasic;
  clinical: PharmacyWizardClinical;
  inventory: PharmacyWizardInventory;
  savedAt: number;
}

const emptyBasic = (): PharmacyWizardBasic => ({
  name: '', description: '', categoryId: '', brandId: '',
  sku: '', barcode: '', unit: 'tablet',
  costPrice: '', salePrice: '', wholesalePrice: '', mrpPrice: '', taxRate: '',
  isFeatured: false, isActive: true,
  imageUrls: [], tagIds: [],
  registrationNumber: '', approvalDate: '',
  dosageForm: 'Tablet', packSize: '', packUnit: 'strip',
  manufacturer: '', countryOfOrigin: 'Pakistan', importedBy: '',
  color: '', shape: '', markings: '',
  isGeneric: false, brandTier: 'STANDARD',
  indication: '',
  currentStock: 0, lowStockAlert: 10,
});

const emptyClinical = (): PharmacyWizardClinical => ({
  salts: [],
  scheduleClass: 'OTC',
  requiresPrescription: false,
  isNarcotic: false,
  isRefrigerated: false,
  storageCondition: 'ROOM_TEMPERATURE',
  storageInstructions: '',
  requiresColdChain: false,
  minTemperature: '', maxTemperature: '',
  mechanismOfAction: '',
  pharmacokinetics: '',
});

const emptyInventory = (): PharmacyWizardInventory => ({
  hasBatches: false,
  batches: [],
  hasSubstitutes: false,
  substitutes: [],
});

const emptyDraft = (): PharmacyWizardDraft => ({
  step: 1,
  basic: emptyBasic(),
  clinical: emptyClinical(),
  inventory: emptyInventory(),
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface UsePharmacyWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function usePharmacyWizard(opts: UsePharmacyWizardOpts = {}) {
  const [draft, setDraft] = useState<PharmacyWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PharmacyWizardDraft;
        if (parsed && parsed.basic) {
          const safe: PharmacyWizardDraft = {
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            clinical: { ...emptyClinical(), ...parsed.clinical },
            inventory: { ...emptyInventory(), ...parsed.inventory },
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

  const updateBasic = useCallback((patch: Partial<PharmacyWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const updateClinical = useCallback((patch: Partial<PharmacyWizardClinical>) => {
    setDraft((d) => ({ ...d, clinical: { ...d.clinical, ...patch } }));
  }, []);

  const addSalt = useCallback((salt: Omit<PharmacyWizardSaltEntry, 'tempId'>) => {
    setDraft((d) => {
      const exists = d.clinical.salts.some((s) => s.saltId === salt.saltId);
      if (exists) return d;
      return {
        ...d,
        clinical: {
          ...d.clinical,
          salts: [...d.clinical.salts, { ...salt, tempId: genId() }],
        },
      };
    });
  }, []);

  const updateSalt = useCallback((tempId: string, patch: Partial<PharmacyWizardSaltEntry>) => {
    setDraft((d) => ({
      ...d,
      clinical: {
        ...d.clinical,
        salts: d.clinical.salts.map((s) => (s.tempId === tempId ? { ...s, ...patch } : s)),
      },
    }));
  }, []);

  const removeSalt = useCallback((tempId: string) => {
    setDraft((d) => ({
      ...d,
      clinical: {
        ...d.clinical,
        salts: d.clinical.salts.filter((s) => s.tempId !== tempId),
      },
    }));
  }, []);

  const setHasBatches = useCallback((v: boolean) => {
    setDraft((d) => (v
      ? { ...d, inventory: { ...d.inventory, hasBatches: true } }
      : { ...d, inventory: { ...d.inventory, hasBatches: false, batches: [] } }
    ));
  }, []);

  const addBatch = useCallback((seed: Partial<PharmacyWizardBatch> = {}) => {
    setDraft((d) => {
      const idx = d.inventory.batches.length + 1;
      return {
        ...d,
        inventory: {
          ...d.inventory,
          batches: [...d.inventory.batches, {
            tempId: genId(),
            batchNumber: seed.batchNumber ?? `B-${String(idx).padStart(3, '0')}`,
            manufactureDate: seed.manufactureDate,
            expiryDate: seed.expiryDate,
            quantity: seed.quantity ?? 0,
            costPrice: seed.costPrice ?? Number(d.basic.costPrice || 0),
            notes: seed.notes,
          }],
        },
      };
    });
  }, []);

  const updateBatch = useCallback((tempId: string, patch: Partial<PharmacyWizardBatch>) => {
    setDraft((d) => ({
      ...d,
      inventory: {
        ...d.inventory,
        batches: d.inventory.batches.map((b) => (b.tempId === tempId ? { ...b, ...patch } : b)),
      },
    }));
  }, []);

  const removeBatch = useCallback((tempId: string) => {
    setDraft((d) => ({
      ...d,
      inventory: { ...d.inventory, batches: d.inventory.batches.filter((b) => b.tempId !== tempId) },
    }));
  }, []);

  const setHasSubstitutes = useCallback((v: boolean) => {
    setDraft((d) => (v
      ? { ...d, inventory: { ...d.inventory, hasSubstitutes: true } }
      : { ...d, inventory: { ...d.inventory, hasSubstitutes: false, substitutes: [] } }
    ));
  }, []);

  const addSubstitute = useCallback((sub: Omit<PharmacyWizardSubstitute, 'tempId'>) => {
    setDraft((d) => {
      const exists = d.inventory.substitutes.some((s) => s.substituteProductId === sub.substituteProductId);
      if (exists) return d;
      return {
        ...d,
        inventory: {
          ...d.inventory,
          substitutes: [...d.inventory.substitutes, { ...sub, tempId: genId() }],
        },
      };
    });
  }, []);

  const removeSubstitute = useCallback((tempId: string) => {
    setDraft((d) => ({
      ...d,
      inventory: {
        ...d.inventory,
        substitutes: d.inventory.substitutes.filter((s) => s.tempId !== tempId),
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
    if (!draft.basic.name.trim()) step1Errors.push('Medicine name required');
    if (!draft.basic.salePrice || Number(draft.basic.salePrice) <= 0) {
      step1Errors.push('Sale price required');
    }
    if (!draft.basic.unit) step1Errors.push('Unit required');

    const step2Errors: string[] = [];
    if (draft.clinical.requiresColdChain) {
      if (draft.clinical.minTemperature === '' || draft.clinical.maxTemperature === '') {
        step2Errors.push('Cold chain requires min/max temperature');
      }
    }
    draft.clinical.salts.forEach((s) => {
      if (!s.strength.trim()) step2Errors.push(`Salt "${s.saltName}" needs strength (e.g. 500mg)`);
    });

    const step3Errors: string[] = [];
    if (draft.inventory.hasBatches) {
      if (draft.inventory.batches.length === 0) {
        step3Errors.push('Add at least one batch, or switch off batch tracking');
      }
      draft.inventory.batches.forEach((b) => {
        if (!b.batchNumber.trim()) step3Errors.push('Batch missing number');
        if (b.quantity <= 0) step3Errors.push(`Batch ${b.batchNumber}: quantity required`);
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
    const saltCount = draft.clinical.salts.length;
    const batchCount = draft.inventory.batches.length;
    const substituteCount = draft.inventory.substitutes.length;
    const batchStock = draft.inventory.batches.reduce((a, b) => a + Number(b.quantity || 0), 0);
    const totalStock = draft.inventory.hasBatches ? batchStock : Number(draft.basic.currentStock || 0);
    const salePrice = Number(draft.basic.salePrice || 0);
    const costPrice = Number(draft.basic.costPrice || 0);
    const stockValue = totalStock * salePrice;
    const stockCost = totalStock * costPrice;
    const profit = salePrice - costPrice;
    const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

    // Check for expiring batches
    const now = Date.now();
    const expiringSoon = draft.inventory.batches.filter((b) => {
      if (!b.expiryDate) return false;
      const days = (new Date(b.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24);
      return days > 0 && days <= 90;
    }).length;
    const expired = draft.inventory.batches.filter((b) => {
      if (!b.expiryDate) return false;
      return new Date(b.expiryDate).getTime() < now;
    }).length;

    return {
      saltCount, batchCount, substituteCount,
      totalStock, stockValue, stockCost,
      profit, margin,
      expiringSoon, expired,
    };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic,
    updateClinical, addSalt, updateSalt, removeSalt,
    setHasBatches, addBatch, updateBatch, removeBatch,
    setHasSubstitutes, addSubstitute, removeSubstitute,
    reset,
  };
}
