/**
 * List state kept in the URL (search, page, page size and any filters), so a
 * filtered list can be shared, survives reload and Back returns to it.
 *
 *   const list = useListParams({ status: 'ALL' });
 *   list.search / list.debouncedSearch / list.page / list.limit / list.filters.status
 *   list.setSearch('ali'); list.setFilter('status', 'TRIAL'); list.setPage(2);
 *
 * Changing the search or a filter goes back to page 1.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export const PAGE_SIZES = [25, 50, 100] as const;

export function useListParams<F extends Record<string, string>>(defaults: F = {} as F, opts: { limit?: number } = {}) {
  const [params, setParams] = useSearchParams();
  const defaultLimit = opts.limit ?? 25;
  const search = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const limit = Number(params.get('limit')) || defaultLimit;
  const filters = useMemo(() => {
    const out = { ...defaults } as Record<string, string>;
    for (const key of Object.keys(defaults)) out[key] = params.get(key) ?? defaults[key];
    return out as F;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const update = useCallback((patch: Record<string, string | number | null>, resetPage = true) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        const isDefault = v === null || v === '' || (k in defaults && defaults[k] === v) || (k === 'limit' && v === defaultLimit) || (k === 'page' && v === 1);
        if (isDefault) next.delete(k); else next.set(k, String(v));
      }
      if (resetPage && !('page' in patch)) next.delete('page');
      return next;
    }, { replace: true });
  }, [setParams, defaults, defaultLimit]);

  // Search is typed into local state and written to the URL after a pause.
  const [draft, setDraft] = useState(search);
  useEffect(() => { setDraft(search); }, [search]);
  useEffect(() => {
    if (draft === search) return;
    const id = setTimeout(() => update({ q: draft.trim() || null }), 300);
    return () => clearTimeout(id);
  }, [draft, search, update]);

  const activeFilters = Object.keys(defaults).filter((k) => filters[k] !== defaults[k]);

  return {
    search: draft,
    debouncedSearch: search,
    page,
    limit,
    filters,
    activeFilters,
    setSearch: setDraft,
    setFilter: (key: keyof F & string, value: string) => update({ [key]: value }),
    setPage: (p: number) => update({ page: p }, false),
    setLimit: (l: number) => update({ limit: l }),
    clear: () => { setDraft(''); update(Object.fromEntries([['q', null], ...Object.keys(defaults).map((k) => [k, null])])); },
  };
}
