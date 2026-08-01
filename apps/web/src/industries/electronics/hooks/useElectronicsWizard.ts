import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.electronics-wizard.draft';

export type WizardStep = 1 | 2 | 3 | 4;

export interface ElectronicsWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  electronicsBrandId: string;
  categoryType: string;
  conditionType: string;
  sku: string;
  barcode: string;
  modelNumber: string;
  partNumber: string;
  colorName: string;
  colorHex: string;
  costPrice: number | '';
  retailPrice: number | '';
  wholesalePrice: number | '';
  mrp: number | '';
  taxRate: number | '';
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
}

export interface ElectronicsWizardSpecs {
  connectivity: string[];
  powerRating: string;
  batteryCapacity: string;
  batteryLifeHours: number | '';
  chargingTimeMinutes: number | '';
  operatingRange: string;
  waterResistance: string;
  screenSize: string;
  resolution: string;
  refreshRate: string;
  compatibleWith: string[];
  compatibleOS: string[];
  weightGrams: number | '';
  lengthMm: number | '';
  widthMm: number | '';
  heightMm: number | '';
}

export interface ElectronicsWizardWarranty {
  warrantyMonths: number | '';
  warrantyType: string;
  hasInternationalWarranty: boolean;
  warrantyStartDate: string;
  warrantyEndDate: string;
  hasImei: boolean;
  boxContents: string[];
  hasManual: boolean;
  hasWarrantyCard: boolean;
}

