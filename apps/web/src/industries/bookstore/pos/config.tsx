/**
 * Bookstore counter on the shared POS engine. Books show their class and
 * ISBN (search by title, author, publisher or ISBN), filter chips split
 * books, textbooks, stationery and art, and every active school list sells
 * as a set from the Combos tab: whole at the set price, or only the books a
 * child still needs.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, GraduationCap, Palette, Pencil, Timer } from 'lucide-react';
import { useComboBundles, useProductCatalog, type PosBundle, type PosEngineApi, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { schoolListsApi, type PosSchoolList } from '../api/school-lists.api';
import { factLine, isbnOf, useBookFacts } from '../hooks/useBookFacts';
import { KEYS } from '../lib/meta';
import { SchoolSetPicker, lineRate } from './SchoolSetPicker';

const SET_PREFIX = 'school:';

function useBookCatalog() {
  const facts = useBookFacts();
  const catalog = useProductCatalog((it): PosItem => {
    const f = facts.get(it.id);
    if (!f) return { ...it, meta: { ...(it.meta ?? {}), kind: 'OTHER' } };
    const isbn = isbnOf(f);
    const book = f.kind === 'BOOK' ? f : null;
    return {
      ...it,
      subline: factLine(f) ?? it.subline,
      searchText: [it.searchText, isbn, book?.isbn10, ...(book?.authors ?? []), book?.publisher, book?.grade, book?.subject, f.kind !== 'BOOK' ? f.brand : null].filter(Boolean).join(' '),
      badges: [
        ...(it.badges ?? []),
        ...(book?.isTextbook && book.grade ? [{ label: book.grade, tone: 'brand' as const, icon: GraduationCap }] : []),
        ...(book?.isRentable ? [{ label: 'Kiraya', tone: 'info' as const, icon: Timer }] : []),
      ],
      meta: { ...(it.meta ?? {}), kind: f.kind, textbook: !!book?.isTextbook, isbn },
    };
  }, [facts]);
  return { ...catalog, refreshKeys: [...catalog.refreshKeys, KEYS.facts, KEYS.posLists] };
}

/** Lists by bundle id, so the picker can open the right list. */
const listsById = new Map<string, PosSchoolList>();

/** Price of a set: the list's own price, less lines that are not in the catalog. */
function setPrice(l: PosSchoolList): number {
  const required = l.items.filter((i) => !i.isOptional);
  if (required.every((i) => i.productId) && l.bundlePrice != null) return l.bundlePrice;
  return Math.round(required.filter((i) => i.productId).reduce((s, i) => s + lineRate(i, l.discountPct) * i.quantity, 0) * 100) / 100;
}

function useSchoolSets(): PosBundle[] {
  const combos = useComboBundles();
  const { data = [] } = useQuery({
    queryKey: [KEYS.posLists],
    queryFn: () => schoolListsApi.forPos().catch(() => [] as PosSchoolList[]),
    staleTime: 60_000,
  });
  return useMemo(() => {
    listsById.clear();
    const sets = data
      .filter((l) => l.items.some((i) => i.productId && !i.isOptional))
      .map((l): PosBundle => {
        listsById.set(SET_PREFIX + l.id, l);
        const lines = l.items.filter((i) => i.productId && !i.isOptional);
        const orig = lines.reduce((s, i) => s + (i.currentPrice ?? i.unitPrice) * i.quantity, 0);
        const price = setPrice(l);
        return {
          id: SET_PREFIX + l.id,
          name: `📚 ${l.school.name} — ${l.grade}${l.section ? ` ${l.section}` : ''}`,
          price,
          sku: l.title,
          savings: Math.max(Math.round((orig - price) * 100) / 100, 0),
          savingsPct: orig > 0 ? Math.max(Math.round(((orig - price) / orig) * 1000) / 10, 0) : 0,
          items: lines.map((i) => ({ productId: i.productId!, quantity: i.quantity, originalPrice: i.currentPrice ?? i.unitPrice })),
        };
      });
    return [...sets, ...combos];
  }, [data, combos]);
}

/** A school set opens the picker; shop combos go straight on the bill. */
function pickSet(bundle: PosBundle, _qty: number, api: PosEngineApi): 'continue' | 'handled' {
  const list = listsById.get(bundle.id);
  if (!list) return 'continue';
  api.openPicker(<SchoolSetPicker list={list} bundle={bundle} api={api} />);
  return 'handled';
}

const filters: PosFilter[] = [
  { id: 'books', label: 'Kitaben', icon: BookOpen, match: (i) => i.meta?.kind === 'BOOK' },
  { id: 'textbooks', label: 'School ki kitaben', icon: GraduationCap, match: (i) => !!i.meta?.textbook },
  { id: 'stationery', label: 'Stationery', icon: Pencil, match: (i) => i.meta?.kind === 'STATIONERY' },
  { id: 'art', label: 'Art', icon: Palette, match: (i) => i.meta?.kind === 'ART' },
];

export const bookstorePos: PosIndustryConfig = {
  id: 'bookstore',
  label: 'Bookstore',
  useCatalog: useBookCatalog,
  useBundles: useSchoolSets,
  beforeAddBundle: pickSet,
  quickKeys: true,
  filters,
  searchHint: 'Kitab, author, publisher, ISBN ya class',
};
