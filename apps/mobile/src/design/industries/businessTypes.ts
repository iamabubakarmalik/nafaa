/**
 * Tenant business types (stored by the API) mapped to industry identity ids.
 * Same pairs as the web modules/auth/lib/industry-choices.ts.
 */

export const PACK_TO_BUSINESS_TYPE: ReadonlyArray<[packId: string, businessType: string]> = [
  ['retail', 'GROCERY'],
  ['pharmacy', 'PHARMACY'],
  ['mobile', 'MOBILE'],
  ['restaurant', 'RESTAURANT'],
  ['garments', 'CLOTHING'],
  ['bakery', 'BAKERY'],
  ['hardware', 'HARDWARE'],
  ['distribution', 'DISTRIBUTOR'],
  ['salon', 'SALON'],
  ['electronics', 'ELECTRONICS'],
  ['appliances', 'APPLIANCES'],
  ['cosmetics', 'COSMETICS'],
  ['shoe', 'SHOE'],
  ['bookstore', 'STATIONERY'],
  ['autoparts', 'AUTO_PARTS'],
  ['meat', 'MEAT'],
  ['dairy', 'DAIRY'],
  ['agri', 'AGRI'],
  ['jewelry', 'JEWELRY'],
  ['clinic', 'CLINIC'],
  ['optical', 'OPTICAL'],
  ['furniture', 'FURNITURE'],
  ['carpet', 'CARPET'],
  ['hotel', 'HOTEL'],
  ['gym', 'GYM'],
  ['services-biz', 'SERVICE'],
  ['florist', 'FLORIST'],
  ['gaming', 'GAMING'],
  ['petshop', 'PETSHOP'],
  ['toystore', 'TOYSTORE'],
  ['sports', 'SPORTS'],
];

const BY_TYPE = new Map(PACK_TO_BUSINESS_TYPE.map(([pack, type]) => [type, pack]));

/** Industry id for a tenant business type; GENERAL and unknown types are 'standard'. */
export function industryIdForBusinessType(businessType: string | null | undefined): string | null {
  if (!businessType) return null;
  const upper = businessType.toUpperCase();
  return BY_TYPE.get(upper) ?? (upper === 'GENERAL' ? 'standard' : null);
}
