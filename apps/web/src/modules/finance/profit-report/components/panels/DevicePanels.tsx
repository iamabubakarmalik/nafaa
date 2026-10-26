/**
 * Mobile and electronics tabs: profit per IMEI or serial unit at its own
 * cost, the period split by where the money came from (new phone, used
 * phone, serial unit, repair, everything else), and for electronics the
 * profit by product type and condition.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Barcode, Cable, RefreshCw, Smartphone, Wrench, type LucideIcon } from 'lucide-react';
import { Card, Segmented, Skeleton, Table, THead, TBody, Tr, Th, Td } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useShopParam } from '@core/stores/auth.store';
import { CATEGORY_META, CONDITION_META, type CategoryType, type ConditionType } from '@industries/electronics/constants';
import { electronicsProductsApi } from '@industries/electronics/api/products.api';
import { PROFIT_KEY, profitApi, type Figures, type UnitKind } from '../../api';
import type { ProfitFmt, ProfitPanelProps } from '../../config';
import { pct, qty } from '../meta';
import { usePeriodItems } from './usePeriodItems';

const KIND_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  IMEI: { label: 'Naye phone', icon: Smartphone, color: '#2563eb' },
  USED: { label: 'Used phone', icon: RefreshCw, color: '#7c3aed' },
  SERIAL: { label: 'Serial wala maal', icon: Barcode, color: '#0891b2' },
  REPAIR: { label: 'Repair', icon: Wrench, color: '#d97706' },
  OTHER: { label: 'Baqi maal', icon: Cable, color: '#059669' },
};

export function MobilePanel(props: ProfitPanelProps) {
  return <UnitsSection {...props} kinds={['IMEI', 'USED']} otherLabel="Accessories" title="IMEI war profit" />;
}

export function ElectronicsPanel(props: ProfitPanelProps) {
  return (
    <div className="space-y-4">
      <TypeSplit {...props} />
      <UnitsSection {...props} kinds={['SERIAL', 'IMEI']} otherLabel="Bina serial maal" title="Serial war profit" />
    </div>
  );
}

function UnitsSection({ filters, fmt, kinds, otherLabel, title }: ProfitPanelProps & { kinds: UnitKind[]; otherLabel: string; title: string }) {
  const shop = useShopParam();
  const [kind, setKind] = useState<UnitKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const q = useQuery({
    queryKey: [PROFIT_KEY, 'units', shop, filters, kind, search.trim()],
    queryFn: () => profitApi.units({ ...filters, kind, search: search.trim() || undefined }),
    placeholderData: (prev) => prev,
  });
  const split = q.data?.split ?? [];
  const total = split.reduce((s, x) => s + x.revenue, 0);
  const order = [...kinds, 'REPAIR', 'OTHER'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {q.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />) : order.map((k) => {
          const s = split.find((x) => x.kind === k);
          if (!s && (k === 'REPAIR' || !kinds.includes(k as UnitKind)) && k !== 'OTHER') return null;
          const meta = KIND_META[k];
          return <SplitCard key={k} label={k === 'OTHER' ? otherLabel : meta.label} icon={meta.icon} color={meta.color} f={s} share={total > 0 && s ? (s.revenue / total) * 100 : 0} fmt={fmt} />;
        })}
      </div>

      <Card className="rounded-2xl" flush title={title} description="Har unit ki apni cost se — sab se naya pehle (500 tak)"
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="IMEI, serial ya bill…" aria-label="Unit search"
              className="h-9 w-48 rounded-lg border border-slate-200 bg-white px-3 text-[0.8125rem] text-slate-900 outline-none focus:ring-2 focus:ring-brand-500" />
            <Segmented label="Type" value={kind} onChange={setKind} items={[{ value: 'all', label: 'Sab' }, ...kinds.map((k) => ({ value: k, label: KIND_META[k].label }))]} />
          </div>
        )}>
        {q.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
          : !q.data?.items.length ? <p className="px-4 py-10 text-center text-[0.875rem] text-slate-500">Is period me koi IMEI ya serial wala unit nahi bika</p> : (
          <div className="overflow-x-auto">
            <Table minWidth="44rem" className="[&>table]:text-[0.8125rem]">
              <THead className="bg-slate-50/70 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                <Tr><Th className="px-4 py-2">Unit</Th><Th className="px-3 py-2">IMEI / serial</Th><Th className="px-3 py-2">Bill</Th><Th className="px-3 py-2 text-right">Bika</Th><Th className="px-3 py-2 text-right">Cost</Th><Th className="px-3 py-2 text-right">Profit</Th><Th className="px-4 py-2 text-right">Margin</Th></Tr>
              </THead>
              <TBody className="divide-y divide-slate-100">
                {q.data.items.map((u) => (
                  <Tr key={u.id} className={cn(u.returned && 'opacity-60')}>
                    <Td className="text-inherit px-4 py-2">
                      <span className="block font-medium text-slate-900">{u.name}{u.variant ? ` · ${u.variant}` : ''}</span>
                      <span className="text-[0.6875rem] text-slate-500">{KIND_META[u.kind]?.label}{u.returned ? ' · wapas aa gaya' : ''}{!fmt.costHidden && u.costFallback ? ' · aaj ki cost' : ''}</span>
                    </Td>
                    <Td className="px-3 py-2 font-mono text-[0.75rem] text-slate-700">{u.imei ?? u.serial ?? '—'}{u.imei && u.serial ? <span className="block text-slate-400">{u.serial}</span> : null}</Td>
                    <Td className="px-3 py-2 text-slate-600">{u.saleNumber}<span className="block text-[0.6875rem] text-slate-400">{new Date(u.soldAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span></Td>
                    <Td className="px-3 py-2 text-right tabular-nums text-slate-900">{fmt.money(u.revenue)}</Td>
                    <Td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmt.cost(u.cost ?? 0)}</Td>
                    <Td className={cn('px-3 py-2 text-right font-semibold tabular-nums', (u.profit ?? 0) < 0 && !fmt.costHidden ? 'text-rose-700' : 'text-slate-900')}>{fmt.cost(u.profit ?? 0)}</Td>
                    <Td className="px-4 py-2 text-right tabular-nums text-slate-600">{fmt.costHidden ? '••' : pct(u.margin)}</Td>
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

function SplitCard({ label, icon: Icon, color, f, share, fmt }: { label: string; icon: LucideIcon; color: string; f?: Figures; share: number; fmt: ProfitFmt }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[0.8125rem] font-medium text-slate-500">{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}17`, color }}><Icon className="h-3.5 w-3.5" /></span>
      </div>
      <p className="mt-1 text-[1.1875rem] font-bold tabular-nums text-slate-900">{fmt.cost(f?.profit ?? 0)}</p>
      <p className="text-[0.75rem] text-slate-500">{fmt.money(f?.revenue ?? 0)} sale · {share.toFixed(0)}%{fmt.costHidden ? '' : ` · ${pct(f?.margin)}`}</p>
      <p className="text-[0.6875rem] text-slate-400">{qty(f?.qty ?? 0)} units · {f?.bills ?? 0} bill</p>
    </div>
  );
}

/** Electronics: profit by product type and by condition, from the period's products. */
function TypeSplit({ filters, fmt }: ProfitPanelProps) {
  const items = usePeriodItems(filters);
  const profiles = useQuery({ queryKey: ['electronics-profiles-all'], queryFn: () => electronicsProductsApi.list().catch(() => []), staleTime: 5 * 60_000 });
  const [dim, setDim] = useState<'type' | 'condition'>('type');

  const rows = useMemo(() => {
    const by = new Map((profiles.data ?? []).map((p) => [p.productId, p]));
    const groups = new Map<string, { id: string; label: string; revenue: number; profit: number; qty: number; products: number }>();
    for (const r of items.data?.items ?? []) {
      const p = r.productId ? by.get(r.productId) : undefined;
      const id = (dim === 'type' ? p?.categoryType : p?.conditionType) ?? 'NONE';
      const label = id === 'NONE' ? 'Likha nahi'
        : dim === 'type' ? `${CATEGORY_META[id as CategoryType]?.emoji ?? ''} ${CATEGORY_META[id as CategoryType]?.label ?? id}`
          : `${CONDITION_META[id as ConditionType]?.emoji ?? ''} ${CONDITION_META[id as ConditionType]?.label ?? id}`;
      const g = groups.get(id) ?? { id, label, revenue: 0, profit: 0, qty: 0, products: 0 };
      g.revenue += r.revenue; g.profit += r.profit ?? 0; g.qty += r.qty; g.products += 1;
      groups.set(id, g);
    }
    return [...groups.values()].sort((a, b) => b.revenue - a.revenue);
  }, [items.data, profiles.data, dim]);
  const total = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <Card className="rounded-2xl" title="Type aur halat" description="Kis type ya halat ke maal se kitni kamai"
      actions={<Segmented label="Kis hisaab se" value={dim} onChange={setDim} items={[{ value: 'type', label: 'Type' }, { value: 'condition', label: 'Halat' }]} />}>
      {items.isLoading || profiles.isLoading ? <Skeleton className="h-40 rounded-xl" /> : !rows.length ? <p className="py-8 text-center text-[0.875rem] text-slate-500">Koi sale nahi</p> : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.id}>
              <div className="flex justify-between gap-2 text-[0.8125rem]">
                <span className="truncate font-medium text-slate-800">{r.label} <span className="text-slate-400">· {r.products} model · {qty(r.qty)} units</span></span>
                <span className="shrink-0 tabular-nums text-slate-900">{fmt.money(r.revenue)}{fmt.costHidden ? '' : <> · <b className={r.profit < 0 ? 'text-rose-700' : ''}>{fmt.cost(r.profit)}</b> ({pct(r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0)})</>}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${total > 0 ? (r.revenue / total) * 100 : 0}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
      <Link to="/products" className="mt-3 inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">Product ki type badlein →</Link>
    </Card>
  );
}
