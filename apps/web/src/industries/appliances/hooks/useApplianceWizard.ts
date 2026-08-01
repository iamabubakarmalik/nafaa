import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.appliance-wizard.draft';

export type WizardStep = 1 | 2 | 3 | 4;

export interface ApplianceWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  applianceBrandId: string;
  categoryType: string;
  sku: string;
  barcode: string;
  modelNumber: string;
  modelYear: number | '';
  colorName: string;
  colorHex: string;
  costPrice: number | '';
  retailPrice: number | '';
  wholesalePrice: number | '';
  mrp: number | '';
  emiStartingFrom: number | '';
  cashDiscount: number | '';
  taxRate: number | '';
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
}

export interface ApplianceWizardSpecs {
  capacity: string;
  powerConsumption: string;
  voltage: string;
  frequency: string;
  weightKg: number | '';
  dimensions: string;
  energyRating: string;
  isEnergyStar: boolean;
  isInverter: boolean;
  acTonnage: string;
  acType: string;
  coolingCapacity: string;
  refrigerantType: string;
  fridgeCapacityLiters: number | '';
  refrigeratorType: string;
  doorCount: number | '';
  compressorType: string;
  washingCapacityKg: number | '';
  washingType: string;
  rpm: number | '';
  screenSizeInch: number | '';
  displayType: string;
  resolution: string;
  smartOS: string;
  features: string[];
  smartFeatures: string[];
  safetyFeatures: string[];
}

export interface ApplianceWizardWarranty {
  warrantyMonths: number | '';
  compressorWarrantyMonths: number | '';
  motorWarrantyMonths: number | '';
  warrantyType: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  boxContents: string[];
}

export interface ApplianceWizardInstallation {
  requiresInstallation: boolean;
  installationCharge: number | '';
  installationCovered: boolean;
  installationTimeHours: number | '';
  requiresPlumbing: boolean;
  requiresGasConnection: boolean;
  requiresElectrician: boolean;
  requiresLargeVehicle: boolean;
  freeDelivery: boolean;
  deliveryChargePerKm: number | '';
}

