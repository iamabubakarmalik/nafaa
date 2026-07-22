import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ServiceCategory } from '../api/services.api';

const DRAFT_KEY = 'nafaa.salon-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export interface SalonWizardBasic {
  name: string;
  code: string;
  category: ServiceCategory;
  description: string;
  price: number | '';
  discountPrice: number | '';
  costPrice: number | '';
  durationMinutes: number | '';
  bufferBefore: number | '';
  bufferAfter: number | '';
  forMen: boolean;
  forWomen: boolean;
  forKids: boolean;
  commissionPct: number | '';
  commissionFixed: number | '';
  imageUrl: string;
  isPopular: boolean;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number | '';
}

export interface SalonWizardDraft {
  step: WizardStep;
  basic: SalonWizardBasic;
  savedAt: number;
}

const emptyBasic = (): SalonWizardBasic => ({
  name: '', code: '', category: 'HAIR_CUT', description: '',
  price: '', discountPrice: '', costPrice: '',
  durationMinutes: 30, bufferBefore: 0, bufferAfter: 0,
  forMen: true, forWomen: true, forKids: false,
  commissionPct: 0, commissionFixed: 0,
  imageUrl: '',
  isPopular: false, isFeatured: false, isActive: true,
  displayOrder: 0,
});

const emptyDraft = (): SalonWizardDraft => ({
  step: 1,
  basic: emptyBasic(),
  savedAt: Date.now(),
});

interface UseSalonWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useSalonWizard(opts: UseSalonWizardOpts = {}) {
  const [draft, setDraft] = useState<SalonWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SalonWizardDraft;
        if (parsed && parsed.basic) {
          setDraft({
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
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

  const goToStep = useCallback((step: WizardStep) => {
    setDraft((d) => ({ ...d, step }));
  }, []);
  const nextStep = useCallback(() => {
    setDraft((d) => ({ ...d, step: (d.step < 3 ? d.step + 1 : 3) as WizardStep }));
  }, []);
  const prevStep = useCallback(() => {
    setDraft((d) => ({ ...d, step: (d.step > 1 ? d.step - 1 : 1) as WizardStep }));
  }, []);

  const updateBasic = useCallback((patch: Partial<SalonWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const reset = useCallback(() => {
    setDraft(emptyDraft());
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setDraftRestored(false);
  }, []);

  const validation = useMemo(() => {
    const step1Errors: string[] = [];
    if (!draft.basic.name.trim()) step1Errors.push('Service name required');
    if (!draft.basic.price || Number(draft.basic.price) <= 0) {
      step1Errors.push('Price required');
    }
    if (!draft.basic.durationMinutes || Number(draft.basic.durationMinutes) <= 0) {
      step1Errors.push('Duration required');
    }

    const step2Errors: string[] = [];
    if (!draft.basic.forMen && !draft.basic.forWomen && !draft.basic.forKids) {
      step2Errors.push('Select at least one target audience (Men/Women/Kids)');
    }

    const step3Errors: string[] = [];

    return {
      step1: { valid: step1Errors.length === 0, errors: step1Errors },
      step2: { valid: step2Errors.length === 0, errors: step2Errors },
      step3: { valid: step3Errors.length === 0, errors: step3Errors },
      allValid: step1Errors.length === 0 && step2Errors.length === 0 && step3Errors.length === 0,
    };
  }, [draft]);

  const stats = useMemo(() => {
    const price = Number(draft.basic.price || 0);
    const cost = Number(draft.basic.costPrice || 0);
    const discount = Number(draft.basic.discountPrice || 0);
    const effectivePrice = discount > 0 && discount < price ? discount : price;
    const profit = effectivePrice - cost;
    const margin = effectivePrice > 0 ? (profit / effectivePrice) * 100 : 0;
    const hasDiscount = discount > 0 && discount < price;
    const discountPct = hasDiscount ? ((price - discount) / price) * 100 : 0;
    const commission = (effectivePrice * Number(draft.basic.commissionPct || 0) / 100) + Number(draft.basic.commissionFixed || 0);
    const targetCount = [draft.basic.forMen, draft.basic.forWomen, draft.basic.forKids].filter(Boolean).length;
    const totalDuration = Number(draft.basic.durationMinutes || 0) + Number(draft.basic.bufferBefore || 0) + Number(draft.basic.bufferAfter || 0);

    return {
      price, cost, profit, margin, effectivePrice,
      hasDiscount, discountPct, commission, targetCount, totalDuration,
    };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic,
    reset,
  };
}
