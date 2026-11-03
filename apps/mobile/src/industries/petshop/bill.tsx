/**
 * Pet shop on the shared Sales history: a grooming chip and link (grooming
 * bills are numbered PGR- and carry the appointment number), and an animal
 * chip and link to the animal's record for bills that sold a live animal.
 * Animals are found by the bill number written on the animal record (needs
 * internet) and cached.
 */

import { PawPrint, Scissors } from 'lucide-react-native';
import { t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import { registerSalesExtras, type SaleChip, type SaleLink } from '@/modules/sales/industry/registry';
import type { HistorySale } from '@/modules/sales/api/history';
import { createBillLookup } from '../retail/lib/lookup';
import { liveAnimalsApi, type LiveAnimal } from './api';
import { PET_KEYS } from './meta';

const isGrooming = (s: HistorySale) => s.saleNumber.startsWith('PGR-');

/** Recently sold animals; a bill that sold one is named in the animal's notes ("Bill <number>"). */
const animals = createBillLookup<LiveAnimal>(async (keys) => {
  const sold = await queryClient.fetchQuery({ queryKey: [PET_KEYS.animals, 'sold-recent'], queryFn: () => liveAnimalsApi.paged({ status: 'SOLD', limit: 100 }), staleTime: 60_000 });
  const out = new Map<string, LiveAnimal>();
  for (const k of keys) {
    const a = sold.items.find((x) => (x.notes ?? '').includes(`Bill ${k.split('|')[1]}`));
    if (a) out.set(k, a);
  }
  return out;
}, { saleIdOf: (k) => k.split('|')[0] });

const animalOf = (s: HistorySale) => (s.pending || isGrooming(s) ? undefined : animals.get(`${s.id}|${s.saleNumber}`));

const chipsOf = (s: HistorySale): SaleChip[] => {
  if (isGrooming(s)) return [{ label: t('Grooming'), tone: 'accent', icon: Scissors }];
  const a = animalOf(s);
  return a ? [{ label: `${t('Animal')} ${a.animalNumber}`, tone: 'info', icon: PawPrint }] : [];
};

const linksOf = (s: HistorySale): SaleLink[] => {
  if (isGrooming(s)) return [{ icon: Scissors, label: t('Grooming'), hint: s.sourceRef ?? undefined, href: `/petshop/grooming${s.sourceRef ? `?q=${encodeURIComponent(s.sourceRef)}` : ''}` }];
  const a = animalOf(s);
  return a ? [{ icon: PawPrint, label: t('Animal record'), hint: [a.name, a.breed].filter(Boolean).join(' · ') || a.animalNumber, href: `/petshop/live-animals/${a.id}` }] : [];
};

registerSalesExtras('petshop', { rowChips: chipsOf, rowActions: linksOf, detailLinks: (s) => linksOf(s) });
