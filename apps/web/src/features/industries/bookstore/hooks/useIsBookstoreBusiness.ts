import { useAuthStore } from '@/store/auth.store';

export function useIsBookstoreBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isBookstoreType =
    type.includes('BOOK') ||
    type.includes('STATIONERY') ||
    type.includes('STATIONARY') ||
    type.includes('LIBRARY') ||
    type.includes('ART') ||
    type.includes('SCHOOL') ||
    type.includes('EDUCATION');

  const hasBookstoreFeature =
    features.bookstoreMode === true ||
    features.stationeryMode === true ||
    features.artMode === true;

  return isBookstoreType || hasBookstoreFeature;
}
