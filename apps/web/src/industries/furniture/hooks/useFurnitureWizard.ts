import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.furniture-wizard.draft';

export type WizardStep = 1 | 2 | 3 | 4;

export interface FurnitureWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  categoryType: string;
  conditionType: string;
  sku: string;
  barcode: string;
  modelNumber: string;
  collectionName: string;
  designerName: string;
  countryOfOrigin: string;
  brand: string;
  costPrice: number | '';
  retailPrice: number | '';
  wholesalePrice: number | '';
  discountedPrice: number | '';
  emiStartingFrom: number | '';
  mrp: number | '';
  taxRate: number | '';
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isCustomMade: boolean;
  isEcoFriendly: boolean;
  isActive: boolean;
  imageUrls: string[];
  images3d: string[];
  ar_model_url: string;
  tagIds: string[];
  notes: string;
  showroomLocation: string;
  showroomFloor: string;
  displayZone: string;
}

export interface FurnitureWizardDimensions {
  lengthCm: number | '';
  widthCm: number | '';
  heightCm: number | '';
  depthCm: number | '';
  seatHeightCm: number | '';
  weightKg: number | '';
  seatingCapacity: number | '';
  storageCompartments: number | '';
  drawersCount: number | '';
  shelvesCount: number | '';
}

export interface FurnitureWizardMaterials {
  primaryMaterial: string;
  secondaryMaterials: string[];
  woodType: string;
  woodFinish: string;
  polishType: string;
  colorName: string;
  colorHex: string;
  upholsteryFabric: string;
  cushionFilling: string;
  cushionDensity: string;
}

export interface FurnitureWizardDelivery {
  requiresAssembly: boolean;
  assemblyTimeMinutes: number | '';
  assemblyPartsCount: number | '';
  assemblyToolsIncluded: boolean;
  assemblyChargeExtra: number | '';
  isCustomizable: boolean;
  customLeadTimeDays: number | '';
  warrantyMonths: number | '';
  warrantyType: string;
  careInstructions: string;
  isWaterResistant: boolean;
  isTermiteProof: boolean;
  requiresLargeVehicle: boolean;
  requiresMultipleHelpers: boolean;
  helpersNeeded: number | '';
  deliveryChargeBase: number | '';
  freeDeliveryRadius: number | '';
}

