import { useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = 'nafaa.services-biz-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export interface ServicesBizBasic {
  name: string;
  code: string;
  description: string;
  category: string;
  businessType: string;
  imageUrl: string;
  imageUrls: string[];
  isActive: boolean;
  isPopular: boolean;
  isFeatured: boolean;
  isEmergency: boolean;
  isRemoteAvailable: boolean;
}

export interface ServicesBizPricing {
  chargeType: string;
  baseCharge: number | '';
  hourlyRate: number | '';
  visitCharge: number | '';
  minCharge: number | '';
  maxCharge: number | '';
  emergencyCharge: number | '';
  weekendCharge: number | '';
  nightCharge: number | '';
  outOfCityCharge: number | '';
  requiresQuote: boolean;
  requiresAdvance: boolean;
  advancePct: number | '';
}

export interface ServicesBizWarranty {
  estimatedDurationMin: number | '';
  requiredSkillLevel: string;
  requiredTools: string[];
  requiredParts: string[];
  requiresLicense: boolean;
  licenseType: string;
  warrantyDays: number | '';
  warrantyType: string;
  warrantyTerms: string;
}

export interface ServicesBizDraft {
  step: WizardStep;
  basic: ServicesBizBasic;
  pricing: ServicesBizPricing;
  warranty: ServicesBizWarranty;
  savedAt: number;
}

const emptyBasic = (): ServicesBizBasic => ({
  name: '', code: '', description: '',
  category: 'REPAIR', businessType: '',
  imageUrl: '', imageUrls: [],
  isActive: true, isPopular: false, isFeatured: false,
  isEmergency: false, isRemoteAvailable: false,
});

const emptyPricing = (): ServicesBizPricing => ({
  chargeType: 'FIXED',
  baseCharge: '', hourlyRate: '', visitCharge: '',
  minCharge: '', maxCharge: '',
  emergencyCharge: '', weekendCharge: '', nightCharge: '', outOfCityCharge: '',
  requiresQuote: false, requiresAdvance: false, advancePct: '',
});

const emptyWarranty = (): ServicesBizWarranty => ({
  estimatedDurationMin: 60,
  requiredSkillLevel: 'JUNIOR',
  requiredTools: [], requiredParts: [],
  requiresLicense: false, licenseType: '',
  warrantyDays: 30,
  warrantyType: 'SERVICE_PROVIDER',
  warrantyTerms: '',
});

const emptyDraft = (): ServicesBizDraft => ({
  step: 1,
  basic: emptyBasic(),
  pricing: emptyPricing(),
  warranty: emptyWarranty(),
  savedAt: Date.now(),
});

