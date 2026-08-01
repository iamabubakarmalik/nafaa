import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.gaming-wizard.draft';

export type WizardStep = 1 | 2 | 3 | 4;

export interface GamingWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  categoryType: string;
  platform: string;
  conditionType: string;
  sku: string;
  barcode: string;
  costPrice: number | '';
  retailPrice: number | '';
  discountedPrice: number | '';
  usedPrice: number | '';
  tradeInValue: number | '';
  mrp: number | '';
  taxRate: number | '';
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewRelease: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
  notes: string;
}

export interface GamingWizardDetails {
  publisher: string;
  developer: string;
  genre: string[];
  ageRating: string;
  playerCount: string;
  onlineMultiplayer: boolean;
  requiresInternet: boolean;
  gameFileSize: string;
  releaseDate: string;
  region: string;
  language: string[];

  storageCapacity: string;
  memoryRam: string;
  processor: string;
  graphicsCard: string;
  displaySpec: string;
  includedAccessories: string[];
  numberOfControllers: number | '';

  gpuModel: string;
  cpuModel: string;
  ramSpec: string;
  formFactor: string;
  power: string;
  socket: string;
  chipset: string;

  trailerUrl: string;
  screenshots: string[];
}

export interface GamingWizardRental {
  isRentable: boolean;
  rentalPricePerHour: number | '';
  rentalPricePerDay: number | '';
  rentalDeposit: number | '';
  isPreOrder: boolean;
  preOrderReleaseDate: string;
}

export interface GamingWizardVariant {
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

export interface GamingWizardStock {
  currentStock: number;
  lowStockAlert: number;
  rackNumber: string;
}

export interface GamingWizardDraft {
  step: WizardStep;
  hasVariants: boolean;
  basic: GamingWizardBasic;
  details: GamingWizardDetails;
  rental: GamingWizardRental;
  variants: GamingWizardVariant[];
  stock: GamingWizardStock;
  savedAt: number;
}

const emptyBasic = (): GamingWizardBasic => ({
  name: '', description: '', categoryId: '',
  categoryType: 'GAME_DISC', platform: 'PS5', conditionType: 'NEW_SEALED',
  sku: '', barcode: '',
  costPrice: '', retailPrice: '', discountedPrice: '', usedPrice: '', tradeInValue: '', mrp: '',
  taxRate: '',
  isFeatured: false, isBestSeller: false, isNewRelease: true, isActive: true,
  imageUrls: [], tagIds: [], notes: '',
});

const emptyDetails = (): GamingWizardDetails => ({
  publisher: '', developer: '', genre: [], ageRating: '', playerCount: '',
  onlineMultiplayer: false, requiresInternet: false, gameFileSize: '',
  releaseDate: '', region: '', language: [],
  storageCapacity: '', memoryRam: '', processor: '', graphicsCard: '', displaySpec: '',
  includedAccessories: [], numberOfControllers: 1,
  gpuModel: '', cpuModel: '', ramSpec: '', formFactor: '', power: '', socket: '', chipset: '',
  trailerUrl: '', screenshots: [],
});

const emptyRental = (): GamingWizardRental => ({
  isRentable: false, rentalPricePerHour: '', rentalPricePerDay: '', rentalDeposit: '',
  isPreOrder: false, preOrderReleaseDate: '',
});

const emptyDraft = (): GamingWizardDraft => ({
  step: 1,
  hasVariants: false,
  basic: emptyBasic(),
  details: emptyDetails(),
  rental: emptyRental(),
  variants: [],
  stock: { currentStock: 0, lowStockAlert: 3, rackNumber: '' },
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Category helpers — which detail groups apply
export const isGameCategory = (c: string) => c.startsWith('GAME_');
export const isConsoleCategory = (c: string) => c.startsWith('CONSOLE_') || c === 'PC_PREBUILT' || c === 'PC_CUSTOM_BUILD';
export const isPcPartCategory = (c: string) =>
  ['CPU', 'GPU', 'RAM', 'MOTHERBOARD', 'PSU', 'STORAGE_SSD', 'STORAGE_HDD', 'COOLING', 'PC_CASE'].includes(c);

interface Opts { autoLoadDraft?: boolean; onDraftLoaded?: () => void }

export function useGamingWizard(opts: Opts = {}) {
  const [draft, setDraft] = useState<GamingWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GamingWizardDraft;
        if (parsed?.basic) {
          setDraft({
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            details: { ...emptyDetails(), ...parsed.details },
            rental: { ...emptyRental(), ...parsed.rental },
            variants: parsed.variants ?? [],
            stock: parsed.stock ?? { currentStock: 0, lowStockAlert: 3, rackNumber: '' },
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

  const updateBasic = useCallback((patch: Partial<GamingWizardBasic>) =>
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } })), []);
  const updateDetails = useCallback((patch: Partial<GamingWizardDetails>) =>
    setDraft((d) => ({ ...d, details: { ...d.details, ...patch } })), []);
  const updateRental = useCallback((patch: Partial<GamingWizardRental>) =>
    setDraft((d) => ({ ...d, rental: { ...d.rental, ...patch } })), []);

  const setHasVariants = useCallback((v: boolean) =>
    setDraft((d) => (v ? { ...d, hasVariants: true } : { ...d, hasVariants: false, variants: [] })), []);

  const addVariant = useCallback((v: Omit<GamingWizardVariant, 'tempId' | 'sortOrder' | 'isActive'>) =>
    setDraft((d) => ({
      ...d,
      variants: [...d.variants, { ...v, tempId: genId(), sortOrder: d.variants.length, isActive: true }],
    })), []);
  const updateVariant = useCallback((tempId: string, patch: Partial<GamingWizardVariant>) =>
    setDraft((d) => ({ ...d, variants: d.variants.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)) })), []);
  const removeVariant = useCallback((tempId: string) =>
    setDraft((d) => ({ ...d, variants: d.variants.filter((v) => v.tempId !== tempId) })), []);

  const updateStock = useCallback((patch: Partial<GamingWizardStock>) =>
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
    if (!draft.basic.platform) s1.push('Platform required');

    const s2: string[] = [];

    const s3: string[] = [];
    if (draft.rental.isRentable) {
      const perHour = Number(draft.rental.rentalPricePerHour || 0);
      const perDay = Number(draft.rental.rentalPricePerDay || 0);
      if (perHour <= 0 && perDay <= 0) s3.push('Rental price (hourly or daily) required');
    }
    if (draft.rental.isPreOrder && !draft.rental.preOrderReleaseDate) {
      s3.push('Pre-order release date required');
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
    updateBasic, updateDetails, updateRental,
    setHasVariants, addVariant, updateVariant, removeVariant,
    updateStock, reset,
  };
}
