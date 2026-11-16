/**
 * Category kinds on the web: the options come from the current industry pack
 * (`categoryKinds`), and the kind of a category is its own or the nearest
 * parent's. Industries without kinds get no options and show no kind select.
 */

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { categoriesApi, type Category } from '../api/categories.api';

/** Kind options of this shop's industry, or null when it uses none. */
export function useCategoryKinds(): Array<{ value: string; label: string }> | null {
  const kinds = useCurrentIndustry()?.categoryKinds;
  return kinds && kinds.length ? kinds : null;
}

/** Own kind, else the nearest parent's; null when the chain has none. */
export function nearestKind(cats: Array<Pick<Category, 'id' | 'parentId' | 'kind'>>, id: string | null | undefined): string | null {
  const byId = new Map(cats.map((c) => [c.id, c]));
  const seen = new Set<string>();
  let cur = id ? byId.get(id) : undefined;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    if (cur.kind) return cur.kind;
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return null;
}

/**
 * Keeps an industry editor's type field in step with the picked category: when the
 * category chain has a kind, `apply` gets it. With no kind the field is left as it is,
 * so an old product keeps its own value.
 */
export function useCategoryKindSync(categoryId: string | null | undefined, current: string | null | undefined, apply: (kind: string) => void) {
  const { data = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });
  const kind = nearestKind(data, categoryId);
  useEffect(() => {
    if (kind && kind !== current) apply(kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, current]);
  return kind;
}

/** Names of a category and its parents, own name first; empty when none is picked. */
export function categoryNames(cats: Array<Pick<Category, 'id' | 'parentId' | 'name'>>, id: string | null | undefined): string[] {
  const byId = new Map(cats.map((c) => [c.id, c]));
  const out: string[] = [];
  const seen = new Set<string>();
  let cur = id ? byId.get(id) : undefined;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    out.push(cur.name);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return out;
}

/**
 * Keeps an industry field in step with the picked category's name, for packs
 * whose type reads naturally from it (pharmacy "Tablets" gives form Tablet).
 * `derive` gets the names (own first) and returns the value, or null to leave
 * the field as it is. It runs only when the user picks another category, so a
 * saved value is never rewritten just by opening the product.
 */
export function useCategoryNameSync(categoryId: string | null | undefined, derive: (names: string[]) => string | null, apply: (value: string) => void) {
  const { data = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });
  const names = categoryNames(data, categoryId);
  const key = names.join('\u0000');
  const base = useRef<string | null>(categoryId ?? null);
  useEffect(() => {
    const id = categoryId ?? null;
    if (id === base.current) return;
    if (id === null) { base.current = null; return; }
    // A category made a moment ago appears once the list reloads.
    if (!names.length) return;
    base.current = id;
    const v = derive(names);
    if (v) apply(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, key]);
  return names;
}
