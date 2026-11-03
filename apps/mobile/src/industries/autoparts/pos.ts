/**
 * Auto parts counter (web autoparts/pos/config.ts) on the shared POS. Every part
 * carries its part number, OEM and other numbers, brand and the vehicles it
 * fits, so "corolla brake" or a part number finds it (the facts are kept on the
 * phone). A part with a warranty goes on the bill with it. Vehicles whose job is
 * finished are handed back from the "Gaari wapsi" tab (or by scanning the job
 * number): the sheet takes what is left and closes the job with its bill. An old
 * part the customer gives back is recorded from the cart.
 */

import { Wrench } from 'lucide-react-native';
import { useMemo } from 'react';
import { msg, t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { queryClient } from '@/core/query/client';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import type { PartFacts } from './api';
import { partProfilesApi, workshopJobsApi } from './api';
import { AutoPartsOverlay, CoreTakeBack, ReadyJobsView, openHandover } from './components/PosParts';
import { usePartFacts } from './components/PartFacts';
import { PART_FACTS_KEY } from './meta';

const allowOnce = new Set<string>();
let loadedAt = 0;

/** Part facts from the phone's saved copy; asks the server for a fresh one when online and stale. */
function factsOf(productId: string): PartFacts | undefined {
  const list = queryClient.getQueryData<PartFacts[]>([PART_FACTS_KEY]);
  if ((!list || Date.now() - loadedAt > 5 * 60_000) && isOnline()) {
    loadedAt = Date.now();
    void queryClient.fetchQuery({ queryKey: [PART_FACTS_KEY], queryFn: () => partProfilesApi.facts().catch(() => [] as PartFacts[]), staleTime: 5 * 60_000 });
  }
  return list?.find((f) => f.productId === productId);
}

export const autoPartsPos: PosIndustryConfig = {
  ...generalPos,
  id: 'autoparts',
  searchHint: msg('Part ka naam, part number, gaari (corolla brake) — ya job number'),
  receiptFooter: 'Bijli ka saman aur fit kiya hua part wapas nahi hota. Part wapas karna ho to bill aur dabba saath laayein.',
  Overlay: AutoPartsOverlay,
  CartExtra: CoreTakeBack,
  extraView: { label: msg('Gaari wapsi'), icon: Wrench, Component: ReadyJobsView },
  beforeAdd: (productId, opts, api) => {
    if (allowOnce.delete(productId) || opts.warrantyMonths) return 'continue';
    const months = Number(factsOf(productId)?.warrantyMonths) || 0;
    if (months <= 0) return 'continue';
    allowOnce.add(productId);
    void api.addProduct(productId, { ...opts, warrantyMonths: months }).then((ok) => { if (!ok) allowOnce.delete(productId); });
    return 'handled';
  },
  /** Vehicle make filter ("fits Toyota") and the part number under each name. */
  useShelf: () => {
    const facts = usePartFacts();
    return useMemo(() => {
      const makes = new Set<string>();
      facts.forEach((f) => f.fits.forEach((x) => x.makeName && makes.add(x.makeName)));
      return {
        filters: makes.size ? [{
          key: 'make', label: t('Gaari'),
          options: [...makes].sort().slice(0, 12).map((m) => ({ value: m, label: m })),
          match: (p: { id: string }, v: string) => { const f = facts.get(p.id); return !!f && (f.universal || f.fits.some((x) => x.makeName === v)); },
        }] : [],
        subline: (p: { id: string }) => { const f = facts.get(p.id); return f ? [f.partNumber, f.brand].filter(Boolean).join(' · ') || null : null; },
      };
    }, [facts]);
  },
  scan: async (code) => {
    const lower = code.trim().toLowerCase();
    if (lower.length < 5 || !isOnline()) return false;
    const list = await queryClient.fetchQuery({ queryKey: ['workshop-jobs', 'scan-ready'], queryFn: () => workshopJobsApi.page({ view: 'ready', limit: 200 }), staleTime: 15_000 }).catch(() => null);
    const job = list?.items.find((j) => j.jobNumber.toLowerCase() === lower);
    if (!job) return false;
    openHandover(job.id);
    return true;
  },
};

registerPosIndustry(autoPartsPos);
