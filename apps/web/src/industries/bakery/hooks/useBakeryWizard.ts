import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  BakerySize, CakeShape, CakeFlavor, CreamType,
} from '../api/products.api';

const DRAFT_KEY = 'nafaa.bakery-wizard.draft';

export type WizardStep = 1 | 2 | 3;

/**
 * Bakery me teen bilkul alag cheezein hoti hain. Pehle wizard sab ko
 * ek jaisa samajhta tha — Lays ke packet se bhi cake ka flavour aur
 * cream poochta tha, aur maida jaisi cheez bhi Product ban kar POS
 * aur catalog dono me aa jati thi.
 *
 *  MADE   — hum khud banate hain (cake, pastry, patties)
 *  BOUGHT — bahar se le kar bechte hain (Lays, bottle, chips)
 *  RAW    — banane ka saamaan (maida, cheeni, makkhan)
 *
 * RAW kabhi Product nahi banta. Wo alag jagah (Ingredient) jata hai,
 * is liye POS aur catalog me kabhi nazar nahi aata — bechne ki cheez
 * hai hi nahi.
 */
export type BakeryItemType = 'MADE' | 'BOUGHT' | 'RAW';

/** Ek cheez banane me kya kya lagta hai — ek line */
export interface BakeryRecipeLine {
  ingredientId: string;
  name: string;
  qty: number | '';
  unit: string;
  costPerUnit: number;
}

/** Sirf RAW ke liye — ye Product nahi, Ingredient banta hai */
export interface BakeryRawDetails {
  category: string;
  currentStock: number | '';
  minStock: number | '';
  costPerUnit: number | '';
  supplierName: string;
  supplierPhone: string;
  shelfLifeDays: number | '';
  requiresRefrigeration: boolean;
  isCritical: boolean;
  notes: string;
}

export interface BakeryWizardBasic {
  name: string;
  descriptionLong: string;
  categoryId: string;
  /** Category ka naam — system wali qism isi se nikalti hai */
  categoryName: string;
  brandId: string;
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
  /* ── Haath se bharne wale khaane ──
     Pehle ye bhare hi nahi jate the: wizard hamesha `stock: 0`,
     `costPrice: 0` bhejta tha. Edit karte waqt yehi 0 seedha
     product par chala jata tha aur maujooda stock ur jata tha. */
  costPrice: number | '';
  openingStock: number | '';
  lowStockAlert: number | '';
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
  itemType: BakeryItemType;
  raw: BakeryRawDetails;
  recipe: BakeryRecipeLine[];
  /** Itna saamaan lagane se kitni cheezein banti hain */
  recipeYield: number;
  basic: BakeryWizardBasic;
  cake: BakeryWizardCakeDetails;
  production: BakeryWizardProduction;
  savedAt: number;
}

