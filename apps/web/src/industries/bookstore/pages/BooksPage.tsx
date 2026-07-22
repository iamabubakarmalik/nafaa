import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BookOpen, Search, RefreshCw, Sparkles, Star, TrendingUp, Award,
  BookMarked, Zap, Filter, Building2, Users,
} from 'lucide-react';
import { bookProfilesApi, type BookCategory } from '../api/book-profiles.api';
import { publishersApi } from '../api/publishers.api';
import { formatPKR } from '@core/lib/format';

const POPULAR_CATEGORIES: { value: BookCategory; label: string; emoji: string }[] = [
  { value: 'TEXTBOOK', label: 'Textbook', emoji: '📚' },
  { value: 'NOVEL', label: 'Novel', emoji: '📖' },
  { value: 'CHILDREN', label: 'Children', emoji: '🧒' },
  { value: 'QURAN', label: 'Quran', emoji: '🕌' },
  { value: 'ISLAMIC_STUDIES', label: 'Islamic', emoji: '☪️' },
  { value: 'BIOGRAPHY', label: 'Biography', emoji: '👤' },
  { value: 'HISTORY', label: 'History', emoji: '🏛️' },
  { value: 'POETRY', label: 'Poetry', emoji: '✒️' },
  { value: 'SELF_HELP', label: 'Self Help', emoji: '💪' },
  { value: 'BUSINESS', label: 'Business', emoji: '💼' },
  { value: 'SCIENCE', label: 'Science', emoji: '🔬' },
  { value: 'DICTIONARY', label: 'Dictionary', emoji: '📕' },
  { value: 'MAGAZINE', label: 'Magazine', emoji: '📰' },
  { value: 'COMICS', label: 'Comics', emoji: '💥' },
];

export default function BooksPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [publisherFilter, setPublisherFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const { data: publishers = [] } = useQuery({
    queryKey: ['publishers-for-books'],
    queryFn: () => publishersApi.list({ active: true }),
  });

  const { data: books = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['books', search, categoryFilter, publisherFilter, tagFilter],
    queryFn: () => bookProfilesApi.list({
      search: search.trim() || undefined,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      publisherId: publisherFilter || undefined,
      isBestSeller: tagFilter === 'bestseller' ? true : undefined,
      isNewArrival: tagFilter === 'new' ? true : undefined,
      isFeatured: tagFilter === 'featured' ? true : undefined,
      isAwardWinner: tagFilter === 'award' ? true : undefined,
      isRentable: tagFilter === 'rentable' ? true : undefined,
    }),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Book Catalog
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📖 Books</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Complete book catalog with ISBN, publishers & authors</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, ISBN, code..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCategoryFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (categoryFilter === 'all' ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Categories</button>
          {POPULAR_CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (categoryFilter === c.value ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{c.emoji} {c.label}</button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <select value={publisherFilter} onChange={(e) => setPublisherFilter(e.target.value)} className="h-9 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-xs font-bold focus:outline-none focus:border-blue-500">
            <option value="">All Publishers</option>
            {publishers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {[
            { v: 'all', label: 'All' },
            { v: 'bestseller', label: '🏆 Best Sellers' },
            { v: 'new', label: '✨ New' },
            { v: 'featured', label: '⭐ Featured' },
            { v: 'award', label: '🥇 Award Winner' },
            { v: 'rentable', label: '📚 Rentable' },
          ].map((t) => (
            <button key={t.v} onClick={() => setTagFilter(t.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (tagFilter === t.v ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{t.label}</button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-80 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <BookOpen className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No books found</p>
          <p className="text-xs text-slate-500 mt-1">Go to Products page to add book profiles</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {books.map((book) => {
            const cat = POPULAR_CATEGORIES.find((c) => c.value === book.category);
            const primaryAuthor = book.bookAuthors?.find((ba: any) => ba.role === 'AUTHOR')?.author;
            return (
              <Link key={book.id} to={'/products/' + book.productId + '/edit'} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition overflow-hidden">
                <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-500 via-cyan-600 to-teal-700 overflow-hidden">
                  {book.product?.images?.[0]?.url ? (
                    <img src={book.product.images[0].url} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-white">
                      <BookOpen className="h-12 w-12 mb-2" />
                      <div className="text-sm font-extrabold text-center line-clamp-3">{book.title}</div>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {book.isBestSeller && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
                        <TrendingUp className="h-2 w-2" />BEST
                      </span>
                    )}
                    {book.isNewArrival && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
                        <Sparkles className="h-2 w-2" />NEW
                      </span>
                    )}
                    {book.isAwardWinner && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
                        <Award className="h-2 w-2" />AWARD
                      </span>
                    )}
                    {book.isRentable && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
                        <BookMarked className="h-2 w-2" />RENT
                      </span>
                    )}
                  </div>

                  {book.condition !== 'NEW' && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-900/80 text-white text-[9px] font-extrabold uppercase shadow">
                      {book.condition.replace('USED_', '').replace('_', ' ')}
                    </div>
                  )}
                </div>

                <div className="p-3 space-y-1.5">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-2 leading-tight">{book.title}</h3>
                    {book.subtitle && <div className="text-[10px] italic text-slate-500 line-clamp-1">{book.subtitle}</div>}
                  </div>

                  {primaryAuthor && (
                    <div className="text-[10px] font-extrabold text-blue-600 truncate">by {primaryAuthor.name}</div>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {cat && <span className="text-[9px] font-extrabold uppercase text-slate-500">{cat.emoji} {cat.label}</span>}
                    {book.isTextbook && book.grade && (
                      <span className="text-[9px] font-extrabold uppercase text-violet-600">• {book.grade}</span>
                    )}
                  </div>

                  {book.isbn13 && (
                    <div className="text-[9px] font-mono text-slate-400">ISBN: {book.isbn13}</div>
                  )}

                  {book.publisher && (
                    <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold">
                      <Building2 className="h-2.5 w-2.5" />
                      {book.publisher.name}
                    </div>
                  )}

                  <div className="pt-1 flex items-end justify-between">
                    <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">{formatPKR(book.product?.price ?? 0)}</div>
                    {book.avgRating && (
                      <div className="text-[10px] font-extrabold text-amber-700 inline-flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        {book.avgRating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
