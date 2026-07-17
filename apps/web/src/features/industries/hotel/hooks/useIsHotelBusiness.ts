import { useAuthStore } from '@/store/auth.store';

export function useIsHotelBusiness(): boolean {
  const tenant = useAuthStore((s) => s.tenant);
  const type = ((tenant as any)?.businessType ?? '').toUpperCase();
  const features = (tenant as any)?.businessFeatures ?? {};

  const isHotelType =
    type.includes('HOTEL') ||
    type.includes('GUEST_HOUSE') ||
    type.includes('GUESTHOUSE') ||
    type.includes('MOTEL') ||
    type.includes('RESORT') ||
    type.includes('LODGE') ||
    type.includes('INN') ||
    type.includes('HOSTEL');

  const hasHotelFeature =
    features.hotelMode === true ||
    features.rooms === true ||
    features.bookings === true;

  return isHotelType || hasHotelFeature;
}
