/**
 * Categories, brands and tags share one shape on the setup pages: each item
 * with its figures for a period, plus create, edit, merge and delete.
 */

import { apiClient } from '@core/api/client';

export type TaxonomyKind = 'category' | 'brand' | 'tag';

export interface TaxonomyStats {
  products: number;
  activeProducts: number;
  stockUnits: number;
  stockValue: number;
  lowStock: number;
  outOfStock: number;
  revenue: number;
  quantity: number;
  profit: number;
}

export interface TaxonomyItem {
  id: string;
  name: string;
  color?: string;
  icon?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  isFeatured?: boolean;
  createdAt: string;
  stats: TaxonomyStats | null;
  [extra: string]: unknown;
}

export interface TaxonomyInsights {
  items: TaxonomyItem[];
  totals: { count: number; active: number; unlinked: number; totalProducts: number; revenue: number; stockValue: number };
}

const PATH: Record<TaxonomyKind, string> = { category: '/categories', brand: '/brands', tag: '/tags' };
const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export function taxonomyApi(kind: TaxonomyKind) {
  const base = PATH[kind];
  return {
    insights: (range?: { from: string; to: string } | null) =>
      apiClient.get<{ data: TaxonomyInsights }>(`${base}/insights`, { params: range ?? undefined }).then(unwrap),
    create: (payload: Record<string, unknown>) => apiClient.post<{ data: TaxonomyItem }>(base, payload).then(unwrap),
    update: (id: string, payload: Record<string, unknown>) => apiClient.patch<{ data: TaxonomyItem }>(`${base}/${id}`, payload).then(unwrap),
    merge: (id: string, intoId: string) =>
      apiClient.post<{ data: { moved: number; message: string } }>(`${base}/${id}/merge`, { intoId }).then(unwrap),
    remove: (id: string) => apiClient.delete<{ data: { message: string; freed?: number } }>(`${base}/${id}`).then(unwrap),
  };
}
