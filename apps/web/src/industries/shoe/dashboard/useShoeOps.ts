/**
 * Shoe numbers for the dashboard: pairs and sizes in stock, missing sizes,
 * best-selling sizes, try-ons, exchanges and brands. Every shoe widget calls
 * this; React Query shares the requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { shoeDashboardApi } from '../api/dashboard.api';
import { shoeTryOnApi } from '../api/try-on.api';
import { shoeExchangesApi } from '../api/exchanges.api';

const MINUTE = 60_000;

interface VariantRow {
  id: string; productId: string; size: string; sizeSystem: string; width?: string;
  stock: number; lowStockAlert: number; boxNumber?: string | null;
}
interface BrandRow {
  id: string; name: string; logoUrl?: string | null; totalRevenue?: number | string | null;
  isPremium?: boolean; isLocal?: boolean; isSportsBrand?: boolean;
}
interface ShoeOverview {
  totals?: {
    totalBrands: number; totalProducts: number; totalSizeVariants: number; totalStockUnits: number;
    pendingTryOns: number; pendingExchanges: number; lowStockCount: number; outOfStockCount: number;
  };
  topBrands?: BrandRow[];
  lowStockVariants?: VariantRow[];
  outOfStockVariants?: VariantRow[];
}
interface TryOnSummary { pending: number; scheduled: number; completed: number; cancelled: number; conversion: number }
interface ExchangeSummary { requested: number; approved: number; completed: number; rejected: number }

export function useShoeOps() {
  const overview = useQuery<ShoeOverview | null>({
    queryKey: ['shoe-dashboard-overview'],
    queryFn: () => shoeDashboardApi.overview().catch(() => null),
    refetchInterval: MINUTE,
  });
  const sizes = useQuery<Array<{ size: string; sold: number }>>({
    queryKey: ['shoe-size-popularity'],
    queryFn: () => shoeDashboardApi.sizePopularity().catch(() => []),
    staleTime: 5 * MINUTE,
  });
  // Same keys as the try-on and exchange pages, so their updates refresh these.
  const tryOn = useQuery<TryOnSummary | null>({
    queryKey: ['shoe-try-on-summary'],
    queryFn: () => shoeTryOnApi.summary().catch(() => null),
    refetchInterval: 5 * MINUTE,
  });
  const exchanges = useQuery<ExchangeSummary | null>({
    queryKey: ['shoe-exchanges-summary'],
    queryFn: () => shoeExchangesApi.summary().catch(() => null),
    refetchInterval: 5 * MINUTE,
  });

  const o = overview.data;
  const gapCount = (o?.outOfStockVariants?.length ?? 0) + (o?.lowStockVariants?.length ?? 0);

  // Size variants carry only a product id; names come from the product list,
  // fetched only when there is a missing size to show.
  const products = useQuery({
    queryKey: ['shoe-all-products'],
    queryFn: () => fetchAllProducts({ isActive: true }),
    staleTime: 5 * MINUTE,
    enabled: gapCount > 0,
  });

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    (products.data?.items ?? []).forEach((p: { id: string; name: string }) => m.set(p.id, p.name));
    return m;
  }, [products.data]);

  return useMemo(() => {
    const totals = o?.totals ?? {
      totalBrands: 0, totalProducts: 0, totalSizeVariants: 0, totalStockUnits: 0,
      pendingTryOns: 0, pendingExchanges: 0, lowStockCount: 0, outOfStockCount: 0,
    };
    const tag = (v: VariantRow, out: boolean) => ({ ...v, out, name: nameById.get(v.productId) ?? null });
    const gaps = [
      ...(o?.outOfStockVariants ?? []).map((v) => tag(v, true)),
      ...(o?.lowStockVariants ?? []).map((v) => tag(v, false)),
    ];
    const topSizes = (sizes.data ?? []).filter((s) => s.sold > 0).slice(0, 8);
    const t = tryOn.data;
    const x = exchanges.data;
    return {
      loading: overview.isLoading,
      totals,
      gaps,
      topSizes,
      tryOn: { pending: t?.pending ?? totals.pendingTryOns, scheduled: t?.scheduled ?? 0, completed: t?.completed ?? 0, conversion: t?.conversion ?? 0 },
      exchanges: { requested: x?.requested ?? totals.pendingExchanges, approved: x?.approved ?? 0, completed: x?.completed ?? 0 },
      brands: o?.topBrands ?? [],
    };
  }, [o, overview.isLoading, sizes.data, tryOn.data, exchanges.data, nameById]);
}