const emptyBasic = (): BakeryWizardBasic => ({
  name: '',
  descriptionLong: '',
  categoryId: '',
  categoryName: '',
  brandId: '',
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
  costPrice: '',
  openingStock: '',
  lowStockAlert: 5,
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

const emptyRaw = (): BakeryRawDetails => ({
  category: 'GENERAL',
  currentStock: '',
  minStock: '',
  costPerUnit: '',
  supplierName: '',
  supplierPhone: '',
  shelfLifeDays: '',
  requiresRefrigeration: false,
  isCritical: false,
  notes: '',
});

const emptyDraft = (): BakeryWizardDraft => ({
  step: 1,
  itemType: 'MADE',
  raw: emptyRaw(),
  recipe: [],
  recipeYield: 1,
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
        const parsed = JSON.parse(raw) as Partial<BakeryWizardDraft>;
        if (parsed && parsed.basic) {
          /* Purane draft me wo khaane nahi hote jo baad me daale gaye
             (jaise `recipe` aur `itemType`). Seedha set karne par
             `draft.recipe` undefined reh jata tha aur safha khulte hi
             crash kar jata tha. Is liye hamesha defaults ke OOPER
             rakho — jo mile wo le lo, baqi default. */
          const base = emptyDraft();
          setDraft({
            ...base,
            ...parsed,
            basic: { ...base.basic, ...(parsed.basic ?? {}) },
            cake: { ...base.cake, ...(parsed.cake ?? {}) },
            production: { ...base.production, ...(parsed.production ?? {}) },
            raw: { ...base.raw, ...(parsed.raw ?? {}) },
            recipe: Array.isArray(parsed.recipe) ? parsed.recipe : [],
            recipeYield: Number(parsed.recipeYield) > 0 ? Number(parsed.recipeYield) : 1,
            itemType: parsed.itemType ?? 'MADE',
          });
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
  const nextStep = useCallback(() => setDraft((d) => {
    const max = d.itemType === 'RAW' ? 1 : d.itemType === 'BOUGHT' ? 2 : 3;
    return { ...d, step: (d.step < max ? d.step + 1 : max) as WizardStep };
  }), []);
  const prevStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step > 1 ? d.step - 1 : 1) as WizardStep })), []);

  const setItemType = useCallback((itemType: BakeryItemType) => {
    setDraft((d) => ({ ...d, itemType, step: 1 }));
  }, []);

  const setRecipeYield = useCallback((n: number) => {
    setDraft((d) => ({ ...d, recipeYield: n }));
  }, []);

  const updateRaw = useCallback((patch: Partial<BakeryRawDetails>) => {
    setDraft((d) => ({ ...d, raw: { ...d.raw, ...patch } }));
  }, []);

  const addRecipeLine = useCallback((line: BakeryRecipeLine) => {
    setDraft((d) => (
      d.recipe.some((r) => r.ingredientId === line.ingredientId)
        ? d
        : { ...d, recipe: [...d.recipe, line] }
    ));
  }, []);

  const updateRecipeLine = useCallback((ingredientId: string, patch: Partial<BakeryRecipeLine>) => {
    setDraft((d) => ({
      ...d,
      recipe: d.recipe.map((r) => (r.ingredientId === ingredientId ? { ...r, ...patch } : r)),
    }));
  }, []);

  const removeRecipeLine = useCallback((ingredientId: string) => {
    setDraft((d) => ({ ...d, recipe: d.recipe.filter((r) => r.ingredientId !== ingredientId) }));
  }, []);

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

    /* Recipe profile ke `ingredients` JSON me save hoti hai. Edit
       kholte waqt wahi wapas form me bhar dete hain, warna save
       karte hi purani recipe mit jati. */
    const savedRecipe: BakeryRecipeLine[] = Array.isArray(profile?.ingredients?.lines)
      ? profile.ingredients.lines.map((l: any) => ({
          ingredientId: String(l.ingredientId ?? ''),
          name: String(l.name ?? ''),
          qty: Number(l.qty) || '',
          unit: String(l.unit ?? 'kg'),
          costPerUnit: Number(l.costPerUnit) || 0,
        }))
      : [];

    setDraft((d) => ({
      ...d,
      itemType: profile ? (profile.isCakeCustomizable ? 'MADE' : 'BOUGHT') : 'BOUGHT',
      recipe: savedRecipe,
      recipeYield: Number(profile?.ingredients?.yield) > 0 ? Number(profile.ingredients.yield) : 1,
      basic: {
        ...d.basic,
        name: product.name ?? '',
        descriptionLong: product.description ?? profile?.descriptionLong ?? '',
        categoryId: product.categoryId ?? '',
        categoryName: product.category?.name ?? '',
        brandId: product.brandId ?? '',
        sku: product.sku ?? '',
        barcode: product.barcode ?? '',
        unit: product.unit ?? 'pcs',
        taxRate: product.taxRate ?? '',
        costPrice: product.costPrice ?? '',
        openingStock: product.stock ?? '',
        lowStockAlert: product.lowStockAlert ?? 5,
        weightGrams: profile?.weightGrams ?? '',
        servingSize: profile?.servingSize ?? '',
        numberOfSlices: profile?.numberOfSlices ?? '',
        imageUrls: (product.images ?? []).map((img: any) => img.url).filter(Boolean),
        isActive: product.isActive ?? true,
        isFeatured: product.isFeatured ?? false,
        tagIds: (product.tags ?? []).map((t: any) => t.tag?.id).filter(Boolean),
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

  /**
   * Har cheez ki apni jaanch. Lays ke packet se cake wale sawal
   * poochne ka koi matlab nahi, aur maida se rate poochne ka bhi
   * nahi — is liye jaanch bhi type ke hisaab se badalti hai.
   */
  const validation = useMemo(() => {
    const t = draft.itemType;

    /* ── RAW: sirf ek chhota sa form ── */
    if (t === 'RAW') {
      const e: string[] = [];
      if (!draft.basic.name.trim()) e.push('Saamaan ka naam likhein');
      if (!draft.basic.unit) e.push('Unit chunein (kg, litre, packet…)');
      if (draft.raw.costPerUnit === '' || Number(draft.raw.costPerUnit) <= 0) {
        e.push('Kitne ka aata hai — rate likhein');
      }
      return {
        step1: { valid: e.length === 0, errors: e },
        step2: { valid: true, errors: [] as string[] },
        step3: { valid: true, errors: [] as string[] },
        allValid: e.length === 0,
      };
    }

    /* ── Step 1: dono (MADE aur BOUGHT) ke liye ek jaisa ── */
    const step1Errors: string[] = [];
    if (!draft.basic.name.trim()) step1Errors.push('Cheez ka naam likhein');
    if (!draft.basic.categoryId) step1Errors.push('Category chunein — ya nayi bana lein');

    const hasAnyPrice =
      Number(draft.basic.pricePerKg || 0) > 0 ||
      Number(draft.basic.pricePerPound || 0) > 0 ||
      Number(draft.basic.pricePerPiece || 0) > 0 ||
      Number(draft.basic.pricePerDozen || 0) > 0 ||
      Number(draft.basic.pricePerSlice || 0) > 0 ||
      Number(draft.basic.pricePerBox || 0) > 0 ||
      Number(draft.basic.pricePerTray || 0) > 0;
    if (!hasAnyPrice) step1Errors.push('Kam se kam ek rate bharein (per piece, pound, kg…)');
    if (draft.basic.costPrice !== '' && Number(draft.basic.costPrice) < 0) {
      step1Errors.push('Cost minus me nahi ho sakti');
    }

    /* ── BOUGHT: bas do step, cake wale sawal nahi ── */
    if (t === 'BOUGHT') {
      const e2: string[] = [];
      const p = draft.production;
      if (p.maxOrderQty !== '' && Number(p.maxOrderQty) < Number(p.minOrderQty || 1)) {
        e2.push('Zyada se zyada tadaad, kam se kam se choti nahi ho sakti');
      }
      return {
        step1: { valid: step1Errors.length === 0, errors: step1Errors },
        step2: { valid: e2.length === 0, errors: e2 },
        step3: { valid: true, errors: [] as string[] },
        allValid: step1Errors.length === 0 && e2.length === 0,
      };
    }

    /* ── MADE: poora teen-step wala raasta ── */
    const step2Errors: string[] = [];
    if (draft.basic.isSeasonalItem && !draft.basic.seasonName.trim()) {
      step2Errors.push('Season wali cheez hai to season ka naam likhein');
    }
    (draft.recipe ?? []).forEach((r) => {
      if (r.qty === '' || Number(r.qty) <= 0) {
        step2Errors.push(`"${r.name}" kitna lagta hai — wo likhein`);
      }
    });

    /* Step 3 pehle bilkul khali tha — har cheez hamesha "theek",
       is liye stepper par teesre qadam par laal nishan kabhi aata
       hi nahi tha. */
    const step3Errors: string[] = [];
    const p = draft.production;
    if (p.shelfLifeDays === '' && p.shelfLifeHours === '') {
      step3Errors.push('Kitni der theek rehti hai — din ya ghante likhein');
    }
    if (p.maxOrderQty !== '' && Number(p.maxOrderQty) < Number(p.minOrderQty || 1)) {
      step3Errors.push('Zyada se zyada tadaad, kam se kam se choti nahi ho sakti');
    }
    if (p.isVegan && (p.containsEgg || p.containsDairy)) {
      step3Errors.push('Vegan cheez me anda ya doodh nahi ho sakta');
    }
    if (p.isEggless && p.containsEgg) {
      step3Errors.push('Egg-free likha hai magar "anda hai" bhi laga hua hai');
    }

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

  /** Ek cheez banane me kitna kharcha aata hai — recipe se */
  const recipeCost = useMemo(() => {
    const batch = (draft.recipe ?? []).reduce((sum, r) => sum + Number(r.qty || 0) * Number(r.costPerUnit || 0), 0);
    const y = draft.recipeYield > 0 ? draft.recipeYield : 1;
    return { batch, perUnit: batch / y };
  }, [draft.recipe, draft.recipeYield]);

  /** Is type me kitne step hain */
  const totalSteps = useMemo<WizardStep>(() => {
    if (draft.itemType === 'RAW') return 1;
    if (draft.itemType === 'BOUGHT') return 2;
    return 3;
  }, [draft.itemType]);

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
    recipeCost,
    totalSteps,
    goToStep, nextStep, prevStep,
    setItemType, updateRaw, setRecipeYield,
    addRecipeLine, updateRecipeLine, removeRecipeLine,
    updateBasic, updateCake, updateProduction,
    toggleDecorativeItem, toggleAllergen,
    reset,
    hydrateFromProduct,
  };
}
