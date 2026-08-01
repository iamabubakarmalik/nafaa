import { useAuthStore } from '@core/stores/auth.store';

export function useIsPetshopBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isPetType =
    type.includes('PET') || type.includes('VET') ||
    type.includes('AQUARIUM') || type.includes('ANIMAL');

  const hasFeature =
    features.petshopMode === true ||
    features.petGrooming === true ||
    features.liveAnimals === true;

  return isPetType || hasFeature;
}
