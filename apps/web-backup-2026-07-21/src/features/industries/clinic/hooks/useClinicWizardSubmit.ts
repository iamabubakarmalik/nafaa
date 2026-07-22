import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { productsApi } from '@/api/products.api';
import { productImagesApi } from '@/api/product-images.api';
import { clinicServicesApi } from '../api/services.api';
import type { ClinicWizardDraft } from './useClinicWizard';

export interface SubmitProgress {
  stage: 'idle' | 'product' | 'images' | 'service' | 'done';
  message: string;
  productCreated?: boolean;
  imagesUploaded: number;
  productId?: string;
}

export function useClinicWizardSubmit(existingProductId?: string) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<SubmitProgress>({
    stage: 'idle',
    message: '',
    imagesUploaded: 0,
  });

  const isEdit = Boolean(existingProductId);

  const mutation = useMutation({
    mutationFn: async (draft: ClinicWizardDraft) => {
      setProgress({
        stage: 'product',
        message: isEdit ? 'Updating service...' : 'Creating service...',
        imagesUploaded: 0,
      });

      const productPayload = {
        name: draft.basic.name.trim(),
        description: draft.basic.descriptionLong || undefined,
        categoryId: draft.basic.categoryId || undefined,
        brandId: draft.basic.brandId || undefined,
        sku: draft.basic.sku || undefined,
        barcode: draft.basic.barcode || undefined,
        unit: draft.basic.unit || 'service',
        price: Number(draft.basic.basePrice) || 0,
        costPrice: 0,
        taxRate: draft.basic.taxRate ? Number(draft.basic.taxRate) : 0,
        stock: 999999, // services are unlimited
        lowStockAlert: 0,
        isActive: draft.basic.isActive,
        isFeatured: draft.basic.isFeatured,
        tagIds: draft.basic.tagIds,
      };

      const product = isEdit && existingProductId
        ? await productsApi.update(existingProductId, productPayload)
        : await productsApi.create(productPayload);

      if (!isEdit && draft.basic.imageUrls.length > 0) {
        setProgress((p) => ({
          ...p,
          stage: 'images',
          message: 'Uploading ' + draft.basic.imageUrls.length + ' image(s)...',
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
        stage: 'service',
        message: isEdit ? 'Updating clinical details...' : 'Saving clinical details...',
        productCreated: true,
        productId: product.id,
      }));

      await clinicServicesApi.upsert({
        productId: product.id,
        category: draft.basic.serviceCategory,
        subcategory: draft.basic.subcategory || undefined,
        serviceCode: draft.basic.serviceCode || undefined,
        durationMin: draft.basic.durationMin ? Number(draft.basic.durationMin) : undefined,
        requiresDoctor: draft.requirements.requiresDoctor,
        requiresAppointment: draft.requirements.requiresAppointment,
        requiresFasting: draft.requirements.requiresFasting,
        requiresPrepInstructions: draft.requirements.requiresPrepInstructions || undefined,
        basePrice: Number(draft.basic.basePrice) || 0,
        followUpPrice: draft.basic.followUpPrice ? Number(draft.basic.followUpPrice) : undefined,
        emergencyPrice: draft.basic.emergencyPrice ? Number(draft.basic.emergencyPrice) : undefined,
        telemedicinePrice: draft.basic.telemedicinePrice ? Number(draft.basic.telemedicinePrice) : undefined,
        homeVisitPrice: draft.basic.homeVisitPrice ? Number(draft.basic.homeVisitPrice) : undefined,
        discountedPrice: draft.basic.discountedPrice ? Number(draft.basic.discountedPrice) : undefined,
        packageIncludes: draft.requirements.packageIncludes,
        contraindications: draft.requirements.contraindications || undefined,
        sideEffects: draft.requirements.sideEffects || undefined,
        prepInstructions: draft.requirements.prepInstructions || undefined,
        postCareInstructions: draft.requirements.postCareInstructions || undefined,
        isActive: draft.basic.isActive,
        isPopular: draft.basic.isPopular,
        isFeatured: draft.basic.isFeatured,
        isDiscounted: draft.basic.isDiscounted,
        imageUrls: draft.basic.imageUrls,
        descriptionLong: draft.basic.descriptionLong || undefined,
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
      queryClient.invalidateQueries({ queryKey: ['clinic-services'] });
      toast.success(isEdit ? 'Service updated!' : 'Clinical service created!', { duration: 3000 });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Save failed');
      setProgress((p) => ({ ...p, stage: 'idle', message: '' }));
    },
  });

  return { mutation, progress, isEdit };
}
