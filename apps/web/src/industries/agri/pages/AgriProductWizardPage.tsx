/* ═════════════════════════════════════════════════════════════
   AGRI PRODUCT WIZARD — SAB KUCH EK JAGAH
   ─────────────────────────────────────────────────────────────
   Pehle ye safha 7 file me bikhra tha: page, paanch component aur
   ek hook. Bakery ki tarah ab sab yahin hai — tarteeb:

     1. Types aur state      — useAgriWizard
     2. Save ka amal         — saveAgriWizard
     3. Safha                — AgriProductWizardPage
     4. Qadam ke component   — step 1/2/3, summary, stepper

   SIRF `lib/agriUnits` bahar hai, kyunke POS, list aur detail
   page bhi wohi hisab istemal karte hain. Nakal se wohi bug
   bante hain jaise bori/kilo wala conversion.
   ═════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wheat, Sprout, FlaskConical, Tractor, Leaf, ShieldAlert, Package,
  ArrowLeft, ArrowRight, Save, X, Plus, Check, CheckCircle2, Camera,
  AlertTriangle, Info, Search, Tag, DollarSign, Scale, Calculator,
  GraduationCap, Sparkles, Loader2, Trash2, ExternalLink, Star,
  TrendingUp, Award, Calendar, Landmark, Droplets, Bug, Beaker,
  Image as ImageIcon, ShieldCheck, Timer, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { categoriesApi, type Category } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { UploadDropzone } from '@core/components/uploads';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { agriProductsApi } from '../api/products.api';
import {
  AGRI_UNITS, agriUnitDef, agriUnitLabel, isMeasured, agriRate,
  agriExtraUnits, certStatus, SEASONS,
} from '../lib/agriUnits';
import {
  AGRI_CATEGORY_SUGGESTIONS, AGRI_KIND_EMOJI, deriveAgriKind, prettyAgriKind,
  isSeedKind, isFertKind, isSprayKind, isFeedKind, isToolKind, needsGovtReg,
  type AgriKind,
} from '../lib/agriCategory';

const DRAFT_KEY = 'nafaa.agri-wizard.draft';

type WizardStep = 1 | 2 | 3;

type SeedType =
  | 'WHEAT' | 'RICE' | 'COTTON' | 'MAIZE' | 'SUGARCANE' | 'POTATO'
  | 'ONION' | 'TOMATO' | 'CHILLI' | 'PULSES' | 'VEGETABLES' | 'FRUITS'
  | 'FODDER' | 'OILSEEDS' | 'OTHER';

type FertilizerType =
  | 'UREA' | 'DAP' | 'NPK' | 'POTASH' | 'ZINC' | 'SULFUR'
  | 'BORON' | 'MICRONUTRIENT' | 'ORGANIC' | 'BIO_FERTILIZER' | 'LIQUID' | 'FOLIAR' | 'OTHER';

type FeedType =
  | 'STARTER' | 'GROWER' | 'FINISHER' | 'LAYER' | 'BREEDER'
  | 'MILK_REPLACER' | 'MINERAL_MIX' | 'CONCENTRATE' | 'ROUGHAGE' | 'SILAGE'
  | 'HAY' | 'BRAN' | 'OIL_CAKE' | 'MOLASSES' | 'OTHER';

type SeasonType = 'KHARIF' | 'RABI' | 'ZAID' | 'ALL_SEASON' | 'SPRING' | 'SUMMER' | 'MONSOON' | 'WINTER';

interface AgriWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  sku: string;
  barcode: string;
  baseUnit: string;
  /** "Apna" naap chuna ho to us ka naam — pehle likhne ki jagah hi nahi thi */
  customUnitName: string;
  /** Bori/packet me kitna maal — 1 bori = 50 kg wala hisab isi se */
  packSize: number | '';
  packUnit: string;
  costPrice: number | '';
  salePrice: number | '';
  wholesalePrice: number | '';
  taxRate: number | '';
  isFeatured: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
  // Agri category
  /* Dukaan-daar ki apni global category. System wali qism is se
     KHUD nikal aati hai — `deriveAgriKind` — is liye wo alag se
     poochi nahi jati. */
  categoryName: string;
  subCategory: string;
  seedType: SeedType | '';
  fertilizerType: FertilizerType | '';
  feedType: FeedType | '';
}

interface AgriWizardProfile {
  brand: string;
  manufacturer: string;
  countryOfOrigin: string;
  npkRatio: string;
  activeIngredient: string;
  concentration: string;
  packSize: string;
  packUnit: string;
  bagsPerTon: number | '';
  applicationRate: string;
  applicationMethod: string;
  applicationInterval: string;
  targetCrops: string[];
  targetPests: string[];
  targetAnimals: string[];
  season: SeasonType | '';
  suitableFor: string[];
  cropStage: string;
  isOrganic: boolean;
  organicCertNumber: string;
  govtRegNumber: string;
  govtRegExpiry: string;
  shelfLifeMonths: number | '';
  storageTemp: string;
  storageInstructions: string;
  descriptionLong: string;
  usageInstructions: string;
}

interface AgriWizardSafety {
  toxicityLevel: string;
  ppePeriod: number | '';
  reEntryPeriod: number | '';
  warningLabel: string;
  hazardClass: string;
  isRestricted: boolean;
  requiresLicense: boolean;
  precautions: string;
  firstAid: string;
  msdsUrl: string;
  // Stock
  reorderLevel: number | '';
  minStockAlert: number | '';
  currentStock: number | '';
  // Bulk pricing
  bulkDiscountThreshold: number | '';
  bulkDiscountPct: number | '';
  // Flags
  isPopular: boolean;
  isBestSeller: boolean;
  isSeasonal: boolean;
}

interface AgriWizardDraft {
  step: WizardStep;
  /** Edit kholte waqt counter par jitna stock tha — badla hai ya nahi, ye usi se pata chalta hai */
  originalStock: number | null;
  basic: AgriWizardBasic;
  profile: AgriWizardProfile;
  safety: AgriWizardSafety;
  savedAt: number;
}

const emptyBasic = (): AgriWizardBasic => ({
  name: '', description: '', categoryId: '', brandId: '',
  sku: '', barcode: '', baseUnit: 'bag',
  customUnitName: '', packSize: 50, packUnit: 'kg',
  costPrice: '', salePrice: '', wholesalePrice: '', taxRate: '',
  isFeatured: false, isActive: true,
  imageUrls: [], tagIds: [],
  categoryName: '', subCategory: '',
  seedType: '', fertilizerType: '', feedType: '',
});

const emptyProfile = (): AgriWizardProfile => ({
  brand: '', manufacturer: '', countryOfOrigin: '',
  npkRatio: '', activeIngredient: '', concentration: '',
  packSize: '', packUnit: '', bagsPerTon: '',
  applicationRate: '', applicationMethod: '', applicationInterval: '',
  targetCrops: [], targetPests: [], targetAnimals: [],
  season: '', suitableFor: [], cropStage: '',
  isOrganic: false, organicCertNumber: '',
  govtRegNumber: '', govtRegExpiry: '',
  shelfLifeMonths: '', storageTemp: '', storageInstructions: '',
  descriptionLong: '', usageInstructions: '',
});

const emptySafety = (): AgriWizardSafety => ({
  toxicityLevel: '', ppePeriod: '', reEntryPeriod: '',
  warningLabel: '', hazardClass: '',
  isRestricted: false, requiresLicense: false,
  precautions: '', firstAid: '', msdsUrl: '',
  reorderLevel: '', minStockAlert: 5, currentStock: '',
  bulkDiscountThreshold: '', bulkDiscountPct: '',
  isPopular: false, isBestSeller: false, isSeasonal: false,
});

const emptyDraft = (): AgriWizardDraft => ({
  step: 1,
  originalStock: null,
  basic: emptyBasic(),
  profile: emptyProfile(),
  safety: emptySafety(),
  savedAt: Date.now(),
});

interface UseAgriWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

