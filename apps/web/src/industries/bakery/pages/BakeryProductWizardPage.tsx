/* ═════════════════════════════════════════════════════════════
   BAKERY PRODUCT WIZARD — SAB KUCH EK JAGAH
   ─────────────────────────────────────────────────────────────
   Pehle ye safha 12 file me bikhra hua tha: ek page, nau
   component, aur do hook. Ek chhoti si tabdeeli ke liye bhi teen
   char file kholni parti thin — halanke lines utni hi thin.

   Ab sab yahin hai. Tarteeb ye rahi:

     1. Types aur state        — useBakeryWizard
     2. Save ka amal           — useBakeryWizardSubmit
     3. Safha                  — BakeryProductWizardPage
     4. Qadam ke component     — item type, stepper, category,
                                 step 1/2/3, recipe, raw, khulasa

   SIRF do cheezein bahar hain — `lib/bakeryCategory` aur
   `lib/bakeryUnits`. Wajah: POS, catalog, product detail aur
   products list bhi wohi hisab istemal karte hain. Agar wo yahan
   aa jayein to har safhe me nakal karni paregi, aur nakal se
   wohi bug bante hain jaise unit conversion wala.
   ═════════════════════════════════════════════════════════════ */

import { CATEGORY_SUGGESTIONS, deriveBakeryCategory, isCakeLike, prettyCategory } from '../lib/bakeryCategory';
import { bakeryProductsApi } from '../api/products.api';
import { ingredientsApi } from '../api/ingredients.api';
import { FLAVORS, SHAPES, CREAMS, SIZES } from '../api/constants';
import type { BakerySize, CakeShape, CakeFlavor, CreamType, BakeryProduct } from '../api/products.api';
import { UNITS, deriveSize, extraUnitsFor, isWeighed, priceField, rateBetween, unitDef, unitLabel } from '../lib/bakeryUnits';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { UploadDropzone } from '@core/components/uploads';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { categoriesApi, type Category } from '@modules/inventory/categories/api/categories.api';
import { productImagesApi } from '@modules/inventory/products/api/product-images.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, ArrowRight, Award, Cake, Calculator, Camera, Check, CheckCircle2, ChefHat, Clock, DollarSign, Egg, ExternalLink, Flame, GraduationCap, Heart, Image as ImageIcon, Info, Loader2, MessageSquare, Milk, Nut, Package, Palette, Plus, Ruler, Save, Scale, Search, Shapes, ShoppingBag, Snowflake, Sparkles, Star, Tag, Timer, Trash2, TrendingUp, Truck, Wheat, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';


/* ════ WIZARD KA DIMAGH — state, validation, hisab ═════════════════ */

const DRAFT_KEY = 'nafaa.bakery-wizard.draft';

type WizardStep = 1 | 2 | 3;

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
type BakeryItemType = 'MADE' | 'BOUGHT' | 'RAW';

/** Ek cheez banane me kya kya lagta hai — ek line */
interface BakeryRecipeLine {
  ingredientId: string;
  name: string;
  qty: number | '';
  unit: string;
  costPerUnit: number;
}

/** Sirf RAW ke liye — ye Product nahi, Ingredient banta hai */
interface BakeryRawDetails {
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

interface BakeryWizardBasic {
  name: string;
  descriptionLong: string;
  categoryId: string;
  /** Category ka naam — system wali qism isi se nikalti hai */
  categoryName: string;
  brandId: string;
  /**
   * Naap ka apna naam — jab "Apna" chuna jaye.
   * Pehle "Custom" chunne par likhne ki jagah hi nahi thi.
   */
  customUnitName: string;
  /** Aam rate — jab koi khaas naap ka rate na bhara ho */
  price: number | '';
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

interface BakeryWizardCakeDetails {
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
  /* "Custom" chunne par dukaan-daar apne alfaz likh sake — pehle
     sirf lafz "Custom" reh jata tha aur kisi ko pata nahi chalta
     tha ke matlab kya hai. */
  customFlavorName: string;
  customShapeName: string;
  customCreamName: string;
  ingredientList: string;
  servingSuggestions: string;
}

interface BakeryWizardProduction {
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

interface BakeryWizardDraft {
  step: WizardStep;
  itemType: BakeryItemType;
  raw: BakeryRawDetails;
  recipe: BakeryRecipeLine[];
  /** Itna saamaan lagane se kitni cheezein banti hain */
  recipeYield: number;
  /**
   * Edit kholte waqt counter par jitna stock tha.
   *
   * Is ke bagair pata nahi chalta ke dukaan-daar ne stock BADLA hai
   * ya sirf form khol kar band kiya. Pehle ehtiyat ke liye edit me
   * stock bheja hi nahi jata tha — magar us se stock badalna hi
   * mumkin nahi raha.
   */
  originalStock: number | null;
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
  customUnitName: '',
  price: '',
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
  customFlavorName: '',
  customShapeName: '',
  customCreamName: '',
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
  originalStock: null,
  basic: emptyBasic(),
  cake: emptyCake(),
  production: emptyProduction(),
  savedAt: Date.now(),
});

interface UseBakeryWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

function useBakeryWizard(opts: UseBakeryWizardOpts = {}) {
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
      originalStock: Number(product.stock ?? 0),
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
        price: product.price ?? '',
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
        customFlavorName: profile?.ingredients?.custom?.flavor ?? '',
        customShapeName: profile?.ingredients?.custom?.shape ?? '',
        customCreamName: profile?.ingredients?.custom?.cream ?? '',
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
    if (draft.basic.unit === 'custom' && !draft.basic.customUnitName.trim()) {
      step1Errors.push('Apne naap ka naam likhein (jaise thaal, tokri)');
    }

    const hasAnyPrice =
      Number(draft.basic.price || 0) > 0 ||
      Number(draft.basic.pricePerKg || 0) > 0 ||
      Number(draft.basic.pricePerPound || 0) > 0 ||
      Number(draft.basic.pricePerPiece || 0) > 0 ||
      Number(draft.basic.pricePerDozen || 0) > 0 ||
      Number(draft.basic.pricePerSlice || 0) > 0 ||
      Number(draft.basic.pricePerBox || 0) > 0 ||
      Number(draft.basic.pricePerTray || 0) > 0;
    if (!hasAnyPrice) step1Errors.push('Bechne ka rate bharein');
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

/* ════ SAVE — product, tasveerein, bakery profile ══════════════════ */

interface SubmitProgress {
  stage: 'idle' | 'product' | 'images' | 'profile' | 'done';
  message: string;
  productCreated?: boolean;
  imagesUploaded: number;
  productId?: string;
}

function useBakeryWizardSubmit(existingProductId?: string) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<SubmitProgress>({
    stage: 'idle',
    message: '',
    imagesUploaded: 0,
  });

  const isEdit = Boolean(existingProductId);

  const mutation = useMutation({
    mutationFn: async (draft: BakeryWizardDraft) => {
      /* ── RAW: ye Product banta hi nahi ──
         Banane ka saamaan bechne ki cheez nahi. Ise Ingredient me
         daalte hain, is liye POS, catalog aur products ki list me
         kabhi nazar nahi aata. */
      if (draft.itemType === 'RAW') {
        setProgress({ stage: 'product', message: 'Saamaan save ho raha hai…', imagesUploaded: 0 });
        const ing = await ingredientsApi.create({
          name: draft.basic.name.trim(),
          category: draft.raw.category || 'GENERAL',
          unit: draft.basic.unit || 'kg',
          currentStock: draft.raw.currentStock === '' ? 0 : Number(draft.raw.currentStock),
          minStock: draft.raw.minStock === '' ? 0 : Number(draft.raw.minStock),
          costPerUnit: draft.raw.costPerUnit === '' ? 0 : Number(draft.raw.costPerUnit),
          supplierName: draft.raw.supplierName || undefined,
          supplierPhone: draft.raw.supplierPhone || undefined,
          shelfLifeDays: draft.raw.shelfLifeDays === '' ? undefined : Number(draft.raw.shelfLifeDays),
          requiresRefrigeration: draft.raw.requiresRefrigeration,
          isCritical: draft.raw.isCritical,
          notes: draft.raw.notes || undefined,
          imageUrl: draft.basic.imageUrls[0] || undefined,
          isActive: draft.basic.isActive,
        });
        setProgress({
          stage: 'done', message: 'Ho gaya!', productCreated: true,
          productId: ing.id, imagesUploaded: 0,
        });
        return { id: ing.id, __raw: true } as any;
      }

      setProgress({
        stage: 'product',
        message: isEdit ? 'Update ho raha hai…' : 'Ban rahi hai…',
        imagesUploaded: 0,
      });

      /* Product ka apna rate = jis naap se bechte hain usi ka rate.
         Pehle yahan tarteeb pakki thi (pehle piece, phir pound…) —
         is se dozen ya box se bechne walon ka rate ghalat lagta. */
      const byUnit: Record<string, any> = {
        pcs: draft.basic.pricePerPiece,
        dozen: draft.basic.pricePerDozen,
        slice: draft.basic.pricePerSlice,
        kg: draft.basic.pricePerKg,
        pound: draft.basic.pricePerPound,
        box: draft.basic.pricePerBox,
        tray: draft.basic.pricePerTray,
      };
      const price =
        Number(byUnit[draft.basic.unit] || 0) ||
        Number(draft.basic.price || 0) ||
        Number(draft.basic.pricePerPiece || 0) ||
        Number(draft.basic.pricePerPound || 0) ||
        Number(draft.basic.pricePerKg || 0) || 0;

      const productPayload = {
        name: draft.basic.name.trim(),
        description: draft.basic.descriptionLong || undefined,
        categoryId: draft.basic.categoryId || undefined,
        brandId: draft.basic.brandId || undefined,
        sku: draft.basic.sku || undefined,
        barcode: draft.basic.barcode || undefined,
        /* "Apna" naap ho to dukaan-daar ka likha hua naam hi unit banta hai */
        unit: draft.basic.unit === 'custom'
          ? (draft.basic.customUnitName.trim() || 'unit')
          : (draft.basic.unit || 'pcs'),
        price,
        costPrice: draft.basic.costPrice === '' ? 0 : Number(draft.basic.costPrice),
        taxRate: draft.basic.taxRate ? Number(draft.basic.taxRate) : 0,
        lowStockAlert: draft.basic.lowStockAlert === '' ? 5 : Number(draft.basic.lowStockAlert),
        weight: draft.basic.weightGrams ? Number(draft.basic.weightGrams) : undefined,
        weightUnit: 'g',
        isActive: draft.basic.isActive,
        isFeatured: draft.basic.isFeatured,
        tagIds: draft.basic.tagIds,
        expiryTracked: !!draft.production.shelfLifeDays || !!draft.production.shelfLifeHours,

        /* STOCK — sirf tab jab waqai badla ho.
           Pehle yahan hamesha `stock: 0` jata tha, jis se edit karte
           hi counter ka poora stock ur jata tha. Phir ehtiyat me edit
           par bhejna hi band kar diya — magar us se stock badalna hi
           mumkin na raha.

           Ab beech ka raasta: jo number kholte waqt tha usi se milan
           karte hain. Haath na lagaya ho to kuch nahi jata; badla ho
           to wahi jata hai. */
        ...(() => {
          const entered = draft.basic.openingStock === '' ? 0 : Number(draft.basic.openingStock);
          if (!isEdit) return { stock: entered };
          const before = draft.originalStock;
          return before !== null && entered !== before ? { stock: entered } : {};
        })(),
      };

      const product = isEdit && existingProductId
        ? await productsApi.update(existingProductId, productPayload)
        : await productsApi.create(productPayload);

      /* Tasveerein edit me bhi. Pehle shart `!isEdit` thi — yani
         edit ke waqt lagai gayi tasveer chup-chaap gir jati thi
         aur koi error bhi nahi aata tha. */
      if (draft.basic.imageUrls.length > 0) {
        setProgress((p) => ({
          ...p,
          stage: 'images',
          message: `Uploading ${draft.basic.imageUrls.length} image${draft.basic.imageUrls.length !== 1 ? 's' : ''}...`,
          productCreated: true,
          productId: product.id,
        }));

        for (let i = 0; i < draft.basic.imageUrls.length; i++) {
          try {
            await productImagesApi.add(product.id, {
              url: draft.basic.imageUrls[i],
              isPrimary: i === 0,
            });
            setProgress((p) => ({ ...p, imagesUploaded: i + 1 }));
          } catch (err) {
            console.warn('Image attach failed', err);
          }
        }
      }

      setProgress((p) => ({
        ...p,
        stage: 'profile',
        message: isEdit ? 'Updating bakery details...' : 'Saving bakery details...',
        productCreated: true,
        productId: product.id,
      }));

      await bakeryProductsApi.upsert({
        productId: product.id,
        /* Qism dukaan-daar se poochi nahi jati — us ki category ke
           naam se nikal aati hai. Backend par ye khana lazmi hai. */
        category: deriveBakeryCategory(draft.basic.categoryName, draft.basic.name),
        /* Size ab poochi nahi jati — naap aur wazan se khud nikalti hai */
        defaultSize: deriveSize(draft.basic.unit, draft.basic.weightGrams),
        /* Bahar se laya hua maal — Lays ke packet ka koi flavour,
           shape ya cream nahi hota. */
        defaultShape: draft.itemType === 'MADE' ? draft.cake.defaultShape : undefined,
        defaultFlavor: draft.itemType === 'MADE' ? draft.cake.defaultFlavor : undefined,
        defaultCreamType: draft.itemType === 'MADE' ? draft.cake.defaultCreamType : undefined,
        pricePerKg: draft.basic.pricePerKg ? Number(draft.basic.pricePerKg) : undefined,
        pricePerPound: draft.basic.pricePerPound ? Number(draft.basic.pricePerPound) : undefined,
        pricePerPiece: draft.basic.pricePerPiece ? Number(draft.basic.pricePerPiece) : undefined,
        pricePerDozen: draft.basic.pricePerDozen ? Number(draft.basic.pricePerDozen) : undefined,
        pricePerSlice: draft.basic.pricePerSlice ? Number(draft.basic.pricePerSlice) : undefined,
        pricePerBox: draft.basic.pricePerBox ? Number(draft.basic.pricePerBox) : undefined,
        pricePerTray: draft.basic.pricePerTray ? Number(draft.basic.pricePerTray) : undefined,
        weightGrams: draft.basic.weightGrams ? Number(draft.basic.weightGrams) : undefined,
        servingSize: draft.basic.servingSize ? Number(draft.basic.servingSize) : undefined,
        numberOfSlices: draft.basic.numberOfSlices ? Number(draft.basic.numberOfSlices) : undefined,
        isCustomizable: draft.itemType === 'MADE' && draft.cake.isCakeCustomizable,
        isCakeCustomizable: draft.itemType === 'MADE' && draft.cake.isCakeCustomizable,
        allowsMessageOnCake: draft.cake.allowsMessageOnCake,
        allowsPhotoOnCake: draft.cake.allowsPhotoOnCake,
        allowsCustomShape: draft.cake.allowsCustomShape,
        allowsFlavorChoice: draft.cake.allowsFlavorChoice,
        allowsSizeChoice: draft.cake.allowsSizeChoice,
        prepTimeHours: draft.production.prepTimeHours ? Number(draft.production.prepTimeHours) : undefined,
        advanceOrderHours: draft.production.advanceOrderHours ? Number(draft.production.advanceOrderHours) : undefined,
        minOrderQty: draft.production.minOrderQty ? Number(draft.production.minOrderQty) : 1,
        maxOrderQty: draft.production.maxOrderQty ? Number(draft.production.maxOrderQty) : undefined,
        shelfLifeHours: draft.production.shelfLifeHours ? Number(draft.production.shelfLifeHours) : undefined,
        shelfLifeDays: draft.production.shelfLifeDays ? Number(draft.production.shelfLifeDays) : undefined,
        requiresRefrigeration: draft.production.requiresRefrigeration,
        allergens: draft.production.allergens,
        containsEgg: draft.production.containsEgg,
        containsNuts: draft.production.containsNuts,
        containsGluten: draft.production.containsGluten,
        containsDairy: draft.production.containsDairy,
        isEggless: draft.production.isEggless,
        isVegan: draft.production.isVegan,
        isSugarFree: draft.production.isSugarFree,
        isHalal: draft.production.isHalal,
        dietaryBadges: draft.production.dietaryBadges,
        caloriesPerServing: draft.production.caloriesPerServing ? Number(draft.production.caloriesPerServing) : undefined,
        /* Recipe seedha profile ke `ingredients` JSON me — is ke
           liye koi naya column ya migration nahi chahiye. */
        ingredients: draft.itemType === 'MADE' && (draft.recipe.length > 0
          || draft.cake.customFlavorName || draft.cake.customShapeName || draft.cake.customCreamName)
          ? {
              yield: draft.recipeYield,
              /* Dukaan-daar ke apne likhe hue naam — flavour/shape/cream
                 me "Custom" chunne par. Profile par in ke apne khaane
                 nahi hain, is liye isi JSON me rakhte hain. */
              custom: {
                flavor: draft.cake.customFlavorName || undefined,
                shape: draft.cake.customShapeName || undefined,
                cream: draft.cake.customCreamName || undefined,
              },
              lines: draft.recipe.map((r) => ({
                ingredientId: r.ingredientId,
                name: r.name,
                qty: Number(r.qty || 0),
                unit: r.unit,
                costPerUnit: r.costPerUnit,
              })),
            }
          : undefined,
        imageUrls: draft.basic.imageUrls,
        descriptionLong: draft.basic.descriptionLong || undefined,
        ingredientList: draft.cake.ingredientList || undefined,
        servingSuggestions: draft.cake.servingSuggestions || undefined,
        isPopular: draft.basic.isPopular,
        isFeatured: draft.basic.isFeatured,
        isBestSeller: draft.basic.isBestSeller,
        isNewArrival: draft.basic.isNewArrival,
        isSeasonalItem: draft.basic.isSeasonalItem,
        seasonName: draft.basic.isSeasonalItem ? draft.basic.seasonName : undefined,
      });

      setProgress({
        stage: 'done',
        message: 'All done!',
        productCreated: true,
        productId: product.id,
        imagesUploaded: draft.basic.imageUrls.length,
      });

      return product;
    },

    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      queryClient.invalidateQueries({ queryKey: ['bakery-products'] });
      queryClient.invalidateQueries({ queryKey: ['bakery-product-detail', product.id] });
      toast.success(isEdit ? 'Update ho gaya!' : 'Ban gaya!', {
        description: isEdit ? 'Tabdeeliyan save ho gayin' : 'Ab POS aur catalog dono par hai',
        duration: 3000,
      });
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Save failed');
      setProgress((p) => ({ ...p, stage: 'idle', message: '' }));
    },
  });

