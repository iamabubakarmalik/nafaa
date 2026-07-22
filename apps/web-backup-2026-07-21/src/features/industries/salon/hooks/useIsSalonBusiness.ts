import { useAuthStore } from '@/store/auth.store';

export function useIsSalonBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isSalonType =
    type.includes('SALON') ||
    type.includes('PARLOUR') ||
    type.includes('PARLOR') ||
    type.includes('BEAUTY') ||
    type.includes('SPA') ||
    type.includes('BARBER');

  const hasSalonFeature =
    features.appointments === true ||
    features.salonMode === true ||
    features.services === true;

  return isSalonType || hasSalonFeature;
}
