import { useAuthStore } from '@/store/auth.store';

export function useIsClinicBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isClinicType =
    type.includes('CLINIC') ||
    type.includes('DOCTOR') ||
    type.includes('HOSPITAL') ||
    type.includes('MEDICAL') ||
    type.includes('DENTAL') ||
    type.includes('HEALTHCARE') ||
    type.includes('PHYSIO') ||
    type.includes('PATIENT');

  const hasClinicFeature =
    features.clinicMode === true ||
    features.patients === true ||
    features.prescriptions === true;

  return isClinicType || hasClinicFeature;
}
