/**
 * Optical counter on the shared POS engine: frames, sunglasses, stock
 * lenses, contact lenses and solutions with brand, model, colour and size
 * on every card. Contact lenses and solutions sell from the earliest
 * expiry batch (engine). The bill panel shows the customer's nuskha and
 * glasses ready for pickup. Glasses made at the lab are booked as orders
 * (Orders page), not sold here.
 */

import { Droplet, Eye, Glasses, Sun } from 'lucide-react';
import { useComboBundles, useProductCatalog, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { FACTS_KEY, factLine, kindOf, typeLabel, useOpticalFacts } from '../hooks/useOpticalFacts';
import { CustomerOptical } from './CustomerOptical';

function useOpticalCatalog() {
  const facts = useOpticalFacts();
  const catalog = useProductCatalog((it): PosItem => {
    const f = facts.get(it.id);
    if (!f) return it;
    return {
      ...it,
      subline: factLine(f),
      badges: [
        ...(f.hasBlueCut ? [{ label: 'Blue cut', tone: 'info' as const }] : []),
        ...(f.isPolarized ? [{ label: 'Polarized', tone: 'neutral' as const }] : []),
      ],
      searchText: [it.searchText, f.brand, f.modelNumber, f.colorName, f.lensIndex, typeLabel(f.categoryType), f.clDuration].filter(Boolean).join(' '),
      meta: { ...it.meta, kind: kindOf(f.categoryType) },
    };
  }, [facts]);
  return { ...catalog, refreshKeys: [...catalog.refreshKeys, FACTS_KEY] };
}

const kind = (k: string) => (i: PosItem) => i.meta?.kind === k;

const filters: PosFilter[] = [
  { id: 'frame', label: 'Frames', icon: Glasses, match: kind('frame') },
  { id: 'sun', label: 'Sunglasses', icon: Sun, match: kind('sun') },
  { id: 'contact', label: 'Contact lens', icon: Eye, match: kind('contact') },
  { id: 'care', label: 'Solution / case', icon: Droplet, match: kind('care') },
];

export const opticalPos: PosIndustryConfig = {
  id: 'optical',
  label: 'Optical',
  useCatalog: useOpticalCatalog,
  useBundles: useComboBundles,
  quickKeys: true,
  filters,
  searchHint: 'Brand, model, rang ya barcode…',
  CartExtra: CustomerOptical,
  receiptFooter: 'Chashma ki warranty ke liye ye bill sambhal kar rakhein.',
  voiceAliases: { chashma: 'frame', ainak: 'frame', dhoop: 'sunglasses', lens: 'contact lens', solution: 'solution' },
};
