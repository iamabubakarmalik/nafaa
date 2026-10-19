/**
 * Meat counter on the shared POS engine. Items sold by kg open the shared
 * weigh window (kg, gram, "Rs 500 ka" and the scale). Each item shows its
 * animal and cut; chips filter murgi, mutton, beef and andar ka maal. The
 * bill panel switches to the restaurant rate (the item's wholesale price)
 * for hotel and restaurant buyers on khata.
 */

import { Beef, Bird, Fish, Heart, Scissors } from 'lucide-react';
import { useProductCatalog, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { useMeatProfiles } from '../hooks/useMeatProfiles';
import { KEYS, animalOf, cutLabel } from '../lib/meta';
import { CounterRate } from './CounterRate';
import { saleListener, useRateMode } from './rateMode';

const OFFAL = ['LIVER', 'KIDNEY', 'HEART', 'BRAIN', 'TONGUE', 'TROTTERS', 'HEAD', 'OFFAL', 'TAIL'];

function useMeatCatalog() {
  const profiles = useMeatProfiles();
  const mode = useRateMode();
  const catalog = useProductCatalog((it): PosItem => {
    const p = profiles.get(it.id);
    const wholesale = Number(it.product.wholesalePrice) || 0;
    const rate = mode === 'wholesale' && wholesale > 0 ? wholesale : it.price;
    if (!p && rate === it.price) return it;
    const animal = p ? animalOf(p.animalType) : null;
    return {
      ...it,
      price: rate,
      subline: [animal ? `${animal.emoji} ${animal.label}` : null, p ? cutLabel(p.cutCategory) : null, rate !== it.price ? 'Restaurant rate' : null].filter(Boolean).join(' · ') || undefined,
      searchText: [it.searchText, animal?.label, p ? cutLabel(p.cutCategory) : null].filter(Boolean).join(' '),
      meta: { ...it.meta, animal: p?.animalType, cut: p?.cutCategory },
    };
  }, [profiles, mode]);
  return { ...catalog, refreshKeys: [...catalog.refreshKeys, KEYS.daySheet] };
}

const isAnimal = (...a: string[]) => (i: PosItem) => a.includes(String(i.meta?.animal ?? ''));

const filters: PosFilter[] = [
  { id: 'chicken', label: 'Murgi', icon: Bird, match: isAnimal('CHICKEN', 'DUCK', 'TURKEY', 'QUAIL') },
  { id: 'mutton', label: 'Mutton', icon: Beef, match: isAnimal('MUTTON', 'GOAT', 'LAMB') },
  { id: 'beef', label: 'Beef', icon: Beef, match: isAnimal('BEEF', 'BUFFALO', 'CAMEL') },
  { id: 'fish', label: 'Machhli', icon: Fish, match: isAnimal('FISH', 'PRAWN') },
  { id: 'offal', label: 'Kaleji / paaye', icon: Heart, match: (i) => OFFAL.includes(String(i.meta?.cut ?? '')) },
  { id: 'mince', label: 'Qeema / boneless', icon: Scissors, match: (i) => ['MINCE', 'BONELESS'].includes(String(i.meta?.cut ?? '')) },
];

export const meatPos: PosIndustryConfig = {
  id: 'meat',
  label: 'Meat',
  useCatalog: useMeatCatalog,
  quickKeys: true,
  filters,
  searchHint: 'Naam, cut (qeema, boneless) ya barcode…',
  CartExtra: CounterRate,
  onSale: (sale) => saleListener.current?.(sale),
  voiceAliases: {
    murgi: 'chicken murgi', qeema: 'qeema mince', boneless: 'boneless', kaleji: 'kaleji liver', paaye: 'paaye trotters', mutton: 'mutton', beef: 'beef', machhli: 'fish machhli',
  },
};