export interface ApplianceWizardVariant {
  tempId: string;
  name: string;
  sku?: string;
  barcode?: string;
  colorHex?: string;
  priceOverride?: number;
  costOverride?: number;
  stock: number;
  lowStockAlert: number;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ApplianceWizardSerial {
  tempId: string;
  serialNumber: string;
  modelNumber?: string;
  batchNumber?: string;
  manufactureDate?: string;
}

export interface ApplianceWizardStock {
  currentStock: number;
  lowStockAlert: number;
  rackNumber: string;
}

export interface ApplianceWizardDraft {
  step: WizardStep;
  hasVariants: boolean;
  hasSerials: boolean;
  basic: ApplianceWizardBasic;
  specs: ApplianceWizardSpecs;
  warranty: ApplianceWizardWarranty;
  installation: ApplianceWizardInstallation;
  variants: ApplianceWizardVariant[];
  serials: ApplianceWizardSerial[];
  stock: ApplianceWizardStock;
  savedAt: number;
}

const emptyBasic = (): ApplianceWizardBasic => ({
  name: '', description: '', categoryId: '', applianceBrandId: '',
  categoryType: 'REFRIGERATOR',
  sku: '', barcode: '', modelNumber: '', modelYear: 2026,
  colorName: '', colorHex: '',
  costPrice: '', retailPrice: '', wholesalePrice: '', mrp: '',
  emiStartingFrom: '', cashDiscount: '',
  taxRate: '',
  isFeatured: false, isBestSeller: false, isNewArrival: true, isActive: true,
  imageUrls: [], tagIds: [],
});

const emptySpecs = (): ApplianceWizardSpecs => ({
  capacity: '', powerConsumption: '', voltage: '220V', frequency: '50Hz',
  weightKg: '', dimensions: '',
  energyRating: 'NOT_RATED', isEnergyStar: false, isInverter: false,
  acTonnage: '', acType: '', coolingCapacity: '', refrigerantType: '',
  fridgeCapacityLiters: '', refrigeratorType: '', doorCount: '', compressorType: '',
  washingCapacityKg: '', washingType: '', rpm: '',
  screenSizeInch: '', displayType: '', resolution: '', smartOS: '',
  features: [], smartFeatures: [], safetyFeatures: [],
});

const emptyWarranty = (): ApplianceWizardWarranty => ({
  warrantyMonths: 12, compressorWarrantyMonths: '', motorWarrantyMonths: '',
  warrantyType: 'Manufacturer',
  warrantyStartDate: '', warrantyEndDate: '',
  boxContents: [],
});

const emptyInstallation = (): ApplianceWizardInstallation => ({
  requiresInstallation: true, installationCharge: '', installationCovered: false,
  installationTimeHours: '',
  requiresPlumbing: false, requiresGasConnection: false, requiresElectrician: true,
  requiresLargeVehicle: false, freeDelivery: false, deliveryChargePerKm: '',
});

const emptyDraft = (): ApplianceWizardDraft => ({
  step: 1,
  hasVariants: false,
  hasSerials: false,
  basic: emptyBasic(),
  specs: emptySpecs(),
  warranty: emptyWarranty(),
  installation: emptyInstallation(),
  variants: [],
  serials: [],
  stock: { currentStock: 0, lowStockAlert: 3, rackNumber: '' },
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface UseApplianceWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useApplianceWizard(opts: UseApplianceWizardOpts = {}) {
  const [draft, setDraft] = useState<ApplianceWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ApplianceWizardDraft;
        if (parsed && parsed.basic) {
          const safe: ApplianceWizardDraft = {
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            specs: { ...emptySpecs(), ...parsed.specs },
            warranty: { ...emptyWarranty(), ...parsed.warranty },
            installation: { ...emptyInstallation(), ...parsed.installation },
            variants: parsed.variants ?? [],
            serials: parsed.serials ?? [],
            stock: parsed.stock ?? { currentStock: 0, lowStockAlert: 3, rackNumber: '' },
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
  const nextStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step < 4 ? d.step + 1 : 4) as WizardStep })), []);
  const prevStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step > 1 ? d.step - 1 : 1) as WizardStep })), []);

  const updateBasic = useCallback((patch: Partial<ApplianceWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const updateSpecs = useCallback((patch: Partial<ApplianceWizardSpecs>) => {
    setDraft((d) => ({ ...d, specs: { ...d.specs, ...patch } }));
  }, []);

  const updateWarranty = useCallback((patch: Partial<ApplianceWizardWarranty>) => {
    setDraft((d) => ({ ...d, warranty: { ...d.warranty, ...patch } }));
  }, []);

  const updateInstallation = useCallback((patch: Partial<ApplianceWizardInstallation>) => {
    setDraft((d) => ({ ...d, installation: { ...d.installation, ...patch } }));
  }, []);

  const setHasVariants = useCallback((v: boolean) => {
    setDraft((d) => (v ? { ...d, hasVariants: true } : { ...d, hasVariants: false, variants: [] }));
  }, []);

  const setHasSerials = useCallback((v: boolean) => {
    setDraft((d) => (v ? { ...d, hasSerials: true } : { ...d, hasSerials: false, serials: [] }));
  }, []);

  const addVariant = useCallback((v: Omit<ApplianceWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) => {
    setDraft((d) => ({
      ...d,
      variants: [...d.variants, { ...v, tempId: genId(), sortOrder: d.variants.length, isActive: true }],
    }));
  }, []);

  const updateVariant = useCallback((tempId: string, patch: Partial<ApplianceWizardVariant>) => {
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)),
    }));
  }, []);

  const removeVariant = useCallback((tempId: string) => {
    setDraft((d) => ({ ...d, variants: d.variants.filter((v) => v.tempId !== tempId) }));
  }, []);

  const addSerial = useCallback((seed: Partial<ApplianceWizardSerial> = {}) => {
    setDraft((d) => ({
      ...d,
      serials: [...d.serials, {
        tempId: genId(),
        serialNumber: seed.serialNumber ?? '',
        modelNumber: seed.modelNumber,
        batchNumber: seed.batchNumber,
        manufactureDate: seed.manufactureDate,
      }],
    }));
  }, []);

  const addSerialsBulk = useCallback((lines: string[]) => {
    setDraft((d) => {
      const existing = new Set(d.serials.map((s) => s.serialNumber));
      const newOnes = lines
        .map((l) => l.trim())
        .filter((l) => l && !existing.has(l))
        .map((sn) => ({ tempId: genId(), serialNumber: sn } as ApplianceWizardSerial));
      return { ...d, serials: [...d.serials, ...newOnes] };
    });
  }, []);

  const updateSerial = useCallback((tempId: string, patch: Partial<ApplianceWizardSerial>) => {
    setDraft((d) => ({
      ...d,
      serials: d.serials.map((s) => (s.tempId === tempId ? { ...s, ...patch } : s)),
    }));
  }, []);

  const removeSerial = useCallback((tempId: string) => {
    setDraft((d) => ({ ...d, serials: d.serials.filter((s) => s.tempId !== tempId) }));
  }, []);

  const updateStock = useCallback((patch: Partial<ApplianceWizardStock>) => {
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
    if (!draft.basic.retailPrice || Number(draft.basic.retailPrice) <= 0) step1Errors.push('Retail price required');
    if (!draft.basic.categoryType) step1Errors.push('Category type required');

    const step2Errors: string[] = [];
    const step3Errors: string[] = [];
    if (draft.warranty.warrantyMonths && Number(draft.warranty.warrantyMonths) < 0) {
      step3Errors.push('Warranty months cannot be negative');
    }

    const step4Errors: string[] = [];
    if (draft.hasVariants && draft.variants.length === 0) {
      step4Errors.push('Add at least one variant, or switch off variants');
    }
    if (draft.hasSerials && draft.serials.length === 0) {
      step4Errors.push('Add at least one serial, or switch off serial tracking');
    }
    const snSet = new Set<string>();
    draft.serials.forEach((s) => {
      if (!s.serialNumber.trim()) step4Errors.push('Empty serial number found');
      else if (snSet.has(s.serialNumber.trim())) step4Errors.push(`Duplicate serial: ${s.serialNumber}`);
      else snSet.add(s.serialNumber.trim());
    });

    return {
      step1: { valid: step1Errors.length === 0, errors: step1Errors },
      step2: { valid: step2Errors.length === 0, errors: step2Errors },
      step3: { valid: step3Errors.length === 0, errors: step3Errors },
      step4: { valid: step4Errors.length === 0, errors: step4Errors },
      allValid: step1Errors.length === 0 && step2Errors.length === 0 && step3Errors.length === 0 && step4Errors.length === 0,
    };
  }, [draft]);

  const stats = useMemo(() => {
    const variantCount = draft.variants.length;
    const serialCount = draft.serials.length;
    const variantStock = draft.variants.reduce((a, v) => a + Number(v.stock || 0), 0);
    const baseStock = draft.hasVariants ? 0 : draft.hasSerials ? serialCount : Number(draft.stock.currentStock || 0);
    const totalStock = baseStock + variantStock;
    const retailPrice = Number(draft.basic.retailPrice || 0);
    const costPrice = Number(draft.basic.costPrice || 0);
    const stockValue = totalStock * retailPrice;
    const stockCost = totalStock * costPrice;
    const potentialProfit = stockValue - stockCost;
    const profitMargin = stockValue > 0 ? (potentialProfit / stockValue) * 100 : 0;

    return {
      variantCount, serialCount, totalStock,
      stockValue, stockCost, potentialProfit, profitMargin,
    };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateSpecs, updateWarranty, updateInstallation,
    setHasVariants, setHasSerials,
    addVariant, updateVariant, removeVariant,
    addSerial, addSerialsBulk, updateSerial, removeSerial,
    updateStock,
    reset,
  };
}
