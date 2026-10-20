/** Bookstore details per product (book, stationery, art), loaded once and shared by the products pages and the counter. */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookProfilesApi, type BookFact } from '../api/book-profiles.api';
import { ART_CATEGORIES, STATIONERY_CATEGORIES, KEYS, labelOf } from '../lib/meta';

export function useBookFacts() {
  const { data } = useQuery({ queryKey: [KEYS.facts], queryFn: () => bookProfilesApi.facts().catch(() => [] as BookFact[]), staleTime: 5 * 60_000 });
  return useMemo(() => new Map((data ?? []).map((f) => [f.productId, f])), [data]);
}

/** "Ali Raza · Oxford · 3rd ed" for a book; brand and type for stationery and art. */
export function factLine(f?: BookFact): string | undefined {
  if (!f) return undefined;
  if (f.kind === 'BOOK') {
    const parts = [f.authors.slice(0, 2).join(', '), f.publisher, f.edition ? `${f.edition} ed` : undefined, f.isTextbook ? [f.grade, f.subject].filter(Boolean).join(' ') : undefined];
    return parts.filter(Boolean).join(' · ') || undefined;
  }
  const list = f.kind === 'STATIONERY' ? STATIONERY_CATEGORIES : ART_CATEGORIES;
  return [labelOf(list, f.category), f.brand, f.color, f.size].filter(Boolean).join(' · ') || undefined;
}

export const isbnOf = (f?: BookFact) => (f?.kind === 'BOOK' ? f.isbn13 || f.isbn10 || undefined : undefined);
