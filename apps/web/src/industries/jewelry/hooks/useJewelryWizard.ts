import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  JewelryCategory, JewelryStyle, GemstoneType, Gemstone,
} from '../api/products.api';
import type { MetalType, Purity } from '../api/metal-rates.api';

const DRAFT_KEY = 'nafaa.jewelry-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export interface JewelryWizardBasic {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  sku: string;
  barcode: string;
  isFeatured: boolean;
  isActive: boolean;
  imageUrls: string[];
  tagIds: string[];
  // Jewelry-specific identity
  itemCode: string;
  designNumber: string;
  category: JewelryCategory;
  subCategory: string;
  style: JewelryStyle;
  metalType: MetalType;
  purity: Purity;
  purityHallmark: string;
  // Weights
  grossWeight: number | '';
  netWeight: number | '';
  stoneWeight: number | '';
  waxWeight: number | '';
  otherWeight: number | '';
  // Dimensions
  size: string;
  length: number | '';
  width: number | '';
  thickness: number | '';
  // Origin
  designerName: string;
  karigarName: string;
  workshopName: string;
  countryOfOrigin: string;
}

export interface JewelryWizardCharges {
  makingChargePerGram: number | '';
  makingChargeFixed: number | '';
  makingChargePct: number | '';
  wastagePct: number | '';
  wastageGrams: number | '';
  designerCharge: number | '';
  polishCharge: number | '';
  hallmarkCharge: number | '';
  otherCharges: number | '';
  // Stones
  hasStones: boolean;
  hasDiamond: boolean;
  hasGemstone: boolean;
  hasPearl: boolean;
  stoneCount: number | '';
  stoneCaret: number | '';
  stoneQuality: string;
  stoneColor: string;
  stoneClarity: string;
  stoneCut: string;
  gemstones: (Gemstone & { tempId: string })[];
  // Hallmark
  hallmarkNumber: string;
  hallmarkAuthority: string;
  hallmarkDate: string;
  bisNumber: string;
  jewellerCode: string;
  hallmarkPhotoUrl: string;
}

export interface JewelryWizardCertify {
  isCustomOrder: boolean;
  isBespoke: boolean;
  isAntique: boolean;
  isCertified: boolean;
  certificateNumber: string;
  certificateAuthority: string;
  certificatePhotoUrl: string;
  // Buyback & Insurance
  isBuyBackEligible: boolean;
  buyBackPct: number | '';
  isReturnable: boolean;
  returnDays: number | '';
  currentValue: number | '';
  insuredValue: number | '';
  // Collection tags
  isPopular: boolean;
  isBestSeller: boolean;
  isBridalCollection: boolean;
  isFestivalSpecial: boolean;
  // Additional
  descriptionLong: string;
  careInstructions: string;
  videoUrl: string;
  // Base pricing (estimated)
  estimatedPrice: number | '';
  costPrice: number | '';
}

export interface JewelryWizardDraft {
  step: WizardStep;
  basic: JewelryWizardBasic;
  charges: JewelryWizardCharges;
  certify: JewelryWizardCertify;
  savedAt: number;
}

const emptyBasic = (): JewelryWizardBasic => ({
  name: '', description: '', categoryId: '', brandId: '',
  sku: '', barcode: '',
  isFeatured: false, isActive: true,
  imageUrls: [], tagIds: [],
  itemCode: '', designNumber: '',
  category: 'RING', subCategory: '', style: 'MODERN',
  metalType: 'GOLD', purity: 'KARAT_22', purityHallmark: '',
  grossWeight: '', netWeight: '', stoneWeight: '', waxWeight: '', otherWeight: '',
  size: '', length: '', width: '', thickness: '',
  designerName: '', karigarName: '', workshopName: '', countryOfOrigin: '',
});

const emptyCharges = (): JewelryWizardCharges => ({
  makingChargePerGram: '', makingChargeFixed: '', makingChargePct: '',
  wastagePct: '', wastageGrams: '',
  designerCharge: '', polishCharge: '', hallmarkCharge: '', otherCharges: '',
  hasStones: false, hasDiamond: false, hasGemstone: false, hasPearl: false,
  stoneCount: '', stoneCaret: '',
  stoneQuality: '', stoneColor: '', stoneClarity: '', stoneCut: '',
  gemstones: [],
  hallmarkNumber: '', hallmarkAuthority: '', hallmarkDate: '',
  bisNumber: '', jewellerCode: '', hallmarkPhotoUrl: '',
});

const emptyCertify = (): JewelryWizardCertify => ({
  isCustomOrder: false, isBespoke: false, isAntique: false,
  isCertified: false, certificateNumber: '', certificateAuthority: '', certificatePhotoUrl: '',
  isBuyBackEligible: true, buyBackPct: 85, isReturnable: true, returnDays: 7,
  currentValue: '', insuredValue: '',
  isPopular: false, isBestSeller: false, isBridalCollection: false, isFestivalSpecial: false,
  descriptionLong: '', careInstructions: '', videoUrl: '',
  estimatedPrice: '', costPrice: '',
});

