/**
 * Categories, brands and tags: the plain lists the pickers use, and the
 * setup pages' shape (each item with its figures, create, edit, merge,
 * delete), same endpoints as the web.
 */

import { apiClient } from '@/core/api/client';

export type TaxonomyKind = 'category' | 'brand' | 'tag';

export interface Category {
  id: string; name: string; color: string; icon?: string | null; isActive: boolean;
  /** Null for a top-level category. */
  parentId?: string | null; sortOrder?: number;
  /** Optional industry kind (agri: SEEDS ...); empty means none. */
  kind?: string | null;
  _count?: { products: number; children?: number };
}
export interface Brand { id: string; name: string; logoUrl?: string | null; isActive: boolean; _count?: { products: number } }
export interface Tag { id: string; name: string; color?: string | null; _count?: { products: number } }

export interface TaxonomyStats {
  products: number; activeProducts: number; stockUnits: number; stockValue: number; lowStock: number; outOfStock: number;
  revenue: number; quantity: number; profit: number;
}

export interface TaxonomyItem {
  id: string; name: string; color?: string; icon?: string | null; logoUrl?: string | null; isActive: boolean; isFeatured?: boolean;
  createdAt: string; stats: TaxonomyStats | null;
  [extra: string]: unknown;
}

export interface TaxonomyInsights {
  items: TaxonomyItem[];
  totals: { count: number; active: number; unlinked: number; totalProducts: number; revenue: number; stockValue: number };
}

const PATH: Record<TaxonomyKind, string> = { category: '/categories', brand: '/brands', tag: '/tags' };
const asList = <T,>(d: unknown): T[] => (Array.isArray(d) ? d : ((d as { items?: T[] })?.items ?? [])) as T[];

export function taxonomyApi(kind: TaxonomyKind) {
  const base = PATH[kind];
  return {
    list: <T = TaxonomyItem>() => apiClient.get(base).then((r) => asList<T>(r.data)),
    insights: (range?: { from: string; to: string } | null) => apiClient.get<TaxonomyInsights>(`${base}/insights`, { params: range ?? undefined }).then((r) => r.data),
    create: (payload: Record<string, unknown>) => apiClient.post<TaxonomyItem>(base, payload).then((r) => r.data),
    update: (id: string, payload: Record<string, unknown>) => apiClient.patch<TaxonomyItem>(`${base}/${id}`, payload).then((r) => r.data),
    merge: (id: string, intoId: string) => apiClient.post<{ moved: number; message: string }>(`${base}/${id}/merge`, { intoId }).then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string; freed?: number }>(`${base}/${id}`).then((r) => r.data),
  };
}

export const categoriesApi = taxonomyApi('category');
export const brandsApi = taxonomyApi('brand');
export const tagsApi = taxonomyApi('tag');
