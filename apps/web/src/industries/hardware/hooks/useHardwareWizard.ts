import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.hardware-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export type CategoryType =
  | 'CEMENT' | 'STEEL_REBAR' | 'STEEL_SHEET' | 'STEEL_PIPE' | 'BRICKS' | 'BLOCKS'
  | 'SAND' | 'GRAVEL' | 'CRUSH' | 'TILES_FLOOR' | 'TILES_WALL' | 'MARBLE' | 'GRANITE'
  | 'SANITARY_WARE' | 'PLUMBING_PIPE' | 'PLUMBING_FITTING'
  | 'ELECTRIC_WIRE' | 'ELECTRIC_SWITCH' | 'ELECTRIC_CONDUIT'
  | 'PAINT' | 'PRIMER' | 'THINNER' | 'WOOD_LUMBER' | 'PLYWOOD' | 'MDF'
  | 'HARDWARE_TOOL' | 'POWER_TOOL' | 'HAND_TOOL' | 'FASTENER'
  | 'ADHESIVE' | 'WATERPROOFING' | 'INSULATION'
  | 'DOOR' | 'WINDOW' | 'GLASS' | 'ALUMINUM' | 'IRON_FABRICATION' | 'ROOFING'
  | 'SAFETY_EQUIPMENT' | 'OTHER';

export interface HardwareWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  hardwareBrandId: string;
  categoryType: CategoryType;
  sku: string;
  barcode: string;
  unit: string;
  costPrice: number | '';
  salePrice: number | '';
  wholesalePrice: number | '';
  taxRate: number | '';
  isFeatured: boolean;
  isActive: boolean;
  isBestSeller: boolean;
  isFastMoving: boolean;
  requiresTruck: boolean;
  hasIsoCertification: boolean;
  imageUrls: string[];
  tagIds: string[];
  initialStock: number | '';
  lowStockAlert: number | '';
}

export interface HardwareWizardSpecs {
  // Cement
  grade: string;
  bagWeight: number | '';
  cementType: string;
  // Steel
  diameter: string;
  gauge: string;
  length: string;
  weightPerPiece: number | '';
  steelGrade: string;
  // Tiles/Marble
  tileSize: string;
  finish: string;
  colorName: string;
  colorHex: string;
  sqftPerBox: number | '';
  piecesPerBox: number | '';
  // Sanitary
  model: string;
  material: string;
  // Plumbing/Electric
  pipeSize: string;
  wireGauge: string;
  wireCore: string;
  // Paint
  litersPerCan: number | '';
  coverage: string;
  paintFinish: string;
  // Wood
  woodType: string;
  thickness: string;
  // Tools
  toolType: string;
  powerRating: string;
  // Generic
  originCountry: string;
  warrantyMonths: number | '';
  specifications: string;
}

export interface HardwareWizardBulkTier {
  tempId: string;
  minQuantity: number;
  maxQuantity?: number;
  price: number;
  discountPct?: number;
  label: string;
}

export interface HardwareWizardReorder {
  enabled: boolean;
  minStock: number;
  reorderPoint: number;
  reorderQty: number;
  maxStock: number | '';
  preferredSupplier: string;
  leadTimeDays: number | '';
  emergencyContact: string;
  autoAlert: boolean;
}

export interface HardwareWizardDraft {
  step: WizardStep;
  basic: HardwareWizardBasic;
  specs: HardwareWizardSpecs;
  bulkTiers: HardwareWizardBulkTier[];
  reorder: HardwareWizardReorder;
  savedAt: number;
}

const emptyBasic = (): HardwareWizardBasic => ({
  name: '', description: '', categoryId: '', brandId: '', hardwareBrandId: '',
  categoryType: 'OTHER', sku: '', barcode: '', unit: 'pcs',
  costPrice: '', salePrice: '', wholesalePrice: '', taxRate: '',
  isFeatured: false, isActive: true, isBestSeller: false, isFastMoving: false,
  requiresTruck: false, hasIsoCertification: false,
  imageUrls: [], tagIds: [],
  initialStock: 0, lowStockAlert: 10,
});

const emptySpecs = (): HardwareWizardSpecs => ({
  grade: '', bagWeight: '', cementType: '',
  diameter: '', gauge: '', length: '', weightPerPiece: '', steelGrade: '',
  tileSize: '', finish: '', colorName: '', colorHex: '', sqftPerBox: '', piecesPerBox: '',
  model: '', material: '',
  pipeSize: '', wireGauge: '', wireCore: '',
  litersPerCan: '', coverage: '', paintFinish: '',
  woodType: '', thickness: '',
  toolType: '', powerRating: '',
  originCountry: '', warrantyMonths: '', specifications: '',
});

