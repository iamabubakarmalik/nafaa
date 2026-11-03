/**
 * BrandLogo moved to the kit (`@/design`). Courier codes map through the
 * online-store package, so CourierLogo stays here.
 */

import { courierBrand } from '@nafaa/core/online-store';
import { BrandLogo, type BrandName } from '@/design';

export { BrandLogo, ChannelLogo, brandColor, brandLabel, brandForChannel, brandForPayment, type BrandName } from '@/design';

export const brandForCourierCode = (code?: string | null): BrandName => courierBrand(code) as BrandName;

export function CourierLogo({ code, size }: { code?: string | null; size?: number }) {
  return <BrandLogo name={brandForCourierCode(code)} size={size} />;
}