  return { mutation, progress, isEdit };
}

/* ═════════════════════════════════════════════════════════════
   SAFHA — sab kuch yahin se chalta hai
   ═════════════════════════════════════════════════════════════ */
export default function BakeryProductWizardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const w = useBakeryWizard({ autoLoadDraft: !isEdit });
  const { mutation, progress } = useBakeryWizardSubmit(isEdit ? id : undefined);

  const [showDraft, setShowDraft] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { data: product } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: isEdit,
  });

  const { data: profile } = useQuery({
    queryKey: ['bakery-profile-by-product', id],
    queryFn: () => bakeryProductsApi.byProduct(id!).catch(() => null),
    enabled: isEdit,
  });

  useEffect(() => {
    if (isEdit && product && !hydrated) {
      w.hydrateFromProduct?.(product, profile);
      setHydrated(true);
    }
  }, [isEdit, product, profile, hydrated, w]);

  useEffect(() => {
    if (!isEdit && w.draftRestored) setShowDraft(true);
  }, [isEdit, w.draftRestored]);

  const saving = mutation.isPending;
  const { draft, validation } = w;
  const type = draft.itemType;

  const cakeLike = useMemo(
    () => isCakeLike(deriveBakeryCategory(draft.basic.categoryName, draft.basic.name)),
    [draft.basic.categoryName, draft.basic.name],
  );

  const save = () => {
    mutation.mutate(draft, {
      onSuccess: (p: any) => {
        setTimeout(() => {
          if (!isEdit) w.reset();
          navigate(p?.__raw ? '/bakery/ingredients' : `/bakery-products/${p.id}`);
        }, 1400);
      },
    });
  };

  /* ── Ho gaya ── */
  if (progress.stage === 'done' && progress.productId) {
    return (
      <div className="max-w-lg mx-auto py-16">
        <div className="rounded-3xl bg-gradient-to-br from-pink-50 via-white to-fuchsia-50 dark:from-pink-950/40 dark:via-neutral-900 dark:to-fuchsia-950/40 border-2 border-pink-200 dark:border-pink-800 shadow-xl p-8 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-pink-500 to-fuchsia-600 mx-auto flex items-center justify-center shadow-lg mb-4">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {isEdit ? 'Save ho gaya!' : 'Ban gaya!'}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 font-bold mt-2">
            <strong className="text-pink-700 dark:text-pink-300">{draft.basic.name}</strong>
            {type === 'RAW' ? ' ab Ingredients me hai' : ' ab POS aur catalog dono par hai'}
          </p>
        </div>
      </div>
    );
  }

  /* ── Save ho raha ── */
  if (saving) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="h-16 w-16 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Save ho raha hai…</h3>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1">{progress.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      {/* ── Draft mila ── */}
      {showDraft && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-[13px] font-bold text-amber-900 dark:text-amber-200">
              Adhoora kaam mil gaya — wahin se shuru karein
            </span>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={() => { if (confirm('Naye sire se shuru karein?')) { w.reset(); setShowDraft(false); } }}
              className="h-9 px-3 rounded-lg bg-white dark:bg-neutral-800 border-2 border-amber-300 text-amber-800 dark:text-amber-200 text-[11px] font-black inline-flex items-center gap-1 transition">
              <Trash2 className="h-3 w-3" /> Naya shuru
            </button>
            <button onClick={() => setShowDraft(false)}
              className="h-9 w-9 rounded-lg bg-white dark:bg-neutral-800 border-2 border-amber-300 flex items-center justify-center">
              <X className="h-3.5 w-3.5 text-amber-800" />
            </button>
          </div>
        </div>
      )}

      {/* ── Upar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-pink-600 transition">
          <ArrowLeft className="h-4 w-4" /> Products
        </Link>
        <div className="flex gap-2">
          <button onClick={() => setShowGuide(true)}
            className="h-10 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 transition">
            <GraduationCap className="h-4 w-4" /> Madad
          </button>
          {isEdit && (
            <Link to={`/bakery-products/${id}`}
              className="h-10 px-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-slate-300 text-xs font-black inline-flex items-center gap-1.5 transition">
              <ExternalLink className="h-4 w-4" /> Detail
            </Link>
          )}
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white p-5 sm:p-6 shadow-2xl">
        <div className="absolute -top-20 -right-16 h-60 w-60 rounded-full bg-pink-400/25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
            <Cake className="h-3.5 w-3.5 text-amber-300" /> {isEdit ? 'Edit' : 'Nayi cheez'}
          </div>
          <h1 className="mt-2.5 text-2xl sm:text-3xl font-black leading-tight">
            {draft.basic.name || (isEdit ? 'Edit karein' : '🍰 Nayi cheez banayein')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-bold text-white/85">
            {type === 'RAW' ? 'Banane ka saamaan — ye bikta nahi'
              : type === 'BOUGHT' ? 'Bahar se laya maal — do step'
              : 'Jo hum khud banate hain — teen step'}
          </p>
        </div>
      </section>

      {/* ── Ye cheez kya hai ── */}
      <StepItemType value={type} onChange={w.setItemType} locked={isEdit} />

      {/* ── Qadam ── */}
      <StepBar current={draft.step} type={type} validation={validation} onGo={w.goToStep} />

      <div className="grid xl:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="min-w-0">
          {type === 'RAW' ? (
            <RawForm
              basic={draft.basic} raw={draft.raw}
              onBasic={w.updateBasic} onRaw={w.updateRaw}
              onSubmit={save} saving={saving} validation={validation.step1}
            />
          ) : (
            <>
              {draft.step === 1 && (
                <Step1
                  basic={draft.basic} onChange={w.updateBasic}
                  onNext={w.nextStep} validation={validation.step1}
                  cakeLike={cakeLike}
                  isEdit={isEdit} originalStock={draft.originalStock}
                />
              )}

              {draft.step === 2 && type === 'MADE' && (
                <div className="space-y-4">
                  <Step2
                    cake={draft.cake} onChange={w.updateCake}
                    onToggleDecoration={w.toggleDecorativeItem}
                    cakeLike={cakeLike} itemName={draft.basic.name}
                    onBack={w.prevStep} onNext={w.nextStep} validation={validation.step2}
                  />
                  <RecipeBuilder
                    recipe={draft.recipe} yieldQty={draft.recipeYield}
                    onAdd={w.addRecipeLine} onUpdate={w.updateRecipeLine} onRemove={w.removeRecipeLine}
                    onYield={w.setRecipeYield}
                    onApplyCost={(c: number) => w.updateBasic({ costPrice: c })}
                    currentCost={draft.basic.costPrice} itemName={draft.basic.name}
                  />
                </div>
              )}

              {draft.step === 2 && type === 'BOUGHT' && (
                <Step3
                  production={draft.production} onChange={w.updateProduction}
                  onToggleAllergen={w.toggleAllergen}
                  onBack={w.prevStep} onSubmit={save} saving={saving}
                  validation={validation.step2} allValid={validation.allValid}
                  simple
                />
              )}

              {draft.step === 3 && type === 'MADE' && (
                <Step3
                  production={draft.production} onChange={w.updateProduction}
                  onToggleAllergen={w.toggleAllergen}
                  onBack={w.prevStep} onSubmit={save} saving={saving}
                  validation={validation.step3} allValid={validation.allValid}
                />
              )}
            </>
          )}
        </div>

        {type !== 'RAW' && (
          <Summary draft={draft} stats={w.stats} allValid={validation.allValid} cakeLike={cakeLike} />
        )}
      </div>

      {showGuide && <Guide onClose={() => setShowGuide(false)} />}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   YE CHEEZ KYA HAI
   ─────────────────────────────────────────────────────────────
   Bakery me teen alag cheezein hoti hain aur teenon ka hisab
   alag chalta hai. Pehle wizard sab ko ek jaisa samajhta tha —
   Lays ke packet se bhi cake ka flavour poochta tha.
   ═════════════════════════════════════════════════════════════ */
