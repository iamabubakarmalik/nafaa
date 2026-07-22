import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ServiceCategory } from '../api/services.api';

const DRAFT_KEY = 'nafaa.clinic-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export interface ClinicWizardBasic {
  name: string;
  descriptionLong: string;
  categoryId: string;
  brandId: string;
  serviceCategory: ServiceCategory;
  subcategory: string;
  serviceCode: string;
  sku: string;
  barcode: string;
  unit: string;
  basePrice: number | '';
  followUpPrice: number | '';
  emergencyPrice: number | '';
  telemedicinePrice: number | '';
  homeVisitPrice: number | '';
  discountedPrice: number | '';
  taxRate: number | '';
  durationMin: number | '';
  imageUrls: string[];
  isActive: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  isDiscounted: boolean;
  tagIds: string[];
}

export interface ClinicWizardRequirements {
  requiresDoctor: boolean;
  requiresAppointment: boolean;
  requiresFasting: boolean;
  requiresPrepInstructions: string;
  prepInstructions: string;
  postCareInstructions: string;
  contraindications: string;
  sideEffects: string;
  packageIncludes: string[];
}

export interface ClinicWizardSafety {
  ageRestrictionMin: number | '';
  ageRestrictionMax: number | '';
  pregnancySafe: boolean;
  lactationSafe: boolean;
  requiresConsent: boolean;
  requiresGuardian: boolean;
  followUpRequired: boolean;
  followUpDays: number | '';
  warningNotes: string;
}

export interface ClinicWizardDraft {
  step: WizardStep;
  basic: ClinicWizardBasic;
  requirements: ClinicWizardRequirements;
  safety: ClinicWizardSafety;
  savedAt: number;
}

const emptyBasic = (): ClinicWizardBasic => ({
  name: '',
  descriptionLong: '',
  categoryId: '',
  brandId: '',
  serviceCategory: 'CONSULTATION',
  subcategory: '',
  serviceCode: '',
  sku: '',
  barcode: '',
  unit: 'service',
  basePrice: '',
  followUpPrice: '',
  emergencyPrice: '',
  telemedicinePrice: '',
  homeVisitPrice: '',
  discountedPrice: '',
  taxRate: '',
  durationMin: 15,
  imageUrls: [],
  isActive: true,
  isFeatured: false,
  isPopular: false,
  isDiscounted: false,
  tagIds: [],
});

const emptyRequirements = (): ClinicWizardRequirements => ({
  requiresDoctor: true,
  requiresAppointment: true,
  requiresFasting: false,
  requiresPrepInstructions: '',
  prepInstructions: '',
  postCareInstructions: '',
  contraindications: '',
  sideEffects: '',
  packageIncludes: [],
});

const emptySafety = (): ClinicWizardSafety => ({
  ageRestrictionMin: '',
  ageRestrictionMax: '',
  pregnancySafe: true,
  lactationSafe: true,
  requiresConsent: false,
  requiresGuardian: false,
  followUpRequired: false,
  followUpDays: '',
  warningNotes: '',
});

const emptyDraft = (): ClinicWizardDraft => ({
  step: 1,
  basic: emptyBasic(),
  requirements: emptyRequirements(),
  safety: emptySafety(),
  savedAt: Date.now(),
});

interface UseClinicWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useClinicWizard(opts: UseClinicWizardOpts = {}) {
  const [draft, setDraft] = useState<ClinicWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ClinicWizardDraft;
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

