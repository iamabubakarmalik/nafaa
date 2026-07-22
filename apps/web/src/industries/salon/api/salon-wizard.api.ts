import { salonServicesApi } from './services.api';
import type { SalonWizardDraft } from '../hooks/useSalonWizard';

export interface SalonWizardSaveResult {
  serviceId: string;
  serviceName: string;
  category: string;
  price: number;
  durationMinutes: number;
}

/**
 * Create a salon service from wizard draft.
 */
export async function saveSalonWizard(
  draft: SalonWizardDraft,
): Promise<SalonWizardSaveResult> {
  const { basic } = draft;

  const service = await salonServicesApi.create({
    name: basic.name.trim(),
    code: basic.code.trim() || undefined,
    category: basic.category,
    description: basic.description.trim() || undefined,
    price: Number(basic.price),
    discountPrice: basic.discountPrice ? Number(basic.discountPrice) : undefined,
    costPrice: basic.costPrice ? Number(basic.costPrice) : undefined,
    durationMinutes: Number(basic.durationMinutes),
    bufferBefore: Number(basic.bufferBefore || 0),
    bufferAfter: Number(basic.bufferAfter || 0),
    forMen: basic.forMen,
    forWomen: basic.forWomen,
    forKids: basic.forKids,
    commissionPct: Number(basic.commissionPct || 0),
    commissionFixed: Number(basic.commissionFixed || 0),
    imageUrl: basic.imageUrl || undefined,
    isPopular: basic.isPopular,
    isFeatured: basic.isFeatured,
    isActive: basic.isActive,
    displayOrder: Number(basic.displayOrder || 0),
  });

  return {
    serviceId: service.id,
    serviceName: service.name,
    category: service.category,
    price: service.price,
    durationMinutes: service.durationMinutes,
  };
}