const ITEM_TYPES = [
  {
    id: 'MADE' as const, emoji: '🧁', icon: ChefHat,
    title: 'Hum khud banate hain',
    eg: 'Cake, cookies, patties, bread',
    note: 'Recipe, freshness aur production — sab chalega',
    ring: 'border-pink-500 ring-pink-200 dark:ring-pink-500/25',
    bg: 'from-pink-50 to-fuchsia-50 dark:from-pink-500/10 dark:to-fuchsia-500/10',
  },
  {
    id: 'BOUGHT' as const, emoji: '📦', icon: ShoppingBag,
    title: 'Bahar se la kar bechte hain',
    eg: 'Lays, bottle, chips, juice',
    note: 'Sirf rate, cost aur stock — cake wale sawal nahi',
    ring: 'border-blue-500 ring-blue-200 dark:ring-blue-500/25',
    bg: 'from-blue-50 to-sky-50 dark:from-blue-500/10 dark:to-sky-500/10',
  },
  {
    id: 'RAW' as const, emoji: '🌾', icon: Wheat,
    title: 'Banane ka saamaan',
    eg: 'Maida, cheeni, makkhan, cream',
    note: 'Ye bikta nahi — POS aur catalog me nazar nahi aayega',
    ring: 'border-violet-500 ring-violet-200 dark:ring-violet-500/25',
    bg: 'from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10',
  },
];