export interface ElectronicsWizardVariant {
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

export interface ElectronicsWizardSerial {
  tempId: string;
  serialNumber: string;
  imei?: string;
  imei2?: string;
  macAddress?: string;
}

export interface ElectronicsWizardStock {
  currentStock: number;
  lowStockAlert: number;
  rackNumber: string;
}

export interface ElectronicsWizardDraft {
  step: WizardStep;
  hasVariants: boolean;
  hasSerials: boolean;
  basic: ElectronicsWizardBasic;
  specs: ElectronicsWizardSpecs;
  warranty: ElectronicsWizardWarranty;
  variants: ElectronicsWizardVariant[];
  serials: ElectronicsWizardSerial[];
  stock: ElectronicsWizardStock;
  savedAt: number;
}

const emptyBasic = (): ElectronicsWizardBasic => ({
  name: '', description: '', categoryId: '', electronicsBrandId: '',
  categoryType: 'SMARTPHONE', conditionType: 'NEW',
  sku: '', barcode: '', modelNumber: '', partNumber: '',
  colorName: '', colorHex: '',
  costPrice: '', retailPrice: '', wholesalePrice: '', mrp: '',
  taxRate: '',
  isFeatured: false, isBestSeller: false, isNewArrival: true, isTrending: false, isActive: true,
  imageUrls: [], tagIds: [],
});

const emptySpecs = (): ElectronicsWizardSpecs => ({
  connectivity: [], powerRating: '', batteryCapacity: '',
  batteryLifeHours: '', chargingTimeMinutes: '',
  operatingRange: '', waterResistance: '',
  screenSize: '', resolution: '', refreshRate: '',
  compatibleWith: [], compatibleOS: [],
  weightGrams: '', lengthMm: '', widthMm: '', heightMm: '',
});

const emptyWarranty = (): ElectronicsWizardWarranty => ({
  warrantyMonths: 12, warrantyType: 'Manufacturer',
  hasInternationalWarranty: false,
  warrantyStartDate: '', warrantyEndDate: '',
  hasImei: false, boxContents: [], hasManual: true, hasWarrantyCard: true,
});

const emptyDraft = (): ElectronicsWizardDraft => ({
  step: 1,
  hasVariants: false,
  hasSerials: false,
  basic: emptyBasic(),
  specs: emptySpecs(),
  warranty: emptyWarranty(),
  variants: [],
  serials: [],
  stock: { currentStock: 0, lowStockAlert: 5, rackNumber: '' },
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface UseElectronicsWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useElectronicsWizard(opts: UseElectronicsWizardOpts = {}) {
  const [draft, setDraft] = useState<ElectronicsWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ElectronicsWizardDraft;
        if (parsed && parsed.basic) {
          const safe: ElectronicsWizardDraft = {
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            specs: { ...emptySpecs(), ...parsed.specs },
            warranty: { ...emptyWarranty(), ...parsed.warranty },
            variants: parsed.variants ?? [],
            serials: parsed.serials ?? [],
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
  const nextStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step < 4 ? d.step + 1 : 4) as WizardStep })), []);
  const prevStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step > 1 ? d.step - 1 : 1) as WizardStep })), []);

  const updateBasic = useCallback((patch: Partial<ElectronicsWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const updateSpecs = useCallback((patch: Partial<ElectronicsWizardSpecs>) => {
    setDraft((d) => ({ ...d, specs: { ...d.specs, ...patch } }));
  }, []);

  const updateWarranty = useCallback((patch: Partial<ElectronicsWizardWarranty>) => {
    setDraft((d) => ({ ...d, warranty: { ...d.warranty, ...patch } }));
  }, []);

  const setHasVariants = useCallback((v: boolean) => {
    setDraft((d) => (v ? { ...d, hasVariants: true } : { ...d, hasVariants: false, variants: [] }));
  }, []);

  const setHasSerials = useCallback((v: boolean) => {
    setDraft((d) => (v ? { ...d, hasSerials: true } : { ...d, hasSerials: false, serials: [] }));
  }, []);

  const addVariant = useCallback((v: Omit<ElectronicsWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) => {
    setDraft((d) => ({
      ...d,
      variants: [...d.variants, { ...v, tempId: genId(), sortOrder: d.variants.length, isActive: true }],
    }));
  }, []);

  const updateVariant = useCallback((tempId: string, patch: Partial<ElectronicsWizardVariant>) => {
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)),
    }));
  }, []);

  const removeVariant = useCallback((tempId: string) => {
    setDraft((d) => ({ ...d, variants: d.variants.filter((v) => v.tempId !== tempId) }));
  }, []);

  const addSerial = useCallback((seed: Partial<ElectronicsWizardSerial> = {}) => {
    setDraft((d) => ({
      ...d,
      serials: [...d.serials, {
        tempId: genId(),
        serialNumber: seed.serialNumber ?? '',
        imei: seed.imei,
        imei2: seed.imei2,
        macAddress: seed.macAddress,
      }],
    }));
  }, []);

  const addSerialsBulk = useCallback((lines: string[]) => {
    setDraft((d) => {
      const existing = new Set(d.serials.map((s) => s.serialNumber));
      const newOnes = lines
        .map((l) => l.trim())
        .filter((l) => l && !existing.has(l))
        .map((sn) => ({ tempId: genId(), serialNumber: sn } as ElectronicsWizardSerial));
      return { ...d, serials: [...d.serials, ...newOnes] };
    });
  }, []);

  const updateSerial = useCallback((tempId: string, patch: Partial<ElectronicsWizardSerial>) => {
    setDraft((d) => ({
      ...d,
      serials: d.serials.map((s) => (s.tempId === tempId ? { ...s, ...patch } : s)),
    }));
  }, []);

  const removeSerial = useCallback((tempId: string) => {
    setDraft((d) => ({ ...d, serials: d.serials.filter((s) => s.tempId !== tempId) }));
  }, []);

  const updateStock = useCallback((patch: Partial<ElectronicsWizardStock>) => {
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
    // Specs step is optional — no strict validation

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
    const skuSet = new Set<string>();
    const snSet = new Set<string>();
    const imeiSet = new Set<string>();
    draft.serials.forEach((s) => {
      if (!s.serialNumber.trim()) step4Errors.push('Empty serial number found');
      else if (snSet.has(s.serialNumber.trim())) step4Errors.push(`Duplicate serial: ${s.serialNumber}`);
      else snSet.add(s.serialNumber.trim());
      if (s.imei?.trim()) {
        if (imeiSet.has(s.imei.trim())) step4Errors.push(`Duplicate IMEI: ${s.imei}`);
        else imeiSet.add(s.imei.trim());
      }
    });
    draft.variants.forEach((v) => {
      if (v.sku?.trim()) {
        const k = v.sku.trim().toLowerCase();
        if (skuSet.has(k)) step4Errors.push(`Duplicate variant SKU: ${v.sku}`);
        else skuSet.add(k);
      }
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
    updateBasic, updateSpecs, updateWarranty,
    setHasVariants, setHasSerials,
    addVariant, updateVariant, removeVariant,
    addSerial, addSerialsBulk, updateSerial, removeSerial,
    updateStock,
    reset,
  };
}
