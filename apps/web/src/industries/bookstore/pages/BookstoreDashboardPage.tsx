import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BookOpen, Users, Package, School, Palette, Building2, Award,
  Sparkles, RefreshCw, ArrowRight, TrendingUp, AlertCircle, Star,
  BookMarked, Zap, Clock, PenTool, Newspaper,
} from 'lucide-react';
import { bookstoreDashboardApi } from '../api/dashboard.api';
import { Button } from '@core/ui/Button';
import { format, differenceInDays } from 'date-fns';

export default function BookstoreDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bookstore-dashboard'],
    queryFn: () => bookstoreDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const totals = overview?.totals ?? { publishers: 0, authors: 0, books: 0, stationery: 0, artSupplies: 0, schools: 0 };
  const operations = overview?.operations ?? { activeSchoolLists: 0, activeRentals: 0, overdueRentals: 0 };
  const catalog = overview?.catalog ?? { bestSellers: 0, newArrivals: 0, featuredBooks: 0 };
  const overdueDetail = overview?.overdueDetail ?? [];
  const booksByCategory = overview?.booksByCategory ?? [];
  const booksByPublisher = overview?.booksByPublisher ?? [];
  const textbooksByGrade = overview?.textbooksByGrade ?? [];

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-teal-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Bookstore Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              📚 Bookstore, Stationery & Art
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Books, stationery, art supplies, school lists — sab ek jagah
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/bookstore/school-lists">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <School className="h-4 w-4" />
                Create School List
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* URGENT ALERTS */}
      {(operations.overdueRentals > 0 || operations.activeRentals > 0) && (
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {operations.overdueRentals > 0 && (
            <AlertCard label="Overdue Rentals" value={operations.overdueRentals} icon={AlertCircle} to="/bookstore/rentals?filter=overdue" color="rose" />
          )}
          <AlertCard label="Active Rentals" value={operations.activeRentals} icon={BookMarked} to="/bookstore/rentals" color="blue" />
          <AlertCard label="Active School Lists" value={operations.activeSchoolLists} icon={School} to="/bookstore/school-lists" color="emerald" />
          <AlertCard label="Featured Books" value={catalog.featuredBooks} icon={Star} to="/bookstore/books?filter=featured" color="amber" />
        </section>
      )}

      {/* KPI GRID */}
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <KpiCard label="Publishers" value={totals.publishers} icon={Building2} color="emerald" />
        <KpiCard label="Authors" value={totals.authors} icon={Users} color="teal" />
        <KpiCard label="Books" value={totals.books} icon={BookOpen} color="blue" />
        <KpiCard label="Stationery" value={totals.stationery} icon={PenTool} color="amber" />
        <KpiCard label="Art Supplies" value={totals.artSupplies} icon={Palette} color="fuchsia" />
        <KpiCard label="Schools" value={totals.schools} icon={School} color="violet" />
      </section>

      {/* CATALOG STATS */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 to-emerald-900 text-white p-6 shadow-xl">
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <Award className="h-3.5 w-3.5 text-amber-300" />
            Book Highlights
          </div>
          <h3 className="mt-2 text-2xl font-extrabold">📖 Catalog Overview</h3>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Best Sellers</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums text-amber-300">{catalog.bestSellers}</div>
            <div className="text-xs text-white/60 font-semibold mt-1">Top selling books</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">New Arrivals</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-300">{catalog.newArrivals}</div>
            <div className="text-xs text-white/60 font-semibold mt-1">Fresh stock</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Featured</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums text-cyan-300">{catalog.featuredBooks}</div>
            <div className="text-xs text-white/60 font-semibold mt-1">Editor picks</div>
          </div>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/bookstore/books" icon={BookOpen} label="Books" color="blue" />
        <QuickLink to="/bookstore/publishers" icon={Building2} label="Publishers" color="emerald" />
        <QuickLink to="/bookstore/authors" icon={Users} label="Authors" color="teal" />
        <QuickLink to="/bookstore/stationery" icon={PenTool} label="Stationery" color="amber" />
        <QuickLink to="/bookstore/art-supplies" icon={Palette} label="Art Supplies" color="fuchsia" />
        <QuickLink to="/bookstore/schools" icon={School} label="Schools" color="violet" />
        <QuickLink to="/bookstore/school-lists" icon={Newspaper} label="School Lists" color="cyan" />
        <QuickLink to="/bookstore/rentals" icon={BookMarked} label="Rentals" color="rose" />
      </section>

      {/* TWO COLUMNS */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* OVERDUE RENTALS */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-600" />
                Overdue Rentals
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Books past due date</p>
            </div>
            {overdueDetail.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-extrabold">
                {overdueDetail.length}
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {overdueDetail.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <BookMarked className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                No overdue rentals
              </div>
            ) : (
              overdueDetail.map((r: any) => {
                const daysOverdue = Math.abs(differenceInDays(new Date(r.dueDate), new Date()));
                return (
                  <div key={r.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                      <BookMarked className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">{r.rentalNumber}</div>
                      <div className="text-xs font-bold text-slate-500">{r.customerName || 'Customer'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold text-rose-700">{daysOverdue}d overdue</div>
                      <div className="text-[10px] font-bold text-slate-500">Due: {format(new Date(r.dueDate), 'dd MMM')}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* TOP PUBLISHERS */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Top Publishers
            </h3>
            <p className="text-xs text-slate-500 font-semibold">By book count</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {booksByPublisher.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No publishers yet
              </div>
            ) : (
              booksByPublisher.map((p: any, i: number) => (
                <div key={p.publisher?.id} className="px-6 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0">
                    {i + 1}
                  </div>
                  {p.publisher?.logoUrl ? (
                    <img src={p.publisher.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover ring-2 ring-slate-200" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-extrabold text-sm">
                      {p.publisher?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{p.publisher?.name}</div>
                    {p.publisher?.country && <div className="text-[10px] font-bold text-slate-500">{p.publisher.country}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums text-lg">{p.count}</div>
                    <div className="text-[10px] font-bold text-slate-500">books</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CATEGORIES + TEXTBOOKS */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Books by Category
          </h3>
          {booksByCategory.length === 0 ? (
            <p className="text-sm text-slate-500 font-semibold text-center py-8">No books yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {booksByCategory.slice(0, 10).map((c: any) => (
                <div key={c.category} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-neutral-800/50">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 truncate">{c.category.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-extrabold text-blue-700 tabular-nums">{c._count._all}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <School className="h-5 w-5 text-violet-600" />
            Textbooks by Grade
          </h3>
          {textbooksByGrade.length === 0 ? (
            <p className="text-sm text-slate-500 font-semibold text-center py-8">No textbooks yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {textbooksByGrade.map((g: any) => (
                <div key={g.grade} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-neutral-800/50">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{g.grade}</span>
                  <span className="text-sm font-extrabold text-violet-700 tabular-nums">{g._count._all}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600',
    teal: 'from-teal-500 to-cyan-600',
    blue: 'from-blue-500 to-cyan-600',
    amber: 'from-amber-500 to-orange-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
    violet: 'from-violet-500 to-purple-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-10 w-10 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function AlertCard({ label, value, icon: Icon, to, color }: any) {
  const colors: Record<string, string> = {
    rose: 'from-rose-500 to-red-600',
    blue: 'from-blue-500 to-cyan-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 hover:shadow-lg hover:-translate-y-0.5 transition">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-10 w-10 rounded-xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow group-hover:scale-110 transition-transform'}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function QuickLink({ to, icon: Icon, label, color }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-600',
    emerald: 'from-emerald-500 to-green-600',
    teal: 'from-teal-500 to-cyan-600',
    amber: 'from-amber-500 to-orange-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
    violet: 'from-violet-500 to-purple-600',
    cyan: 'from-cyan-500 to-blue-600',
    rose: 'from-rose-500 to-red-600',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition">
      <div className={'h-11 w-11 rounded-xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-2'}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs font-extrabold text-slate-900 dark:text-white">{label}</div>
    </Link>
  );
}
