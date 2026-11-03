/**
 * Bookstore counter (web bookstore/pos/config.tsx) on the shared POS: search
 * by title, author, publisher, ISBN or class (the facts load in the background),
 * and every active school list sells as a set from the "School sets" tab.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { GraduationCap } from 'lucide-react-native';
import { isbnValid } from '@nafaa/core/industries/bookstore';
import { msg, t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { offline } from '@/core/offline';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { bookProfilesApi, schoolListsApi, type BookFact, type PosSchoolList } from './api';
import { SchoolSets } from './components/SchoolSets';
import { KEYS } from './meta';

export const bookstorePos: PosIndustryConfig = {
  ...generalPos,
  id: 'bookstore',
  searchHint: msg('Kitab, author, publisher, ISBN ya class'),
  /** A book whose ISBN is only on its details (not its barcode) still goes on the bill. */
  scan: async (code, api) => {
    if (await generalPos.scan?.(code, api)) return true;
    if (!isbnValid(code) || !isOnline() || (await offline.products.byBarcode(code, api.shopId).catch(() => null))) return false;
    const b = await bookProfilesApi.byIsbn(code).catch(() => null);
    return b ? api.addProduct(b.productId) : false;
  },
  extraView: { label: msg('School sets'), icon: GraduationCap, Component: SchoolSets },
  /** Class and school chips (from the books' class and the active school lists) and "Publisher · Class" under each book. */
  useShelf: () => {
    const facts = useQuery({ queryKey: [KEYS.facts], queryFn: () => bookProfilesApi.facts().catch(() => [] as BookFact[]), staleTime: 5 * 60_000 });
    const lists = useQuery({ queryKey: [KEYS.posLists], queryFn: () => schoolListsApi.forPos().catch(() => [] as PosSchoolList[]), staleTime: 60_000 });
    return useMemo(() => {
      const grade = new Map<string, string>();
      const schoolOf = new Map<string, Set<string>>();
      const publisher = new Map<string, string>();
      for (const f of facts.data ?? []) {
        if (f.kind === 'BOOK') { if (f.grade) grade.set(f.productId, f.grade.trim()); if (f.publisher) publisher.set(f.productId, f.publisher); }
      }
      for (const l of lists.data ?? []) {
        for (const it of l.items) {
          if (!it.productId) continue;
          if (!grade.has(it.productId) && l.grade) grade.set(it.productId, l.grade.trim());
          (schoolOf.get(it.productId) ?? schoolOf.set(it.productId, new Set()).get(it.productId)!).add(l.school.id);
        }
      }
      const grades = [...new Set(grade.values())].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(0, 14);
      const schools = [...new Map((lists.data ?? []).map((l) => [l.school.id, l.school.name])).entries()].slice(0, 10);
      return {
        filters: [
          ...(grades.length ? [{ key: 'class', label: t('Class'), options: grades.map((g) => ({ value: g, label: g })), match: (p: { id: string }, v: string) => grade.get(p.id) === v }] : []),
          ...(schools.length ? [{ key: 'school', label: t('School'), options: schools.map(([id, name]) => ({ value: id, label: name })), match: (p: { id: string }, v: string) => schoolOf.get(p.id)?.has(v) ?? false }] : []),
        ],
        subline: (p: { id: string }) => [publisher.get(p.id), grade.get(p.id)].filter(Boolean).join(' · ') || null,
      };
    }, [facts.data, lists.data]);
  },
};

registerPosIndustry(bookstorePos);