export interface FurnitureWizardVariant {
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

export interface FurnitureWizardStock {
  currentStock: number;
  lowStockAlert: number;
}

export interface FurnitureWizardDraft {
  step: WizardStep;
  hasVariants: boolean;
  basic: FurnitureWizardBasic;
  dimensions: FurnitureWizardDimensions;
  materials: FurnitureWizardMaterials;
  delivery: FurnitureWizardDelivery;
  variants: FurnitureWizardVariant[];
  stock: FurnitureWizardStock;
  savedAt: number;
}

const emptyBasic = (): FurnitureWizardBasic => ({
  name: '', description: '', categoryId: '',
  categoryType: 'SOFA_SET', conditionType: 'BRAND_NEW',
  sku: '', barcode: '',
  modelNumber: '', collectionName: '', designerName: '', countryOfOrigin: '', brand: '',
  costPrice: '', retailPrice: '', wholesalePrice: '', discountedPrice: '', emiStartingFrom: '', mrp: '',
  taxRate: '',
  isFeatured: false, isBestSeller: false, isNewArrival: true, isCustomMade: false, isEcoFriendly: false, isActive: true,
  imageUrls: [], images3d: [], ar_model_url: '',
  tagIds: [], notes: '',
  showroomLocation: '', showroomFloor: '', displayZone: '',
});

const emptyDimensions = (): FurnitureWizardDimensions => ({
  lengthCm: '', widthCm: '', heightCm: '', depthCm: '', seatHeightCm: '', weightKg: '',
  seatingCapacity: '', storageCompartments: '', drawersCount: '', shelvesCount: '',
});

const emptyMaterials = (): FurnitureWizardMaterials => ({
  primaryMaterial: 'SOLID_WOOD_SHEESHAM', secondaryMaterials: [],
  woodType: '', woodFinish: '', polishType: '',
  colorName: '', colorHex: '',
  upholsteryFabric: '', cushionFilling: '', cushionDensity: '',
});

const emptyDelivery = (): FurnitureWizardDelivery => ({
  requiresAssembly: true, assemblyTimeMinutes: '', assemblyPartsCount: '',
  assemblyToolsIncluded: false, assemblyChargeExtra: '',
  isCustomizable: false, customLeadTimeDays: '',
  warrantyMonths: 12, warrantyType: 'Manufacturer',
  careInstructions: '',
  isWaterResistant: false, isTermiteProof: false,
  requiresLargeVehicle: true, requiresMultipleHelpers: true, helpersNeeded: 2,
  deliveryChargeBase: '', freeDeliveryRadius: '',
});

const emptyDraft = (): FurnitureWizardDraft => ({
  step: 1,
  hasVariants: false,
  basic: emptyBasic(),
  dimensions: emptyDimensions(),
  materials: emptyMaterials(),
  delivery: emptyDelivery(),
  variants: [],
  stock: { currentStock: 0, lowStockAlert: 2 },
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface Opts { autoLoadDraft?: boolean; onDraftLoaded?: () => void }

export function useFurnitureWizard(opts: Opts = {}) {
  const [draft, setDraft] = useState<FurnitureWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FurnitureWizardDraft;
        if (parsed?.basic) {
          setDraft({
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            dimensions: { ...emptyDimensions(), ...parsed.dimensions },
            materials: { ...emptyMaterials(), ...parsed.materials },
            delivery: { ...emptyDelivery(), ...parsed.delivery },
            variants: parsed.variants ?? [],
            stock: parsed.stock ?? { currentStock: 0, lowStockAlert: 2 },
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

  const updateBasic = useCallback((patch: Partial<FurnitureWizardBasic>) =>
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } })), []);
  const updateDimensions = useCallback((patch: Partial<FurnitureWizardDimensions>) =>
    setDraft((d) => ({ ...d, dimensions: { ...d.dimensions, ...patch } })), []);
  const updateMaterials = useCallback((patch: Partial<FurnitureWizardMaterials>) =>
    setDraft((d) => ({ ...d, materials: { ...d.materials, ...patch } })), []);
  const updateDelivery = useCallback((patch: Partial<FurnitureWizardDelivery>) =>
    setDraft((d) => ({ ...d, delivery: { ...d.delivery, ...patch } })), []);

  const setHasVariants = useCallback((v: boolean) =>
    setDraft((d) => (v ? { ...d, hasVariants: true } : { ...d, hasVariants: false, variants: [] })), []);

  const addVariant = useCallback((v: Omit<FurnitureWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) =>
    setDraft((d) => ({
      ...d,
      variants: [...d.variants, { ...v, tempId: genId(), sortOrder: d.variants.length, isActive: true }],
    })), []);
  const updateVariant = useCallback((tempId: string, patch: Partial<FurnitureWizardVariant>) =>
    setDraft((d) => ({ ...d, variants: d.variants.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)) })), []);
  const removeVariant = useCallback((tempId: string) =>
    setDraft((d) => ({ ...d, variants: d.variants.filter((v) => v.tempId !== tempId) })), []);

  const updateStock = useCallback((patch: Partial<FurnitureWizardStock>) =>
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

    const s2: string[] = [];
    const s3: string[] = [];
    if (draft.delivery.warrantyMonths !== '' && Number(draft.delivery.warrantyMonths) < 0) {
      s3.push('Warranty months cannot be negative');
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
    updateBasic, updateDimensions, updateMaterials, updateDelivery,
    setHasVariants, addVariant, updateVariant, removeVariant,
    updateStock, reset,
  };
}
