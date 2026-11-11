import { industryIdentity, type IndustryIdentity } from '@/design-system';

/**
 * Tenant.businessType → industry pack id, for colors, icons and labels.
 * Same pairs as apps/web/src/modules/auth/lib/industry-choices.ts.
 */
const BUSINESS_TYPE_TO_PACK: Record<string, string> = {
  GROCERY: 'retail', PHARMACY: 'pharmacy', MOBILE: 'mobile', RESTAURANT: 'restaurant', CLOTHING: 'garments',
  BAKERY: 'bakery', HARDWARE: 'hardware', DISTRIBUTOR: 'distribution', SALON: 'salon', ELECTRONICS: 'electronics',
  APPLIANCES: 'appliances', COSMETICS: 'cosmetics', SHOE: 'shoe', STATIONERY: 'bookstore', AUTO_PARTS: 'autoparts',
  MEAT: 'meat', DAIRY: 'dairy', AGRI: 'agri', JEWELRY: 'jewelry', CLINIC: 'clinic', OPTICAL: 'optical',
  FURNITURE: 'furniture', CARPET: 'carpet', HOTEL: 'hotel', GYM: 'gym', SERVICE: 'services-biz', FLORIST: 'florist',
  GAMING: 'gaming', PETSHOP: 'petshop', TOYSTORE: 'toystore', SPORTS: 'sports',
};

/** All business types with a known industry, for filters. */
export const BUSINESS_TYPES = Object.keys(BUSINESS_TYPE_TO_PACK);

export function industryForType(type: string): IndustryIdentity & { known: boolean } {
  const pack = BUSINESS_TYPE_TO_PACK[type];
  if (pack) return { ...industryIdentity(pack), known: true };
  const label = type === 'UNKNOWN' || type === 'NONE' ? 'Not chosen yet' : type === 'GENERAL' ? 'General shop' : type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  return { ...industryIdentity(null), label, color: '#64748b', known: false };
}
