import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  BakeryCategory, BakerySize, CakeShape, CakeFlavor, CreamType,
} from '../api/products.api';

const DRAFT_KEY = 'nafaa.bakery-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export interface BakeryWizardBasic {
  name: string;
  descriptionLong: string;
  categoryId: string;
  brandId: string;
  bakeryCategory: BakeryCategory;
  defaultSize: BakerySize;
  sku: string;
  barcode: string;
  unit: string;
  pricePerKg: number | '';
  pricePerPound: number | '';
  pricePerPiece: number | '';
  pricePerDozen: number | '';
  pricePerSlice: number | '';
  pricePerBox: number | '';
  pricePerTray: number | '';
  weightGrams: number | '';
  servingSize: number | '';
  numberOfSlices: number | '';
  taxRate: number | '';
  imageUrls: string[];
  isActive: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isSeasonalItem: boolean;
  seasonName: string;
  tagIds: string[];
}

export interface BakeryWizardCakeDetails {
  defaultFlavor: CakeFlavor;
  defaultShape: CakeShape;
  defaultCreamType: CreamType;
  isCakeCustomizable: boolean;
  allowsMessageOnCake: boolean;
  allowsPhotoOnCake: boolean;
  allowsCustomShape: boolean;
  allowsFlavorChoice: boolean;
  allowsSizeChoice: boolean;
  decorativeItems: string[];
  ingredientList: string;
  servingSuggestions: string;
}

export interface BakeryWizardProduction {
  prepTimeHours: number | '';
  advanceOrderHours: number | '';
  minOrderQty: number | '';
  maxOrderQty: number | '';
  shelfLifeHours: number | '';
  shelfLifeDays: number | '';
  requiresRefrigeration: boolean;
  allergens: string[];
  containsEgg: boolean;
  containsNuts: boolean;
  containsGluten: boolean;
  containsDairy: boolean;
  isEggless: boolean;
  isVegan: boolean;
  isSugarFree: boolean;
  isHalal: boolean;
  dietaryBadges: string[];
  caloriesPerServing: number | '';
}

export interface BakeryWizardDraft {
  step: WizardStep;
  basic: BakeryWizardBasic;
  cake: BakeryWizardCakeDetails;
  production: BakeryWizardProduction;
  savedAt: number;
}

const emptyBasic = (): BakeryWizardBasic => ({
  name: '',
  descriptionLong: '',
  categoryId: '',
  brandId: '',
  bakeryCategory: 'CAKE',
  defaultSize: 'ONE_POUND',
  sku: '',
  barcode: '',
  unit: 'pcs',
  pricePerKg: '',
  pricePerPound: '',
  pricePerPiece: '',
  pricePerDozen: '',
  pricePerSlice: '',
  pricePerBox: '',
  pricePerTray: '',
  weightGrams: '',
  servingSize: '',
  numberOfSlices: '',
  taxRate: '',
  imageUrls: [],
  isActive: true,
  isFeatured: false,
  isPopular: false,
  isBestSeller: false,
  isNewArrival: false,
  isSeasonalItem: false,
  seasonName: '',
  tagIds: [],
});

const emptyCake = (): BakeryWizardCakeDetails => ({
  defaultFlavor: 'VANILLA',
  defaultShape: 'ROUND',
  defaultCreamType: 'BUTTERCREAM',
  isCakeCustomizable: true,
  allowsMessageOnCake: true,
  allowsPhotoOnCake: false,
  allowsCustomShape: false,
  allowsFlavorChoice: true,
  allowsSizeChoice: true,
  decorativeItems: [],
  ingredientList: '',
  servingSuggestions: '',
});

const emptyProduction = (): BakeryWizardProduction => ({
  prepTimeHours: 4,
  advanceOrderHours: 24,
  minOrderQty: 1,
  maxOrderQty: '',
  shelfLifeHours: '',
  shelfLifeDays: 3,
  requiresRefrigeration: true,
  allergens: [],
  containsEgg: true,
  containsNuts: false,
  containsGluten: true,
  containsDairy: true,
  isEggless: false,
  isVegan: false,
  isSugarFree: false,
  isHalal: true,
  dietaryBadges: [],
  caloriesPerServing: '',
});

const emptyDraft = (): BakeryWizardDraft => ({
  step: 1,
  basic: emptyBasic(),
  cake: emptyCake(),
  production: emptyProduction(),
  savedAt: Date.now(),
});

