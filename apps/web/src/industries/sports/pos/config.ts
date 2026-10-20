/**
 * Sports shop POS on the shared engine: full catalog with sizes (variants),
 * combos and quick keys, udhaar and receipts. Cards show the sport, the
 * team rate and Sale (below MRP); sport filter chips. A line at or above
 * the product's team quantity moves to the team rate (bulk rate) by
 * itself. Older size products whose units sat on the product row are
 * moved to their sizes once.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgePercent, Trophy, Users } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { useComboBundles, useProductCatalog, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { sportsProductsApi, type SportsMeta } from '../api/products.api';
import { META_KEY, SPORTS, typeLabel } from '../components/meta';

const norm = (s?: string | null) => String(s ?? '').trim().toLowerCase();

function useSportsCatalog() {
  const metaQ = useQuery({ queryKey: [META_KEY], queryFn: sportsProductsApi.meta, staleTime: 5 * 60_000, retry: 1 });
  const byProduct = useMemo(() => new Map<string, SportsMeta>((metaQ.data?.items ?? []).map((p) => [p.productId, p])), [metaQ.data]);

  const catalog = useProductCatalog((it): PosItem => {
    const p = byProduct.get(it.id);
    if (!p) return it;
    const teamPrice = Number(p.teamPrice || 0);
    const onSale = !!p.mrp && p.mrp > Number(it.price) && Number(it.price) > 0;
    return {
      ...it,
      searchText: [it.searchText, p.sport, typeLabel(p.categoryType)].filter(Boolean).join(' '),
      badges: [
        ...(it.badges ?? []),
        ...(onSale ? [{ label: `Sale ${Math.round(((p.mrp! - Number(it.price)) / p.mrp!) * 100)}%`, tone: 'danger' as const, icon: BadgePercent }] : []),
        ...(p.sport ? [{ label: p.sport, tone: 'info' as const, icon: Trophy }] : []),
        ...(p.isTeamOrderable ? [{ label: 'Team', tone: 'brand' as const, icon: Users }] : []),
      ],
      subline: teamPrice > 0 ? `Team rate ${formatPKR(teamPrice)}` : onSale ? `MRP ${formatPKR(p.mrp!)}` : it.subline,
      meta: { ...(it.meta ?? {}), sport: norm(p.sport), teamPrice: teamPrice > 0 && teamPrice < Number(it.price) ? teamPrice : null, teamMin: Number(p.minTeamOrder || 0) },
    };
  }, [byProduct]);

  return { ...catalog, refreshKeys: [...catalog.refreshKeys, META_KEY] };
}

const filters: PosFilter[] = SPORTS.filter((s) => s !== 'Other').map((s) => ({ id: `sport-${s}`, label: s, match: (i) => i.meta?.sport === norm(s) }));

/** Products already checked this session for older variant stock. */
const variantStockChecked = new Set<string>();

export const sportsPos: PosIndustryConfig = {
  id: 'sports',
  label: 'Sports',
  useCatalog: useSportsCatalog,
  useBundles: useComboBundles,
  quickKeys: true,
  filters,
  searchHint: 'Naam, SKU, barcode ya sport likhein',
  repriceLine: (line, item) => {
    const team = Number(item.meta?.teamPrice || 0);
    const min = Number(item.meta?.teamMin || 0);
    if (!(team > 0) || !(min > 1)) return undefined;
    const rate = team * line.conversionRate;
    const normal = line.basePrice;
    if (!(rate < normal)) return undefined;
    if (line.baseQuantity >= min) return rate;
    // Back under the team quantity: only undo the team rate, never a rate typed by hand.
    return Math.abs(line.unitPrice - rate) < 0.005 ? normal : undefined;
  },
  beforeAdd: (item, opts, api) => {
    if (!item.hasVariants || opts.variant || variantStockChecked.has(item.id)) return 'continue';
    variantStockChecked.add(item.id);
    void sportsProductsApi.splitVariantStock(item.id).catch(() => undefined).finally(() => api.addItem(item, opts));
    return 'handled';
  },
};
