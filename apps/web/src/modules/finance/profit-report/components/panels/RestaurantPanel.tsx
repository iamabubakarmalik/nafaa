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
import { Card, KpiCard, KpiRow, Segmented, Skeleton, Table, THead, TBody, Tr, Th, Td } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { recipesApi } from '@industries/restaurant/api/recipes.api';
import { menuItemsApi } from '@industries/restaurant/api/menu-items.api';
import type { ProfitPanelProps } from '../../config';
import { qty } from '../meta';
import { usePeriodItems } from './usePeriodItems';
import { t } from '@core/i18n';

/** Food cost grade in the owner's words. */
function grade(p: number) {
  if (p <= 0) return { l: t('Pata nahi'), c: 'bg-slate-100 text-slate-500' };
  if (p <= 30) return { l: t('Behtareen'), c: 'bg-emerald-50 text-emerald-700' };
  if (p <= 38) return { l: t('Theek'), c: 'bg-sky-50 text-sky-700' };
  if (p <= 45) return { l: t('Dhyan dein'), c: 'bg-amber-50 text-amber-800' };
  return { l: t('Nuqsan ka khatra'), c: 'bg-rose-50 text-rose-700' };
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
  if (fmt.costHidden) return <p className="rounded-3xl bg-white px-6 py-14 text-center text-[0.875rem] text-slate-500 ring-1 ring-slate-200/80">{t('Food cost dekhne ke liye cost ki permission chahiye')}</p>;

  return (
    <div className="space-y-4">
      <KpiRow cols={4}>
        <KpiCard icon={Wallet} color="#16a34a" label={t('Dishon se kamai')} value={fmt.cost(stats.earned)} hint={t('is period me, bill ki cost se')} />
        <KpiCard icon={Target} color={stats.avg <= 38 ? '#0284c7' : '#d97706'} label={t('Ausat food cost')} value={`${stats.avg.toFixed(1)}%`} hint={stats.avg <= 38 ? t('Theek chal raha hai') : t('Thora zyada hai')} />
        <KpiCard icon={AlertTriangle} color="#e11d48" label={t('Dhyan chahiye')} value={String(stats.bad)} hint={t('food cost 45% se upar')} />
        <KpiCard icon={Soup} color="#64748b" label={t('Recipe nahi bani')} value={String(stats.noRecipe)} hint={stats.noRecipe ? t('in ka food cost nahi banta') : t('sab par recipe hai')} />
      </KpiRow>

      {stats.busyPoor.length > 0 && (
        <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-200">
          <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-rose-900"><TrendingDown className="h-4 w-4" />{t('Ye dish bikti bahut hain, kamati kam')}</p>
          <p className="mt-0.5 text-[0.75rem] text-rose-800">{t('Rate barhayein, portion dekhein, ya recipe me koi mehngi cheez badlein.')}</p>
          <ul className="mt-2 space-y-1">
            {stats.busyPoor.map((r) => (
              <li key={r.recipeId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-1.5 text-[0.75rem]">
                <span className="font-semibold text-slate-900">{r.name}</span>
                <span className="tabular-nums text-rose-700">{t('{{sold}} biki · food cost {{value}}% · ek plate par {{profit}}', { sold: qty(r.sold), value: r.foodCostPct.toFixed(0), profit: fmt.cost(r.profit) })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card className="rounded-2xl" flush title={t('Dish war food cost')} description={t('Rate, recipe ki cost, ek plate par bacha, aur is period ki kamai')}
        actions={<Segmented label={t('Sort')} value={sort} onChange={setSort} items={[{ value: 'earned', label: t('Kamai') }, { value: 'foodcost', label: t('Food cost') }, { value: 'sold', label: t('Biki') }]} />}>
        {!sorted.length ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[0.875rem] text-slate-500">{t('Kisi dish par recipe nahi bani — food cost nikal hi nahi sakta')}</p>
            <Link to="/restaurant/recipes" className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-brand-700 hover:underline"><ChefHat className="h-4 w-4" />{t('Recipe banayein')}</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table minWidth="44rem" className="[&>table]:text-[0.8125rem]">
              <THead className="bg-slate-50/70 text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                <Tr><Th className="px-4 py-2">{t('Dish')}</Th><Th className="px-3 py-2 text-end">{t('Rate')}</Th><Th className="px-3 py-2 text-end">{t('Recipe cost')}</Th><Th className="px-3 py-2 text-end">{t('Food cost')}</Th><Th className="px-3 py-2 text-end">{t('Ek plate par')}</Th><Th className="px-3 py-2 text-end">{t('Biki')}</Th><Th className="px-4 py-2 text-end">{t('Kamai')}</Th></Tr>
              </THead>
              <TBody className="divide-y divide-slate-100">
                {sorted.map((r) => (
                  <Tr key={r.recipeId}>
                    <Td className="px-4 py-2 font-medium text-slate-900">{r.name}</Td>
                    <Td className="text-inherit px-3 py-2 text-end tabular-nums">{fmt.money(r.price)}</Td>
                    <Td className="text-inherit px-3 py-2 text-end tabular-nums">{fmt.cost(r.cost)}</Td>
                    <Td className="text-inherit px-3 py-2 text-end"><span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', r.g.c)}>{r.foodCostPct > 0 ? `${r.foodCostPct.toFixed(0)}%` : '—'} · {r.g.l}</span></Td>
                    <Td className={cn('px-3 py-2 text-end tabular-nums', r.profit < 0 && 'text-rose-700')}>{fmt.cost(r.profit)}</Td>
                    <Td className="text-inherit px-3 py-2 text-end tabular-nums">{qty(r.sold)}</Td>
                    <Td className={cn('px-4 py-2 text-end font-semibold tabular-nums', r.earned < 0 && 'text-rose-700')}>{fmt.cost(r.earned)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
