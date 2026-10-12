/**
 * Restaurant tab: food cost % of each dish from its recipe, what one plate
 * leaves, how many sold in the period and what they earned. The dish that
 * sells most is often not the one that earns most, so busy dishes with a
 * high food cost are called out on their own.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChefHat, Soup, Target, TrendingDown, Wallet } from 'lucide-react';
import { Card, KpiCard, KpiRow, Segmented, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { recipesApi } from '@industries/restaurant/api/recipes.api';
import { menuItemsApi } from '@industries/restaurant/api/menu-items.api';
import type { ProfitPanelProps } from '../../config';
import { qty } from '../meta';
import { usePeriodItems } from './usePeriodItems';

/** Food cost grade in the owner's words. */
function grade(p: number) {
  if (p <= 0) return { l: 'Pata nahi', c: 'bg-slate-100 text-slate-500' };
  if (p <= 30) return { l: 'Behtareen', c: 'bg-emerald-50 text-emerald-700' };
  if (p <= 38) return { l: 'Theek', c: 'bg-sky-50 text-sky-700' };
  if (p <= 45) return { l: 'Dhyan dein', c: 'bg-amber-50 text-amber-800' };
  return { l: 'Nuqsan ka khatra', c: 'bg-rose-50 text-rose-700' };
}

export function RestaurantPanel({ filters, fmt }: ProfitPanelProps) {
  const items = usePeriodItems(filters);
  const cook = useQuery({ queryKey: ['restaurant-cookability'], queryFn: () => recipesApi.cookability(), staleTime: 60_000 });
  const menu = useQuery({ queryKey: ['restaurant-menu-items'], queryFn: () => menuItemsApi.list({}).catch(() => []), staleTime: 5 * 60_000 });
  const [sort, setSort] = useState<'earned' | 'foodcost' | 'sold'>('earned');

  const rows = useMemo(() => {
    const sold = new Map((items.data?.items ?? []).filter((r) => r.productId).map((r) => [r.productId!, r]));
    return (cook.data?.rows ?? []).map((d) => {
      const s = d.productId ? sold.get(d.productId) : undefined;
      return { ...d, g: grade(d.foodCostPct), sold: s?.qty ?? 0, revenue: s?.revenue ?? 0, earned: s?.profit ?? 0 };
    });
  }, [cook.data, items.data]);

  const stats = useMemo(() => {
    const priced = rows.filter((r) => r.price > 0 && r.cost > 0);
    const withRecipe = new Set(rows.map((r) => r.menuItemId));
    return {
      avg: priced.length ? priced.reduce((s, r) => s + r.foodCostPct, 0) / priced.length : 0,
      bad: rows.filter((r) => r.foodCostPct > 45).length,
      noRecipe: (menu.data ?? []).filter((m: { id: string }) => !withRecipe.has(m.id)).length,
      earned: rows.reduce((s, r) => s + r.earned, 0),
      busyPoor: rows.filter((r) => r.sold >= 5 && r.foodCostPct > 45).sort((a, b) => b.sold - a.sold).slice(0, 5),
    };
  }, [rows, menu.data]);

  const sorted = useMemo(() => [...rows].sort((a, b) => (sort === 'foodcost' ? b.foodCostPct - a.foodCostPct : sort === 'sold' ? b.sold - a.sold : b.earned - a.earned)), [rows, sort]);

  if (cook.isLoading || items.isLoading) return <Skeleton className="h-72 rounded-3xl" />;
  if (fmt.costHidden) return <p className="rounded-3xl bg-white px-6 py-14 text-center text-[0.875rem] text-slate-500 ring-1 ring-slate-200/80">Food cost dekhne ke liye cost ki ijazat chahiye</p>;

  return (
    <div className="space-y-4">
      <KpiRow cols={4}>
        <KpiCard icon={Wallet} color="#16a34a" label="Dishon se kamai" value={fmt.cost(stats.earned)} hint="is muddat me, bill ki cost se" />
        <KpiCard icon={Target} color={stats.avg <= 38 ? '#0284c7' : '#d97706'} label="Ausat food cost" value={`${stats.avg.toFixed(1)}%`} hint={stats.avg <= 38 ? 'Theek chal raha hai' : 'Thora zyada hai'} />
        <KpiCard icon={AlertTriangle} color="#e11d48" label="Dhyan chahiye" value={String(stats.bad)} hint="food cost 45% se upar" />
        <KpiCard icon={Soup} color="#64748b" label="Recipe nahi bani" value={String(stats.noRecipe)} hint={stats.noRecipe ? 'in ka food cost nahi banta' : 'sab par recipe hai'} />
      </KpiRow>

      {stats.busyPoor.length > 0 && (
        <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-200">
          <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-rose-900"><TrendingDown className="h-4 w-4" />Ye dish bikti bahut hain, kamati kam</p>
          <p className="mt-0.5 text-[0.75rem] text-rose-800">Rate barhayein, portion dekhein, ya recipe me koi mehngi cheez badlein.</p>
          <ul className="mt-2 space-y-1">
            {stats.busyPoor.map((r) => (
              <li key={r.recipeId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-1.5 text-[0.75rem]">
                <span className="font-semibold text-slate-900">{r.name}</span>
                <span className="tabular-nums text-rose-700">{qty(r.sold)} biki · food cost {r.foodCostPct.toFixed(0)}% · ek plate par {fmt.cost(r.profit)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card className="rounded-2xl" flush title="Dish war food cost" description="Rate, recipe ki lagat, ek plate par bacha, aur is muddat ki kamai"
        actions={<Segmented label="Tarteeb" value={sort} onChange={setSort} items={[{ value: 'earned', label: 'Kamai' }, { value: 'foodcost', label: 'Food cost' }, { value: 'sold', label: 'Biki' }]} />}>
        {!sorted.length ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[0.875rem] text-slate-500">Kisi dish par recipe nahi bani — food cost nikal hi nahi sakta</p>
            <Link to="/restaurant/recipes" className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-brand-700 hover:underline"><ChefHat className="h-4 w-4" />Recipe banayein</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-[0.8125rem]">
              <thead className="bg-slate-50/70 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2">Dish</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Recipe lagat</th><th className="px-3 py-2 text-right">Food cost</th><th className="px-3 py-2 text-right">Ek plate par</th><th className="px-3 py-2 text-right">Biki</th><th className="px-4 py-2 text-right">Kamai</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((r) => (
                  <tr key={r.recipeId}>
                    <td className="px-4 py-2 font-medium text-slate-900">{r.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt.money(r.price)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt.cost(r.cost)}</td>
                    <td className="px-3 py-2 text-right"><span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', r.g.c)}>{r.foodCostPct > 0 ? `${r.foodCostPct.toFixed(0)}%` : '—'} · {r.g.l}</span></td>
                    <td className={cn('px-3 py-2 text-right tabular-nums', r.profit < 0 && 'text-rose-700')}>{fmt.cost(r.profit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{qty(r.sold)}</td>
                    <td className={cn('px-4 py-2 text-right font-semibold tabular-nums', r.earned < 0 && 'text-rose-700')}>{fmt.cost(r.earned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
