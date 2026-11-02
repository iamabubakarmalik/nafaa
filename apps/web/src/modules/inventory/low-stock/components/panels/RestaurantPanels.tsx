/**
 * Restaurant: a dish is not kept in stock, its ingredients are. These panels
 * answer "which dish can no longer be made": a warning for dishes still on
 * the menu that cannot be cooked, and a tab with every dish, how many more
 * plates can be made, and which ingredient holds it back.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChefHat, Flame, Soup } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { recipesApi } from '@industries/restaurant/api/recipes.api';
import { qty } from '../meta';
import { t } from '@core/i18n';

function useCookability() {
  return useQuery({ queryKey: ['restaurant-cookability'], queryFn: () => recipesApi.cookability(), refetchInterval: 60_000, retry: false });
}

export function RestaurantBanner({ openTab }: { openTab: (id: string) => void }) {
  const { data } = useCookability();
  const dead = (data?.rows ?? []).filter((r) => r.canMake === 0 && r.isAvailable);
  if (!dead.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200/70">
      <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-rose-900"><Flame className="h-4 w-4 text-rose-600" />{t('{{count}} dish menu par chalu hai magar ban nahi sakti:', { count: dead.length })}</span>
      {dead.slice(0, 6).map((r) => (
        <span key={r.menuItemId} className="rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-medium text-rose-900 ring-1 ring-rose-200">
          {r.name}{r.blocker ? t(' · {{name}} khatam', { name: r.blocker.name }) : ''}
        </span>
      ))}
      <span className="ms-auto flex gap-3">
        <button type="button" onClick={() => openTab('dishes')} className="text-[0.75rem] font-semibold text-rose-800 hover:underline">{t('Sab dish dekhein →')}</button>
        <Link to="/restaurant/menu" className="text-[0.75rem] font-semibold text-rose-800 hover:underline">{t('Menu theek karein →')}</Link>
      </span>
    </div>
  );
}

export function RestaurantDishes() {
  const { data, isLoading, error } = useCookability();
  const rows = useMemo(() => [...(data?.rows ?? [])].sort((a, b) => (a.canMake ?? 1e9) - (b.canMake ?? 1e9) || a.name.localeCompare(b.name)), [data]);

  // One ingredient can stop several dishes; list them by how many it stops.
  const blockers = useMemo(() => {
    const m = new Map<string, { name: string; unit: string; have: number; dead: string[]; tight: string[] }>();
    for (const r of rows) {
      for (const x of r.missing) {
        const e = m.get(x.name) ?? { name: x.name, unit: x.unit, have: x.have, dead: [], tight: [] };
        e.dead.push(r.name); m.set(x.name, e);
      }
      if (r.blocker && r.canMake !== null && r.canMake > 0 && r.canMake <= 5) {
        const e = m.get(r.blocker.name) ?? { name: r.blocker.name, unit: r.blocker.unit, have: r.blocker.have, dead: [], tight: [] };
        e.tight.push(r.name); m.set(r.blocker.name, e);
      }
    }
    return [...m.values()].sort((a, b) => b.dead.length - a.dead.length || b.tight.length - a.tight.length);
  }, [rows]);

  if (isLoading) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;
  if (error) return <p className="rounded-3xl bg-white px-6 py-10 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">{t('Kitchen ki report dekhne ki permission nahi, ya report nahi aa saki.')}</p>;
  if (!rows.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <Soup className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">{t('Kisi dish ki recipe nahi bani')}</p>
        <p className="mt-1 text-sm text-slate-500">{t('Recipe banayein to yahan dikhega kaunsi dish kitni aur ban sakti hai.')}</p>
        <Link to="/restaurant/menu" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">{t('Menu kholein →')}</Link>
      </div>
    );
  }

  const dead = rows.filter((r) => r.canMake === 0).length;
  const tight = rows.filter((r) => r.canMake !== null && r.canMake > 0 && r.canMake <= 5).length;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5">
          <h2 className="inline-flex items-center gap-2 text-[0.875rem] font-semibold text-slate-900"><ChefHat className="h-4 w-4 text-brand-600" />{t('Dish — kitni aur ban sakti hain')}</h2>
          <span className="text-[0.75rem] text-slate-500">{t('{{dead}} nahi ban sakti · {{tight}} me thora bacha', { dead, tight })}</span>
        </header>
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.recipeId} className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
              <span className={cn('flex h-10 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold tabular-nums ring-1',
                r.canMake === 0 ? 'bg-rose-50 text-rose-700 ring-rose-200' : r.canMake !== null && r.canMake <= 5 ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200')}>
                {r.canMake ?? '—'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{r.name}{!r.isAvailable && <span className="ms-2 text-[0.6875rem] font-medium text-slate-400">{t('menu se band')}</span>}</p>
                <p className="truncate text-[0.75rem] text-slate-500">
                  {r.canMake === null ? t('Recipe khali hai') : r.blocker ? t('Rok raha: {{name}} — {{have}} {{unit}} hai, 1 plate me {{need}}', { name: r.blocker.name, have: qty(r.blocker.have), unit: r.blocker.unit, need: qty(r.blocker.need) }) : t('Saamaan poora')}
                </p>
              </div>
              <span className="text-[0.75rem] tabular-nums text-slate-500">{t('food cost {{value}}%', { value: r.foodCostPct.toFixed(0) })}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="h-fit rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <h3 className="text-[0.875rem] font-semibold text-slate-900">{t('Kaunsa saamaan dish rok raha hai')}</h3>
        <p className="mt-0.5 text-[0.75rem] text-slate-500">{t('Pehle ye mangwayein — sab se zyada dish inhi se ruki hain')}</p>
        {!blockers.length ? <p className="py-6 text-center text-sm text-slate-500">{t('Koi saamaan kisi dish ko nahi rok raha')}</p> : (
          <ul className="mt-3 space-y-2.5">
            {blockers.slice(0, 12).map((b) => (
              <li key={b.name} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                <p className="flex justify-between gap-2 text-[0.8125rem] font-semibold text-slate-900"><span className="truncate">{b.name}</span><span className="shrink-0 tabular-nums text-slate-500">{qty(b.have)} {b.unit}</span></p>
                {b.dead.length > 0 && <p className="mt-0.5 text-[0.75rem] text-rose-700">{t('{{count}} dish ruki: {{value}}{{value2}}', { count: b.dead.length, value: b.dead.slice(0, 4).join(', '), value2: b.dead.length > 4 ? ` +${b.dead.length - 4}` : '' })}</p>}
                {b.tight.length > 0 && <p className="mt-0.5 text-[0.75rem] text-amber-700">{t('{{count}} me thora bacha: {{value}}', { count: b.tight.length, value: b.tight.slice(0, 3).join(', ') })}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