function useAgriWizard(opts: UseAgriWizardOpts = {}) {
  const [draft, setDraft] = useState<AgriWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AgriWizardDraft;
        if (parsed && parsed.basic) {
          setDraft({
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            profile: { ...emptyProfile(), ...parsed.profile },
            safety: { ...emptySafety(), ...parsed.safety },
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
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [draft]);

  const goToStep = useCallback((step: WizardStep) => setDraft((d) => ({ ...d, step })), []);
  const nextStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step < 3 ? d.step + 1 : 3) as WizardStep })), []);
  const prevStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step > 1 ? d.step - 1 : 1) as WizardStep })), []);

  const updateBasic = useCallback((patch: Partial<AgriWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const updateProfile = useCallback((patch: Partial<AgriWizardProfile>) => {
    setDraft((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
  }, []);

  const updateSafety = useCallback((patch: Partial<AgriWizardSafety>) => {
    setDraft((d) => ({ ...d, safety: { ...d.safety, ...patch } }));
  }, []);

  const toggleCrop = useCallback((crop: string) => {
    setDraft((d) => ({
      ...d,
      profile: {
        ...d.profile,
        targetCrops: d.profile.targetCrops.includes(crop)
          ? d.profile.targetCrops.filter((c) => c !== crop)
          : [...d.profile.targetCrops, crop],
      },
    }));
  }, []);

  const togglePest = useCallback((pest: string) => {
    setDraft((d) => ({
      ...d,
      profile: {
        ...d.profile,
        targetPests: d.profile.targetPests.includes(pest)
          ? d.profile.targetPests.filter((p) => p !== pest)
          : [...d.profile.targetPests, pest],
      },
    }));
  }, []);

  const toggleAnimal = useCallback((animal: string) => {
    setDraft((d) => ({
      ...d,
      profile: {
        ...d.profile,
        targetAnimals: d.profile.targetAnimals.includes(animal)
          ? d.profile.targetAnimals.filter((a) => a !== animal)
          : [...d.profile.targetAnimals, animal],
      },
    }));
  }, []);

  const toggleSuitableFor = useCallback((item: string) => {
    setDraft((d) => ({
      ...d,
      profile: {
        ...d.profile,
        suitableFor: d.profile.suitableFor.includes(item)
          ? d.profile.suitableFor.filter((s) => s !== item)
          : [...d.profile.suitableFor, item],
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
    if (!draft.basic.salePrice || Number(draft.basic.salePrice) <= 0) step1Errors.push('Sale price required');
    if (!draft.basic.categoryId) step1Errors.push('Category chunein — ya nayi bana lein');

    const step2Errors: string[] = [];
    // Step 2 is optional — no hard requirements

    const step3Errors: string[] = [];
    // Step 3 is optional

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
    const stock = Number(draft.safety.currentStock || 0);
    const stockValue = stock * salePrice;
    const stockCost = stock * costPrice;
    const profit = salePrice - costPrice;
    const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

    return {
      targetCropCount: draft.profile.targetCrops.length,
      targetPestCount: draft.profile.targetPests.length,
      targetAnimalCount: draft.profile.targetAnimals.length,
      stockValue, stockCost, profit, margin,
      hasOrganicCert: draft.profile.isOrganic && !!draft.profile.organicCertNumber,
      hasGovtReg: !!draft.profile.govtRegNumber,
      isRestricted: draft.safety.isRestricted,
    };
  }, [draft]);

  /** Edit kholte waqt wala stock — sirf ek dafa set hota hai */
  const setOriginalStock = useCallback((n: number) => {
    setDraft((d) => (d.originalStock === n ? d : { ...d, originalStock: n }));
  }, []);

  return {
    draft, draftRestored, validation, stats,
    setOriginalStock,
    goToStep, nextStep, prevStep,
    updateBasic, updateProfile, updateSafety,
    toggleCrop, togglePest, toggleAnimal, toggleSuitableFor,
    reset,
  };
}

/* ════ SAVE — product + agri profile ═══════════════════════════ */

interface AgriWizardSaveResult {
  productId: string;
  profileId: string;
  productName: string;
  agriCategory: string;
  targetCropCount: number;
  isOrganic: boolean;
  isRestricted: boolean;
}

/**
 * Atomically create an agri product with:
 *   • Base product entity
 *   • Agri product profile (specs, certs, targets, safety)
 *
 * Rollback: deletes the product if profile creation fails.
 */
async function saveAgriWizard(

  draft: AgriWizardDraft,
  /** Diya ho to isi product ko badla jayega, naya nahi banega */
  existingId?: string,
): Promise<AgriWizardSaveResult> {
  const { basic, profile, safety } = draft;

  // ─── 1. CREATE PRODUCT ─────────────────────────────────
  /* Pehle yahan sirf `create` tha: product "edit" karne par naya
     product ban jata tha aur purana waise ka waisa para rehta —
     ek hi cheez do dafa, do alag stock ke sath. */
  const _payload = {
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    brandId: basic.brandId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: basic.baseUnit === 'custom'
      ? (basic.customUnitName.trim() || 'unit')
      : (basic.baseUnit || 'bag'),
    price: Number(basic.salePrice || 0),
    costPrice: Number(basic.costPrice || 0),
    wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
    taxRate: Number(basic.taxRate || 0),
    lowStockAlert: Number(safety.minStockAlert || 5),
    /* STOCK — sirf tab jab waqai badla ho.
       Pehle yahan hamesha `stock` jata tha, is liye edit karte hi
       counter ka maujooda stock us number se badal jata tha jo form
       me para tha. Ab kholte waqt wala number yaad rakha jata hai
       aur usi se milan hota hai. */
    ...(() => {
      const entered = Number(safety.currentStock || 0);
      if (!existingId) return { stock: entered };
      const before = draft.originalStock;
      return before !== null && entered !== before ? { stock: entered } : {};
    })(),
    isActive: basic.isActive,
    isFeatured: basic.isFeatured,
    tagIds: basic.tagIds,
    imageUrls: basic.imageUrls,
  };

  const product = existingId
    ? await productsApi.update(existingId, _payload as any)
    : await productsApi.create(_payload as any);;

  const productId = product.id;

  const rollback = async (reason: unknown) => {
    // EDIT me hargiz nahi — warna dukaan-daar ka mojooda product,
    // uski saari bikri ka rishta aur stock sab mit jata.
    if (existingId) throw reason;
    try { await productsApi.remove(productId); } catch {}
    throw reason;
  };

  // ─── 2. CREATE AGRI PROFILE ────────────────────────────
  let agriProfile: any;
  try {
    agriProfile = await agriProductsApi.upsert({
      productId,
      category: deriveAgriKind(basic.categoryName, basic.name),
      subCategory: basic.subCategory || undefined,
      seedType: basic.seedType || undefined,
      fertilizerType: basic.fertilizerType || undefined,
      feedType: basic.feedType || undefined,
      brand: profile.brand || undefined,
      manufacturer: profile.manufacturer || undefined,
      countryOfOrigin: profile.countryOfOrigin || undefined,
      npkRatio: profile.npkRatio || undefined,
      activeIngredient: profile.activeIngredient || undefined,
      concentration: profile.concentration || undefined,
      /* Naap ka hisab ab basic me rehta hai — POS ko wahin se milta hai */
      packSize: basic.packSize ? String(basic.packSize) : (profile.packSize || undefined),
      packUnit: basic.packUnit || profile.packUnit || undefined,
      bagsPerTon: profile.bagsPerTon ? Number(profile.bagsPerTon) : undefined,
      applicationRate: profile.applicationRate || undefined,
      applicationMethod: profile.applicationMethod || undefined,
      applicationInterval: profile.applicationInterval || undefined,
      targetCrops: profile.targetCrops,
      targetPests: profile.targetPests,
      targetAnimals: profile.targetAnimals,
      season: profile.season || undefined,
      suitableFor: profile.suitableFor,
      cropStage: profile.cropStage || undefined,
      toxicityLevel: safety.toxicityLevel || undefined,
      ppePeriod: safety.ppePeriod ? Number(safety.ppePeriod) : undefined,
      reEntryPeriod: safety.reEntryPeriod ? Number(safety.reEntryPeriod) : undefined,
      warningLabel: safety.warningLabel || undefined,
      hazardClass: safety.hazardClass || undefined,
      isOrganic: profile.isOrganic,
      organicCertNumber: profile.isOrganic ? (profile.organicCertNumber || undefined) : undefined,
      govtRegNumber: profile.govtRegNumber || undefined,
      govtRegExpiry: profile.govtRegExpiry || undefined,
      shelfLifeMonths: profile.shelfLifeMonths ? Number(profile.shelfLifeMonths) : undefined,
      storageTemp: profile.storageTemp || undefined,
      storageInstructions: profile.storageInstructions || undefined,
      reorderLevel: safety.reorderLevel ? Number(safety.reorderLevel) : undefined,
      minStockAlert: safety.minStockAlert ? Number(safety.minStockAlert) : undefined,
      bulkDiscountThreshold: safety.bulkDiscountThreshold ? Number(safety.bulkDiscountThreshold) : undefined,
      bulkDiscountPct: safety.bulkDiscountPct ? Number(safety.bulkDiscountPct) : undefined,
      isRestricted: safety.isRestricted,
      requiresLicense: safety.requiresLicense,
      isPopular: safety.isPopular,
      isBestSeller: safety.isBestSeller,
      isSeasonal: safety.isSeasonal,
      isFeatured: basic.isFeatured,
      descriptionLong: profile.descriptionLong || undefined,
      usageInstructions: profile.usageInstructions || undefined,
      precautions: safety.precautions || undefined,
      firstAid: safety.firstAid || undefined,
      msdsUrl: safety.msdsUrl || undefined,
      imageUrls: basic.imageUrls,
    });
  } catch (e) {
    await rollback(e);
  }

  return {
    productId,
    profileId: agriProfile.id,
    productName: product.name,
    agriCategory: deriveAgriKind(basic.categoryName, basic.name),
    targetCropCount: profile.targetCrops.length,
    isOrganic: profile.isOrganic,
    isRestricted: safety.isRestricted,
  };
}
/* ═════════════════════════════════════════════════════════════
   SAFHA
   ═════════════════════════════════════════════════════════════ */
export default function AgriProductWizardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const qc = useQueryClient();

  const w = useAgriWizard({ autoLoadDraft: !isEdit });
  const [showDraft, setShowDraft] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { data: product } = useQuery({
    queryKey: ['product', id], queryFn: () => productsApi.getOne(id!), enabled: isEdit,
  });
  const { data: profile } = useQuery({
    queryKey: ['agri-profile-by-product', id],
    queryFn: () => agriProductsApi.byProduct(id!).catch(() => null),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!isEdit || !product || hydrated) return;
    const p: any = profile ?? {};
    w.updateBasic({
      name: product.name ?? '',
      description: product.description ?? '',
      categoryId: product.categoryId ?? '',
      brandId: product.brandId ?? '',
      sku: product.sku ?? '', barcode: product.barcode ?? '',
      baseUnit: product.unit ?? 'bag',
      packSize: p.packSize ? Number(p.packSize) : 50,
      packUnit: p.packUnit ?? 'kg',
      costPrice: product.costPrice ?? '', salePrice: product.price ?? '',
      wholesalePrice: product.wholesalePrice ?? '', taxRate: product.taxRate ?? '',
      isActive: product.isActive ?? true, isFeatured: product.isFeatured ?? false,
      imageUrls: (product.images ?? []).map((i: any) => i.url).filter(Boolean),
      tagIds: (product.tags ?? []).map((t: any) => t.tag?.id).filter(Boolean),
      categoryName: (product as any).category?.name ?? '',
      subCategory: p.subCategory ?? '',
      seedType: p.seedType ?? '', fertilizerType: p.fertilizerType ?? '', feedType: p.feedType ?? '',
    });
    w.updateProfile({
      brand: p.brand ?? '', manufacturer: p.manufacturer ?? '', countryOfOrigin: p.countryOfOrigin ?? '',
      npkRatio: p.npkRatio ?? '', activeIngredient: p.activeIngredient ?? '', concentration: p.concentration ?? '',
      applicationRate: p.applicationRate ?? '', applicationMethod: p.applicationMethod ?? '',
      applicationInterval: p.applicationInterval ?? '',
      targetCrops: p.targetCrops ?? [], targetPests: p.targetPests ?? [], targetAnimals: p.targetAnimals ?? [],
      season: p.season ?? '', suitableFor: p.suitableFor ?? [], cropStage: p.cropStage ?? '',
      isOrganic: !!p.isOrganic, organicCertNumber: p.organicCertNumber ?? '',
      govtRegNumber: p.govtRegNumber ?? '', govtRegExpiry: p.govtRegExpiry ? String(p.govtRegExpiry).slice(0, 10) : '',
      shelfLifeMonths: p.shelfLifeMonths ?? '', storageTemp: p.storageTemp ?? '',
      storageInstructions: p.storageInstructions ?? '',
      descriptionLong: p.descriptionLong ?? '', usageInstructions: p.usageInstructions ?? '',
    });
    w.updateSafety({
      toxicityLevel: p.toxicityLevel ?? '', ppePeriod: p.ppePeriod ?? '', reEntryPeriod: p.reEntryPeriod ?? '',
      warningLabel: p.warningLabel ?? '', hazardClass: p.hazardClass ?? '',
      isRestricted: !!p.isRestricted, requiresLicense: !!p.requiresLicense,
      precautions: p.precautions ?? '', firstAid: p.firstAid ?? '', msdsUrl: p.msdsUrl ?? '',
      reorderLevel: p.reorderLevel ?? '', minStockAlert: p.minStockAlert ?? product.lowStockAlert ?? '',
      currentStock: product.stock ?? '',
      bulkDiscountThreshold: p.bulkDiscountThreshold ?? '', bulkDiscountPct: p.bulkDiscountPct ?? '',
      isPopular: !!p.isPopular, isBestSeller: !!p.isBestSeller, isSeasonal: !!p.isSeasonal,
    });
    w.setOriginalStock(Number(product.stock ?? 0));
    setHydrated(true);
  }, [isEdit, product, profile, hydrated, w]);

  useEffect(() => { if (!isEdit && w.draftRestored) setShowDraft(true); }, [isEdit, w.draftRestored]);

  const save = useMutation({
    mutationFn: () => saveAgriWizard(w.draft, isEdit ? id : undefined),
    onSuccess: (res) => {
      toast.success(isEdit ? 'Save ho gaya!' : 'Ban gaya!');
      qc.invalidateQueries({ queryKey: ['agri-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      if (!isEdit) w.reset();
      navigate(`/agri-products/${res.productId}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save nahi hua'),
  });

  const { draft, validation } = w;
  const cert = certStatus(draft.profile.govtRegExpiry);

  if (save.isPending) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="rounded-3xl bg-white dark:bg-slate-900 shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="h-16 w-16 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Save ho raha hai…</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
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
              className="h-9 px-3 rounded-lg bg-white dark:bg-slate-800 border-2 border-amber-300 text-amber-800 dark:text-amber-200 text-[11px] font-black inline-flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Naya shuru
            </button>
            <button onClick={() => setShowDraft(false)}
              className="h-9 w-9 rounded-lg bg-white dark:bg-slate-800 border-2 border-amber-300 flex items-center justify-center">
              <X className="h-3.5 w-3.5 text-amber-800" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition">
          <ArrowLeft className="h-4 w-4" /> Products
        </Link>
        <div className="flex gap-2">
          <button onClick={() => setShowGuide(true)}
            className="h-10 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 transition">
            <GraduationCap className="h-4 w-4" /> Madad
          </button>
          {isEdit && (
            <Link to={`/agri-products/${id}`}
              className="h-10 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black inline-flex items-center gap-1.5 transition">
              <ExternalLink className="h-4 w-4" /> Detail
            </Link>
          )}
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-700 text-white p-5 sm:p-6 shadow-2xl">
        <div className="absolute -top-20 -right-16 h-60 w-60 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
            <Sprout className="h-3.5 w-3.5 text-lime-300" /> {isEdit ? 'Edit' : 'Nayi cheez'}
          </div>
          <h1 className="mt-2.5 text-2xl sm:text-3xl font-black leading-tight">
            {draft.basic.name || (isEdit ? 'Edit karein' : '🌱 Nayi cheez daalein')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-bold text-white/85">
            Beej, khaad, spray, feed — teen qadam
          </p>
        </div>
      </section>

      {/* Registration ki warning — sab se upar, kyunke ye qanooni baat hai */}
      {cert.state === 'expired' && (
        <ANote tone="rose" icon={ShieldAlert}>
          <strong>Registration khatam ho chuki.</strong> {cert.text} Renew karwaye bagair ye cheez
          bechna ghair-qanooni hai.
        </ANote>
      )}
      {cert.state === 'soon' && (
        <ANote tone="amber" icon={ShieldAlert}>{cert.text}</ANote>
      )}

      <AStepper current={draft.step} validation={validation} onGo={w.goToStep} />

      <div className="grid xl:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="min-w-0">
          {draft.step === 1 && (
            <AStep1 basic={draft.basic} onChange={w.updateBasic}
              onNext={w.nextStep} validation={validation.step1}
              safety={draft.safety} onSafety={w.updateSafety}
              isEdit={isEdit} originalStock={draft.originalStock} />
          )}
          {draft.step === 2 && (
            <AStep2 basic={draft.basic} profile={draft.profile} onChange={w.updateProfile}
              onToggleCrop={w.toggleCrop} onTogglePest={w.togglePest} onToggleAnimal={w.toggleAnimal}
              onBack={w.prevStep} onNext={w.nextStep} validation={validation.step2} />
          )}
          {draft.step === 3 && (
            <AStep3 basic={draft.basic} safety={draft.safety} onChange={w.updateSafety}
              onBack={w.prevStep} onSubmit={() => save.mutate()} saving={save.isPending}
              validation={validation.step3} allValid={validation.allValid} />
          )}
        </div>

        <ASummary draft={draft} stats={w.stats} allValid={validation.allValid} />
      </div>

      {showGuide && <AGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   QADAMON KI PATTI
   ═════════════════════════════════════════════════════════════ */
const A_STEPS = [
  { id: 1, label: 'Basic', desc: 'Naam, naap, rate', icon: Package },
  { id: 2, label: 'Tafseel', desc: 'Kis fasal par, kab', icon: Leaf },
  { id: 3, label: 'Safety', desc: 'Zehreelapan, stock', icon: ShieldAlert },
];

function AStepper({ current, validation, onGo }: any) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-2 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max">
        {A_STEPS.map((s, i) => {
          const active = current === s.id;
          const past = current > s.id;
          const v = validation[`step${s.id}`];
          const bad = !v?.valid && (past || active);
          const done = v?.valid && past;
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <button type="button" onClick={() => onGo(s.id)}
                className={[
                  'flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all',
                  active ? 'bg-gradient-to-br from-emerald-500 to-lime-600 text-white shadow-md'
                    : past ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-2 border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-2 border-transparent hover:bg-slate-100',
                ].join(' ')}>
                <span className={[
                  'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                  active ? 'bg-white/25' : done ? 'bg-emerald-600 text-white'
                    : bad ? 'bg-rose-100 dark:bg-rose-500/20'
                    : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700',
                ].join(' ')}>
                  {bad ? <AlertTriangle className="h-4 w-4 text-rose-500" />
                    : done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className="text-left">
                  <span className={`block text-[9px] uppercase tracking-wider font-black ${active ? 'text-white/80' : 'text-slate-400'}`}>
                    Step {s.id} / 3
                  </span>
                  <span className="block text-sm font-black leading-tight">{s.label}</span>
                  <span className={`block text-[10px] font-bold leading-tight ${active ? 'text-white/75' : bad ? 'text-rose-500' : 'text-slate-400'}`}>
                    {bad ? (v?.errors?.[0] ?? 'Kuch reh gaya') : s.desc}
                  </span>
                </span>
              </button>
              {i < A_STEPS.length - 1 && (
                <span className={`h-0.5 w-8 rounded-full ${current > s.id ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
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
   Agri ka asal sawal ek hi hai: *kis hisaab se bechte hain?*
   Bori, kilo, litre — aur agar bori hai to us me kitna maal.
   Yehi se POS ka poora hisab chalta hai: ek bori bikne par stock
   se 50 kg ghatna chahiye, 1 nahi.
   ═════════════════════════════════════════════════════════════ */
function AStep1({ basic, onChange, onNext, validation, safety, onSafety, isEdit, originalStock }: any) {
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });
  const [scan, setScan] = useState(false);

  const base = basic.baseUnit || 'bag';
  const def = agriUnitDef(base);
  const baseName = agriUnitLabel(base, basic.customUnitName);
  const measured = isMeasured(base);
  const packed = !measured && base !== 'custom';

  const [added, setAdded] = useState<string[]>([]);
  const extras = useMemo(
    () => agriExtraUnits(base).filter((k) => added.includes(k)),
    [base, added],
  );
  const available = useMemo(
    () => agriExtraUnits(base).filter((k) => !extras.includes(k)),
    [base, extras],
  );

  const price = Number(basic.salePrice || 0);
  const cost = Number(basic.costPrice || 0);
  const margin = price > 0 && cost > 0 ? ((price - cost) / price) * 100 : null;

  return (
    <div className="space-y-4">
      {scan && (
        <BarcodeScanner
          onDetected={(c: string) => { onChange({ barcode: c.trim() }); setScan(false); toast.success('Barcode mil gaya'); }}
          onClose={() => setScan(false)} title="Barcode scan karein"
          hint="Bori ya packet ka barcode camera ke samne rakhein" />
      )}

      <ACard>
        <AHead icon={Package} title="Naam aur qism" desc="Jo naam dukaan par bolte hain" />
        <AField label="Naam" req>
          <input value={basic.name} onChange={(e) => onChange({ name: e.target.value })} autoFocus
            placeholder="Urea, Wheat Seed Galaxy-13, Confidor…" className={ainp} />
        </AField>

        <ACategoryPicker
          value={basic.categoryId} productName={basic.name}
          onChange={(cid: string, cname: string) => onChange({ categoryId: cid, categoryName: cname })} />

        <AField label="Tafseel" opt>
          <textarea rows={2} value={basic.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Galaxy-13, certified beej, 90 din me tayyar…"
            className={`${ainp} h-auto py-2 resize-none`} />
        </AField>
      </ACard>

      {/* NAAP — agri ka dil */}
      <ACard>
        <AHead icon={Scale} title="Kis hisaab se bechte hain?" desc="Stock isi naap me ginta hai — sab se ahem sawal" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {AGRI_UNITS.map((u) => {
            const on = base === u.key;
            return (
              <button key={u.key} type="button" onClick={() => onChange({ baseUnit: u.key })}
                className={[
                  'rounded-2xl border-2 p-2.5 text-center transition-all',
                  on ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-lime-50 dark:from-emerald-500/15 dark:to-lime-500/15 ring-2 ring-emerald-200 dark:ring-emerald-500/25 shadow-md'
                     : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300 hover:-translate-y-0.5',
                ].join(' ')}>
                <div className="text-2xl">{u.emoji}</div>
                <div className={`mt-1 text-[11px] font-black ${on ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                  {u.label}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{def.hint}</p>

        {base === 'custom' && (
          <AField label="Apne naap ka naam" req>
            <input value={basic.customUnitName} onChange={(e) => onChange({ customUnitName: e.target.value })}
              placeholder="Katta, tokra, drum…" className={ainp} />
          </AField>
        )}

        {packed && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <AField label={`Ek ${baseName} me kitna maal`} req>
                <input type="number" min={0} step="any" value={basic.packSize}
                  onChange={(e) => onChange({ packSize: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="50" className={ainp} />
              </AField>
              <AField label="Kis naap me">
                <select value={basic.packUnit} onChange={(e) => onChange({ packUnit: e.target.value })} className={ainp}>
                  {['kg', 'gram', 'litre', 'ml'].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </AField>
            </div>
            <ANote tone="emerald" icon={Calculator}>
              Yani <strong>1 {baseName} = {Number(basic.packSize) || 0} {basic.packUnit}</strong>.
              POS par khula maal bechein to stock se theek utna hi ghatega — pehle ye hisab
              tha hi nahi, ek bori bechne par sirf 1 ghatta tha.
            </ANote>
          </>
        )}
      </ACard>

      {/* RATE */}
      <ACard tone="green">
        <AHead icon={DollarSign} title={`Ek ${baseName} kitne ka?`} desc="Yehi rate POS par sab se pehle chalega" />
        <div className="grid sm:grid-cols-3 gap-3">
          <AField label={`Sale rate — per ${baseName}`} req>
            <input type="number" value={basic.salePrice}
              onChange={(e) => onChange({ salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" className={ainp} />
          </AField>
          <AField label={`Cost — per ${baseName}`} opt>
            <input type="number" value={basic.costPrice}
              onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" className={ainp} />
          </AField>
          <AField label="Thok rate" opt>
            <input type="number" value={basic.wholesalePrice}
              onChange={(e) => onChange({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" className={ainp} />
          </AField>
        </div>

        {margin !== null && (
          <ANote tone={margin < 0 ? 'rose' : margin < 8 ? 'amber' : 'emerald'} icon={Calculator}>
            {margin < 0
              ? <>Nuqsaan! Cost <strong>{formatPKR(cost)}</strong> hai magar rate <strong>{formatPKR(price)}</strong>.</>
              : <>Har {baseName} par <strong>{formatPKR(price - cost)}</strong> bachta hai — {margin.toFixed(0)}% margin.</>}
          </ANote>
        )}

        <div className="grid sm:grid-cols-3 gap-3">
          <AField label={isEdit ? 'Stock — abhi godown me' : 'Opening stock'} opt>
            <input type="number" value={safety.currentStock}
              onChange={(e) => onSafety({ currentStock: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" className={ainp} />
          </AField>
          <AField label="Low stock alert" opt>
            <input type="number" value={safety.minStockAlert}
              onChange={(e) => onSafety({ minStockAlert: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="5" className={ainp} />
          </AField>
          <AField label="Tax %" opt>
            <input type="number" value={basic.taxRate}
              onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" className={ainp} />
          </AField>
        </div>

        {isEdit && originalStock !== null && originalStock !== undefined ? (
          Number(safety.currentStock || 0) !== originalStock ? (
            <ANote tone="amber">
              Stock <strong>{originalStock}</strong> se badal kar{' '}
              <strong>{Number(safety.currentStock || 0)}</strong> kiya ja raha hai.
            </ANote>
          ) : (
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Godown me abhi <strong>{originalStock}</strong> hai. Haath na lagayein to waisa hi rahega.
            </p>
          )
        ) : null}
      </ACard>

      {/* AUR KAISE */}
      <ACard>
        <AHead icon={Plus} title="Aur kis tarah bech sakte hain?" desc="Marzi ki baat — bori bhi, khula bhi" />
        {extras.length > 0 && (
          <div className="space-y-2">
            {extras.map((k) => {
              const rate = agriRate(k, base, { packSize: basic.packSize, packUnit: basic.packUnit });
              const d = agriUnitDef(k);
              return (
                <div key={k} className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 flex items-center gap-2.5 flex-wrap">
                  <span className="text-xl shrink-0">{d.emoji}</span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white shrink-0">Per {d.label}</span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    1 {d.label.toLowerCase()} = <strong>{rate.toFixed(rate < 1 ? 4 : 2)}</strong> {baseName} stock se
                  </span>
                  <button type="button" onClick={() => setAdded((xs) => xs.filter((x) => x !== k))}
                    className="h-9 w-9 rounded-lg bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 hover:border-rose-400 ml-auto transition">
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
              const d = agriUnitDef(k);
              return (
                <button key={k} type="button" onClick={() => setAdded((xs) => [...xs, k])}
                  className="h-10 px-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition">
                  <Plus className="h-3.5 w-3.5 text-emerald-500" /> {d.emoji} Per {d.label}
                </button>
              );
            })}
          </div>
        )}

        <ANote tone="slate" icon={Info}>
          Misal: urea <strong>bori</strong> se bhi bikti hai aur <strong>khuli kilo</strong> se bhi.
          Dono chaal lein — stock hamesha ek hi naap me ginta rahega, aur POS khud hisab laga lega.
        </ANote>
      </ACard>

      {/* PEHCHAN */}
      <ACard>
        <AHead icon={Tag} title="Barcode aur brand" desc="Marzi ki baat" />
        <div className="grid sm:grid-cols-3 gap-3">
          <AField label="Barcode" opt>
            <div className="flex gap-2">
              <input value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })}
                placeholder="8901234567890" className={`${ainp} flex-1 min-w-0 font-mono`} />
              <button type="button" onClick={() => setScan(true)}
                className="h-11 px-3 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 transition">
                <Camera className="h-4 w-4" /> Scan
              </button>
            </div>
          </AField>
          <AField label="SKU" opt>
            <input value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })}
              placeholder="Khali chhoren to khud banega" className={ainp} />
          </AField>
          <AField label="Brand" opt>
            <select value={basic.brandId} onChange={(e) => onChange({ brandId: e.target.value })} className={ainp}>
              <option value="">Koi nahi</option>
              {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </AField>
        </div>
      </ACard>

      <ACard>
        <AHead icon={ImageIcon} title="Photos" desc="Bori ya packet ki tasveer" />
        <UploadDropzone purpose="product-image" maxFiles={8}
          onUploaded={(r) => onChange({ imageUrls: [...basic.imageUrls, ...r.map((x) => x.url)] })}
          hint="Packet ka label bhi lagayein — farmer ko dikhane me aasani" />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
            {basic.imageUrls.map((url: string, i: number) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 group">
                <img src={url} alt="" className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute top-1 left-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white">Main</span>}
                <button type="button" onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_: any, x: number) => x !== i) })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-lg bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <X className="h-3 w-3 text-rose-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </ACard>

      <ACard>
        <AHead icon={Award} title="Badges" desc="POS aur list par nazar aate hain" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {([
            ['isFeatured', 'Featured', Star, 'basic'],
            ['isActive', 'Active — bikri ke liye', Package, 'basic'],
            ['isPopular', 'Popular', TrendingUp, 'safety'],
            ['isBestSeller', 'Best Seller', Award, 'safety'],
            ['isSeasonal', 'Seasonal', Calendar, 'safety'],
          ] as const).map(([k, label, Icon, where]) => {
            const src = where === 'basic' ? basic : safety;
            const on = !!src[k];
            const set = where === 'basic' ? onChange : onSafety;
            return (
              <button key={k} type="button" onClick={() => set({ [k]: !on })}
                className={`rounded-xl border-2 p-2.5 text-left flex items-center gap-2 transition ${
                  on ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300'
                }`}>
                <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  on ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}><Icon className="h-4 w-4" /></span>
                <span className="text-[11px] font-extrabold text-slate-900 dark:text-white leading-tight">{label}</span>
              </button>
            );
          })}
        </div>

        {allTags.length > 0 && (
          <AField label="Tags" opt>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((t: any) => {
                const on = basic.tagIds.includes(t.id);
                return (
                  <button key={t.id} type="button"
                    onClick={() => onChange({ tagIds: on ? basic.tagIds.filter((x: string) => x !== t.id) : [...basic.tagIds, t.id] })}
                    className={`h-9 px-3 rounded-lg border-2 text-[11px] font-extrabold transition ${
                      on ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>{t.name}</button>
                );
              })}
            </div>
          </AField>
        )}
      </ACard>

      <AErrors errors={validation.errors} show={!validation.valid} />

      <Button className="w-full h-14 text-base font-extrabold bg-gradient-to-r from-emerald-600 to-lime-700"
        disabled={!validation.valid} onClick={onNext}>
        Aage chalein <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   QADAM 2 — KIS FASAL PAR, KAB, AUR REGISTRATION
   ─────────────────────────────────────────────────────────────
   Farmer ka pehla sawal yehi hota hai: "ye meri fasal par
   chalegi?" Aur dukaan-daar ka apna sab se bara khatra
   registration ki meyaad hai — khatam ho jaye to bechna
   ghair-qanooni hai.
   ═════════════════════════════════════════════════════════════ */
const CROPS = ['Gandum', 'Chawal', 'Kapas', 'Makai', 'Ganna', 'Aloo', 'Pyaz', 'Tamatar', 'Mirch', 'Daalein', 'Sabzi', 'Phal', 'Chara', 'Sarson'];
const PESTS = ['Sundi', 'Teela', 'Safaid makhi', 'Aphid', 'Thrips', 'Army worm', 'Fungus', 'Jarr ka keera', 'Ghaas', 'Deemak'];
const ANIMALS = ['Gaaye', 'Bhains', 'Bakri', 'Bhair', 'Murghi', 'Machhli', 'Ghora', 'Oont'];

const SEED_TYPES = ['WHEAT', 'RICE', 'COTTON', 'MAIZE', 'SUGARCANE', 'POTATO', 'ONION', 'TOMATO', 'CHILLI', 'PULSES', 'VEGETABLES', 'FRUITS', 'FODDER', 'OILSEEDS', 'OTHER'];
const FERT_TYPES = ['UREA', 'DAP', 'NPK', 'POTASH', 'ZINC', 'SULFUR', 'BORON', 'MICRONUTRIENT', 'ORGANIC', 'BIO_FERTILIZER', 'LIQUID', 'FOLIAR', 'OTHER'];
const FEED_TYPES = ['STARTER', 'GROWER', 'FINISHER', 'LAYER', 'BREEDER', 'MILK_REPLACER', 'MINERAL_MIX', 'CONCENTRATE', 'ROUGHAGE', 'SILAGE', 'HAY', 'BRAN', 'OIL_CAKE', 'MOLASSES', 'OTHER'];

const pretty = (v: string) => v.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

function AStep2({ basic, profile, onChange, onToggleCrop, onTogglePest, onToggleAnimal, onBack, onNext, validation }: any) {
  const [ownCrop, setOwnCrop] = useState('');
  /* Qism ab category ke naam se khud nikalti hai — dukaan-daar se
     dobara nahi poochi jati. */
  const kind: AgriKind = useMemo(
    () => deriveAgriKind(basic.categoryName, basic.name),
    [basic.categoryName, basic.name],
  );

  const isSeed = isSeedKind(kind);
  const isFert = isFertKind(kind);
  const isSpray = isSprayKind(kind);
  const isFeed = isFeedKind(kind);
  const isTool = isToolKind(kind);
  const wantsReg = needsGovtReg(kind);

  const cert = certStatus(profile.govtRegExpiry);

  return (
    <div className="space-y-4">
      {isTool && (
        <ANote tone="slate" icon={Info}>
          Ye auzaar ya purza hai — fasal, mausam aur registration wale sawal chhupa diye gaye
          hain. Neeche sirf wo cheezein hain jo kaam ki hain.
        </ANote>
      )}

      <ACard>
        <AHead icon={Landmark} title="Company aur pehchan" desc="Farmer aksar brand se hi maangta hai" />
        <div className="grid sm:grid-cols-3 gap-3">
          <AField label="Brand" opt>
            <input value={profile.brand} onChange={(e) => onChange({ brand: e.target.value })}
              placeholder="Syngenta, FFC, Engro…" className={ainp} />
          </AField>
          <AField label="Banane wali company" opt>
            <input value={profile.manufacturer} onChange={(e) => onChange({ manufacturer: e.target.value })}
              className={ainp} />
          </AField>
          <AField label="Kis mulk ka" opt>
            <input value={profile.countryOfOrigin} onChange={(e) => onChange({ countryOfOrigin: e.target.value })}
              placeholder="Pakistan, China…" className={ainp} />
          </AField>
        </div>

        {isSeed && (
          <AField label="Kaunsa beej" opt>
            <div className="flex flex-wrap gap-1.5">
              {SEED_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => onChange({ seedType: basic.seedType === t ? '' : t } as any)}
                  className={`h-9 px-3 rounded-lg border-2 text-[11px] font-extrabold transition ${
                    basic.seedType === t ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>{pretty(t)}</button>
              ))}
            </div>
          </AField>
        )}

        {isFert && (
          <>
            <AField label="Kaunsi khaad" opt>
              <div className="flex flex-wrap gap-1.5">
                {FERT_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => onChange({ fertilizerType: basic.fertilizerType === t ? '' : t } as any)}
                    className={`h-9 px-3 rounded-lg border-2 text-[11px] font-extrabold transition ${
                      basic.fertilizerType === t ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>{pretty(t)}</button>
                ))}
              </div>
            </AField>
            <AField label="NPK ratio" opt>
              <input value={profile.npkRatio} onChange={(e) => onChange({ npkRatio: e.target.value })}
                placeholder="46-0-0, 18-46-0…" className={`${ainp} font-mono`} />
            </AField>
          </>
        )}

        {isFeed && (
          <AField label="Kaunsa feed" opt>
            <div className="flex flex-wrap gap-1.5">
              {FEED_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => onChange({ feedType: basic.feedType === t ? '' : t } as any)}
                  className={`h-9 px-3 rounded-lg border-2 text-[11px] font-extrabold transition ${
                    basic.feedType === t ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>{pretty(t)}</button>
              ))}
            </div>
          </AField>
        )}

        {isSpray && (
          <div className="grid sm:grid-cols-2 gap-3">
            <AField label="Active ingredient" opt>
              <input value={profile.activeIngredient} onChange={(e) => onChange({ activeIngredient: e.target.value })}
                placeholder="Imidacloprid, Glyphosate…" className={ainp} />
            </AField>
            <AField label="Concentration" opt>
              <input value={profile.concentration} onChange={(e) => onChange({ concentration: e.target.value })}
                placeholder="20% SL, 48% EC…" className={`${ainp} font-mono`} />
            </AField>
          </div>
        )}
      </ACard>

      {/* REGISTRATION — sab se ahem qanooni baat */}
      {wantsReg && (
        <ACard tone="green">
          <AHead icon={ShieldCheck} title="Sarkari registration" desc="Meyaad khatam ho to bechna ghair-qanooni hai" />
          <div className="grid sm:grid-cols-2 gap-3">
            <AField label="Registration number" opt>
              <input value={profile.govtRegNumber} onChange={(e) => onChange({ govtRegNumber: e.target.value })}
                placeholder="AD-12345" className={`${ainp} font-mono`} />
            </AField>
            <AField label="Kab tak chalegi" opt>
              <input type="date" value={profile.govtRegExpiry}
                onChange={(e) => onChange({ govtRegExpiry: e.target.value })}
                className={`${ainp} [color-scheme:light] dark:[color-scheme:dark]`} />
            </AField>
          </div>

          {cert.state !== 'none' && (
            <ANote tone={cert.state === 'expired' ? 'rose' : cert.state === 'soon' ? 'amber' : 'emerald'} icon={ShieldAlert}>
              {cert.text}
              {cert.state !== 'ok' && <> Low stock wale safhe par bhi warning aayegi.</>}
            </ANote>
          )}

          <ATog icon={Leaf} label="Organic certified hai" hint="Organic farming wale maangte hain"
            on={profile.isOrganic} onChange={(v: boolean) => onChange({ isOrganic: v })} />
          {profile.isOrganic && (
            <AField label="Organic cert number" opt>
              <input value={profile.organicCertNumber} onChange={(e) => onChange({ organicCertNumber: e.target.value })}
                className={`${ainp} font-mono`} />
            </AField>
          )}
        </ACard>
      )}

      {/* KIS PAR CHALEGA */}
      {!isTool && (
        <ACard>
          <AHead icon={Leaf} title="Kis par chalega?" desc="Farmer ka pehla sawal yehi hota hai" />

          {!isFeed && (
            <AField label="Kaunsi fasal par" opt>
              <div className="flex flex-wrap gap-1.5">
                {CROPS.map((c) => {
                  const on = profile.targetCrops.includes(c);
                  return (
                    <button key={c} type="button" onClick={() => onToggleCrop(c)}
                      className={`h-9 px-3 rounded-lg border-2 text-[11px] font-extrabold transition ${
                        on ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>{c}</button>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-2">
                <input value={ownCrop} onChange={(e) => setOwnCrop(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && ownCrop.trim()) { e.preventDefault(); onToggleCrop(ownCrop.trim()); setOwnCrop(''); } }}
                  placeholder="Koi aur fasal…" className={`${ainp} flex-1`} />
                <button type="button" disabled={!ownCrop.trim()}
                  onClick={() => { onToggleCrop(ownCrop.trim()); setOwnCrop(''); }}
                  className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black shrink-0 transition">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {profile.targetCrops.filter((c: string) => !CROPS.includes(c)).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {profile.targetCrops.filter((c: string) => !CROPS.includes(c)).map((c: string) => (
                    <span key={c} className="h-9 px-3 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-[11px] font-extrabold inline-flex items-center gap-1.5">
                      {c}<button type="button" onClick={() => onToggleCrop(c)}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </AField>
          )}

          {isSpray && (
            <AField label="Kaunse keeray / ghaas par" opt>
              <div className="flex flex-wrap gap-1.5">
                {PESTS.map((p) => {
                  const on = profile.targetPests.includes(p);
                  return (
                    <button key={p} type="button" onClick={() => onTogglePest(p)}
                      className={`h-9 px-3 rounded-lg border-2 text-[11px] font-extrabold transition ${
                        on ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>{p}</button>
                  );
                })}
              </div>
            </AField>
          )}

          {isFeed && (
            <AField label="Kaunse jaanwar ke liye" opt>
              <div className="flex flex-wrap gap-1.5">
                {ANIMALS.map((a) => {
                  const on = profile.targetAnimals.includes(a);
                  return (
                    <button key={a} type="button" onClick={() => onToggleAnimal(a)}
                      className={`h-9 px-3 rounded-lg border-2 text-[11px] font-extrabold transition ${
                        on ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>{a}</button>
                  );
                })}
              </div>
            </AField>
          )}

          <AField label="Kaunsa mausam" opt>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SEASONS.map((s) => {
                const on = profile.season === s.v;
                return (
                  <button key={s.v} type="button" onClick={() => onChange({ season: on ? '' : s.v })}
                    className={`rounded-xl border-2 p-2.5 text-left transition ${
                      on ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300'
                    }`}>
                    <div className="text-lg">{s.e}</div>
                    <div className={`text-[12px] font-black ${on ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>{s.l}</div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{s.hint}</div>
                  </button>
                );
              })}
            </div>
          </AField>
        </ACard>
      )}

      {/* KAISE ISTEMAL */}
      {!isTool && (
        <ACard>
          <AHead icon={Droplets} title="Kaise istemal karna hai" desc="Farmer ko yehi batana parta hai" />
          <div className="grid sm:grid-cols-3 gap-3">
            <AField label="Kitna daalna hai" opt>
              <input value={profile.applicationRate} onChange={(e) => onChange({ applicationRate: e.target.value })}
                placeholder="2 bori / acre" className={ainp} />
            </AField>
            <AField label="Kaise daalna hai" opt>
              <input value={profile.applicationMethod} onChange={(e) => onChange({ applicationMethod: e.target.value })}
                placeholder="Spray, chhirkao, paani ke sath" className={ainp} />
            </AField>
            <AField label="Kitne din baad dobara" opt>
              <input value={profile.applicationInterval} onChange={(e) => onChange({ applicationInterval: e.target.value })}
                placeholder="15 din baad" className={ainp} />
            </AField>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <AField label="Fasal ki kaunsi halat me" opt>
              <input value={profile.cropStage} onChange={(e) => onChange({ cropStage: e.target.value })}
                placeholder="Bijai ke waqt, phool se pehle" className={ainp} />
            </AField>
            <AField label="Kitne mahine theek rehta" opt>
              <input type="number" value={profile.shelfLifeMonths}
                onChange={(e) => onChange({ shelfLifeMonths: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="24" className={ainp} />
            </AField>
            <AField label="Kaise rakhna hai" opt>
              <input value={profile.storageTemp} onChange={(e) => onChange({ storageTemp: e.target.value })}
                placeholder="Thandi khushk jagah" className={ainp} />
            </AField>
          </div>
          <AField label="Poori hidayaat" opt>
            <textarea rows={2} value={profile.usageInstructions}
              onChange={(e) => onChange({ usageInstructions: e.target.value })}
              placeholder="Subah ya shaam spray karein, dhoop me nahi…"
              className={`${ainp} h-auto py-2 resize-none`} />
          </AField>
        </ACard>
      )}

      <AErrors errors={validation.errors} show={!validation.valid} />

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1 h-14" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" /> Peeche
        </Button>
        <Button className="flex-[2] h-14 text-base font-extrabold bg-gradient-to-r from-emerald-600 to-lime-700"
          disabled={!validation.valid} onClick={onNext}>
          Aage chalein <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   QADAM 3 — SAFETY AUR THOK
   ─────────────────────────────────────────────────────────────
   Spray zehreeli cheez hai. Kitni zehreeli, kitne din tak khet
   me nahi jana, aur kya pehan kar chhirakna — ye farmer ki jaan
   ka masla hai, sirf kaghazi khana nahi.
   ═════════════════════════════════════════════════════════════ */
const TOXICITY = [
  { v: 'GREEN', l: 'Halka (green)', e: '🟢', hint: 'Aam ehtiyat kaafi hai' },
  { v: 'BLUE', l: 'Darmiyana (blue)', e: '🔵', hint: 'Dastane aur mask' },
  { v: 'YELLOW', l: 'Zehreela (yellow)', e: '🟡', hint: 'Poora PPE zaroori' },
  { v: 'RED', l: 'Bohat zehreela (red)', e: '🔴', hint: 'Tajurba-kaar hi chhirke' },
];

function AStep3({ basic, safety, onChange, onBack, onSubmit, saving, validation, allValid }: any) {
  const isSpray = isSprayKind(deriveAgriKind(basic.categoryName, basic.name));

  return (
    <div className="space-y-4">
      {isSpray ? (
        <ACard tone="red">
          <AHead icon={ShieldAlert} title="Kitni zehreeli hai?" desc="Farmer ki jaan ka masla — theek se bharein" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TOXICITY.map((t) => {
              const on = safety.toxicityLevel === t.v;
              return (
                <button key={t.v} type="button" onClick={() => onChange({ toxicityLevel: on ? '' : t.v })}
                  className={`rounded-xl border-2 p-3 text-left transition ${
                    on ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 ring-2 ring-rose-200 dark:ring-rose-500/25'
                       : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-rose-300'
                  }`}>
                  <div className="text-xl">{t.e}</div>
                  <div className={`text-[12px] font-black mt-0.5 ${on ? 'text-rose-800 dark:text-rose-300' : 'text-slate-900 dark:text-white'}`}>{t.l}</div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{t.hint}</div>
                </button>
              );
            })}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <AField label="Chhirakne ke baad kitne din khet me na jayein" opt>
              <input type="number" value={safety.reEntryPeriod}
                onChange={(e) => onChange({ reEntryPeriod: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="3" className={ainp} />
            </AField>
            <AField label="Kitne din baad fasal kaat sakte hain" opt>
              <input type="number" value={safety.ppePeriod}
                onChange={(e) => onChange({ ppePeriod: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="14" className={ainp} />
            </AField>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            <ATog icon={ShieldAlert} label="Restricted cheez hai" hint="Har kisi ko nahi bechi jati"
              on={safety.isRestricted} onChange={(v: boolean) => onChange({ isRestricted: v })} />
            <ATog icon={Landmark} label="License dekhna zaroori" hint="Bechne se pehle license check karein"
              on={safety.requiresLicense} onChange={(v: boolean) => onChange({ requiresLicense: v })} />
          </div>

          <AField label="Warning (packet par likha hua)" opt>
            <input value={safety.warningLabel} onChange={(e) => onChange({ warningLabel: e.target.value })}
              placeholder="Bachon se door rakhein" className={ainp} />
          </AField>
          <AField label="Ehtiyat — farmer ko kya batana hai" opt>
            <textarea rows={2} value={safety.precautions}
              onChange={(e) => onChange({ precautions: e.target.value })}
              placeholder="Dastane aur mask pehnein, hawa ke rukh me spray na karein…"
              className={`${ainp} h-auto py-2 resize-none`} />
          </AField>
          <AField label="Agar lag jaye to kya karein" opt>
            <textarea rows={2} value={safety.firstAid}
              onChange={(e) => onChange({ firstAid: e.target.value })}
              placeholder="Foran paani se dho lein, doctor ko packet dikhayein…"
              className={`${ainp} h-auto py-2 resize-none`} />
          </AField>
        </ACard>
      ) : (
        <ANote tone="slate" icon={Info}>
          Ye zehreeli cheez nahi hai, is liye safety wale sawal chhupa diye gaye hain. Neeche
          sirf stock aur thok ka hisab hai.
        </ANote>
      )}

      <ACard>
        <AHead icon={Package} title="Stock ka hisab" desc="Kab batana hai ke maal khatam ho raha" />
        <div className="grid sm:grid-cols-2 gap-3">
          <AField label="Itna reh jaye to mangwa lein" opt>
            <input type="number" value={safety.reorderLevel}
              onChange={(e) => onChange({ reorderLevel: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="10" className={ainp} />
          </AField>
          <AField label="Itna reh jaye to warning" opt>
            <input type="number" value={safety.minStockAlert}
              onChange={(e) => onChange({ minStockAlert: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="5" className={ainp} />
          </AField>
        </div>
      </ACard>

      <ACard tone="green">
        <AHead icon={Layers} title="Bulk par Discount" desc="Farmer 10 bori le to rate kam" />
        <div className="grid sm:grid-cols-2 gap-3">
          <AField label="Kitni tadaad par discount" opt>
            <input type="number" value={safety.bulkDiscountThreshold}
              onChange={(e) => onChange({ bulkDiscountThreshold: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="10" className={ainp} />
          </AField>
          <AField label="Kitne % discount" opt>
            <input type="number" value={safety.bulkDiscountPct}
              onChange={(e) => onChange({ bulkDiscountPct: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="5" className={ainp} />
          </AField>
        </div>
        {Number(safety.bulkDiscountThreshold) > 0 && Number(safety.bulkDiscountPct) > 0 && (
          <ANote tone="emerald" icon={Calculator}>
            <strong>{safety.bulkDiscountThreshold}</strong> ya us se zyada lene par{' '}
            <strong>{safety.bulkDiscountPct}%</strong> disccount — yani{' '}
            <strong>{formatPKR(Number(basic.salePrice || 0) * (1 - Number(safety.bulkDiscountPct) / 100))}</strong> per {agriUnitLabel(basic.baseUnit, basic.customUnitName)}.
          </ANote>
        )}
      </ACard>

      <AErrors errors={validation.errors} show={!validation.valid} />

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
   KHULASA
   ═════════════════════════════════════════════════════════════ */
function ASummary({ draft, stats, allValid }: any) {
  const b = draft.basic;
  const base = b.baseUnit || 'bag';
  const def = agriUnitDef(base);
  const baseName = agriUnitLabel(base, b.customUnitName);
  const img = b.imageUrls[0];
  const cert = certStatus(draft.profile.govtRegExpiry);
  const kind = deriveAgriKind(b.categoryName, b.name);

  return (
    <aside className="hidden xl:flex flex-col gap-3 sticky top-4 self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-700 text-white p-4 shadow-xl">
        <div className="rounded-2xl overflow-hidden bg-white/10 aspect-square flex items-center justify-center mb-3">
          {img ? <img src={img} alt="" className="h-full w-full object-cover" />
               : <span className="text-5xl">{AGRI_KIND_EMOJI[kind]}</span>}
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-white/60">
          {b.categoryName || 'Category nahi chuni'}
        </div>
        <div className="text-lg font-black leading-tight break-words">{b.name || 'Naam nahi likha'}</div>
        {allValid
          ? <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 px-2 py-1 text-[10px] font-black text-emerald-200">
              <CheckCircle2 className="h-3 w-3" /> Save ke liye tayyar
            </div>
          : <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-400/30 px-2 py-1 text-[10px] font-black text-amber-200">
              <AlertTriangle className="h-3 w-3" /> Kuch reh gaya hai
            </div>}
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <span className="font-extrabold text-sm text-slate-900 dark:text-white">Kaise bech rahe hain</span>
        </div>
        <div className="p-3 space-y-2">
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900 border-2 border-emerald-200 dark:border-emerald-800 p-3">
            <div className="text-[10px] uppercase tracking-widest font-black text-emerald-700 dark:text-emerald-300">
              {def.emoji} Per {baseName}
            </div>
            <div className="text-xl font-black text-emerald-900 dark:text-emerald-100 tabular-nums leading-tight">
              {Number(b.salePrice) > 0 ? formatPKR(Number(b.salePrice)) : '—'}
            </div>
            {Number(b.packSize) > 0 && !isMeasured(base) && base !== 'custom' && (
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                1 {baseName} = {b.packSize} {b.packUnit}
              </div>
            )}
          </div>

          {stats.margin > 0 && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Margin</div>
              <div className="text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                {stats.margin.toFixed(1)}%
              </div>
            </div>
          )}

          {stats.stockValue > 0 && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stock ki qeemat</div>
              <div className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                {formatPKR(stats.stockValue)}
              </div>
            </div>
          )}
        </div>

        {cert.state !== 'none' && (
          <div className={`px-3 py-2.5 border-t-2 ${
            cert.state === 'expired' ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
              : cert.state === 'soon' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
          }`}>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Registration</div>
            <div className={`text-[11px] font-extrabold leading-snug ${
              cert.state === 'expired' ? 'text-rose-800 dark:text-rose-200'
                : cert.state === 'soon' ? 'text-amber-800 dark:text-amber-200'
                : 'text-emerald-800 dark:text-emerald-200'
            }`}>{cert.text}</div>
          </div>
        )}

        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800 border-t-2 border-slate-100 dark:border-slate-800">
          <div className="p-3 text-center">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Fasal</div>
            <div className="text-base font-black text-slate-900 dark:text-white">{stats.targetCropCount}</div>
          </div>
          <div className="p-3 text-center">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Photos</div>
            <div className="text-base font-black text-slate-900 dark:text-white">{b.imageUrls.length}</div>
          </div>
        </div>
      </div>

      {draft.safety.isRestricted && (
        <ANote tone="rose" icon={ShieldAlert}>
          <strong>Restricted</strong> — har kisi ko nahi bechi jati. POS par warning aayegi.
        </ANote>
      )}
    </aside>
  );
}

/* ═════════════════════════════════════════════════════════════
   SANJHE HISSE — poore safhe me ek hi set
   ═════════════════════════════════════════════════════════════ */
const ainp = 'h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition';

function ACard({ tone, children }: { tone?: 'green' | 'red'; children: any }) {
  return (
    <section className={`rounded-3xl border-2 shadow-sm p-5 space-y-3.5 ${
      tone === 'green'
        ? 'bg-gradient-to-br from-emerald-50 via-white to-lime-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-lime-950/30 border-emerald-200 dark:border-emerald-800'
        : tone === 'red'
        ? 'bg-gradient-to-br from-rose-50 via-white to-orange-50 dark:from-rose-950/30 dark:via-slate-900 dark:to-orange-950/30 border-rose-200 dark:border-rose-800'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
    }`}>{children}</section>
  );
}

function AHead({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-lime-600 text-white flex items-center justify-center shadow shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">{title}</h3>
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

function AField({ label, req, opt, children }: any) {
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

function ATog({ icon: Icon, label, hint, on, onChange }: any) {
  return (
    <button type="button" onClick={() => onChange(!on)}
      className={`text-left rounded-2xl border-2 p-3 flex items-start gap-2.5 transition ${
        on ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300'
      }`}>
      <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
        on ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
      }`}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0">
        <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight">{label}</span>
        {hint && <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{hint}</span>}
      </span>
    </button>
  );
}

function ANote({ tone = 'slate', icon: Icon, children }: any) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200',
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
  };
  const I = Icon ?? Info;
  return (
    <div className={`rounded-2xl border-2 p-3 flex gap-2.5 ${tones[tone] ?? tones.slate}`}>
      <I className="h-4 w-4 shrink-0 mt-0.5" />
      <p className="text-[12px] font-bold leading-snug min-w-0">{children}</p>
    </div>
  );
}

function AErrors({ errors, show }: any) {
  if (!show || !errors?.length) return null;
  return (
    <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <AlertTriangle className="h-4 w-4 text-rose-600" />
        <span className="text-sm font-extrabold text-rose-900 dark:text-rose-200">Ye reh gaya hai</span>
      </div>
      <ul className="space-y-0.5">
        {errors.map((e: string, i: number) => (
          <li key={i} className="text-[12px] font-bold text-rose-800 dark:text-rose-300">• {e}</li>
        ))}
      </ul>
    </div>
  );
}

function AGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-lime-50 dark:from-emerald-500/15 dark:to-lime-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Cheez kaise daalein
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <AGTip icon={Scale} title="Naap — sab se ahem">
            Agri ka saara kaam <strong>bori</strong> par chalta hai. Bori chunein to poochha jata
            hai ke us me kitna maal hai (jaise 50 kg). Isi se POS ka hisab chalta hai: ek bori
            bikne par stock se <strong>50 kg</strong> ghatta hai, 1 nahi. Pehle ye hisab tha hi nahi.
          </AGTip>
          <AGTip icon={ShieldCheck} title="Sarkari registration">
            Meyaad khatam ho jaye to cheez bechna <strong>ghair-qanooni</strong> hai. Tareekh bhar
            dein — 60 din pehle se warning aani shuru ho jayegi, safhe par bhi aur low stock par bhi.
          </AGTip>
          <AGTip icon={Leaf} title="Kis fasal par chalega">
            Farmer ka pehla sawal yehi hota hai. Fasal, keeray aur mausam bhar dein — POS par
            farmer ko foran bata sakenge.
          </AGTip>
          <AGTip icon={ShieldAlert} title="Zehreelapan">
            Spray ke liye zaroori hai: kitni zehreeli, chhirakne ke baad kitne din khet me na
            jayein, aur fasal kab kaat sakte hain. Ye farmer ki jaan ka masla hai.
          </AGTip>
          <AGTip icon={Layers} title="Thok par discount">
            Farmer 10 bori le to rate kam. Yahan bhar dein, POS khud laga dega.
          </AGTip>
          <AGTip icon={Sprout} title="Auzaar aur purze">
            Belcha, pipe ya nozzle daal rahe hain? Qism me "Auzaar" chunein — fasal, mausam aur
            zehreelapan ke sawal khud chhup jayenge.
          </AGTip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
              Adhoora chhor dein to kuch nahi jata — draft khud save ho jata hai.
            </p>
          </div>
          <Button className="w-full" onClick={onClose}>Samajh gaya</Button>
        </div>
      </div>
    </div>
  );
}

function AGTip({ icon: Icon, title, children }: any) {
  return (
    <div className="flex gap-2.5">
      <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CATEGORY — ek hi, aur wo dukaan-daar ki apni
   ─────────────────────────────────────────────────────────────
   Pehle yahan 19 emoji button ka pakka grid tha aur us ke ilawa
   global category bhi. Dukaan-daar ko do dafa ek hi baat batani
   parti thi. Ab sirf uski apni category — system wali qism naam
   se khud nikal aati hai (`deriveAgriKind`), aur us ka natija
   ooper "System samjha" me dikha diya jata hai taake bharosa
   rahe.
   ═════════════════════════════════════════════════════════════ */
function ACategoryPicker({ value, onChange, productName }: {
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
    return AGRI_CATEGORY_SUGGESTIONS.filter((s) => !have.has(s.name.toLowerCase()));
  }, [categories]);
  const exact = categories.some((c) => c.name.trim().toLowerCase() === needle);
  const kind = deriveAgriKind(selected?.name, productName);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          Category <span className="text-rose-500">*</span>
        </label>
        {selected && (
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-500" />
            System samjha:{' '}
            <strong className="text-emerald-600 dark:text-emerald-400">
              {AGRI_KIND_EMOJI[kind]} {prettyAgriKind(kind)}
            </strong>
          </span>
        )}
      </div>

      {selected ? (
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 p-3">
          <span className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white font-black"
            style={{ background: selected.color || '#10b981' }}>
            {selected.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{selected.name}</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {selected._count?.products ?? 0} cheezein is me
            </div>
          </div>
          <button type="button" onClick={() => onChange('', '')}
            className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 hover:border-rose-400 transition">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-3 text-center">
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
          placeholder="Category dhoondein ya naya naam likhein…" className={`${ainp} pl-9`} />
      </div>

      {needle && !exact && (
        <button type="button" disabled={create.isPending} onClick={() => create.mutate(q.trim())}
          className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          "{q.trim()}" naam se nayi category banayein
        </button>
      )}

      {isLoading ? (
        <div className="py-4 text-center"><Loader2 className="h-5 w-5 animate-spin text-emerald-500 mx-auto" /></div>
      ) : filtered.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {filtered.map((c) => {
            const on = c.id === value;
            return (
              <button key={c.id} type="button" onClick={() => onChange(c.id, c.name)}
                className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                  on ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-400'
                }`}>
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: c.color || '#94a3b8' }} />
                {c.name}{on && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      ) : null}

      {openSuggestions.length > 0 && (
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Ready categories — click karein to ban jayegi
          </div>
          <div className="flex flex-wrap gap-1.5">
            {openSuggestions.map((sg) => (
              <button key={sg.name} type="button" disabled={create.isPending}
                onClick={() => {
                  const ex = categories.find((c) => c.name.trim().toLowerCase() === sg.name.toLowerCase());
                  if (ex) return onChange(ex.id, ex.name);
                  create.mutate(sg.name);
                }}
                className="h-9 px-2.5 rounded-lg bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 disabled:opacity-50 transition">
                <span>{sg.emoji}</span> {sg.name}
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
