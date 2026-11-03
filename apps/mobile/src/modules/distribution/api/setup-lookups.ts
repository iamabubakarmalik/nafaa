/**
 * Small lookups the manager setup screens need: team logins, godowns,
 * the customer roster, product search, brands, categories, suppliers and
 * money accounts. Same endpoints as the web pickers.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { usePermission, PERMISSIONS as P } from '@/core/permissions';
import { DIST_KEY } from './distribution.api';

export interface TeamLogin { id: string; fullName: string; role: string; isActive: boolean; permissions?: string[] }
export interface Godown { id: string; name: string; isActive: boolean }
export interface RosterCustomer {
  id: string; name: string; businessName?: string | null; phone?: string | null; area?: string | null; city?: string | null;
  balance?: number | null; isActive?: boolean; routeId?: string | null; priceListId?: string | null;
}
export interface ProductHit { id: string; name: string; sku?: string | null; unit?: string | null }
export interface NamedItem { id: string; name: string }
export interface MoneyAccount { id: string; name: string; bankName?: string | null }

const asList = <T,>(d: unknown): T[] => (Array.isArray(d) ? d : ((d as { items?: T[] } | null)?.items ?? [])) as T[];

export const lookups = {
  team: () => apiClient.get('/team').then((r) => asList<TeamLogin>(r.data)).catch(() => [] as TeamLogin[]),
  shops: () => apiClient.get('/shops').then((r) => asList<Godown>(r.data)),
  customers: (page: number) =>
    apiClient.get('/customers', { params: { scope: 'all', limit: 500, page } }).then((r) => r.data as { items: RosterCustomer[]; meta?: { total?: number } }),
  products: (search: string) =>
    apiClient.get('/products', { params: { search, limit: 12, isActive: true } }).then((r) => asList<ProductHit>(r.data)),
  brands: () => apiClient.get('/brands').then((r) => asList<NamedItem>(r.data)),
  categories: () => apiClient.get('/categories').then((r) => asList<NamedItem>(r.data)),
  suppliers: () => apiClient.get('/suppliers', { params: { limit: 200, status: 'active', sort: 'name' } }).then((r) => asList<NamedItem>(r.data)),
  moneyAccounts: () =>
    apiClient.get('/finance/money/money-accounts').then((r) => ((r.data as { accounts?: MoneyAccount[] } | null)?.accounts ?? [])),
};

export const useTeam = () => useQuery({ queryKey: ['team'], queryFn: lookups.team, staleTime: 5 * 60_000 });
export const useGodowns = () => useQuery({ queryKey: ['shops'], queryFn: lookups.shops, staleTime: 5 * 60_000 });

/** Every customer with route and price list, for the assign screens (pages of 500). */
export function useCustomerRoster(enabled = true) {
  const can = usePermission();
  return useQuery({
    queryKey: [DIST_KEY, 'roster'],
    queryFn: async () => {
      const out: RosterCustomer[] = [];
      for (let page = 1; page <= 20; page++) {
        const r = await lookups.customers(page);
        out.push(...(r.items ?? []));
        if (out.length >= (r.meta?.total ?? 0) || !r.items?.length) break;
      }
      return out;
    },
    enabled: enabled && can(P.CUSTOMERS_VIEW),
    staleTime: 60_000,
  });
}

export const partyOf = (c: Pick<RosterCustomer, 'name' | 'businessName'>) => c.businessName || c.name;
export const partySubOf = (c: Pick<RosterCustomer, 'name' | 'businessName' | 'area' | 'phone'>) =>
  [c.businessName ? c.name : null, c.area, c.phone].filter(Boolean).join(' · ');
