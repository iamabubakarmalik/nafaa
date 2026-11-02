/**
 * Recipe costing: every product with a recipe, priced at today's raw
 * material rates against its selling price and the cost written on the
 * product, how many can be made from the store, and one tap to put the new
 * cost on the product.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ChevronDown, Pencil, Wheat } from 'lucide-react';
import { Button, Skeleton, Table, THead, TBody, Tr, Th, Td } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { ingredientsApi, type RecipeCost } from '../../api/ingredients.api';
import { LoadFailed } from '../charts';
import { RAW_KEY, apiError, fmtQty } from '../meta';
import { t as tr } from '@core/i18n';

export type RecipeFilter = 'all' | 'low' | 'off' | 'missing';

export function useRecipes() {
  return useQuery({ queryKey: [RAW_KEY, 'recipes'], queryFn: ingredientsApi.recipes, staleTime: 60_000 });
}

export function RecipeCosting({ search, filter }: { search: string; filter: RecipeFilter }) {
  const q = useRecipes();
  const t = search.trim().toLowerCase();
  const rows = useMemo(() => (q.data?.rows ?? []).filter((r) => {
    if (t && !r.name.toLowerCase().includes(t) && !r.lines.some((l) => l.name.toLowerCase().includes(t))) return false;
    if (filter === 'low') return r.margin?.pct != null && r.margin.pct < 20;
    if (filter === 'off') return !!r.cost && (r.cost.current > 0 ? Math.abs(r.cost.diff) / r.cost.current > 0.05 : r.cost.perUnit > 0);
    if (filter === 'missing') return r.missing > 0;
    return true;
  }), [q.data, t, filter]);

  if (q.isError && !q.data) return <LoadFailed what={tr('Recipes')} retry={() => q.refetch()} />;
  if (!q.data) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  if (!q.data.rows.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <Wheat className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">{tr('Abhi kisi cheez ki recipe nahi bani')}</p>
        <p className="mt-1 text-sm text-slate-500">{tr('Product kholein → Badlein → "Recipe" me likhein ke ek dafa me kitna maida, cheeni, makhan lagta hai. Phir yahan aaj ke rate se har cheez ki cost aur profit dikhega.')}</p>
        <Link to="/bakery/products" className="mt-4 inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">{tr('Products kholein')}</Link>
      </div>
    );
  }
  if (!rows.length) return <div className="rounded-3xl bg-white px-6 py-14 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">{tr('Is filter me koi recipe nahi')}</div>;
  return <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">{rows.map((r) => <RecipeRow key={r.productId} r={r} />)}</ul>;
}

function RecipeRow({ r }: { r: RecipeCost }) {
  const qc = useQueryClient();
  const { cost, costHidden } = useMasked();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const [open, setOpen] = useState(false);
  const pct = r.margin?.pct;
  const off = r.cost && (r.cost.current > 0 ? Math.abs(r.cost.diff) / r.cost.current > 0.05 : r.cost.perUnit > 0);
  const apply = useMutation({
    mutationFn: () => productsApi.update(r.productId, { costPrice: r.cost!.perUnit }),
    onSuccess: () => { toast.success(tr('{{name}}: cost {{perUnit}} laga di', { name: r.name, perUnit: formatPKR(r.cost!.perUnit) })); qc.invalidateQueries({ queryKey: [RAW_KEY, 'recipes'] }); qc.invalidateQueries({ queryKey: ['products'] }); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
  });
  return (
    <li>
      <div className="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
        {r.image ? <img src={r.image} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Wheat className="h-5 w-5" /></span>}
        <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-start">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold text-slate-900">{r.name}</span>
            {r.ratesChanged > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-medium text-amber-800 ring-1 ring-amber-200">{tr('{{ratesChanged}} rate badle', { ratesChanged: r.ratesChanged })}</span>}
            {r.missing > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.6875rem] font-medium text-rose-700 ring-1 ring-rose-200">{tr('{{missing}} saamaan nahi mila', { missing: r.missing })}</span>}
            {!r.isActive && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] text-slate-500">{tr('Band')}</span>}
          </span>
          <span className="block text-[0.75rem] text-slate-500">{tr('Ek dafa me {{yieldQty}} {{unit}} · {{count}} cheezein{{value}}{{value2}}', { yieldQty: fmtQty(r.yieldQty), unit: r.unit, count: r.lines.length, value: r.canMake !== null ? tr(' · gudaam se {{canMake}} ban sakte', { canMake: fmtQty(r.canMake) }) : '', value2: r.limiting ? tr(' (pehle {{limiting}} khatam)', { limiting: r.limiting }) : '' })}</span>
        </button>
        <div className="grid grid-cols-3 gap-4 text-end text-[0.75rem]">
          <div><p className="text-slate-500">{tr('Cost')}</p><p className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{costHidden || !r.cost ? '••••' : cost(r.cost.perUnit)}</p></div>
          <div><p className="text-slate-500">{tr('Bechte')}</p><p className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{formatPKR(r.price)}</p></div>
          <div><p className="text-slate-500">{tr('Profit')}</p><p className={cn('text-[0.9375rem] font-bold tabular-nums', pct == null ? 'text-slate-400' : pct < 20 ? 'text-rose-700' : 'text-success-700')}>{costHidden || pct == null ? '—' : `${pct}%`}</p></div>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label={tr('Details')} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} /></button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          <Table minWidth="34rem" className="text-[0.8125rem] [&_table]:text-[0.8125rem]">
              <THead><Tr className="text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500"><Th className="py-1.5">{tr('Saamaan')}</Th><Th className="py-1.5 text-end">{tr('Quantity')}</Th><Th className="py-1.5 text-end">{tr('Aaj ka rate')}</Th><Th className="py-1.5 text-end">{tr('Cost')}</Th><Th className="py-1.5 text-end">{tr('Gudaam')}</Th></Tr></THead>
              <TBody>
                {r.lines.map((l) => (
                  <Tr key={l.ingredientId} className={cn(l.missing && 'text-rose-700')}>
                    <Td className="py-1.5">{l.name}{l.missing && tr(' (nahi mila)')}</Td>
                    <Td className="py-1.5 text-end tabular-nums">{fmtQty(l.qty)} {l.unit}</Td>
                    <Td className="py-1.5 text-end tabular-nums">{l.cost ? <>{cost(l.cost.rate)}{l.cost.changed && <span className="ms-1 text-[0.6875rem] text-amber-700">{tr('(pehle {{savedRate}})', { savedRate: cost(l.cost.savedRate) })}</span>}</> : '••••'}</Td>
                    <Td className="py-1.5 text-end font-medium tabular-nums">{l.cost ? cost(l.cost.line) : '••••'}</Td>
                    <Td className="py-1.5 text-end tabular-nums text-slate-600">{l.stock === null ? '—' : `${fmtQty(l.stock)} ${l.unit}`}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          {r.cost && !costHidden && (
            <p className="text-[0.8125rem] text-slate-700">{tr('Poori dafa {{batch}} · ek {{unit}} {{perUnit}} · product par likhi cost {{current}}', { batch: cost(r.cost.batch), unit: r.unit, perUnit: cost(r.cost.perUnit), current: cost(r.cost.current) })}
              {off && <span className="ms-1 inline-flex items-center gap-1 text-amber-800"><AlertTriangle className="h-3.5 w-3.5" />{tr('farq {{cost}}', { cost: cost(Math.abs(r.cost.diff)) })}</span>}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {canEdit && off && !costHidden && r.cost && <Button size="sm" loading={apply.isPending} onClick={() => apply.mutate()}>{tr('Cost {{perUnit}} product par laga dein', { perUnit: cost(r.cost.perUnit) })}</Button>}
            {canEdit && <Link to={`/bakery-products/${r.productId}/edit`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Pencil className="h-4 w-4" />{tr('Recipe badlein')}</Link>}
            <Link to={`/bakery-products/${r.productId}`} className="inline-flex h-8 items-center rounded-lg px-2.5 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">{tr('Product dekhein →')}</Link>
          </div>
        </div>
      )}
    </li>
  );
}