function StepItemType({ value, onChange, locked }: {
  value: BakeryItemType; onChange: (t: BakeryItemType) => void; locked?: boolean;
}) {
  return (
    <Card>
      <CardHead icon={Package} title="Ye cheez kya hai?" desc="Isi se aage ke sawal tay hote hain" />
      <div className="grid sm:grid-cols-3 gap-3">
        {ITEM_TYPES.map((o) => {
          const on = value === o.id;
          const Icon = o.icon;
          return (
            <button key={o.id} type="button" disabled={locked && !on}
              onClick={() => onChange(o.id)}
              className={[
                'text-left rounded-2xl border-2 p-4 transition-all relative',
                locked && !on ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow-md',
                on ? `${o.ring} ring-4 bg-gradient-to-br ${o.bg} shadow-lg`
                   : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800',
              ].join(' ')}>
              {on && (
                <span className="absolute top-3 right-3 h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
              <div className="text-3xl">{o.emoji}</div>
              <div className="mt-2 font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Icon className="h-4 w-4 shrink-0" /> {o.title}
              </div>
              <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 mt-1">{o.eg}</div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">{o.note}</div>
            </button>
          );
        })}
      </div>

      {locked ? (
        <Note tone="amber">
          Edit me type nahi badalta — cheez pehle se bani hui hai. Type galat ho to nayi bana lein.
        </Note>
      ) : value === 'RAW' ? (
        <Note tone="violet">
          Banane ka saamaan <strong>bechne ki cheez nahi</strong>. Ye Ingredients me jayega — POS,
          catalog aur products ki list me kahin nazar nahi aayega.
        </Note>
      ) : null}
    </Card>
  );
}

/* ═════════════════════════════════════════════════════════════
   QADAMON KI PATTI
   ═════════════════════════════════════════════════════════════ */
const STEPS: Record<BakeryItemType, Array<{ id: number; label: string; desc: string; icon: any }>> = {
  MADE: [
    { id: 1, label: 'Basic', desc: 'Naam, naap, rate', icon: Package },
    { id: 2, label: 'Tafseel', desc: 'Flavour aur recipe', icon: Palette },
    { id: 3, label: 'Freshness', desc: 'Kitni der theek', icon: Timer },
  ],
  BOUGHT: [
    { id: 1, label: 'Basic', desc: 'Naam, naap, rate', icon: Package },
    { id: 2, label: 'Stock', desc: 'Expiry aur khana', icon: ShoppingBag },
  ],
  RAW: [],
};

function StepBar({ current, type, validation, onGo }: {
  current: number; type: BakeryItemType;
  validation: any; onGo: (s: WizardStep) => void;
}) {
  const steps = STEPS[type];
  if (steps.length <= 1) return null;

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-2 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max">
        {steps.map((s, i) => {
          const active = current === s.id;
          const past = current > s.id;
          const v = validation[`step${s.id}`];
          const bad = !v?.valid && (past || active);
          const done = v?.valid && past;
          const Icon = s.icon;

          return (
            <div key={s.id} className="flex items-center gap-2">
              <button type="button" onClick={() => onGo(s.id as WizardStep)}
                className={[
                  'flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all',
                  active ? 'bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white shadow-md'
                    : past ? 'bg-pink-50 dark:bg-pink-500/10 text-pink-800 dark:text-pink-200 border-2 border-pink-200 dark:border-pink-500/30'
                    : 'bg-slate-50 dark:bg-neutral-800 text-slate-500 border-2 border-transparent hover:bg-slate-100',
                ].join(' ')}>
                <span className={[
                  'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                  active ? 'bg-white/25' : done ? 'bg-pink-600 text-white' : bad ? 'bg-rose-100 dark:bg-rose-500/20' : 'bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700',
                ].join(' ')}>
                  {bad ? <AlertTriangle className="h-4 w-4 text-rose-500" />
                    : done ? <Check className="h-4 w-4" />
                    : <Icon className="h-4 w-4" />}
                </span>
                <span className="text-left">
                  <span className={`block text-[9px] uppercase tracking-wider font-black ${active ? 'text-white/80' : 'text-slate-400'}`}>
                    Step {s.id} / {steps.length}
                  </span>
                  <span className="block text-sm font-black leading-tight">{s.label}</span>
                  <span className={`block text-[10px] font-bold leading-tight ${active ? 'text-white/75' : bad ? 'text-rose-500' : 'text-slate-400'}`}>
                    {bad ? (v?.errors?.[0] ?? 'Kuch reh gaya') : s.desc}
                  </span>
                </span>
              </button>
              {i < steps.length - 1 && (
                <span className={`h-0.5 w-8 rounded-full ${current > s.id ? 'bg-pink-500' : 'bg-slate-200 dark:bg-neutral-700'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   QADAM 1 — NAAM, NAAP, RATE
   ─────────────────────────────────────────────────────────────
   Pehle yahan "Base Unit" aur "Default Size" do alag khaane thay
   jo asal me ek hi baat pooch rahe thay — aur dono ki list me
   dozen aur box maujood thay. Ab tarteeb seedhi hai:

     1. Kaise bechte hain?   (ek hi sawal)
     2. Ek [wohi naap] kitne ka?
     3. Aur kis tarah bech sakte hain?  (marzi)

   Size ab poochi nahi jati — naap aur wazan se khud nikal aati hai.
   ═════════════════════════════════════════════════════════════ */
function Step1({ basic, onChange, onNext, validation, cakeLike, isEdit, originalStock }: {
  basic: BakeryWizardBasic;
  onChange: (p: Partial<BakeryWizardBasic>) => void;
  onNext: () => void;
  validation: { valid: boolean; errors: string[] };
  cakeLike: boolean;
  isEdit?: boolean;
  originalStock?: number | null;
}) {
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });
  const [scan, setScan] = useState(false);

  const base = basic.unit || 'pcs';
  const def = unitDef(base);
  const baseName = unitLabel(base, basic.customUnitName);
  const weighed = isWeighed(base);

  /* Chip dabate hi row aani chahiye — chahe rate abhi khali ho.
     Pehle filter `rate > 0` tha, is liye chip dabane par kuch hota
     hua nazar hi nahi aata tha aur lagta tha kaam nahi kar raha. */
  const [added, setAdded] = useState<string[]>(
    () => extraUnitsFor(base).filter((k) => Number((basic as any)[priceField[k]] || 0) > 0),
  );

  const extras = useMemo(() => {
    const priced = extraUnitsFor(base).filter((k) => Number((basic as any)[priceField[k]] || 0) > 0);
    return extraUnitsFor(base).filter((k) => priced.includes(k) || added.includes(k));
  }, [base, basic, added]);

  const available = useMemo(
    () => extraUnitsFor(base).filter((k) => !extras.includes(k)),
    [base, extras],
  );

  const mainPrice = Number((basic as any)[priceField[base]] || 0) || Number(basic.price || 0);
  const cost = Number(basic.costPrice || 0);
  const margin = mainPrice > 0 && cost > 0 ? ((mainPrice - cost) / mainPrice) * 100 : null;

  const setMain = (v: number | '') => {
    const f = priceField[base];
    onChange(f ? ({ [f]: v } as any) : ({ price: v } as any));
  };

  return (
    <div className="space-y-4">
      {scan && (
        <BarcodeScanner
          onDetected={(c: string) => { onChange({ barcode: c.trim() }); setScan(false); toast.success('Barcode mil gaya'); }}
          onClose={() => setScan(false)}
          title="Barcode scan karein"
          hint="Packet ka barcode camera ke samne rakhein"
        />
      )}

      {/* 1 — NAAM */}
      <Card>
        <CardHead icon={Package} title="Naam aur category" desc="Jo naam counter par bolte hain" />
        <Field label="Naam" req>
          <input value={basic.name} onChange={(e) => onChange({ name: e.target.value })} autoFocus
            placeholder="Chocolate Cake, Nan Khatai, Chicken Patty…" className={inp} />
        </Field>

        <CategoryPicker
          value={basic.categoryId} productName={basic.name}
          onChange={(cid, cname) => onChange({ categoryId: cid, categoryName: cname })}
        />

        <Field label="Tafseel" opt>
          <textarea rows={2} value={basic.descriptionLong}
            onChange={(e) => onChange({ descriptionLong: e.target.value })}
            placeholder="Fresh cream, chocolate sponge, 8 logon ke liye…"
            className={`${inp} h-auto py-2 resize-none`} />
        </Field>
      </Card>

      {/* 2 — NAAP */}
      <Card>
        <CardHead icon={Scale} title="Ye cheez kaise bechte hain?" desc="Stock isi naap me ginta hai — sab se ahem sawal" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {UNITS.map((u) => {
            const on = base === u.key;
            return (
              <button key={u.key} type="button" onClick={() => onChange({ unit: u.key })}
                className={[
                  'rounded-2xl border-2 p-2.5 text-center transition-all',
                  on ? 'border-pink-500 bg-gradient-to-br from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/15 ring-2 ring-pink-200 dark:ring-pink-500/25 shadow-md'
                     : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-pink-300 hover:-translate-y-0.5',
                ].join(' ')}>
                <div className="text-2xl">{u.emoji}</div>
                <div className={`mt-1 text-[11px] font-black ${on ? 'text-pink-800 dark:text-pink-300' : 'text-slate-700 dark:text-slate-300'}`}>
                  {u.label}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{def.hint}</p>

        {base === 'custom' && (
          <Field label="Apne naap ka naam" req>
            <input value={basic.customUnitName} onChange={(e) => onChange({ customUnitName: e.target.value })}
              placeholder="Thaal, tokri, degchi, pateela…" className={inp} />
          </Field>
        )}

        {(weighed || cakeLike) && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={weighed ? `Ek ${baseName} me kitne gram?` : 'Ek ka wazan (gram)'} opt={!weighed}>
              <input type="number" value={basic.weightGrams}
                onChange={(e) => onChange({ weightGrams: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder={base === 'pound' ? '454' : base === 'kg' ? '1000' : '500'} className={inp} />
            </Field>
            {cakeLike && (
              <Field label="Ek me kitne slice bante hain?" opt>
                <input type="number" value={basic.numberOfSlices}
                  onChange={(e) => onChange({ numberOfSlices: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="8" className={inp} />
              </Field>
            )}
          </div>
        )}
      </Card>

      {/* 3 — RATE */}
      <Card tone="pink">
        <CardHead icon={DollarSign} title={`Ek ${baseName} kitne ka?`} desc="Yehi rate POS par sab se pehle chalega" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={`Sale rate — per ${baseName}`} req>
            <input type="number" value={(basic as any)[priceField[base]] ?? basic.price ?? ''}
              onChange={(e) => setMain(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0" className={inp} />
          </Field>
          <Field label={`Cost — per ${baseName}`} opt>
            <input type="number" value={basic.costPrice}
              onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" className={inp} />
          </Field>
        </div>

        {margin !== null && (
          <Note tone={margin < 0 ? 'rose' : margin < 15 ? 'amber' : 'emerald'} icon={Calculator}>
            {margin < 0
              ? <>Nuqsaan! Cost <strong>{formatPKR(cost)}</strong> hai magar rate <strong>{formatPKR(mainPrice)}</strong>.</>
              : <>Har {baseName} par <strong>{formatPKR(mainPrice - cost)}</strong> bachta hai — {margin.toFixed(0)}% margin.</>}
          </Note>
        )}

        <div className="grid sm:grid-cols-3 gap-3">
          <Field label={isEdit ? 'Stock — abhi counter par' : 'Opening stock'} opt>
            <input type="number" value={basic.openingStock}
              onChange={(e) => onChange({ openingStock: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" className={inp} />
          </Field>
          <Field label="Low stock alert" opt>
            <input type="number" value={basic.lowStockAlert}
              onChange={(e) => onChange({ lowStockAlert: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="5" className={inp} />
          </Field>
          <Field label="Tax %" opt>
            <input type="number" value={basic.taxRate}
              onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" className={inp} />
          </Field>
        </div>
        {isEdit && originalStock !== null && originalStock !== undefined ? (
          Number(basic.openingStock || 0) !== originalStock ? (
            <Note tone="amber">
              Stock <strong>{originalStock}</strong> se badal kar{' '}
              <strong>{Number(basic.openingStock || 0)}</strong> kiya ja raha hai. Save karte hi
              counter par yehi hoga.
            </Note>
          ) : (
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Counter par abhi <strong>{originalStock}</strong> hai. Haath na lagayein to waisa hi
              rahega — badalna ho to number likh dein.
            </p>
          )
        ) : (
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Ye shuruaati stock hai. Baad me kharidari ya stock adjustment se badalta rahega.
          </p>
        )}
      </Card>

      {/* 4 — AUR KAISE */}
      <Card>
        <CardHead icon={Plus} title="Aur kis tarah bech sakte hain?" desc="Marzi ki baat — ek hi cheez kai tarah bik sakti hai" />

        {extras.length > 0 && (
          <div className="space-y-2">
            {extras.map((k) => {
              const rate = rateBetween(k, base, { weightGrams: basic.weightGrams, slices: basic.numberOfSlices });
              const d = unitDef(k);
              return (
                <div key={k} className="rounded-2xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/60 p-3 flex items-center gap-2.5 flex-wrap">
                  <span className="text-xl shrink-0">{d.emoji}</span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white shrink-0">Per {d.label}</span>
                  <input type="number" min={0} step="any" autoFocus={added.includes(k)}
                    value={(basic as any)[priceField[k]] ?? ''}
                    onChange={(e) => onChange({ [priceField[k]]: e.target.value === '' ? '' : Number(e.target.value) } as any)}
                    placeholder="Rate"
                    className="h-10 w-28 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-sm font-extrabold text-center tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-pink-500" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    1 {d.label.toLowerCase()} = <strong>{rate.toFixed(rate < 1 ? 3 : 2)}</strong> {baseName} stock se
                  </span>
                  <button type="button"
                    onClick={() => { setAdded((xs) => xs.filter((x) => x !== k)); onChange({ [priceField[k]]: '' } as any); }}
                    className="h-9 w-9 rounded-lg bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 flex items-center justify-center shrink-0 hover:border-rose-400 ml-auto transition">
                    <X className="h-3.5 w-3.5 text-rose-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {available.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {available.map((k) => {
              const d = unitDef(k);
              return (
                <button key={k} type="button"
                  onClick={() => setAdded((xs) => (xs.includes(k) ? xs : [...xs, k]))}
                  className="h-10 px-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/10 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition">
                  <Plus className="h-3.5 w-3.5 text-pink-500" /> {d.emoji} Per {d.label}
                </button>
              );
            })}
          </div>
        )}

        <Note tone="slate" icon={Info}>
          Misal: cake <strong>per pound</strong> bhi bikta hai aur <strong>per slice</strong> bhi.
          Dono rate bhar dein — POS par counter wale ko dono nazar aayenge, aur stock apne aap
          sahi hisab se ghatega.
          {(base === 'box' || base === 'tray' || extras.includes('box') || extras.includes('tray')) && (
            <> <strong className="text-amber-600">Box/Tray me kitne aate hain</strong> — ye Multi-Unit
            safhe se set karein, warna 1 mana jayega.</>
          )}
        </Note>
      </Card>

      {/* 5 — PEHCHAN */}
      <Card>
        <CardHead icon={Tag} title="Barcode aur brand" desc="Marzi ki baat" />
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Barcode" opt>
            <div className="flex gap-2">
              <input value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })}
                placeholder="8901234567890" className={`${inp} flex-1 min-w-0 font-mono`} />
              <button type="button" onClick={() => setScan(true)}
                className="h-11 px-3 rounded-xl bg-slate-900 dark:bg-neutral-700 hover:bg-slate-800 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 transition">
                <Camera className="h-4 w-4" /> Scan
              </button>
            </div>
          </Field>
          <Field label="SKU" opt>
            <input value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })}
              placeholder="Khali chhoren to khud banega" className={inp} />
          </Field>
          <Field label="Brand" opt>
            <select value={basic.brandId} onChange={(e) => onChange({ brandId: e.target.value })} className={inp}>
              <option value="">Koi nahi</option>
              {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      {/* 6 — TASVEEREIN */}
      <Card>
        <CardHead icon={ImageIcon} title="Photos" desc="Pehli photo catalog me sab se pehle aati hai" />
        <UploadDropzone purpose="product-image" maxFiles={10}
          onUploaded={(r) => onChange({ imageUrls: [...basic.imageUrls, ...r.map((x) => x.url)] })}
          hint="Cake ki photo, decoration ke angle — sab" />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 dark:border-neutral-700 group">
                <img src={url} alt="" className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute top-1 left-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-pink-600 text-white">Main</span>}
                <button type="button" onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, x) => x !== i) })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-lg bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <X className="h-3 w-3 text-rose-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 7 — BADGES */}
      <Card>
        <CardHead icon={Award} title="Badges" desc="Catalog aur POS par nazar aate hain" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {([
            ['isFeatured', 'Featured', Star],
            ['isPopular', 'Popular', TrendingUp],
            ['isBestSeller', 'Best Seller', Award],
            ['isNewArrival', 'New', Sparkles],
            ['isSeasonalItem', 'Seasonal', Zap],
            ['isActive', 'Active — bikri ke liye', Package],
          ] as const).map(([k, label, Icon]) => {
            const on = !!(basic as any)[k];
            return (
              <button key={k} type="button" onClick={() => onChange({ [k]: !on } as any)}
                className={`rounded-xl border-2 p-2.5 text-left flex items-center gap-2 transition ${
                  on ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-pink-300'
                }`}>
                <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  on ? 'bg-pink-600 text-white' : 'bg-slate-100 dark:bg-neutral-700 text-slate-500'
                }`}><Icon className="h-4 w-4" /></span>
                <span className="text-[11px] font-extrabold text-slate-900 dark:text-white leading-tight">{label}</span>
              </button>
            );
          })}
        </div>

        {basic.isSeasonalItem && (
          <Field label="Kaunsa season / mauqa" req>
            <input value={basic.seasonName} onChange={(e) => onChange({ seasonName: e.target.value })}
              placeholder="Ramzan, Eid, sardi…" className={inp} />
          </Field>
        )}

        {allTags.length > 0 && (
          <Field label="Tags" opt>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((t: any) => {
                const on = basic.tagIds.includes(t.id);
                return (
                  <button key={t.id} type="button"
                    onClick={() => onChange({ tagIds: on ? basic.tagIds.filter((x) => x !== t.id) : [...basic.tagIds, t.id] })}
                    className={`h-9 px-3 rounded-lg border-2 text-[11px] font-extrabold transition ${
                      on ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300'
                        : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-300'
                    }`}>{t.name}</button>
                );
              })}
            </div>
          </Field>
        )}
      </Card>

      <Errors errors={validation.errors} show={!validation.valid} />

      <Button className="w-full h-14 text-base font-extrabold bg-gradient-to-r from-pink-600 to-fuchsia-700"
        disabled={!validation.valid} onClick={onNext}>
        Aage chalein <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   QADAM 2 — CAKE KI BAATEIN
   ─────────────────────────────────────────────────────────────
   Cookies aur patty par flavour/shape/cream ka sawal fazool hai —
   is liye category cake jaisi na ho to ye sab chhup jata hai.
   Aur jahan "Apna" chuna jaye, wahin likhne ki jagah khul jati
   hai; pehle sirf lafz "Custom" reh jata tha.
   ═════════════════════════════════════════════════════════════ */
const DECORATIONS = [
  '🌹 Roses', '🌸 Phool', '🎀 Ribbon', '⭐ Sitare', '🌟 Sprinkles',
  '🍓 Taaza phal', '🍫 Chocolate chips', '🎂 Candles', '💎 Pearls',
  '🦄 Unicorn', '👑 Crown', '💝 Dil', '🎈 Ghubbare', '🌿 Fondant patte',
];

function Step2({ cake, onChange, onToggleDecoration, cakeLike, itemName, onBack, onNext, validation }: {
  cake: BakeryWizardCakeDetails;
  onChange: (p: Partial<BakeryWizardCakeDetails>) => void;
  onToggleDecoration: (item: string) => void;
  cakeLike: boolean; itemName?: string;
  onBack: () => void; onNext: () => void;
  validation: { valid: boolean; errors: string[] };
}) {
  const [own, setOwn] = useState('');

  return (
    <div className="space-y-4">
      {!cakeLike && (
        <Note tone="slate" icon={Info}>
          <strong>{itemName || 'Ye cheez'}</strong> cake nahi hai, is liye flavour, shape aur cream
          wale sawal chhupa diye gaye hain. Category "Cake" kar dein to wapas aa jayenge.
        </Note>
      )}

      {cakeLike && (
        <>
          <Card>
            <CardHead icon={Cake} title="Flavour" desc="POS par sab se pehle yehi chuna hua milega" />
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {FLAVORS.map((f) => {
                const on = cake.defaultFlavor === f.value;
                return (
                  <button key={f.value} type="button" onClick={() => onChange({ defaultFlavor: f.value })}
                    className={`relative rounded-xl overflow-hidden transition-all ${on ? 'ring-4 ring-pink-500 shadow-lg' : 'hover:scale-105 hover:shadow-md'}`}>
                    <div className={`aspect-square bg-gradient-to-br ${f.color} flex flex-col items-center justify-center gap-1 text-white`}>
                      <div className="text-2xl">{f.emoji}</div>
                      <div className="text-[9px] font-extrabold text-center px-1 leading-tight drop-shadow">{f.label}</div>
                    </div>
                    {on && <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-white text-pink-600 flex items-center justify-center text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
            {cake.defaultFlavor === 'CUSTOM_FLAVOR' && (
              <CustomName label="Apne flavour ka naam" placeholder="Kashmiri chai, gajar halwa, pan…"
                value={cake.customFlavorName} onChange={(v) => onChange({ customFlavorName: v })} />
            )}
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHead icon={Shapes} title="Shape" desc="Cake kis shakal ka hai" />
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {SHAPES.map((s) => {
                  const on = cake.defaultShape === s.value;
                  return (
                    <button key={s.value} type="button" onClick={() => onChange({ defaultShape: s.value })}
                      className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition ${
                        on ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 ring-2 ring-pink-200' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-pink-300'
                      }`}>
                      <span className="text-xl">{s.emoji}</span>
                      <span className={`text-[9px] font-extrabold text-center ${on ? 'text-pink-800 dark:text-pink-300' : 'text-slate-700 dark:text-slate-300'}`}>{s.label}</span>
                    </button>
                  );
                })}
              </div>
              {cake.defaultShape === 'CUSTOM_SHAPE' && (
                <CustomName label="Apne shape ka naam" placeholder="Dil, number 5, gaari, masjid…"
                  value={cake.customShapeName} onChange={(v) => onChange({ customShapeName: v })} />
              )}
            </Card>

            <Card>
              <CardHead icon={Palette} title="Cream" desc="Upar kya lagta hai" />
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {CREAMS.map((c) => {
                  const on = cake.defaultCreamType === c.value;
                  return (
                    <button key={c.value} type="button" onClick={() => onChange({ defaultCreamType: c.value })}
                      className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition ${
                        on ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 ring-2 ring-amber-200' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-amber-300'
                      }`}>
                      <span className="text-xl">{c.emoji}</span>
                      <span className={`text-[9px] font-extrabold text-center ${on ? 'text-amber-800 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'}`}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
              {cake.defaultCreamType === 'OTHER' && (
                <CustomName label="Apni cream ka naam" placeholder="Khoya, malai, desi cream…"
                  value={cake.customCreamName} onChange={(v) => onChange({ customCreamName: v })} />
              )}
            </Card>
          </div>

          <Card tone="pink">
            <CardHead icon={Sparkles} title="Customer apni marzi se kya kara sakta hai?" desc="Order lete waqt ye options milenge" />
            <div className="grid sm:grid-cols-2 gap-2">
              {([
                ['isCakeCustomizable', 'Apni marzi ka bana sakta hai', Palette],
                ['allowsFlavorChoice', 'Flavour khud chun sakta hai', Cake],
                ['allowsSizeChoice', 'Size khud chun sakta hai', Ruler],
                ['allowsMessageOnCake', 'Cake par likhwa sakta hai', MessageSquare],
                ['allowsPhotoOnCake', 'Photo laga sakta hai', ImageIcon],
                ['allowsCustomShape', 'Apni marzi ka shape', Shapes],
              ] as const).map(([k, label, Icon]) => {
                const on = !!(cake as any)[k];
                return (
                  <button key={k} type="button" onClick={() => onChange({ [k]: !on } as any)}
                    className={`rounded-xl border-2 p-3 text-left flex items-center gap-2.5 transition ${
                      on ? 'border-pink-500 bg-white dark:bg-neutral-900' : 'border-slate-200 dark:border-neutral-700 bg-white/60 dark:bg-neutral-800'
                    }`}>
                    <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                      on ? 'bg-pink-600 text-white' : 'bg-slate-100 dark:bg-neutral-700 text-slate-500'
                    }`}><Icon className="h-4 w-4" /></span>
                    <span className="text-[12px] font-extrabold text-slate-900 dark:text-white leading-tight">{label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHead icon={Sparkles} title="Sajawat" desc="Jo cheezein aam tor par lagti hain" />
            <div className="flex flex-wrap gap-1.5">
              {DECORATIONS.map((d) => {
                const on = cake.decorativeItems.includes(d);
                return (
                  <button key={d} type="button" onClick={() => onToggleDecoration(d)}
                    className={`h-9 px-3 rounded-lg border-2 text-[11px] font-extrabold transition ${
                      on ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300'
                        : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-300'
                    }`}>{d}</button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input value={own} onChange={(e) => setOwn(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && own.trim()) { e.preventDefault(); onToggleDecoration(own.trim()); setOwn(''); } }}
                placeholder="Apni sajawat likhein…" className={`${inp} flex-1`} />
              <button type="button" disabled={!own.trim()}
                onClick={() => { onToggleDecoration(own.trim()); setOwn(''); }}
                className="h-11 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-black inline-flex items-center gap-1.5 shrink-0 transition">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            {cake.decorativeItems.filter((d) => !DECORATIONS.includes(d)).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {cake.decorativeItems.filter((d) => !DECORATIONS.includes(d)).map((d) => (
                  <span key={d} className="h-9 px-3 rounded-lg bg-pink-100 dark:bg-pink-500/20 text-pink-800 dark:text-pink-200 text-[11px] font-extrabold inline-flex items-center gap-1.5">
                    {d}
                    <button type="button" onClick={() => onToggleDecoration(d)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <Card>
        <CardHead icon={Wheat} title="Ingredients aur serving" desc="Customer ke poochne par kaam aata hai" />
        <Field label="Kya kya lagta hai (likh kar)" opt>
          <textarea rows={2} value={cake.ingredientList}
            onChange={(e) => onChange({ ingredientList: e.target.value })}
            placeholder="Maida, cheeni, makkhan, anday, cocoa…" className={`${inp} h-auto py-2 resize-none`} />
        </Field>
        <Field label="Kaise khayein / pesh karein" opt>
          <textarea rows={2} value={cake.servingSuggestions}
            onChange={(e) => onChange({ servingSuggestions: e.target.value })}
            placeholder="Fridge se nikal kar 10 minute baad kaatein…" className={`${inp} h-auto py-2 resize-none`} />
        </Field>
      </Card>

      <Errors errors={validation.errors} show={!validation.valid} />

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1 h-14" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" /> Peeche
        </Button>
        <Button className="flex-[2] h-14 text-base font-extrabold bg-gradient-to-r from-pink-600 to-fuchsia-700"
          disabled={!validation.valid} onClick={onNext}>
          Aage chalein <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   QADAM 3 — FRESHNESS AUR KHANA
   ═════════════════════════════════════════════════════════════ */
const ALLERGENS = ['Nuts', 'Doodh', 'Anday', 'Gluten', 'Soya', 'Til', 'Mungphali', 'Machhli'];

function Step3({ production, onChange, onToggleAllergen, onBack, onSubmit, saving, validation, allValid, simple }: {
  production: BakeryWizardProduction;
  onChange: (p: Partial<BakeryWizardProduction>) => void;
  onToggleAllergen: (a: string) => void;
  onBack: () => void; onSubmit: () => void; saving: boolean;
  validation: { valid: boolean; errors: string[] };
  allValid: boolean; simple?: boolean;
}) {
  const [own, setOwn] = useState('');

  return (
    <div className="space-y-4">
      <Card tone="pink">
        <CardHead icon={Timer} title="Kitni der theek rehti hai?" desc="Yehi se expiry ki warning aati hai — sab se ahem khaana" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Kitne din theek" req>
            <input type="number" value={production.shelfLifeDays}
              onChange={(e) => onChange({ shelfLifeDays: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="3" className={inp} />
          </Field>
          <Field label="Ya kitne ghante" opt>
            <input type="number" value={production.shelfLifeHours}
              onChange={(e) => onChange({ shelfLifeHours: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="12" className={inp} />
          </Field>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[1, 2, 3, 7, 15, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => onChange({ shelfLifeDays: d, shelfLifeHours: '' })}
              className={`h-10 px-3 rounded-xl text-xs font-black transition ${
                production.shelfLifeDays === d ? 'bg-pink-600 text-white' : 'bg-white dark:bg-neutral-800 border-2 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-slate-300'
              }`}>{d} din</button>
          ))}
        </div>
        <Toggle icon={Snowflake} label="Fridge me rakhna parta hai" hint="Cream, doodh wali cheezein"
          on={production.requiresRefrigeration} onChange={(v) => onChange({ requiresRefrigeration: v })} />
      </Card>

      {!simple && (
        <Card>
          <CardHead icon={ChefHat} title="Banane ka waqt" desc="Order lete waqt kaam aata hai" />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Banane me kitne ghante" opt>
              <input type="number" value={production.prepTimeHours}
                onChange={(e) => onChange({ prepTimeHours: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="4" className={inp} />
            </Field>
            <Field label="Kitne ghante pehle order" opt>
              <input type="number" value={production.advanceOrderHours}
                onChange={(e) => onChange({ advanceOrderHours: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="24" className={inp} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Kam se kam order" opt>
              <input type="number" value={production.minOrderQty}
                onChange={(e) => onChange({ minOrderQty: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="1" className={inp} />
            </Field>
            <Field label="Zyada se zyada order" opt>
              <input type="number" value={production.maxOrderQty}
                onChange={(e) => onChange({ maxOrderQty: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="Koi hadd nahi" className={inp} />
            </Field>
          </div>
        </Card>
      )}

      <Card>
        <CardHead icon={Egg} title="Is me kya hai?" desc="Customer ke poochne par foran jawab" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            ['containsEgg', 'Anday', Egg],
            ['containsDairy', 'Doodh', Milk],
            ['containsNuts', 'Nuts', Nut],
            ['containsGluten', 'Gluten', Wheat],
          ] as const).map(([k, label, Icon]) => {
            const on = !!(production as any)[k];
            return (
              <button key={k} type="button" onClick={() => onChange({ [k]: !on } as any)}
                className={`rounded-xl border-2 p-3 flex flex-col items-center gap-1.5 transition ${
                  on ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
                }`}>
                <Icon className={`h-5 w-5 ${on ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className="text-[11px] font-extrabold text-slate-900 dark:text-white">{label}</span>
                <span className={`text-[9px] font-black uppercase ${on ? 'text-amber-600' : 'text-slate-400'}`}>{on ? 'Haan' : 'Nahi'}</span>
              </button>
            );
          })}
        </div>

        <Field label="Diet badges" opt>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              ['isEggless', 'Egg-free'], ['isVegan', 'Vegan'],
              ['isSugarFree', 'Sugar-free'], ['isHalal', 'Halal'],
            ] as const).map(([k, label]) => {
              const on = !!(production as any)[k];
              return (
                <button key={k} type="button" onClick={() => onChange({ [k]: !on } as any)}
                  className={`h-11 rounded-xl border-2 text-[11px] font-black transition ${
                    on ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-300'
                  }`}>{label}</button>
              );
            })}
          </div>
        </Field>

        <Field label="Allergens" opt>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGENS.map((a) => {
              const on = production.allergens.includes(a);
              return (
                <button key={a} type="button" onClick={() => onToggleAllergen(a)}
                  className={`h-9 px-3 rounded-lg border-2 text-[11px] font-extrabold transition ${
                    on ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-300'
                  }`}>{a}</button>
              );
            })}
          </div>
          <div className="flex gap-2 mt-2">
            <input value={own} onChange={(e) => setOwn(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && own.trim()) { e.preventDefault(); onToggleAllergen(own.trim()); setOwn(''); } }}
              placeholder="Aur koi allergen…" className={`${inp} flex-1`} />
            <button type="button" disabled={!own.trim()}
              onClick={() => { onToggleAllergen(own.trim()); setOwn(''); }}
              className="h-11 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black shrink-0 transition">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </Field>

        <Field label="Calories per serving" opt>
          <input type="number" value={production.caloriesPerServing}
            onChange={(e) => onChange({ caloriesPerServing: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="350" className={inp} />
        </Field>
      </Card>

      <Errors errors={validation.errors} show={!validation.valid} />

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1 h-14" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" /> Peeche
        </Button>
        <Button className="flex-[2] h-14 text-base font-extrabold bg-gradient-to-r from-emerald-600 to-green-700"
          disabled={!allValid || saving} loading={saving} onClick={onSubmit}>
          <Save className="h-5 w-5" /> Save karein
        </Button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   BANANE KA SAAMAAN — chhota form
   ─────────────────────────────────────────────────────────────
   Ye Product nahi banta. Isi liye form bhi chhota hai: rate,
   stock aur supplier. Na bechne ka rate, na barcode, na cake
   wale sawal.
   ═════════════════════════════════════════════════════════════ */
const RAW_CATEGORIES = [
  { v: 'FLOUR', l: 'Aata / Maida', e: '🌾' }, { v: 'SUGAR', l: 'Cheeni', e: '🍬' },
  { v: 'DAIRY', l: 'Doodh / Cream', e: '🥛' }, { v: 'EGG', l: 'Anday', e: '🥚' },
  { v: 'FAT', l: 'Ghee / Oil', e: '🫒' }, { v: 'CHOCOLATE', l: 'Chocolate', e: '🍫' },
  { v: 'FRUIT', l: 'Phal / Nuts', e: '🍓' }, { v: 'FLAVOR', l: 'Flavour', e: '🧪' },
  { v: 'DECORATION', l: 'Sajawat', e: '✨' }, { v: 'PACKAGING', l: 'Packing', e: '📦' },
  { v: 'GENERAL', l: 'Aur koi', e: '🧺' },
];
const RAW_UNITS = ['kg', 'gram', 'litre', 'ml', 'packet', 'dozen', 'piece', 'bag', 'tin', 'bottle'];

function RawForm({ basic, raw, onBasic, onRaw, onSubmit, saving, validation }: {
  basic: BakeryWizardBasic; raw: BakeryRawDetails;
  onBasic: (p: Partial<BakeryWizardBasic>) => void;
  onRaw: (p: Partial<BakeryRawDetails>) => void;
  onSubmit: () => void; saving: boolean;
  validation: { valid: boolean; errors: string[] };
}) {
  const value = Number(raw.currentStock || 0) * Number(raw.costPerUnit || 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHead icon={Wheat} title="Saamaan ki tafseel" desc="Jo cake banane me lagta hai" />
        <Field label="Saamaan ka naam" req>
          <input value={basic.name} onChange={(e) => onBasic({ name: e.target.value })} autoFocus
            placeholder="Maida, Cheeni, Makkhan, Cocoa Powder…" className={inp} />
        </Field>

        <Field label="Kis qism ka">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {RAW_CATEGORIES.map((c) => (
              <button key={c.v} type="button" onClick={() => onRaw({ category: c.v })}
                className={`h-11 px-2 rounded-xl border-2 text-[11px] font-extrabold inline-flex items-center justify-center gap-1 transition ${
                  raw.category === c.v ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300'
                    : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-300 hover:border-violet-400'
                }`}>{c.e} <span className="truncate">{c.l}</span></button>
            ))}
          </div>
        </Field>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Kis hisaab se ginte hain" req>
            <select value={basic.unit} onChange={(e) => onBasic({ unit: e.target.value })} className={inp}>
              {RAW_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label={`Ek ${basic.unit || 'unit'} kitne ka`} req>
            <input type="number" value={raw.costPerUnit}
              onChange={(e) => onRaw({ costPerUnit: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" className={inp} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHead icon={Package} title="Stock" desc="Abhi gudaam me kitna para hai" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Abhi kitna hai" opt>
            <input type="number" value={raw.currentStock}
              onChange={(e) => onRaw({ currentStock: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" className={inp} />
          </Field>
          <Field label="Itna reh jaye to batao" opt>
            <input type="number" value={raw.minStock}
              onChange={(e) => onRaw({ minStock: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" className={inp} />
          </Field>
        </div>

        {value > 0 && (
          <Note tone="violet">
            Is waqt gudaam me <strong>{formatPKR(value)}</strong> ka {basic.name || 'saamaan'} para hai
          </Note>
        )}

        <div className="grid sm:grid-cols-2 gap-2">
          <Toggle icon={Snowflake} label="Fridge chahiye" hint="Doodh, cream, makkhan"
            on={raw.requiresRefrigeration} onChange={(v) => onRaw({ requiresRefrigeration: v })} />
          <Toggle icon={AlertTriangle} label="Bagair kaam nahi chalta" hint="Khatam ho to bakery band"
            on={raw.isCritical} onChange={(v) => onRaw({ isCritical: v })} />
        </div>

        <Field label="Kitne din theek rehta hai" opt>
          <input type="number" value={raw.shelfLifeDays}
            onChange={(e) => onRaw({ shelfLifeDays: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="30" className={inp} />
        </Field>
      </Card>

      <Card>
        <CardHead icon={Truck} title="Kahan se aata hai" desc="Supplier ka number ho to WhatsApp ka button khud aa jata hai" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Supplier" opt>
            <input value={raw.supplierName} onChange={(e) => onRaw({ supplierName: e.target.value })}
              placeholder="Al-Madina Traders" className={inp} />
          </Field>
          <Field label="WhatsApp number" opt>
            <input value={raw.supplierPhone} onChange={(e) => onRaw({ supplierPhone: e.target.value })}
              placeholder="03001234567" className={inp} />
          </Field>
        </div>
        <Field label="Koi baat yaad rakhni ho" opt>
          <input value={raw.notes} onChange={(e) => onRaw({ notes: e.target.value })}
            placeholder="Subah 10 baje se pehle order karna parta hai" className={inp} />
        </Field>
      </Card>

      <Note tone="slate" icon={Info}>
        Save karne ke baad ye saamaan <strong>Ingredients</strong> ke safhe par aayega, cake ki
        <strong> recipe</strong> me chuna ja sakega, aur khatam hone par warning aayegi.
        <strong> POS aur catalog me nazar nahi aayega</strong> — ye bechne ki cheez nahi.
      </Note>

      <Errors errors={validation.errors} show={!validation.valid} />

      <Button className="w-full h-14 text-base font-extrabold bg-gradient-to-r from-violet-600 to-purple-700"
        disabled={!validation.valid || saving} loading={saving} onClick={onSubmit}>
        <Save className="h-5 w-5" /> Saamaan save karein
      </Button>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   RECIPE — is me kya kya lagta hai
   ═════════════════════════════════════════════════════════════ */
function RecipeBuilder({ recipe, yieldQty, onAdd, onUpdate, onRemove, onYield, onApplyCost, currentCost, itemName }: {
  recipe: BakeryRecipeLine[]; yieldQty: number;
  onAdd: (l: BakeryRecipeLine) => void;
  onUpdate: (id: string, p: Partial<BakeryRecipeLine>) => void;
  onRemove: (id: string) => void;
  onYield: (n: number) => void;
  onApplyCost?: (c: number) => void;
  currentCost?: number | ''; itemName?: string;
}) {
  const [q, setQ] = useState('');
  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ['bakery-ingredients-for-recipe'],
    queryFn: () => ingredientsApi.list({}),
  });

  const chosen = new Set(recipe.map((r) => r.ingredientId));
  const needle = q.trim().toLowerCase();
  const options = useMemo(
    () => ingredients.filter((i: any) => i.isActive !== false && !chosen.has(i.id))
      .filter((i: any) => (needle ? i.name.toLowerCase().includes(needle) : true)).slice(0, 20),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ingredients, needle, recipe],
  );

  const batch = recipe.reduce((s, r) => s + Number(r.qty || 0) * Number(r.costPerUnit || 0), 0);
  const per = yieldQty > 0 ? batch / yieldQty : batch;
  const differs = currentCost !== '' && currentCost !== undefined && Math.abs(Number(currentCost) - per) > 1;

  return (
    <Card>
      <CardHead icon={Wheat} title={itemName ? `"${itemName}" me kya lagta hai` : 'Recipe'}
        desc="Marzi ki baat — bharenge to cost khud nikal aayegi" />

      {recipe.length > 0 && (
        <div className="space-y-2">
          {recipe.map((r) => {
            const bad = r.qty === '' || Number(r.qty) <= 0;
            return (
              <div key={r.ingredientId}
                className={`rounded-2xl border-2 p-3 flex items-center gap-2.5 ${
                  bad ? 'border-rose-300 bg-rose-50 dark:bg-rose-500/10' : 'border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/60'
                }`}>
                <span className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
                  <Wheat className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{r.name}</div>
                  <div className="text-[11px] font-bold text-slate-400 tabular-nums">{formatPKR(r.costPerUnit)} / {r.unit}</div>
                </div>
                <input type="number" min={0} step="any" value={r.qty}
                  onChange={(e) => onUpdate(r.ingredientId, { qty: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="0"
                  className={`h-10 w-24 rounded-xl border-2 bg-white dark:bg-neutral-900 px-2 text-sm font-extrabold text-center tabular-nums focus:outline-none ${
                    bad ? 'border-rose-400' : 'border-slate-200 dark:border-neutral-700 focus:border-violet-500'
                  }`} />
                <span className="text-[11px] font-black text-slate-500 w-10 shrink-0">{r.unit}</span>
                <span className="text-sm font-black tabular-nums text-slate-900 dark:text-white w-20 text-right shrink-0">
                  {formatPKR(Number(r.qty || 0) * Number(r.costPerUnit || 0))}
                </span>
                <button type="button" onClick={() => onRemove(r.ingredientId)}
                  className="h-9 w-9 rounded-xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 hover:border-rose-400 flex items-center justify-center shrink-0 transition">
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {recipe.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border-2 border-violet-200 dark:border-violet-500/30 p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Calculator className="h-4 w-4 text-violet-600" />
            <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
              Itna saamaan lagane se kitni cheezein banti hain?
            </span>
            <input type="number" min={1} step="any" value={yieldQty}
              onChange={(e) => onYield(Math.max(Number(e.target.value) || 1, 0.01))}
              className="h-10 w-24 rounded-xl border-2 border-violet-200 dark:border-violet-500/30 bg-white dark:bg-neutral-900 px-2 text-sm font-extrabold text-center tabular-nums focus:outline-none focus:border-violet-500" />
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            <div className="rounded-xl bg-white dark:bg-neutral-900 p-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Poore batch ka</div>
              <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{formatPKR(batch)}</div>
            </div>
            <div className="rounded-xl bg-white dark:bg-neutral-900 p-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ek cheez ka</div>
              <div className="text-lg font-black text-violet-700 dark:text-violet-300 tabular-nums">{formatPKR(per)}</div>
            </div>
          </div>

          {onApplyCost && per > 0 && (
            <button type="button" onClick={() => onApplyCost(Number(per.toFixed(2)))}
              className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
              <Calculator className="h-4 w-4" /> Ye kharcha cost me daal do
            </button>
          )}

          {differs && (
            <Note tone="amber">
              Aap ne cost <strong>{formatPKR(Number(currentCost))}</strong> likhi hai, magar recipe se{' '}
              <strong>{formatPKR(per)}</strong> banti hai. Munafa is se bigar jayega.
            </Note>
          )}
        </div>
      )}

      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Saamaan dhoondein — maida, cheeni, makkhan…" className={`${inp} pl-9`} />
      </div>

      {isLoading ? (
        <div className="py-5 text-center"><Loader2 className="h-5 w-5 animate-spin text-violet-500 mx-auto" /></div>
      ) : options.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {options.map((i: any) => (
            <button key={i.id} type="button"
              onClick={() => { onAdd({ ingredientId: i.id, name: i.name, qty: '', unit: i.unit, costPerUnit: Number(i.costPerUnit) || 0 }); setQ(''); }}
              className="h-10 px-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-violet-400 text-xs font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition">
              <Plus className="h-3.5 w-3.5 text-violet-500" /> {i.name}
              <span className="text-[10px] text-slate-400 tabular-nums">{formatPKR(i.costPerUnit)}/{i.unit}</span>
            </button>
          ))}
        </div>
      ) : ingredients.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 dark:bg-neutral-800 border-2 border-dashed border-slate-300 dark:border-neutral-700 p-4 text-center">
          <Wheat className="h-6 w-6 text-slate-400 mx-auto" />
          <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200 mt-2">Abhi koi saamaan nahi</p>
          <p className="text-[11px] font-bold text-slate-500 mt-1">
            Pehle maida, cheeni, makkhan daalein — phir yahan chun sakenge.
          </p>
          <Link to="/bakery/ingredients"
            className="mt-3 h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
            <Plus className="h-4 w-4" /> Saamaan daalein
          </Link>
        </div>
      ) : (
        <p className="text-xs font-bold text-slate-400 text-center py-2">
          {needle ? `"${q}" se kuch nahi mila` : 'Saara saamaan recipe me aa chuka hai'}
        </p>
      )}

      {recipe.length === 0 && ingredients.length > 0 && (
        <Note tone="slate" icon={Info}>
          Recipe bharna zaroori nahi. Lekin bhar dein to ek bara faida hai: maida ya cheeni ka rate
          barhte hi pata chal jayega ke ab ek cake par kitna kharcha aa raha hai.
        </Note>
      )}
    </Card>
  );
}

/* ═════════════════════════════════════════════════════════════
   CATEGORY — dukaan-daar ki apni
   ═════════════════════════════════════════════════════════════ */
function CategoryPicker({ value, onChange, productName }: {
  value: string; onChange: (id: string, name: string) => void; productName?: string;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState('');

  const { data: categories = [], isLoading } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const create = useMutation({
    mutationFn: (name: string) => categoriesApi.create({ name }),
    onSuccess: (c: Category) => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      onChange(c.id, c.name); setQ('');
      toast.success(`"${c.name}" ban gayi`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Category nahi bani'),
  });

  const selected = categories.find((c) => c.id === value);
  const needle = q.trim().toLowerCase();
  const filtered = useMemo(
    () => (needle ? categories.filter((c) => c.name.toLowerCase().includes(needle)) : categories),
    [categories, needle],
  );
  const openSuggestions = useMemo(() => {
    const have = new Set(categories.map((c) => c.name.trim().toLowerCase()));
    return CATEGORY_SUGGESTIONS.filter((s) => !have.has(s.name.toLowerCase()));
  }, [categories]);
  const exact = categories.some((c) => c.name.trim().toLowerCase() === needle);
  const derived = deriveBakeryCategory(selected?.name, productName);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          Category <span className="text-rose-500">*</span>
        </label>
        {selected && (
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-pink-500" />
            System samjha: <strong className="text-pink-600 dark:text-pink-400">{prettyCategory(derived)}</strong>
          </span>
        )}
      </div>

      {selected ? (
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-pink-400 bg-pink-50 dark:bg-pink-500/10 p-3">
          <span className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white font-black"
            style={{ background: selected.color || '#ec4899' }}>
            {selected.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{selected.name}</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {selected._count?.products ?? 0} cheezein is me
            </div>
          </div>
          <button type="button" onClick={() => onChange('', '')}
            className="h-9 w-9 rounded-xl bg-white dark:bg-neutral-800 border-2 border-slate-200 dark:border-neutral-700 flex items-center justify-center shrink-0 hover:border-rose-400 transition">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-neutral-700 p-3 text-center">
          <Tag className="h-5 w-5 text-slate-400 mx-auto" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            Koi category nahi chuni — neeche se chunein ya apni banayein
          </p>
        </div>
      )}

      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && needle && !exact) { e.preventDefault(); create.mutate(q.trim()); } }}
          placeholder="Category dhoondein ya naya naam likhein…" className={`${inp} pl-9`} />
      </div>

      {needle && !exact && (
        <button type="button" disabled={create.isPending} onClick={() => create.mutate(q.trim())}
          className="w-full h-11 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          "{q.trim()}" naam se nayi category banayein
        </button>
      )}

      {isLoading ? (
        <div className="py-4 text-center"><Loader2 className="h-5 w-5 animate-spin text-pink-500 mx-auto" /></div>
      ) : filtered.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {filtered.map((c) => {
            const on = c.id === value;
            return (
              <button key={c.id} type="button" onClick={() => onChange(c.id, c.name)}
                className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                  on ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300'
                    : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 dark:text-slate-200 hover:border-pink-400'
                }`}>
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: c.color || '#94a3b8' }} />
                {c.name}{on && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      ) : null}

      {openSuggestions.length > 0 && (
        <div className="rounded-2xl bg-slate-50 dark:bg-neutral-800/60 border-2 border-slate-200 dark:border-neutral-700 p-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Ready categories — click karein to ban jayegi
          </div>
          <div className="flex flex-wrap gap-1.5">
            {openSuggestions.map((s) => (
              <button key={s.name} type="button" disabled={create.isPending}
                onClick={() => {
                  const ex = categories.find((c) => c.name.trim().toLowerCase() === s.name.toLowerCase());
                  if (ex) return onChange(ex.id, ex.name);
                  create.mutate(s.name);
                }}
                className="h-9 px-2.5 rounded-lg bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 hover:border-pink-400 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 disabled:opacity-50 transition">
                <span>{s.emoji}</span> {s.name}
              </button>
            ))}
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-2">
            Ye sirf madad ke liye hain — jo naam aap ki dukaan par chalta hai, wohi likh lein.
          </p>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   KHULASA — dayen taraf
   ═════════════════════════════════════════════════════════════ */
function Summary({ draft, stats, allValid, cakeLike }: {
  draft: BakeryWizardDraft; stats: any; allValid: boolean; cakeLike: boolean;
}) {
  const b = draft.basic;
  const base = b.unit || 'pcs';
  const baseDef = unitDef(base);
  const baseName = unitLabel(base, b.customUnitName);
  const basePrice = Number((b as any)[priceField[base]] || 0) || Number(b.price || 0);
  const img = b.imageUrls[0];

  const extras = useMemo(
    () => extraUnitsFor(base)
      .map((k) => ({
        ...unitDef(k),
        price: Number((b as any)[priceField[k]] || 0),
        rate: rateBetween(k, base, { weightGrams: b.weightGrams, slices: b.numberOfSlices }),
      }))
      .filter((x) => x.price > 0),
    [base, b],
  );

  const flavor = FLAVORS.find((f) => f.value === draft.cake.defaultFlavor);
  const cost = Number(b.costPrice || 0);
  const margin = basePrice > 0 && cost > 0 ? ((basePrice - cost) / basePrice) * 100 : null;

  return (
    <aside className="hidden xl:flex flex-col gap-3 sticky top-4 self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white p-4 shadow-xl overflow-hidden">
        <div className="rounded-2xl overflow-hidden bg-white/10 aspect-square flex items-center justify-center mb-3">
          {img ? <img src={img} alt="" className="h-full w-full object-cover" />
               : <span className="text-5xl">{draft.itemType === 'MADE' ? '🧁' : '📦'}</span>}
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-white/60">
          {b.categoryName || 'Category nahi chuni'}
        </div>
        <div className="text-lg font-black leading-tight break-words">{b.name || 'Naam nahi likha'}</div>
        {allValid
          ? <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 px-2 py-1 text-[10px] font-black text-emerald-200">
              <CheckCircle2 className="h-3 w-3" /> Save karne ke liye tayyar
            </div>
          : <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-400/30 px-2 py-1 text-[10px] font-black text-amber-200">
              <AlertTriangle className="h-3 w-3" /> Kuch reh gaya hai
            </div>}
      </div>

      <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b-2 border-slate-100 dark:border-neutral-800 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-pink-600" />
          <span className="font-extrabold text-sm text-slate-900 dark:text-white">Kaise bech rahe hain</span>
        </div>
        <div className="p-3 space-y-2">
          <div className="rounded-xl bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/30 dark:to-neutral-900 border-2 border-pink-200 dark:border-pink-800 p-3">
            <div className="text-[10px] uppercase tracking-widest font-black text-pink-700 dark:text-pink-300">
              {baseDef.emoji} Per {baseName}
            </div>
            <div className="text-xl font-black text-pink-900 dark:text-pink-100 tabular-nums leading-tight">
              {basePrice > 0 ? formatPKRFull(basePrice) : '—'}
            </div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Stock isi naap me ginta hai</div>
          </div>

          {extras.map((x) => (
            <div key={x.key} className="rounded-xl bg-slate-50 dark:bg-neutral-800/60 border-2 border-slate-200 dark:border-neutral-700 p-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{x.emoji}</span>
                <span className="text-[11px] font-extrabold text-slate-900 dark:text-white">Per {x.label}</span>
                <span className="ml-auto text-[12px] font-black tabular-nums text-slate-900 dark:text-white">{formatPKRFull(x.price)}</span>
              </div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">= {x.rate.toFixed(x.rate < 1 ? 3 : 2)} {baseName}</div>
            </div>
          ))}

          {margin !== null && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-2.5">
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Margin</div>
              <div className="text-base font-black text-emerald-800 dark:text-emerald-200 tabular-nums">{margin.toFixed(0)}%</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-neutral-800 border-t-2 border-slate-100 dark:border-neutral-800">
          <div className="p-3 text-center">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Photos</div>
            <div className="text-base font-black text-slate-900 dark:text-white">{stats.imageCount}</div>
          </div>
          <div className="p-3 text-center">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Diet</div>
            <div className="text-base font-black text-slate-900 dark:text-white">{stats.dietaryScore}/4</div>
          </div>
        </div>
      </div>

      {cakeLike && flavor && (
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Flavour</div>
          <div className={`rounded-xl bg-gradient-to-br ${flavor.color} p-3 text-white text-center`}>
            <div className="text-2xl">{flavor.emoji}</div>
            <div className="font-extrabold text-sm">{flavor.label}</div>
          </div>
        </div>
      )}
    </aside>
  );
}

/* ═════════════════════════════════════════════════════════════
   SANJHE HISSE — poore safhe me ek hi set
   ─────────────────────────────────────────────────────────────
   Pehle har component ka apna Section, Toggle, Tip hota tha —
   naam alag, shakal alag. Ab ek hi jagah, is liye safha har jagah
   ek jaisa lagta hai.
   ═════════════════════════════════════════════════════════════ */
const inp = 'h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-500 transition';

function Card({ tone, children }: { tone?: 'pink'; children: any }) {
  return (
    <section className={`rounded-3xl border-2 shadow-sm p-5 space-y-3.5 ${
      tone === 'pink'
        ? 'bg-gradient-to-br from-pink-50 via-white to-fuchsia-50 dark:from-pink-950/30 dark:via-neutral-900 dark:to-fuchsia-950/30 border-pink-200 dark:border-pink-800'
        : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800'
    }`}>{children}</section>
  );
}

function CardHead({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white flex items-center justify-center shadow shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">{title}</h3>
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

function Field({ label, req, opt, children }: { label: string; req?: boolean; opt?: boolean; children: any }) {
  return (
    <div>
      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
        {label}
        {req && <span className="text-rose-500"> *</span>}
        {opt && <span className="text-slate-400 normal-case font-bold"> — marzi</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({ icon: Icon, label, hint, on, onChange }: {
  icon: any; label: string; hint?: string; on: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button type="button" onClick={() => onChange(!on)}
      className={`text-left rounded-2xl border-2 p-3 flex items-start gap-2.5 transition ${
        on ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-pink-300'
      }`}>
      <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
        on ? 'bg-pink-600 text-white' : 'bg-slate-100 dark:bg-neutral-700 text-slate-500'
      }`}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0">
        <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight">{label}</span>
        {hint && <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{hint}</span>}
      </span>
    </button>
  );
}

function Note({ tone = 'slate', icon: Icon, children }: { tone?: string; icon?: any; children: any }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-slate-300',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200',
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
    violet: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-900 dark:text-violet-200',
  };
  const I = Icon ?? Info;
  return (
    <div className={`rounded-2xl border-2 p-3 flex gap-2.5 ${tones[tone] ?? tones.slate}`}>
      <I className="h-4 w-4 shrink-0 mt-0.5" />
      <p className="text-[12px] font-bold leading-snug min-w-0">{children}</p>
    </div>
  );
}

function CustomName({ label, placeholder, value, onChange }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  const empty = !value.trim();
  return (
    <div className={`rounded-2xl border-2 p-3 space-y-1.5 ${
      empty ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10'
            : 'border-pink-300 dark:border-pink-500/40 bg-pink-50 dark:bg-pink-500/10'
    }`}>
      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
        {label} <span className="text-rose-500">*</span>
      </label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus className={inp} />
      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
        Jo aap likhenge wohi POS aur catalog par nazar aayega.
      </p>
    </div>
  );
}

function Errors({ errors, show }: { errors: string[]; show: boolean }) {
  if (!show || errors.length === 0) return null;
  return (
    <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <AlertTriangle className="h-4 w-4 text-rose-600" />
        <span className="text-sm font-extrabold text-rose-900 dark:text-rose-200">Ye reh gaya hai</span>
      </div>
      <ul className="space-y-0.5">
        {errors.map((e, i) => (
          <li key={i} className="text-[12px] font-bold text-rose-800 dark:text-rose-300">• {e}</li>
        ))}
      </ul>
    </div>
  );
}

function Guide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-neutral-900 border-2 border-pink-300 dark:border-pink-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-pink-200 dark:border-pink-500/30 bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-pink-900 dark:text-pink-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Cheez kaise banayein
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Pehla sawal: <strong>ye cheez kya hai?</strong> Bakery me teen tarah ki cheezein hoti
            hain, aur teenon ka hisab alag chalta hai.
          </p>
          <GTip icon={ChefHat} title="Hum khud banate hain">
            Cake, cookies, patties, bread. Recipe, freshness aur production — sab chalega.
          </GTip>
          <GTip icon={ShoppingBag} title="Bahar se laya maal">
            Lays, bottle, juice. Cake wale sawal nahi — sirf rate, cost aur stock. Do hi step.
          </GTip>
          <GTip icon={Wheat} title="Banane ka saamaan">
            Maida, cheeni, makkhan. <strong>Ye bikta nahi</strong> — POS aur catalog me kabhi nazar
            nahi aata. Iska kaam sirf recipe me lagna aur khatam hone par batana hai.
          </GTip>
          <GTip icon={Scale} title="Naap — ek hi sawal">
            Pehle "Base Unit" aur "Default Size" do alag khaane thay jo ek hi baat pooch rahe thay.
            Ab sirf ek: <strong>kaise bechte hain</strong>. Size khud nikal aati hai.
          </GTip>
          <GTip icon={Plus} title="Ek cheez, kai rate">
            Cake per pound bhi bikta hai aur per slice bhi. Dono rate bhar dein — sath me likha
            aata hai ke <strong>stock se kitna ghatega</strong>.
          </GTip>
          <GTip icon={Sparkles} title='Jahan "Apna" ho, wahan likh sakte hain'>
            Naap, flavour, shape, cream — chaaron me. Jo aap likhenge wohi POS par nazar aayega;
            pehle sirf lafz "Custom" reh jata tha.
          </GTip>
          <GTip icon={Timer} title="Freshness sab se ahem">
            "Kitni der theek rehti hai" se hi expiry ki warning aati hai — warna bana hua maal
            chup-chaap kharab ho jata hai.
          </GTip>
          <div className="rounded-2xl bg-slate-50 dark:bg-neutral-800 p-3">
            <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
              Adhoora chhor dein to kuch nahi jata — draft khud save ho jata hai, wapas aakar
              wahin se shuru kar sakte hain.
            </p>
          </div>
          <Button className="w-full" onClick={onClose}>Samajh gaya</Button>
        </div>
      </div>
    </div>
  );
}

function GTip({ icon: Icon, title, children }: { icon: any; title: string; children: any }) {
  return (
    <div className="flex gap-2.5">
      <div className="h-8 w-8 rounded-xl bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-pink-600 dark:text-pink-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