const emptyReorder = (): HardwareWizardReorder => ({
  enabled: false,
  minStock: 5, reorderPoint: 10, reorderQty: 50,
  maxStock: '', preferredSupplier: '', leadTimeDays: '',
  emergencyContact: '', autoAlert: true,
});

const emptyDraft = (): HardwareWizardDraft => ({
  step: 1,
  basic: emptyBasic(),
  specs: emptySpecs(),
  bulkTiers: [],
  reorder: emptyReorder(),
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface UseHardwareWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useHardwareWizard(opts: UseHardwareWizardOpts = {}) {
  const [draft, setDraft] = useState<HardwareWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as HardwareWizardDraft;
        if (parsed && parsed.basic) {
          const safe: HardwareWizardDraft = {
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            specs: { ...emptySpecs(), ...parsed.specs },
            bulkTiers: parsed.bulkTiers ?? [],
            reorder: { ...emptyReorder(), ...parsed.reorder },
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

  const updateBasic = useCallback((patch: Partial<HardwareWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const updateSpecs = useCallback((patch: Partial<HardwareWizardSpecs>) => {
    setDraft((d) => ({ ...d, specs: { ...d.specs, ...patch } }));
  }, []);

  const addBulkTier = useCallback((tier: Omit<HardwareWizardBulkTier, 'tempId'>) => {
    setDraft((d) => ({
      ...d,
      bulkTiers: [...d.bulkTiers, { ...tier, tempId: genId() }].sort((a, b) => a.minQuantity - b.minQuantity),
    }));
  }, []);

  const updateBulkTier = useCallback((tempId: string, patch: Partial<HardwareWizardBulkTier>) => {
    setDraft((d) => ({
      ...d,
      bulkTiers: d.bulkTiers.map((t) => (t.tempId === tempId ? { ...t, ...patch } : t)),
    }));
  }, []);

  const removeBulkTier = useCallback((tempId: string) => {
    setDraft((d) => ({ ...d, bulkTiers: d.bulkTiers.filter((t) => t.tempId !== tempId) }));
  }, []);

  const updateReorder = useCallback((patch: Partial<HardwareWizardReorder>) => {
    setDraft((d) => ({ ...d, reorder: { ...d.reorder, ...patch } }));
  }, []);

  const toggleTag = useCallback((tagId: string) => {
    setDraft((d) => ({
      ...d,
      basic: {
        ...d.basic,
        tagIds: d.basic.tagIds.includes(tagId)
          ? d.basic.tagIds.filter((t) => t !== tagId)
          : [...d.basic.tagIds, tagId],
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
    if (!draft.basic.salePrice || Number(draft.basic.salePrice) <= 0) {
      step1Errors.push('Sale price required');
    }
    if (!draft.basic.unit) step1Errors.push('Unit required');

    const step2Errors: string[] = [];
    // Category-specific validation could go here — soft warnings only

    const step3Errors: string[] = [];
    if (draft.bulkTiers.length > 0) {
      draft.bulkTiers.forEach((t) => {
        if (t.minQuantity <= 0) step3Errors.push(`Tier "${t.label || 'unnamed'}": min qty must be > 0`);
        if (t.price <= 0) step3Errors.push(`Tier "${t.label || 'unnamed'}": price required`);
        if (t.maxQuantity && t.maxQuantity < t.minQuantity) {
          step3Errors.push(`Tier "${t.label || 'unnamed'}": max qty must be >= min qty`);
        }
      });
    }
    if (draft.reorder.enabled) {
      if (draft.reorder.reorderPoint <= 0) step3Errors.push('Reorder point required');
      if (draft.reorder.reorderQty <= 0) step3Errors.push('Reorder quantity required');
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
    const stockValue = Number(draft.basic.initialStock || 0) * salePrice;
    const stockCost = Number(draft.basic.initialStock || 0) * costPrice;

    return {
      bulkTierCount: draft.bulkTiers.length,
      hasReorder: draft.reorder.enabled,
      profit, margin,
      stockValue, stockCost,
      potentialProfit: stockValue - stockCost,
      minBulkPrice: draft.bulkTiers.length > 0 ? Math.min(...draft.bulkTiers.map((t) => t.price)) : 0,
    };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateSpecs,
    addBulkTier, updateBulkTier, removeBulkTier,
    updateReorder,
    toggleTag,
    reset,
  };
}
