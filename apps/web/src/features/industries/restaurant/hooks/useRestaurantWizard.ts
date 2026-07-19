import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SpiceLevel, DietaryTag } from '../api/menu-items.api';

const DRAFT_KEY = 'nafaa.restaurant-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export interface RestaurantWizardBasic {
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
  isFeatured: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
  // Restaurant-specific
  prepTimeMinutes: number | '';
  cookingInstructions: string;
  chefSpecial: boolean;
  bestSeller: boolean;
  calories: number | '';
  servingSize: string;
  servesPeople: number | '';
  tagLine: string;
  allergenInfo: string;
  availableFrom: string;
  availableTo: string;
  availableDays: number[];
  menuImageUrl: string;
}

export interface RestaurantWizardModifiers {
  isSpicy: boolean;
  spiceLevel: SpiceLevel;
  dietaryTags: DietaryTag[];
  modifierGroupIds: string[];
}

export interface RestaurantWizardRecipeIngredient {
  tempId: string;
  ingredientProductId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  costPerUnit?: number;
  isOptional: boolean;
  notes?: string;
}

export interface RestaurantWizardRecipe {
  hasRecipe: boolean;
  yieldQuantity: number;
  yieldUnit: string;
  preparationSteps: string;
  cookingTime: number | '';
  ingredients: RestaurantWizardRecipeIngredient[];
}

export interface RestaurantWizardDraft {
  step: WizardStep;
  basic: RestaurantWizardBasic;
  modifiers: RestaurantWizardModifiers;
  recipe: RestaurantWizardRecipe;
  savedAt: number;
}

const emptyBasic = (): RestaurantWizardBasic => ({
  name: '', description: '', categoryId: '', brandId: '',
  sku: '', barcode: '', unit: 'plate',
  costPrice: '', salePrice: '', wholesalePrice: '', taxRate: '',
  isFeatured: false, isActive: true,
  imageUrls: [], tagIds: [],
  prepTimeMinutes: 15, cookingInstructions: '',
  chefSpecial: false, bestSeller: false,
  calories: '', servingSize: '', servesPeople: 1,
  tagLine: '', allergenInfo: '',
  availableFrom: '', availableTo: '', availableDays: [],
  menuImageUrl: '',
});

const emptyModifiers = (): RestaurantWizardModifiers => ({
  isSpicy: false, spiceLevel: 'MILD',
  dietaryTags: [], modifierGroupIds: [],
});

const emptyRecipe = (): RestaurantWizardRecipe => ({
  hasRecipe: false,
  yieldQuantity: 1, yieldUnit: 'plate',
  preparationSteps: '', cookingTime: '',
  ingredients: [],
});

