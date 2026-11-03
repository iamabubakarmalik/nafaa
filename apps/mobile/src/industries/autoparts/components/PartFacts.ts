/** Part numbers, brand, condition and fitment per product id, for the counter, products list and job card. */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { partFits } from '@nafaa/core/industries/autoparts';
import { partProfilesApi, type PartFacts } from '../api';
import { PART_FACTS_KEY } from '../meta';

export function usePartFacts() {
  const { data = [] } = useQuery({ queryKey: [PART_FACTS_KEY], queryFn: () => partProfilesApi.facts().catch(() => [] as PartFacts[]), staleTime: 5 * 60_000 });
  return useMemo(() => new Map(data.map((f) => [f.productId, f])), [data]);
}

/** Words a part is found by: its numbers, brand and the vehicles it fits. */
export const partSearchText = (f?: PartFacts) =>
  (f ? [f.partNumber, f.oemNumber, ...f.alternateNumbers, f.brand, f.fitment, f.universal ? 'universal' : ''].filter(Boolean).join(' ') : '');

/** True when the part fits the vehicle (universal parts fit every vehicle; parts without any fitment row are not claimed to fit). */
export function partFitsVehicle(f: PartFacts | undefined, v: { makeId?: string | null; modelId?: string | null; year?: number | null; makeName?: string | null; modelName?: string | null }) {
  if (!f) return false;
  if (f.universal) return true;
  if (!f.fits.length) return false;
  const make = v.makeName?.toLowerCase();
  const model = v.modelName?.toLowerCase();
  return f.fits.some((x) => (!make || x.makeName?.toLowerCase() === make) && (!model || !x.modelName || x.modelName.toLowerCase() === model)
    && (!v.year || ((!x.yearFrom || v.year >= x.yearFrom) && (!x.yearTo || v.year <= x.yearTo)))) || f.fits.some((x) => partFits({ fitments: [x] }, v));
}
