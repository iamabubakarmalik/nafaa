/**
 * How a business sells, asked at sign-up and editable in Settings. A business
 * can pick several (a shop that also sells online, a wholesaler that also
 * runs vans). Stored on Tenant.businessModels; an empty list means the owner
 * never answered and the business is treated as retail.
 */

export const BUSINESS_MODELS = ['RETAIL', 'WHOLESALE', 'DISTRIBUTION', 'ONLINE'] as const;
export type BusinessModel = (typeof BUSINESS_MODELS)[number];

/** Known values only, without repeats, in the fixed order above. */
export function cleanBusinessModels(input: readonly string[] | null | undefined): BusinessModel[] {
  const picked = new Set((input ?? []).map((m) => String(m).trim().toUpperCase()));
  return BUSINESS_MODELS.filter((m) => picked.has(m));
}

/**
 * The distribution mode the models ask for, or null when they do not need
 * distribution. Vans and bookers need FULL; wholesale alone needs price
 * lists, orders, credit and recoveries.
 */
export function distributionModeFor(models: readonly BusinessModel[]): 'FULL' | 'WHOLESALE' | null {
  if (models.includes('DISTRIBUTION')) return 'FULL';
  if (models.includes('WHOLESALE')) return 'WHOLESALE';
  return null;
}
