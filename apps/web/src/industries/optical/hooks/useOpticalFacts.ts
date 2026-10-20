/**
 * Optical facts per product (frame brand, model, colour, lens type, contact
 * lens details), loaded once and shared by the product pages and the counter.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { opticalProductsApi, type OpticalCategoryType, type OpticalFacts } from '../api/products.api';

export const FACTS_KEY = 'optical-facts';

export function useOpticalFacts() {
  const { data } = useQuery({ queryKey: [FACTS_KEY], queryFn: () => opticalProductsApi.facts().catch(() => [] as OpticalFacts[]), staleTime: 5 * 60_000 });
  return useMemo(() => new Map((data ?? []).map((f) => [f.productId, f])), [data]);
}

export type OpticalKind = 'frame' | 'sun' | 'lens' | 'contact' | 'care' | 'other';

export const KINDS: Array<{ value: OpticalKind; label: string; types: OpticalCategoryType[] }> = [
  { value: 'frame', label: 'Frame', types: ['FRAME_FULL_RIM', 'FRAME_HALF_RIM', 'FRAME_RIMLESS', 'FRAME_SPORTS', 'FRAME_KIDS', 'FRAME_READING'] },
  { value: 'sun', label: 'Sunglasses', types: ['SUNGLASSES', 'SUNGLASSES_POLARIZED', 'SUNGLASSES_KIDS'] },
  { value: 'lens', label: 'Lens (stock)', types: ['LENS_SINGLE_VISION', 'LENS_BIFOCAL', 'LENS_PROGRESSIVE', 'LENS_PHOTOCHROMIC', 'LENS_BLUE_CUT', 'LENS_ANTI_GLARE', 'LENS_CYLINDRICAL', 'LENS_SPHERICAL'] },
  { value: 'contact', label: 'Contact lens', types: ['CONTACT_LENS_MONTHLY', 'CONTACT_LENS_DAILY', 'CONTACT_LENS_YEARLY', 'CONTACT_LENS_COLORED', 'CONTACT_LENS_TORIC', 'CONTACT_LENS_MULTIFOCAL'] },
  { value: 'care', label: 'Solution / case', types: ['CLEANING_SOLUTION', 'LENS_CASE', 'ACCESSORY'] },
  { value: 'other', label: 'Doosra', types: ['OTHER'] },
];

export const kindOf = (t?: OpticalCategoryType | null): OpticalKind | null => (t ? KINDS.find((k) => k.types.includes(t))?.value ?? 'other' : null);

const TYPE_LABEL: Partial<Record<OpticalCategoryType, string>> = {
  FRAME_FULL_RIM: 'Full rim', FRAME_HALF_RIM: 'Half rim', FRAME_RIMLESS: 'Rimless', FRAME_SPORTS: 'Sports', FRAME_KIDS: 'Bachon ka', FRAME_READING: 'Reading',
  SUNGLASSES: 'Sunglasses', SUNGLASSES_POLARIZED: 'Polarized', SUNGLASSES_KIDS: 'Bachon ki',
  LENS_SINGLE_VISION: 'Single vision', LENS_BIFOCAL: 'Bifocal', LENS_PROGRESSIVE: 'Progressive', LENS_PHOTOCHROMIC: 'Photochromic', LENS_BLUE_CUT: 'Blue cut',
  LENS_ANTI_GLARE: 'Anti-glare', LENS_CYLINDRICAL: 'Cylinder', LENS_SPHERICAL: 'Spherical',
  CONTACT_LENS_MONTHLY: 'Monthly', CONTACT_LENS_DAILY: 'Daily', CONTACT_LENS_YEARLY: 'Yearly', CONTACT_LENS_COLORED: 'Rangeen', CONTACT_LENS_TORIC: 'Toric', CONTACT_LENS_MULTIFOCAL: 'Multifocal',
  CLEANING_SOLUTION: 'Solution', LENS_CASE: 'Lens case', ACCESSORY: 'Accessory', OTHER: 'Doosra',
};
export const typeLabel = (t?: OpticalCategoryType | null) => (t ? TYPE_LABEL[t] ?? t : '');

/** "Ray-Ban RB2140 · Black · 52-18-145", "1.56 Blue cut", "Monthly · BC 8.6". */
export function factLine(f?: OpticalFacts): string | undefined {
  if (!f) return undefined;
  const size = f.frameSizeMm ? [f.frameSizeMm, f.bridgeSizeMm, f.templeLengthMm].filter(Boolean).join('-') : '';
  const parts = f.isContactLens
    ? [f.brand, f.clDuration, f.clBaseCurve && `BC ${f.clBaseCurve}`, f.clDiameter && `DIA ${f.clDiameter}`]
    : [[f.brand, f.modelNumber].filter(Boolean).join(' '), f.colorName, size, f.lensIndex, f.lensType];
  return parts.filter(Boolean).join(' · ') || undefined;
}
