/**
 * Bookstore items on the shared products page: author, publisher, edition
 * and class under every book, ISBN in search results, stationery brand and
 * type, and links to school lists, publishers and rentals.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Building2, ClipboardList, GraduationCap, Pencil, ScanLine, Timer } from 'lucide-react';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { bookProfilesApi } from '../api/book-profiles.api';
import { factLine, isbnOf, useBookFacts } from '../hooks/useBookFacts';

function HeroLinks() {
  return (
    <>
      <Link to="/bookstore/school-lists" className={heroButton}><ClipboardList className="h-4 w-4" /><span className="hidden sm:inline">School lists</span></Link>
      <Link to="/bookstore/publishers" className={heroButton}><Building2 className="h-4 w-4" /><span className="hidden sm:inline">Publishers</span></Link>
    </>
  );
}

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';

const base: Omit<ProductsPageConfig, 'extras' | 'columns'> = {
  label: 'Bookstore',
  noun: 'item',
  paths: {
    detail: (id) => `/bookstore-products/${id}`,
    edit: (id) => `/bookstore-products/${id}/edit`,
    create: '/bookstore-products/new',
  },
  HeroExtra: HeroLinks,
  filters: ['tags'],
  stockChips: () => [1, 10, 50, 100],
  // A scanned ISBN that is only on a book's details (not its barcode) still opens the book.
  onScanMiss: async (code, navigate) => {
    const b = await bookProfilesApi.byIsbn(code).catch(() => null);
    if (!b) return false;
    navigate(`/bookstore-products/${b.productId}`);
    return true;
  },
  guide: [
    { icon: ScanLine, color: '#0891b2', title: 'ISBN', text: 'Kitab ki pusht wala ISBN barcode scan karein — wohi kitab khul jati hai. Naye ISBN par nayi kitab banayein.' },
    { icon: GraduationCap, color: '#7c3aed', title: 'Class aur subject', text: 'Textbook par class, subject aur board likha ho to School list banana aur POS par dhoondna aasaan hai.' },
    { icon: Pencil, color: '#16a34a', title: 'Dozen aur pack', text: 'Copy, pencil jaisi cheezein piece me rakhein aur Price step me Dozen ya Pack jorein — dono tarah bikti hain.' },
    { icon: Timer, color: '#d97706', title: 'Kiraye wali kitab', text: 'Jis kitab par "Kiraya" laga hai wo Book rentals se kiraye par di ja sakti hai.' },
  ],
};

export default function BookstoreProducts() {
  const facts = useBookFacts();
  const config = useMemo<ProductsPageConfig>(() => ({
    ...base,
    extras: (item) => {
      const f = facts.get(item.id);
      if (!f) return {};
      const isbn = isbnOf(f);
      return {
        line: factLine(f),
        badges: f.kind === 'BOOK' && f.isRentable ? <span className={`${chip} bg-amber-600 text-white`}><Timer className="h-3 w-3" />Kiraya</span> : null,
        chips: (
          <>
            {f.kind === 'BOOK' && <span className={`${chip} bg-sky-50 text-sky-700`}><BookOpen className="h-3 w-3" />{f.isTextbook ? 'Textbook' : 'Kitab'}</span>}
            {f.kind === 'BOOK' && f.isTextbook && f.board && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-600">{f.board}</span>}
            {isbn && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.6875rem] text-slate-600">{isbn}</span>}
            {f.kind === 'STATIONERY' && f.isSchoolItem && <span className={`${chip} bg-violet-50 text-violet-700`}>School</span>}
          </>
        ),
      };
    },
    columns: [
      { id: 'details', label: 'Author / publisher', cell: (i) => factLine(facts.get(i.id)) || <span className="text-slate-400">—</span> },
      { id: 'isbn', label: 'ISBN', cell: (i) => { const v = isbnOf(facts.get(i.id)); return v ? <span className="font-mono text-[0.8125rem]">{v}</span> : <span className="text-slate-400">—</span>; } },
    ],
  }), [facts]);
  return <ProductsPage config={config} />;
}