const emptyDraft = (): RestaurantWizardDraft => ({
  step: 1,
  basic: emptyBasic(),
  modifiers: emptyModifiers(),
  recipe: emptyRecipe(),
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface UseRestaurantWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useRestaurantWizard(opts: UseRestaurantWizardOpts = {}) {
  const [draft, setDraft] = useState<RestaurantWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RestaurantWizardDraft;
        if (parsed && parsed.basic) {
          const safe: RestaurantWizardDraft = {
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            modifiers: { ...emptyModifiers(), ...parsed.modifiers },
            recipe: { ...emptyRecipe(), ...parsed.recipe },
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

  const updateBasic = useCallback((patch: Partial<RestaurantWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const updateModifiers = useCallback((patch: Partial<RestaurantWizardModifiers>) => {
    setDraft((d) => ({ ...d, modifiers: { ...d.modifiers, ...patch } }));
  }, []);

  const toggleDietaryTag = useCallback((tag: DietaryTag) => {
    setDraft((d) => ({
      ...d,
      modifiers: {
        ...d.modifiers,
        dietaryTags: d.modifiers.dietaryTags.includes(tag)
          ? d.modifiers.dietaryTags.filter((t) => t !== tag)
          : [...d.modifiers.dietaryTags, tag],
      },
    }));
  }, []);

  const toggleModifierGroup = useCallback((groupId: string) => {
    setDraft((d) => ({
      ...d,
      modifiers: {
        ...d.modifiers,
        modifierGroupIds: d.modifiers.modifierGroupIds.includes(groupId)
          ? d.modifiers.modifierGroupIds.filter((id) => id !== groupId)
          : [...d.modifiers.modifierGroupIds, groupId],
      },
    }));
  }, []);

  const setHasRecipe = useCallback((v: boolean) => {
    setDraft((d) => (v ? { ...d, recipe: { ...d.recipe, hasRecipe: true } } : { ...d, recipe: { ...emptyRecipe() } }));
  }, []);

  const updateRecipe = useCallback((patch: Partial<RestaurantWizardRecipe>) => {
    setDraft((d) => ({ ...d, recipe: { ...d.recipe, ...patch } }));
  }, []);

  const addIngredient = useCallback((ing: Omit<RestaurantWizardRecipeIngredient, 'tempId'>) => {
    setDraft((d) => ({
      ...d,
      recipe: {
        ...d.recipe,
        ingredients: [...d.recipe.ingredients, { ...ing, tempId: genId() }],
      },
    }));
  }, []);

  const updateIngredient = useCallback((tempId: string, patch: Partial<RestaurantWizardRecipeIngredient>) => {
    setDraft((d) => ({
      ...d,
      recipe: {
        ...d.recipe,
        ingredients: d.recipe.ingredients.map((i) => (i.tempId === tempId ? { ...i, ...patch } : i)),
      },
    }));
  }, []);

  const removeIngredient = useCallback((tempId: string) => {
    setDraft((d) => ({
      ...d,
      recipe: {
        ...d.recipe,
        ingredients: d.recipe.ingredients.filter((i) => i.tempId !== tempId),
      },
    }));
  }, []);

  const toggleDay = useCallback((day: number) => {
    setDraft((d) => ({
      ...d,
      basic: {
        ...d.basic,
        availableDays: d.basic.availableDays.includes(day)
          ? d.basic.availableDays.filter((x) => x !== day)
          : [...d.basic.availableDays, day],
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
    if (!draft.basic.name.trim()) step1Errors.push('Menu item name required');
    if (!draft.basic.salePrice || Number(draft.basic.salePrice) <= 0) {
      step1Errors.push('Sale price required');
    }

    const step2Errors: string[] = [];
    // Nothing strictly required in Step 2

    const step3Errors: string[] = [];
    if (draft.recipe.hasRecipe) {
      if (draft.recipe.ingredients.length === 0) {
        step3Errors.push('Add at least one ingredient, or switch off recipe');
      }
      draft.recipe.ingredients.forEach((i) => {
        if (!i.ingredientProductId) step3Errors.push(`Ingredient "${i.ingredientName || 'unnamed'}" needs product selection`);
        if (i.quantity <= 0) step3Errors.push(`Ingredient "${i.ingredientName}" needs quantity`);
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
    const recipeCost = draft.recipe.ingredients.reduce(
      (a, i) => a + Number(i.quantity || 0) * Number(i.costPerUnit || 0), 0,
    );
    const effectiveCost = draft.recipe.hasRecipe ? recipeCost : costPrice;
    const profit = salePrice - effectiveCost;
    const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

    return {
      dietaryTagCount: draft.modifiers.dietaryTags.length,
      modifierGroupCount: draft.modifiers.modifierGroupIds.length,
      ingredientCount: draft.recipe.ingredients.length,
      recipeCost,
      effectiveCost,
      profit,
      margin,
    };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic,
    updateModifiers, toggleDietaryTag, toggleModifierGroup,
    setHasRecipe, updateRecipe,
    addIngredient, updateIngredient, removeIngredient,
    toggleDay,
    reset,
  };
}
