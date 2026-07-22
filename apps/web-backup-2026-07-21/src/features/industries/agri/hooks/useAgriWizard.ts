import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.agri-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export type AgriCategory =
  | 'SEEDS' | 'FERTILIZER' | 'PESTICIDE' | 'HERBICIDE' | 'FUNGICIDE'
  | 'INSECTICIDE' | 'ANIMAL_FEED' | 'POULTRY_FEED' | 'CATTLE_FEED' | 'FISH_FEED'
  | 'VETERINARY_MEDICINE' | 'FARM_TOOLS' | 'IRRIGATION' | 'MACHINERY_PART'
  | 'MULCH_COVER' | 'GROWTH_HORMONE' | 'SOIL_CONDITIONER' | 'PLANT_NUTRIENT'
  | 'ORGANIC_INPUT' | 'OTHER';

export type SeedType =
  | 'WHEAT' | 'RICE' | 'COTTON' | 'MAIZE' | 'SUGARCANE' | 'POTATO'
  | 'ONION' | 'TOMATO' | 'CHILLI' | 'PULSES' | 'VEGETABLES' | 'FRUITS'
  | 'FODDER' | 'OILSEEDS' | 'OTHER';

export type FertilizerType =
  | 'UREA' | 'DAP' | 'NPK' | 'POTASH' | 'ZINC' | 'SULFUR'
  | 'BORON' | 'MICRONUTRIENT' | 'ORGANIC' | 'BIO_FERTILIZER' | 'LIQUID' | 'FOLIAR' | 'OTHER';

export type FeedType =
  | 'STARTER' | 'GROWER' | 'FINISHER' | 'LAYER' | 'BREEDER'
  | 'MILK_REPLACER' | 'MINERAL_MIX' | 'CONCENTRATE' | 'ROUGHAGE' | 'SILAGE'
  | 'HAY' | 'BRAN' | 'OIL_CAKE' | 'MOLASSES' | 'OTHER';

export type SeasonType = 'KHARIF' | 'RABI' | 'ZAID' | 'ALL_SEASON' | 'SPRING' | 'SUMMER' | 'MONSOON' | 'WINTER';

export interface AgriWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  sku: string;
  barcode: string;
  baseUnit: string;
  costPrice: number | '';
  salePrice: number | '';
  wholesalePrice: number | '';
  taxRate: number | '';
  isFeatured: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
  // Agri category
  agriCategory: AgriCategory;
  subCategory: string;
  seedType: SeedType | '';
  fertilizerType: FertilizerType | '';
  feedType: FeedType | '';
}

export interface AgriWizardProfile {
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

export interface AgriWizardSafety {
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

export interface AgriWizardDraft {
  step: WizardStep;
  basic: AgriWizardBasic;
  profile: AgriWizardProfile;
  safety: AgriWizardSafety;
  savedAt: number;
}

const emptyBasic = (): AgriWizardBasic => ({
  name: '', description: '', categoryId: '', brandId: '',
  sku: '', barcode: '', baseUnit: 'bag',
  costPrice: '', salePrice: '', wholesalePrice: '', taxRate: '',
  isFeatured: false, isActive: true,
  imageUrls: [], tagIds: [],
  agriCategory: 'SEEDS', subCategory: '',
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
  basic: emptyBasic(),
  profile: emptyProfile(),
  safety: emptySafety(),
  savedAt: Date.now(),
});

interface UseAgriWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useAgriWizard(opts: UseAgriWizardOpts = {}) {
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
    if (!draft.basic.agriCategory) step1Errors.push('Agri category required');

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

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateProfile, updateSafety,
    toggleCrop, togglePest, toggleAnimal, toggleSuitableFor,
    reset,
  };
}
