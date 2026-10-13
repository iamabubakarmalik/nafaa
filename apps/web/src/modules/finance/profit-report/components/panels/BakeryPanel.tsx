/**
 * Bakery tab: what each item really costs by its recipe against the cost
 * the bills carried. A gap usually means flour or butter got dearer while
 * the selling rate stayed the same, so every sale loses a little unseen.
 * Also splits profit between what the shop makes and what it buys in.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChefHat, ShoppingBag } from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { bakeryProductsApi } from '@industries/bakery/api/products.api';
import type { ProfitPanelProps } from '../../config';
import { pct, qty } from '../meta';
import { usePeriodItems } from './usePeriodItems';

interface RecipeLine { qty?: number | string; costPerUnit?: number | string }

export function BakeryPanel({ filters, fmt }: ProfitPanelProps) {
  const items = usePeriodItems(filters);
  const profiles = useQuery({ queryKey: ['bakery-profiles-all'], queryFn: () => bakeryProductsApi.list({}).catch(() => []), staleTime: 5 * 60_000 });
  const [onlyProblems, setOnlyProblems] = useState(false);

  const rows = useMemo(() => {
    const recipe = new Map<string, number>();
    const made = new Set<string>();
    for (const p of profiles.data ?? []) {
      const ing = p.ingredients as { lines?: RecipeLine[]; yield?: number | string } | undefined;
      if (p.productId && (p.isCakeCustomizable || p.isCustomizable)) made.add(p.productId);
      if (!p.productId || !Array.isArray(ing?.lines) || !ing.lines.length) continue;
      const batch = ing.lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.costPerUnit || 0), 0);
      const y = Number(ing.yield) > 0 ? Number(ing.yield) : 1;
      recipe.set(p.productId, batch / y);
      made.add(p.productId);
    }
    return (items.data?.items ?? []).filter((r) => r.productId).map((r) => {
      const recipeCost = recipe.get(r.productId!);
      // Under one rupee is rounding, not a real gap.
      const gap = recipeCost !== undefined ? recipeCost - (r.avgCost ?? 0) : 0;
      return {
        ...r,
        recipeCost,
        gap: Math.abs(gap) > 1 ? gap : 0,
        recipeProfit: recipeCost !== undefined ? r.revenue - recipeCost * r.qty : r.profit ?? 0,
        isMade: made.has(r.productId!),
        noCost: (r.noCostLines ?? 0) > 0 || (r.avgCost ?? 0) <= 0,
      };
    });
  }, [items.data, profiles.data]);

  const problems = useMemo(() => ({
    noCost: rows.filter((r) => r.noCost).length,
    gap: rows.filter((r) => r.gap > 0).length,
    losing: rows.filter((r) => (r.profit ?? 0) < 0).length,
    hidden: rows.reduce((s, r) => s + (r.gap > 0 ? r.gap * r.qty : 0), 0),
  }), [rows]);
  const split = useMemo(() => ({
    made: rows.filter((r) => r.isMade).reduce((s, r) => ({ revenue: s.revenue + r.revenue, profit: s.profit + (r.profit ?? 0), n: s.n + 1 }), { revenue: 0, profit: 0, n: 0 }),
    bought: rows.filter((r) => !r.isMade).reduce((s, r) => ({ revenue: s.revenue + r.revenue, profit: s.profit + (r.profit ?? 0), n: s.n + 1 }), { revenue: 0, profit: 0, n: 0 }),
  }), [rows]);
  const shown = onlyProblems ? rows.filter((r) => r.noCost || r.gap > 0 || (r.profit ?? 0) < 0) : rows;

  if (items.isLoading || profiles.isLoading) return <Skeleton className="h-72 rounded-3xl" />;
  if (fmt.costHidden) return <p className="rounded-3xl bg-white px-6 py-14 text-center text-[0.875rem] text-slate-500 ring-1 ring-slate-200/80">Recipe cost dekhne ke liye cost ki permission chahiye</p>;

  return (
    <div className="space-y-4">
      {(problems.noCost > 0 || problems.gap > 0 || problems.losing > 0) && (
        <div className="space-y-1 rounded-2xl bg-amber-50 p-4 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Ye hisaab kharab kar rahe hain</p>
          {problems.noCost > 0 && <p>• {problems.noCost} cheezon ki cost 0 hai — un ka profit poora dikh raha hai, jo sach nahi.</p>}
          {problems.gap > 0 && <p>• {problems.gap} cheezon me bill wali cost aur recipe ki cost alag hai — is period me lagbhag <b>{fmt.cost(problems.hidden)}</b> ka chhupa nuqsan.</p>}
          {problems.losing > 0 && <p>• {problems.losing} cheezein nuqsan par bik rahi hain.</p>}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <SplitTile icon={ChefHat} color="#db2777" label="Dukaan me banaya" n={split.made.n} revenue={fmt.money(split.made.revenue)} profit={fmt.cost(split.made.profit)} />
        <SplitTile icon={ShoppingBag} color="#2563eb" label="Bahar se laya" n={split.bought.n} revenue={fmt.money(split.bought.revenue)} profit={fmt.cost(split.bought.profit)} />
      </div>

      <Card className="rounded-2xl" flush title="Recipe se milan" description="Bill par saved cost aur recipe ki aaj ki cost — ek cheez par"
        actions={(
          <button type="button" onClick={() => setOnlyProblems((v) => !v)}
            className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[0.8125rem] font-semibold ring-1', onlyProblems ? 'bg-amber-50 text-amber-800 ring-amber-300' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
            <AlertTriangle className="h-4 w-4" />Sirf masle wali
          </button>
        )}>
        {!shown.length ? <p className="px-4 py-10 text-center text-[0.875rem] text-slate-500">{onlyProblems ? 'Koi masla nahi — hisaab saaf hai' : 'Is period me koi sale nahi'}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-[0.8125rem]">
              <thead className="bg-slate-50/70 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2">Cheez</th><th className="px-3 py-2 text-right">Biki</th><th className="px-3 py-2 text-right">Ausat rate</th><th className="px-3 py-2 text-right">Bill ki cost</th><th className="px-3 py-2 text-right">Recipe ki cost</th><th className="px-3 py-2 text-right">Profit</th><th className="px-4 py-2 text-right">Recipe se profit</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((r) => (
                  <tr key={r.key}>
                    <td className="px-4 py-2">
                      <span className="block font-medium text-slate-900">{r.name}</span>
                      <span className="text-[0.6875rem] text-slate-500">{r.isMade ? 'Dukaan me banta hai' : 'Bahar se aata hai'}{r.noCost ? ' · cost nahi bhari' : ''}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{qty(r.qty)} {r.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt.money(r.avgPrice)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt.cost(r.avgCost ?? 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.recipeCost === undefined ? <Link to="/bakery/products" className="text-brand-700 hover:underline">Recipe bharein</Link> : (
                        <span className={cn(r.gap > 0 && 'font-semibold text-rose-700', r.gap < 0 && 'text-emerald-700')}>{fmt.cost(r.recipeCost)}{r.gap ? ` (${r.gap > 0 ? '+' : ''}${fmt.cost(r.gap)})` : ''}</span>
                      )}
                    </td>
                    <td className={cn('px-3 py-2 text-right font-semibold tabular-nums', (r.profit ?? 0) < 0 && 'text-rose-700')}>{fmt.cost(r.profit ?? 0)}<span className="block text-[0.6875rem] font-normal text-slate-400">{pct(r.margin)}</span></td>
                    <td className={cn('px-4 py-2 text-right font-semibold tabular-nums', r.recipeProfit < 0 && 'text-rose-700')}>{fmt.cost(r.recipeProfit)}</td>
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

function SplitTile({ icon: Icon, color, label, n, revenue, profit }: { icon: typeof ChefHat; color: string; label: string; n: number; revenue: string; profit: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}17`, color }}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-[0.8125rem] font-medium text-slate-500">{label} · {n} cheezein</p>
        <p className="text-[1.125rem] font-bold tabular-nums text-slate-900">{profit} <span className="text-[0.75rem] font-normal text-slate-500">profit · {revenue} sale</span></p>
      </div>
    </div>
  );
}