  const updateBasic = useCallback((patch: Partial<ClinicWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const updateRequirements = useCallback((patch: Partial<ClinicWizardRequirements>) => {
    setDraft((d) => ({ ...d, requirements: { ...d.requirements, ...patch } }));
  }, []);

  const updateSafety = useCallback((patch: Partial<ClinicWizardSafety>) => {
    setDraft((d) => ({ ...d, safety: { ...d.safety, ...patch } }));
  }, []);

  const togglePackageItem = useCallback((item: string) => {
    setDraft((d) => {
      const has = d.requirements.packageIncludes.includes(item);
      return {
        ...d,
        requirements: {
          ...d.requirements,
          packageIncludes: has
            ? d.requirements.packageIncludes.filter((x) => x !== item)
            : [...d.requirements.packageIncludes, item],
        },
      };
    });
  }, []);

  const hydrateFromProduct = useCallback((product: any, service: any) => {
    if (!product) return;
    setDraft((d) => ({
      ...d,
      basic: {
        ...d.basic,
        name: product.name ?? '',
        descriptionLong: product.description ?? service?.descriptionLong ?? '',
        categoryId: product.categoryId ?? '',
        brandId: product.brandId ?? '',
        sku: product.sku ?? '',
        barcode: product.barcode ?? '',
        unit: product.unit ?? 'service',
        taxRate: product.taxRate ?? '',
        imageUrls: (product.images ?? []).map((img: any) => img.url).filter(Boolean),
        isActive: product.isActive ?? true,
        isFeatured: product.isFeatured ?? false,
        tagIds: (product.tags ?? []).map((t: any) => t.tag?.id).filter(Boolean),
        serviceCategory: service?.category ?? 'CONSULTATION',
        subcategory: service?.subcategory ?? '',
        serviceCode: service?.serviceCode ?? '',
        basePrice: service?.basePrice ?? product.price ?? '',
        followUpPrice: service?.followUpPrice ?? '',
        emergencyPrice: service?.emergencyPrice ?? '',
        telemedicinePrice: service?.telemedicinePrice ?? '',
        homeVisitPrice: service?.homeVisitPrice ?? '',
        discountedPrice: service?.discountedPrice ?? '',
        durationMin: service?.durationMin ?? 15,
        isPopular: service?.isPopular ?? false,
        isDiscounted: service?.isDiscounted ?? false,
      },
      requirements: {
        ...d.requirements,
        requiresDoctor: service?.requiresDoctor ?? true,
        requiresAppointment: service?.requiresAppointment ?? true,
        requiresFasting: service?.requiresFasting ?? false,
        requiresPrepInstructions: service?.requiresPrepInstructions ?? '',
        prepInstructions: service?.prepInstructions ?? '',
        postCareInstructions: service?.postCareInstructions ?? '',
        contraindications: service?.contraindications ?? '',
        sideEffects: service?.sideEffects ?? '',
        packageIncludes: service?.packageIncludes ?? [],
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
    if (!draft.basic.name.trim()) step1Errors.push('Service name required');
    if (!draft.basic.basePrice || Number(draft.basic.basePrice) <= 0) step1Errors.push('Base price required');

    const step2Errors: string[] = [];
    const step3Errors: string[] = [];

    return {
      step1: { valid: step1Errors.length === 0, errors: step1Errors },
      step2: { valid: step2Errors.length === 0, errors: step2Errors },
      step3: { valid: step3Errors.length === 0, errors: step3Errors },
      allValid: step1Errors.length === 0 && step2Errors.length === 0 && step3Errors.length === 0,
    };
  }, [draft]);

  const stats = useMemo(() => {
    const priceCount = [
      draft.basic.basePrice, draft.basic.followUpPrice, draft.basic.emergencyPrice,
      draft.basic.telemedicinePrice, draft.basic.homeVisitPrice, draft.basic.discountedPrice,
    ].filter((p) => Number(p || 0) > 0).length;

    const requirementsScore = [
      draft.requirements.requiresDoctor, draft.requirements.requiresAppointment,
      draft.requirements.requiresFasting, !!draft.requirements.prepInstructions,
      !!draft.requirements.postCareInstructions,
    ].filter(Boolean).length;

    const safetyScore = [
      draft.safety.pregnancySafe, draft.safety.lactationSafe,
      draft.safety.requiresConsent, draft.safety.requiresGuardian, draft.safety.followUpRequired,
    ].filter(Boolean).length;

    return {
      priceCount,
      imageCount: draft.basic.imageUrls.length,
      requirementsScore,
      safetyScore,
      packageItems: draft.requirements.packageIncludes.length,
    };
  }, [draft]);

  return {
    draft,
    draftRestored,
    validation,
    stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateRequirements, updateSafety,
    togglePackageItem,
    hydrateFromProduct,
    reset,
  };
}