interface UseServicesBizWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useServicesBizWizard(opts: UseServicesBizWizardOpts = {}) {
  const [draft, setDraft] = useState<ServicesBizDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ServicesBizDraft;
        if (parsed && parsed.basic) {
          setDraft(parsed);
          setDraftRestored(true);
          opts.onDraftLoaded?.();
        }
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const updateBasic = useCallback((patch: Partial<ServicesBizBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const updatePricing = useCallback((patch: Partial<ServicesBizPricing>) => {
    setDraft((d) => ({ ...d, pricing: { ...d.pricing, ...patch } }));
  }, []);

  const updateWarranty = useCallback((patch: Partial<ServicesBizWarranty>) => {
    setDraft((d) => ({ ...d, warranty: { ...d.warranty, ...patch } }));
  }, []);

  const toggleTool = useCallback((tool: string) => {
    setDraft((d) => {
      const has = d.warranty.requiredTools.includes(tool);
      return {
        ...d,
        warranty: {
          ...d.warranty,
          requiredTools: has
            ? d.warranty.requiredTools.filter((x) => x !== tool)
            : [...d.warranty.requiredTools, tool],
        },
      };
    });
  }, []);

  const togglePart = useCallback((part: string) => {
    setDraft((d) => {
      const has = d.warranty.requiredParts.includes(part);
      return {
        ...d,
        warranty: {
          ...d.warranty,
          requiredParts: has
            ? d.warranty.requiredParts.filter((x) => x !== part)
            : [...d.warranty.requiredParts, part],
        },
      };
    });
  }, []);

  const reset = useCallback(() => {
    setDraft(emptyDraft());
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setDraftRestored(false);
  }, []);

  const hydrateFromService = useCallback((service: any) => {
    if (!service) return;
    setDraft((d) => ({
      ...d,
      basic: {
        ...d.basic,
        name: service.name ?? '',
        code: service.code ?? '',
        description: service.description ?? '',
        category: service.category ?? 'REPAIR',
        businessType: service.businessType ?? '',
        imageUrl: service.imageUrl ?? '',
        imageUrls: service.imageUrls ?? [],
        isActive: service.isActive ?? true,
        isPopular: service.isPopular ?? false,
        isFeatured: service.isFeatured ?? false,
        isEmergency: service.isEmergency ?? false,
        isRemoteAvailable: service.isRemoteAvailable ?? false,
      },
      pricing: {
        ...d.pricing,
        chargeType: service.chargeType ?? 'FIXED',
        baseCharge: service.baseCharge ?? '',
        hourlyRate: service.hourlyRate ?? '',
        visitCharge: service.visitCharge ?? '',
        minCharge: service.minCharge ?? '',
        maxCharge: service.maxCharge ?? '',
        emergencyCharge: service.emergencyCharge ?? '',
        weekendCharge: service.weekendCharge ?? '',
        nightCharge: service.nightCharge ?? '',
        outOfCityCharge: service.outOfCityCharge ?? '',
        requiresQuote: service.requiresQuote ?? false,
        requiresAdvance: service.requiresAdvance ?? false,
        advancePct: service.advancePct ?? '',
      },
      warranty: {
        ...d.warranty,
        estimatedDurationMin: service.estimatedDurationMin ?? 60,
        requiredSkillLevel: service.requiredSkillLevel ?? 'JUNIOR',
        requiredTools: service.requiredTools ?? [],
        requiredParts: service.requiredParts ?? [],
        requiresLicense: service.requiresLicense ?? false,
        licenseType: service.licenseType ?? '',
        warrantyDays: service.warrantyDays ?? 30,
        warrantyType: service.warrantyType ?? 'SERVICE_PROVIDER',
        warrantyTerms: service.warrantyTerms ?? '',
      },
    }));
  }, []);

  const validation = useMemo(() => {
    const step1Errors: string[] = [];
    if (!draft.basic.name.trim()) step1Errors.push('Service name required');
    if (!draft.basic.category) step1Errors.push('Category required');

    const step2Errors: string[] = [];
    const hasAnyCharge =
      Number(draft.pricing.baseCharge || 0) > 0 ||
      Number(draft.pricing.hourlyRate || 0) > 0 ||
      Number(draft.pricing.visitCharge || 0) > 0;
    if (!hasAnyCharge && !draft.pricing.requiresQuote) {
      step2Errors.push('At least one charge required (or mark as quote-based)');
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
    const chargeCount = [
      draft.pricing.baseCharge, draft.pricing.hourlyRate, draft.pricing.visitCharge,
    ].filter((p) => Number(p || 0) > 0).length;

    const surchargeCount = [
      draft.pricing.emergencyCharge, draft.pricing.weekendCharge,
      draft.pricing.nightCharge, draft.pricing.outOfCityCharge,
    ].filter((p) => Number(p || 0) > 0).length;

    return {
      chargeCount,
      surchargeCount,
      imageCount: draft.basic.imageUrls.length + (draft.basic.imageUrl ? 1 : 0),
      toolsCount: draft.warranty.requiredTools.length,
      partsCount: draft.warranty.requiredParts.length,
    };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updatePricing, updateWarranty,
    toggleTool, togglePart,
    reset, hydrateFromService,
  };
}
