/** Bookstore item detail on the shared product page: ISBN, authors, publisher, edition, class and rental terms, or the stationery type and brand. */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardList, GraduationCap, Timer } from 'lucide-react';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { bookProfilesApi, type BookProfile } from '../api/book-profiles.api';
import { stationeryProfilesApi, type StationeryProfile } from '../api/stationery-profiles.api';
import { artSupplyProfilesApi, type ArtSupplyProfile } from '../api/art-supply-profiles.api';
import { ART_CATEGORIES, BINDINGS, BOOK_CATEGORIES, CONDITIONS, STATIONERY_CATEGORIES, labelOf } from '../lib/meta';

interface Extra { book: BookProfile | null; stationery: StationeryProfile | null; art: ArtSupplyProfile | null }

const pill = 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.75rem] font-semibold';

const config: DetailConfig<Extra> = {
  label: 'Bookstore',
  paths: { list: '/products', edit: (id) => `/bookstore-products/${id}/edit` },
  stockChips: [1, 5, 10, 50],
  extra: {
    key: 'bookstore-product-detail',
    load: async (id) => {
      const [book, stationery, art] = await Promise.all([
        bookProfilesApi.byProduct(id).catch(() => null),
        stationeryProfilesApi.byProduct(id).catch(() => null),
        artSupplyProfilesApi.byProduct(id).catch(() => null),
      ]);
      return { book, stationery, art };
    },
  },
  badges: ({ extra }) => {
    const b = extra?.book;
    if (b) return (
      <>
        <span className={`${pill} bg-sky-50 text-sky-700 ring-1 ring-sky-200`}><BookOpen className="h-3 w-3" />{labelOf(BOOK_CATEGORIES, b.category)}</span>
        {b.isTextbook && b.grade && <span className={`${pill} bg-violet-50 text-violet-700 ring-1 ring-violet-200`}><GraduationCap className="h-3 w-3" />{[b.grade, b.subject].filter(Boolean).join(' · ')}</span>}
        {b.isRentable && <span className={`${pill} bg-amber-50 text-amber-800 ring-1 ring-amber-200`}><Timer className="h-3 w-3" />Kiraye par</span>}
      </>
    );
    const s = extra?.stationery ?? extra?.art;
    return s ? <span className={`${pill} bg-slate-100 text-slate-700`}>{labelOf(extra?.stationery ? STATIONERY_CATEGORIES : ART_CATEGORIES, s.category)}</span> : null;
  },
  facts: ({ extra, money }) => {
    const b = extra?.book;
    if (b) {
      const authors = (b.bookAuthors ?? []).map((a: { author?: { name: string } }) => a.author?.name).filter(Boolean).join(', ');
      const rows: Array<[string, ReactNode]> = [
        ['ISBN-13', b.isbn13 && <span className="font-mono">{b.isbn13}</span>], ['ISBN-10', b.isbn10 && <span className="font-mono">{b.isbn10}</span>],
        ['Author', authors || undefined], ['Publisher', b.publisher?.name], ['Edition', [b.edition, b.publishYear].filter(Boolean).join(' · ') || undefined],
        ['Zubaan', b.language], ['Jild', labelOf(BINDINGS, b.binding)], ['Haalat', labelOf(CONDITIONS, b.condition)],
        ['Board', b.isTextbook ? b.board : undefined],
        ['Kiraya', b.isRentable ? `${money(b.rentalPricePerWeek)} / hafta · deposit ${money(b.rentalDeposit)}` : undefined],
      ];
      return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
    }
    const s = extra?.stationery ?? extra?.art;
    if (!s) return [];
    const rows: Array<[string, ReactNode]> = [['Brand', s.brand], ['Rang', s.color], ['Size', s.size]];
    return rows.filter(([, v]) => !!v);
  },
  alerts: ({ extra }) => (extra?.book?.isTextbook ? (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-violet-50 px-4 py-3 text-violet-900 ring-1 ring-violet-200">
      <ClipboardList className="h-4 w-4" />
      <span className="text-[0.875rem] font-medium">School season se pehle stock dekh lein — ye kitab jin school lists me hai wahan se set bikta hai.</span>
      <Link to="/bookstore/school-lists" className="ml-auto text-[0.8125rem] font-semibold hover:underline">School lists →</Link>
    </div>
  ) : null),
  guide: [
    { icon: BookOpen, color: '#0891b2', title: 'Kitab ki tafseel', text: 'ISBN, author, publisher aur edition Edit se badlein. Naye edition ko alag item banayein.' },
  ],
};

export default function BookstoreProductDetail() {
  return <ProductDetailPage config={config} />;
}
