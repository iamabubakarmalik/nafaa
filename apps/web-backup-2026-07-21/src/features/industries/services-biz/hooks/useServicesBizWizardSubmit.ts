import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { catalogApi } from '../api/catalog.api';
import type { ServicesBizDraft } from './useServicesBizWizard';

export interface SubmitProgress {
  stage: 'idle' | 'saving' | 'done';
  message: string;
  serviceId?: string;
}

export function useServicesBizWizardSubmit(existingServiceId?: string) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<SubmitProgress>({ stage: 'idle', message: '' });
  const isEdit = Boolean(existingServiceId);

  const mutation = useMutation({
    mutationFn: async (draft: ServicesBizDraft) => {
      setProgress({
        stage: 'saving',
        message: isEdit ? 'Updating service...' : 'Creating service...',
      });

      const payload: any = {
        name: draft.basic.name.trim(),
        code: draft.basic.code || undefined,
        description: draft.basic.description || undefined,
        category: draft.basic.category,
        businessType: draft.basic.businessType || undefined,
        chargeType: draft.pricing.chargeType,
        baseCharge: Number(draft.pricing.baseCharge) || 0,
        hourlyRate: Number(draft.pricing.hourlyRate) || 0,
        visitCharge: Number(draft.pricing.visitCharge) || 0,
        minCharge: Number(draft.pricing.minCharge) || 0,
        maxCharge: draft.pricing.maxCharge ? Number(draft.pricing.maxCharge) : undefined,
        emergencyCharge: Number(draft.pricing.emergencyCharge) || 0,
        weekendCharge: Number(draft.pricing.weekendCharge) || 0,
        nightCharge: Number(draft.pricing.nightCharge) || 0,
        outOfCityCharge: Number(draft.pricing.outOfCityCharge) || 0,
        estimatedDurationMin: Number(draft.warranty.estimatedDurationMin) || 60,
        requiredSkillLevel: draft.warranty.requiredSkillLevel,
        requiredTools: draft.warranty.requiredTools,
        requiredParts: draft.warranty.requiredParts,
        requiresLicense: draft.warranty.requiresLicense,
        licenseType: draft.warranty.licenseType || undefined,
        warrantyDays: Number(draft.warranty.warrantyDays) || 0,
        warrantyType: draft.warranty.warrantyType,
        warrantyTerms: draft.warranty.warrantyTerms || undefined,
        isEmergency: draft.basic.isEmergency,
        isRemoteAvailable: draft.basic.isRemoteAvailable,
        requiresQuote: draft.pricing.requiresQuote,
        requiresAdvance: draft.pricing.requiresAdvance,
        advancePct: Number(draft.pricing.advancePct) || 0,
        imageUrl: draft.basic.imageUrl || undefined,
        imageUrls: draft.basic.imageUrls,
        isPopular: draft.basic.isPopular,
        isFeatured: draft.basic.isFeatured,
        isActive: draft.basic.isActive,
      };

      const service = isEdit && existingServiceId
        ? await catalogApi.update(existingServiceId, payload)
        : await catalogApi.create(payload);

      setProgress({
        stage: 'done',
        message: 'All done!',
        serviceId: service.id,
      });

      return service;
    },

    onSuccess: (service) => {
      queryClient.invalidateQueries({ queryKey: ['catalog-services'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-service', service.id] });
      toast.success(isEdit ? 'Service updated!' : 'Service created!', {
        description: isEdit ? 'Changes saved' : 'Available in POS & catalog now',
        duration: 3000,
      });
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Save failed');
      setProgress({ stage: 'idle', message: '' });
    },
  });

  return { mutation, progress, isEdit };
}
