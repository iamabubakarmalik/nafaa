/**
 * Agri counter on the shared POS engine. Cards show the kind (seed,
 * fertilizer, spray, feed), pack weight and active ingredient; search also
 * finds crops and pests ("gandum", "sundi"). A seed, fertilizer or spray
 * whose government registration has expired cannot be sold. Bulk rates
 * from the product's agri details apply once the bag count reaches the
 * threshold. Batches and expiry of sprays come from the engine (earliest
 * valid expiry first). The farmer picked on the bill shows village, land,
 * udhaar by crop season and the credit limit.
 */

import { toast } from 'sonner';
import { Bug, FlaskConical, Leaf, PawPrint, ShieldAlert, Sprout, Tags, Wrench } from 'lucide-react';
import { useComboBundles, useProductCatalog, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import type { AgriFacts } from '../api/products.api';
import { AGRI_FACTS_KEY, factLine, useAgriFacts } from '../hooks/useAgriFacts';
import { deriveAgriKind, isFeedKind, isFertKind, isSeedKind, isSprayKind, isToolKind, needsGovtReg, prettyAgriKind, type AgriKind } from '../lib/agriCategory';
import { certStatus } from '../lib/agriUnits';
import { FarmerStrip } from './FarmerStrip';

const KIND_ICON = (k: AgriKind) => (isSeedKind(k) ? Sprout : isFertKind(k) ? FlaskConical : isSprayKind(k) ? Bug : isFeedKind(k) ? PawPrint : isToolKind(k) ? Wrench : Leaf);

function useAgriCatalog() {
  const facts = useAgriFacts();
  const catalog = useProductCatalog((it): PosItem => {
    const f: AgriFacts | undefined = facts.get(it.id);
    const kind = (f?.category as AgriKind | undefined) ?? deriveAgriKind(it.categoryName, it.name);
    const cert = certStatus(f?.govtRegExpiry);
    const blocked = needsGovtReg(kind) && cert.state === 'expired';
    const bulk = Number(f?.bulkDiscountThreshold) > 0 && Number(f?.bulkDiscountPct) > 0;
    return {
      ...it,
      dim: blocked || it.dim,
      badges: [
        ...(blocked ? [{ label: 'Reg khatam', tone: 'danger' as const, icon: ShieldAlert }]
          : kind !== 'OTHER' ? [{ label: prettyAgriKind(kind), tone: 'neutral' as const, icon: KIND_ICON(kind) }] : []),
        ...(bulk ? [{ label: `${f!.bulkDiscountThreshold}+ par ${f!.bulkDiscountPct}%`, tone: 'success' as const, icon: Tags }] : []),
        ...(f?.isRestricted || f?.requiresLicense ? [{ label: 'Pabandi', tone: 'warning' as const, icon: ShieldAlert }] : []),
      ],
      subline: factLine(f),
      searchText: [it.searchText, f?.activeIngredient, f?.npkRatio, f?.brand, f?.manufacturer, ...(f?.targetCrops ?? []), ...(f?.targetPests ?? []), prettyAgriKind(kind)].filter(Boolean).join(' '),
      meta: {
        ...it.meta, kind, blocked, regText: cert.text,
        bulkMin: bulk ? Number(f!.bulkDiscountThreshold) : 0, bulkPct: bulk ? Number(f!.bulkDiscountPct) : 0,
        restricted: !!(f?.isRestricted || f?.requiresLicense),
      },
    };
  }, [facts]);
  return { ...catalog, refreshKeys: [...catalog.refreshKeys, AGRI_FACTS_KEY] };
}

const ofKind = (test: (k: AgriKind) => boolean) => (i: PosItem) => test(i.meta?.kind as AgriKind);

const filters: PosFilter[] = [
  { id: 'seed', label: 'Beej', icon: Sprout, match: ofKind(isSeedKind) },
  { id: 'fert', label: 'Khaad', icon: FlaskConical, match: ofKind(isFertKind) },
  { id: 'spray', label: 'Spray / dawa', icon: Bug, match: ofKind(isSprayKind) },
  { id: 'feed', label: 'Feed', icon: PawPrint, match: ofKind(isFeedKind) },
  { id: 'tool', label: 'Auzaar', icon: Wrench, match: ofKind(isToolKind) },
  { id: 'bulk', label: 'Bulk rate', icon: Tags, match: (i) => Number(i.meta?.bulkMin) > 0 },
];

/** Restricted items already noted on this bill session. */
const warned = new Set<string>();

export const agriPos: PosIndustryConfig = {
  id: 'agri',
  label: 'Agri',
  useCatalog: useAgriCatalog,
  useBundles: useComboBundles,
  quickKeys: true,
  voice: true,
  filters,
  searchHint: 'Naam, fasal (gandum), keera (sundi), formula ya barcode…',
  receiptFooter: 'Spray karte waqt mask aur dastane pehnein. Khula beej aur khuli dawa wapas nahi hoti.',
  CartExtra: FarmerStrip,
  beforeAdd: (item) => {
    if (item.meta?.blocked) {
      toast.error(`${item.name}: ${String(item.meta.regText)}. Registration renew karwa kar product me nayi date likhein.`, { duration: 6000 });
      return 'handled';
    }
    if (item.meta?.restricted && !warned.has(item.id)) {
      warned.add(item.id);
      toast.info(`${item.name} pabandi wali dawa hai — license / ijazat dekh kar bechein`, { duration: 3000 });
    }
    return 'continue';
  },
  // The bulk rate holds while the line has the bulk quantity; a rate typed by hand is kept.
  repriceLine: (line, item) => {
    const min = Number(item.meta?.bulkMin || 0);
    const pct = Number(item.meta?.bulkPct || 0);
    if (!(min > 0) || !(pct > 0)) return undefined;
    const normal = line.basePrice;
    const rate = Math.round(normal * (1 - pct / 100) * 100) / 100;
    if (line.baseQuantity >= min) return rate;
    return Math.abs(line.unitPrice - rate) < 0.005 ? normal : undefined;
  },
  voiceAliases: {
    urea: 'urea khaad', dap: 'dap khaad', khaad: 'fertilizer khaad', beej: 'seed beej', gandum: 'gandum wheat', kapas: 'kapas cotton',
    spray: 'spray dawa', sundi: 'sundi insecticide', ghaas: 'herbicide weed', feed: 'feed', wanda: 'wanda cattle feed',
  },
};