const emptyDraft = (): JewelryWizardDraft => ({
  step: 1,
  basic: emptyBasic(),
  charges: emptyCharges(),
  certify: emptyCertify(),
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface UseJewelryWizardOpts {
  autoLoadDraft?: boolean;
}

export function useJewelryWizard(opts: UseJewelryWizardOpts = {}) {
  const [draft, setDraft] = useState<JewelryWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as JewelryWizardDraft;
        if (parsed && parsed.basic) {
          const safe: JewelryWizardDraft = {
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            charges: { ...emptyCharges(), ...parsed.charges, gemstones: parsed.charges?.gemstones ?? [] },
            certify: { ...emptyCertify(), ...parsed.certify },
          };
          setDraft(safe);
          setDraftRestored(true);
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

  const updateBasic = useCallback((patch: Partial<JewelryWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const updateCharges = useCallback((patch: Partial<JewelryWizardCharges>) => {
    setDraft((d) => ({ ...d, charges: { ...d.charges, ...patch } }));
  }, []);

  const updateCertify = useCallback((patch: Partial<JewelryWizardCertify>) => {
    setDraft((d) => ({ ...d, certify: { ...d.certify, ...patch } }));
  }, []);

  const addGemstone = useCallback((g: Omit<Gemstone, 'id'>) => {
    setDraft((d) => ({
      ...d,
      charges: {
        ...d.charges,
        gemstones: [...d.charges.gemstones, { ...g, tempId: genId() } as any],
      },
    }));
  }, []);

  const updateGemstone = useCallback((tempId: string, patch: Partial<Gemstone>) => {
    setDraft((d) => ({
      ...d,
      charges: {
        ...d.charges,
        gemstones: d.charges.gemstones.map((g) => (g.tempId === tempId ? { ...g, ...patch } : g)),
      },
    }));
  }, []);

  const removeGemstone = useCallback((tempId: string) => {
    setDraft((d) => ({
      ...d,
      charges: {
        ...d.charges,
        gemstones: d.charges.gemstones.filter((g) => g.tempId !== tempId),
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
    if (!draft.basic.name.trim()) step1Errors.push('Item name required');
    if (!draft.basic.category) step1Errors.push('Category required');
    if (!draft.basic.metalType) step1Errors.push('Metal type required');
    if (!draft.basic.purity) step1Errors.push('Purity required');
    if (!draft.basic.grossWeight || Number(draft.basic.grossWeight) <= 0) {
      step1Errors.push('Gross weight required');
    }
    if (!draft.basic.netWeight || Number(draft.basic.netWeight) <= 0) {
      step1Errors.push('Net weight required');
    }
    if (Number(draft.basic.netWeight) > Number(draft.basic.grossWeight)) {
      step1Errors.push('Net weight cannot exceed gross weight');
    }

    const step2Errors: string[] = [];
    if (draft.charges.hasStones && draft.charges.gemstones.length > 0) {
      draft.charges.gemstones.forEach((g, i) => {
        if (!g.type) step2Errors.push(`Gemstone #${i + 1}: type required`);
        if (g.count <= 0) step2Errors.push(`Gemstone #${i + 1}: count must be > 0`);
        if (g.caret <= 0) step2Errors.push(`Gemstone #${i + 1}: carat required`);
      });
    }

    const step3Errors: string[] = [];
    if (draft.certify.isCertified && !draft.certify.certificateNumber.trim()) {
      step3Errors.push('Certificate number required when certified');
    }

    return {
      step1: { valid: step1Errors.length === 0, errors: step1Errors },
      step2: { valid: step2Errors.length === 0, errors: step2Errors },
      step3: { valid: step3Errors.length === 0, errors: step3Errors },
      allValid: step1Errors.length === 0 && step2Errors.length === 0 && step3Errors.length === 0,
    };
  }, [draft]);

  const stats = useMemo(() => {
    const gross = Number(draft.basic.grossWeight || 0);
    const net = Number(draft.basic.netWeight || 0);
    const stone = Number(draft.basic.stoneWeight || 0);
    const wax = Number(draft.basic.waxWeight || 0);

    const makingPct = Number(draft.charges.makingChargePct || 0);
    const makingPerGram = Number(draft.charges.makingChargePerGram || 0);
    const makingFixed = Number(draft.charges.makingChargeFixed || 0);
    const wastagePct = Number(draft.charges.wastagePct || 0);

    const gemstoneValue = draft.charges.gemstones.reduce(
      (a, g) => a + Number(g.totalValue || 0), 0,
    );
    const gemstoneCaret = draft.charges.gemstones.reduce(
      (a, g) => a + Number(g.caret || 0) * Number(g.count || 0), 0,
    );

    const estimatedPrice = Number(draft.certify.estimatedPrice || 0);
    const costPrice = Number(draft.certify.costPrice || 0);
    const profit = estimatedPrice - costPrice;
    const margin = estimatedPrice > 0 ? (profit / estimatedPrice) * 100 : 0;

    return {
      grossWeight: gross,
      netWeight: net,
      stoneWeight: stone,
      waxWeight: wax,
      makingPct, makingPerGram, makingFixed, wastagePct,
      gemstoneCount: draft.charges.gemstones.length,
      gemstoneValue,
      gemstoneCaret,
      estimatedPrice, costPrice, profit, margin,
      hasHallmark: !!draft.charges.hallmarkNumber.trim(),
      hasCertificate: draft.certify.isCertified && !!draft.certify.certificateNumber.trim(),
    };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateCharges, updateCertify,
    addGemstone, updateGemstone, removeGemstone,
    reset,
  };
}
