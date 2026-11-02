/**
 * Optical facts per product (frame brand, model, colour, lens type, contact
 * lens details), loaded once and shared by the product pages and the counter.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { opticalProductsApi, type OpticalCategoryType, type OpticalFacts } from '../api/products.api';
import { t as tr } from '@core/i18n';

export const FACTS_KEY = 'optical-facts';

export function useOpticalFacts() {
  const { data } = useQuery({ queryKey: [FACTS_KEY], queryFn: () => opticalProductsApi.facts().catch(() => [] as OpticalFacts[]), staleTime: 5 * 60_000 });
  return useMemo(() => new Map((data ?? []).map((f) => [f.productId, f])), [data]);
}

export type OpticalKind = 'frame' | 'sun' | 'lens' | 'contact' | 'care' | 'other';

export const KINDS: Array<{ value: OpticalKind; label: string; types: OpticalCategoryType[] }> = [
  { value: 'frame', label: tr('Frame'), types: ['FRAME_FULL_RIM', 'FRAME_HALF_RIM', 'FRAME_RIMLESS', 'FRAME_SPORTS', 'FRAME_KIDS', 'FRAME_READING'] },
  { value: 'sun', label: tr('Sunglasses'), types: ['SUNGLASSES', 'SUNGLASSES_POLARIZED', 'SUNGLASSES_KIDS'] },
  { value: 'lens', label: tr('Lens (stock)'), types: ['LENS_SINGLE_VISION', 'LENS_BIFOCAL', 'LENS_PROGRESSIVE', 'LENS_PHOTOCHROMIC', 'LENS_BLUE_CUT', 'LENS_ANTI_GLARE', 'LENS_CYLINDRICAL', 'LENS_SPHERICAL'] },
  { value: 'contact', label: tr('Contact lens'), types: ['CONTACT_LENS_MONTHLY', 'CONTACT_LENS_DAILY', 'CONTACT_LENS_YEARLY', 'CONTACT_LENS_COLORED', 'CONTACT_LENS_TORIC', 'CONTACT_LENS_MULTIFOCAL'] },
  { value: 'care', label: tr('Solution / case'), types: ['CLEANING_SOLUTION', 'LENS_CASE', 'ACCESSORY'] },
  { value: 'other', label: tr('Doosra'), types: ['OTHER'] },
];

export const kindOf = (t?: OpticalCategoryType | null): OpticalKind | null => (t ? KINDS.find((k) => k.types.includes(t))?.value ?? 'other' : null);

const TYPE_LABEL: Partial<Record<OpticalCategoryType, string>> = {
  FRAME_FULL_RIM: tr('Full rim'), FRAME_HALF_RIM: tr('Half rim'), FRAME_RIMLESS: tr('Rimless'), FRAME_SPORTS: tr('Sports'), FRAME_KIDS: tr('Bachon ka'), FRAME_READING: tr('Reading'),
  SUNGLASSES: tr('Sunglasses'), SUNGLASSES_POLARIZED: tr('Polarized'), SUNGLASSES_KIDS: tr('Bachon ki'),
  LENS_SINGLE_VISION: tr('Single vision'), LENS_BIFOCAL: tr('Bifocal'), LENS_PROGRESSIVE: tr('Progressive'), LENS_PHOTOCHROMIC: tr('Photochromic'), LENS_BLUE_CUT: tr('Blue cut'),
  LENS_ANTI_GLARE: tr('Anti-glare'), LENS_CYLINDRICAL: tr('Cylinder'), LENS_SPHERICAL: tr('Spherical'),
  CONTACT_LENS_MONTHLY: tr('Monthly'), CONTACT_LENS_DAILY: tr('Daily'), CONTACT_LENS_YEARLY: tr('Yearly'), CONTACT_LENS_COLORED: tr('Rangeen'), CONTACT_LENS_TORIC: tr('Toric'), CONTACT_LENS_MULTIFOCAL: tr('Multifocal'),
  CLEANING_SOLUTION: tr('Solution'), LENS_CASE: tr('Lens case'), ACCESSORY: tr('Accessory'), OTHER: tr('Doosra'),
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
