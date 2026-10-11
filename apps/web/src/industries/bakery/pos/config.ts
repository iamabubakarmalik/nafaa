/**
 * Bakery POS: items about to expire come first and carry their hours left;
 * expired batches and zero-stock items ask before selling (fresh from the
 * oven is often not in stock yet). Slice/pound/dozen rates from the bakery
 * profile become units.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Cake, Flame, Package, Snowflake, Timer } from 'lucide-react';
import { createElement } from 'react';
import { formatPKR } from '@core/lib/format';
import { productEmoji } from '@modules/inventory/products/lib/productEmoji';
import { useComboBundles, useProductCatalog, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { unitEmoji, unitKeyOf, type PosUnitOption } from '@modules/pos/lib/posUnits';
import { bakeryProductsApi, type BakeryProduct } from '../api/products.api';
import { freshnessApi, type FreshnessLog } from '../api/freshness.api';
import { extraUnitsFor, priceField, rateBetween, unitDef } from '../lib/bakeryUnits';

/** Under this many hours left, an item is "sell first". */
const URGENT_HOURS = 12;

function useBakeryCatalog() {
  const { data: profiles = [] } = useQuery({
    queryKey: ['bakery-profiles-all'],
    queryFn: () => bakeryProductsApi.list({}).catch(() => [] as BakeryProduct[]),
    staleTime: 5 * 60_000,
  });
  const { data: logs = [] } = useQuery({
    queryKey: ['bakery-freshness-pos'],
    queryFn: () => freshnessApi.list({}).catch(() => [] as FreshnessLog[]),
    staleTime: 60_000,
  });

  const profileBy = useMemo(() => new Map((profiles as BakeryProduct[]).filter((p) => p.productId).map((p) => [p.productId!, p])), [profiles]);
  // Soonest-expiring live batch per product, in hours.
  const hoursLeft = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of logs as FreshnessLog[]) {
      if (f.status === 'DISCARDED' || Number(f.currentQty) <= 0 || !f.productId) continue;
      const t = new Date(f.expiryDate || f.bestBefore).getTime();
      if (Number.isNaN(t)) continue;
      const left = (t - Date.now()) / 3_600_000;
      if (left < URGENT_HOURS) m.set(f.productId, Math.min(m.get(f.productId) ?? Infinity, left));
    }
    return m;
  }, [logs]);

  const catalog = useProductCatalog((it): PosItem => {
    const profile = profileBy.get(it.id);
    const left = hoursLeft.get(it.id);
    const expired = left !== undefined && left <= 0;
    const soon = left !== undefined && left > 0;
    const made = !!profile && !!(profile.isCakeCustomizable || profile.isCustomizable);
    const slice = Number(profile?.pricePerSlice || 0);
    const badges = [
      ...(expired ? [{ label: 'Waqt guzra', tone: 'danger' as const, icon: Flame }] : []),
      ...(soon ? [{ label: `${Math.max(1, Math.round(left!))}h baqi`, tone: 'warning' as const, icon: Timer }] : []),
      ...(profile?.requiresRefrigeration ? [{ label: 'Fridge', tone: 'info' as const, icon: Snowflake }] : []),
    ];
    return {
      ...it,
      badges,
      rank: soon ? 0 : expired || it.stock <= 0 ? 3 : 1,
      dim: expired,
      subline: slice > 0 ? `per ${it.unit} · slice ${formatPKR(slice)}` : undefined,
      meta: { profile, hoursLeft: left, made },
    };
  }, [profileBy, hoursLeft]);

  return { ...catalog, refreshKeys: [...catalog.refreshKeys, 'bakery-all-products', 'bakery-freshness-pos', 'freshness-logs'] };
}

/** Slice / pound / dozen rates from the bakery profile, when no unit of that name exists. */
function bakeryUnits(item: PosItem, units: PosUnitOption[]): PosUnitOption[] {
  const profile = item.meta?.profile as BakeryProduct | undefined;
  if (!profile) return units;
  const base = (item.unit || 'pcs').toLowerCase();
  const have = new Set(units.map((u) => unitKeyOf(u.unitName)));
  const out = [...units];
  for (const k of extraUnitsFor(base)) {
    const price = Number((profile as unknown as Record<string, unknown>)[priceField[k]] || 0);
    if (price <= 0) continue;
    const def = unitDef(k);
    if (have.has(unitKeyOf(k)) || have.has(unitKeyOf(def.label))) continue;
    out.push({
      id: `bk-${k}`, unitName: k, label: String(def.label).toUpperCase(), emoji: def.emoji || unitEmoji(k),
      conversionRate: rateBetween(k, base, { weightGrams: profile.weightGrams, slices: profile.numberOfSlices }) || 1,
      price, wholesalePrice: null,
    } as PosUnitOption);
    have.add(unitKeyOf(k));
  }
  return out;
}

export const bakeryPos: PosIndustryConfig = {
  id: 'bakery',
  label: 'Bakery',
  useCatalog: useBakeryCatalog,
  useBundles: useComboBundles,
  quickKeys: true,
  extraUnits: bakeryUnits,
  filters: [
    { id: 'urgent', label: 'Jald bechna', icon: Timer, match: (i) => i.meta?.hoursLeft !== undefined },
    { id: 'made', label: 'Khud banaya', icon: Cake, match: (i) => !!i.meta?.made },
    { id: 'bought', label: 'Bahar se', icon: Package, match: (i) => !i.meta?.made },
  ],
  beforeAdd: (item, opts, api) => {
    const left = item.meta?.hoursLeft as number | undefined;
    const confirmed = opts.confirmed ?? [];
    if (left !== undefined && left <= 0 && !confirmed.includes('expired')) {
      toast.error(`${item.name} — taazgi ka waqt guzar chuka`, {
        description: 'Batch check kar lein, kharab maal na bike', duration: 8000,
        action: { label: 'Phir bhi bechein', onClick: () => api.addItem(item, { ...opts, confirmed: [...confirmed, 'expired'] }) },
      });
      return 'handled';
    }
    if (item.stock <= 0 && !opts.oversell) {
      toast.error(`${item.name} — stock 0 hai`, {
        description: 'Abhi bana hai aur stock mein nahi chadha?', duration: 8000,
        action: { label: 'Phir bhi bechein', onClick: () => api.addItem(item, { ...opts, oversell: true }) },
      });
      return 'handled';
    }
    if (left !== undefined && left > 0 && !api.cart.some((l) => l.productId === item.id)) {
      toast.info(`${item.name} ${Math.max(1, Math.round(left))} ghante mein kharab hoga`, { description: 'Bill mein rate par click kar ke discount de sakte hain', duration: 2500 });
    }
    return 'continue';
  },
  cardFallback: (item) => createElement('span', { className: 'text-4xl' }, productEmoji(item.name, item.categoryName)),
  voiceAliases: {
    cake: 'cake', pastry: 'pastry', patty: 'patty patties', samosa: 'samosa', rusk: 'rusk papay', papay: 'rusk papay',
    'double roti': 'bread double roti', bread: 'bread double roti', bun: 'bun', 'nan khatai': 'nan khatai',
    biscuit: 'biscuit cookies', cookies: 'biscuit cookies', pizza: 'pizza', sandwich: 'sandwich', mithai: 'mithai sweet',
  },
  searchHint: 'Cake, patties, bread… ya barcode scan karein',
};