interface UseBakeryWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useBakeryWizard(opts: UseBakeryWizardOpts = {}) {
  const [draft, setDraft] = useState<BakeryWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  // Load draft
  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BakeryWizardDraft;
        if (parsed && parsed.basic) {
          setDraft(parsed);
          setDraftRestored(true);
          opts.onDraftLoaded?.();
        }
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [draft]);

  const goToStep = useCallback((step: WizardStep) => setDraft((d) => ({ ...d, step })), []);
  const nextStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step < 3 ? d.step + 1 : 3) as WizardStep })), []);
  const prevStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step > 1 ? d.step - 1 : 1) as WizardStep })), []);

  const updateBasic = useCallback((patch: Partial<BakeryWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const updateCake = useCallback((patch: Partial<BakeryWizardCakeDetails>) => {
    setDraft((d) => ({ ...d, cake: { ...d.cake, ...patch } }));
  }, []);

  const updateProduction = useCallback((patch: Partial<BakeryWizardProduction>) => {
    setDraft((d) => ({ ...d, production: { ...d.production, ...patch } }));
  }, []);

  const toggleDecorativeItem = useCallback((item: string) => {
    setDraft((d) => {
      const has = d.cake.decorativeItems.includes(item);
      return {
        ...d,
        cake: {
          ...d.cake,
          decorativeItems: has
            ? d.cake.decorativeItems.filter((x) => x !== item)
            : [...d.cake.decorativeItems, item],
        },
      };
    });
  }, []);

  const toggleAllergen = useCallback((allergen: string) => {
    setDraft((d) => {
      const has = d.production.allergens.includes(allergen);
      return {
        ...d,
        production: {
          ...d.production,
          allergens: has
            ? d.production.allergens.filter((x) => x !== allergen)
            : [...d.production.allergens, allergen],
        },
      };
    });
  }, []);


  const hydrateFromProduct = useCallback((product: any, profile: any) => {
    if (!product) return;
    setDraft((d) => ({
      ...d,
      basic: {
        ...d.basic,
        name: product.name ?? '',
        descriptionLong: product.description ?? profile?.descriptionLong ?? '',
        categoryId: product.categoryId ?? '',
        brandId: product.brandId ?? '',
        sku: product.sku ?? '',
        barcode: product.barcode ?? '',
        unit: product.unit ?? 'pcs',
        taxRate: product.taxRate ?? '',
        weightGrams: profile?.weightGrams ?? '',
        servingSize: profile?.servingSize ?? '',
        numberOfSlices: profile?.numberOfSlices ?? '',
        imageUrls: (product.images ?? []).map((img: any) => img.url).filter(Boolean),
        isActive: product.isActive ?? true,
        isFeatured: product.isFeatured ?? false,
        tagIds: (product.tags ?? []).map((t: any) => t.tag?.id).filter(Boolean),
        bakeryCategory: profile?.category ?? 'CAKE',
        defaultSize: profile?.defaultSize ?? 'ONE_POUND',
        pricePerKg: profile?.pricePerKg ?? '',
        pricePerPound: profile?.pricePerPound ?? '',
        pricePerPiece: profile?.pricePerPiece ?? '',
        pricePerDozen: profile?.pricePerDozen ?? '',
        pricePerSlice: profile?.pricePerSlice ?? '',
        pricePerBox: profile?.pricePerBox ?? '',
        pricePerTray: profile?.pricePerTray ?? '',
        isPopular: profile?.isPopular ?? false,
        isBestSeller: profile?.isBestSeller ?? false,
        isNewArrival: profile?.isNewArrival ?? false,
        isSeasonalItem: profile?.isSeasonalItem ?? false,
        seasonName: profile?.seasonName ?? '',
      },
      cake: {
        ...d.cake,
        defaultFlavor: profile?.defaultFlavor ?? 'VANILLA',
        defaultShape: profile?.defaultShape ?? 'ROUND',
        defaultCreamType: profile?.defaultCreamType ?? 'BUTTERCREAM',
        isCakeCustomizable: profile?.isCakeCustomizable ?? true,
        allowsMessageOnCake: profile?.allowsMessageOnCake ?? true,
        allowsPhotoOnCake: profile?.allowsPhotoOnCake ?? false,
        allowsCustomShape: profile?.allowsCustomShape ?? false,
        allowsFlavorChoice: profile?.allowsFlavorChoice ?? true,
        allowsSizeChoice: profile?.allowsSizeChoice ?? true,
        decorativeItems: profile?.decorativeItems ?? [],
        ingredientList: profile?.ingredientList ?? '',
        servingSuggestions: profile?.servingSuggestions ?? '',
      },
      production: {
        ...d.production,
        prepTimeHours: profile?.prepTimeHours ?? 4,
        advanceOrderHours: profile?.advanceOrderHours ?? 24,
        minOrderQty: profile?.minOrderQty ?? 1,
        maxOrderQty: profile?.maxOrderQty ?? '',
        shelfLifeHours: profile?.shelfLifeHours ?? '',
        shelfLifeDays: profile?.shelfLifeDays ?? 3,
        requiresRefrigeration: profile?.requiresRefrigeration ?? true,
        allergens: profile?.allergens ?? [],
        containsEgg: profile?.containsEgg ?? true,
        containsNuts: profile?.containsNuts ?? false,
        containsGluten: profile?.containsGluten ?? true,
        containsDairy: profile?.containsDairy ?? true,
        isEggless: profile?.isEggless ?? false,
        isVegan: profile?.isVegan ?? false,
        isSugarFree: profile?.isSugarFree ?? false,
        isHalal: profile?.isHalal ?? true,
        dietaryBadges: profile?.dietaryBadges ?? [],
        caloriesPerServing: profile?.caloriesPerServing ?? '',
      },
    }));
  }, []);

  const reset = useCallback(() => {
    setDraft(emptyDraft());
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setDraftRestored(false);
  }, []);

  const validation = useMemo(() => {
    const step1Errors: string[] = [];
    if (!draft.basic.name.trim()) step1Errors.push('Product name required');
    const hasAnyPrice =
      Number(draft.basic.pricePerKg || 0) > 0 ||
      Number(draft.basic.pricePerPound || 0) > 0 ||
      Number(draft.basic.pricePerPiece || 0) > 0 ||
      Number(draft.basic.pricePerDozen || 0) > 0 ||
      Number(draft.basic.pricePerSlice || 0) > 0 ||
      Number(draft.basic.pricePerBox || 0) > 0 ||
      Number(draft.basic.pricePerTray || 0) > 0;
    if (!hasAnyPrice) step1Errors.push('At least one price required (per kg, pound, piece, dozen, etc.)');

    const step2Errors: string[] = [];
    // Cake details step has no hard requirements — all optional
    // but if seasonal, need season name
    if (draft.basic.isSeasonalItem && !draft.basic.seasonName.trim()) {
      step2Errors.push('Season name required for seasonal items');
    }

    const step3Errors: string[] = [];
    // Production has sensible defaults, nothing strictly required

    return {
      step1: { valid: step1Errors.length === 0, errors: step1Errors },
      step2: { valid: step2Errors.length === 0, errors: step2Errors },
      step3: { valid: step3Errors.length === 0, errors: step3Errors },
      allValid:
        step1Errors.length === 0 &&
        step2Errors.length === 0 &&
        step3Errors.length === 0,
    };
  }, [draft]);

  const stats = useMemo(() => {
    const priceCount = [
      draft.basic.pricePerKg,
      draft.basic.pricePerPound,
      draft.basic.pricePerPiece,
      draft.basic.pricePerDozen,
      draft.basic.pricePerSlice,
      draft.basic.pricePerBox,
      draft.basic.pricePerTray,
    ].filter((p) => Number(p || 0) > 0).length;

    const customizationScore = [
      draft.cake.isCakeCustomizable,
      draft.cake.allowsMessageOnCake,
      draft.cake.allowsPhotoOnCake,
      draft.cake.allowsCustomShape,
      draft.cake.allowsFlavorChoice,
      draft.cake.allowsSizeChoice,
    ].filter(Boolean).length;

    const dietaryScore =
      Number(draft.production.isEggless) +
      Number(draft.production.isVegan) +
      Number(draft.production.isSugarFree) +
      Number(draft.production.isHalal);

    return {
      priceCount,
      imageCount: draft.basic.imageUrls.length,
      customizationScore,
      dietaryScore,
      decorativeItemsCount: draft.cake.decorativeItems.length,
      allergensCount: draft.production.allergens.length,
    };
  }, [draft]);

  return {
    draft,
    draftRestored,
    validation,
    stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateCake, updateProduction,
    toggleDecorativeItem, toggleAllergen,
    reset,
    hydrateFromProduct,
  };
}
