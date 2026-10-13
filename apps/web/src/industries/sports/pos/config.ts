/**
 * Sports shop POS on the shared engine: full catalog with sizes (variants),
 * combos and quick keys, udhaar and receipts. Cards show the sport and the
 * team price; the cashier can change the rate on the bill line for a team.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { Trophy, Users } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { useComboBundles, useProductCatalog, type PosFilter, type AddOptions, type PosEngineApi, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { sportsProductsApi, type SportsProductProfile } from '../api/products.api';

const SPORTS = ['Cricket', 'Football', 'Hockey', 'Badminton', 'Tennis', 'Table Tennis', 'Basketball', 'Squash', 'Gym / Fitness'];

const norm = (s?: string | null) => String(s ?? '').trim().toLowerCase();

function useSportsCatalog() {
  const { data: profiles = [] } = useQuery({
    queryKey: ['sports-profiles-pos'],
    queryFn: () => sportsProductsApi.list({}).catch(() => [] as SportsProductProfile[]),
    staleTime: 5 * 60_000,
  });
  const byProduct = useMemo(
    () => new Map((profiles as SportsProductProfile[]).map((p) => [p.productId, p])),
    [profiles],
  );

  const catalog = useProductCatalog((it): PosItem => {
    const p = byProduct.get(it.id);
    if (!p) return it;
    const teamPrice = Number(p.teamPrice || 0);
    return {
      ...it,
      searchText: [it.searchText, p.sport, p.categoryType].filter(Boolean).join(' '),
      badges: [
        ...(it.badges ?? []),
        ...(p.sport ? [{ label: p.sport, tone: 'info' as const, icon: Trophy }] : []),
        ...(p.isTeamOrderable ? [{ label: 'Team', tone: 'brand' as const, icon: Users }] : []),
      ],
      subline: teamPrice > 0 ? `Team rate ${formatPKR(teamPrice)}` : it.subline,
      meta: { ...(it.meta ?? {}), sport: norm(p.sport) },
    };
  }, [byProduct]);

  return { ...catalog, refreshKeys: [...catalog.refreshKeys, 'sports-profiles-pos'] };
}

const filters: PosFilter[] = SPORTS.map((s) => ({ id: `sport-${s}`, label: s, match: (i) => i.meta?.sport === norm(s) }));


/** Products already checked this session for older variant stock. */
const variantStockChecked = new Set<string>();

/**
 * Before the size/colour picker opens, older variant products get their
 * units moved from the product row to the variant rows (server checks it is
 * exact), so the POS can sell the chosen variant.
 */
function prepareVariants(item: PosItem, opts: AddOptions, api: PosEngineApi): 'continue' | 'handled' {
  if (!item.hasVariants || opts.variant || variantStockChecked.has(item.id)) return 'continue';
  variantStockChecked.add(item.id);
  apiClient.post(`/sports/products/${item.id}/variant-stock-split`)
    .catch(() => undefined)
    .finally(() => api.addItem(item, opts));
  return 'handled';
}

export const sportsPos: PosIndustryConfig = {
  id: 'sports',
  label: 'Sports',
  useCatalog: useSportsCatalog,
  useBundles: useComboBundles,
  quickKeys: true,
  filters,
  beforeAdd: prepareVariants,
  searchHint: 'Naam, SKU, barcode ya sport likhein',
};
