/**
 * Bakery raw materials (maida, cheeni, makkhan) are kept apart from the
 * products, so their money is shown here: what is in the store, what it is
 * worth, what is at or under its level and what needs the fridge.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Search, Snowflake, Wheat } from 'lucide-react';
import { KpiCard, KpiRow, Skeleton, Table, THead, TBody, Tr, Th, Td } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useReportMasked } from '@modules/reports/prefs';
import { ingredientsApi } from '@industries/bakery/api/ingredients.api';
import { ageText, dateText, qty } from '../meta';

export function BakeryRaw() {
  const { cost } = useReportMasked();
  const [search, setSearch] = useState('');
  const q = useQuery({ queryKey: ['stock-report-ingredients'], queryFn: () => ingredientsApi.list({}) });

  const rows = useMemo(() => (q.data ?? []).filter((i) => i.isActive !== false).map((i) => {
    const level = Number(i.reorderLevel ?? i.minStock ?? 0);
    const have = Number(i.currentStock || 0);
    const rate = Number(i.costPerUnit || 0);
    const since = i.lastPurchaseDate ? Math.floor((Date.now() - new Date(i.lastPurchaseDate).getTime()) / 86_400_000) : null;
    return { ...i, level, have, rate, value: have * rate, out: have <= 0, low: have > 0 && have <= level, since };
  }).sort((a, b) => b.value - a.value), [q.data]);
  const shown = useMemo(() => {
    const t = search.trim().toLowerCase();
    return t ? rows.filter((r) => [r.name, r.category, r.brand].some((v) => v?.toLowerCase().includes(t))) : rows;
  }, [rows, search]);

  if (q.isLoading) return <Skeleton className="h-72 rounded-3xl" />;
  if (!rows.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <Wheat className="mx-auto h-8 w-8 text-amber-500" />
        <p className="mt-3 font-semibold text-slate-900">Abhi koi saamaan nahi likha</p>
        <Link to="/bakery/ingredients" className="mt-2 inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">Saamaan daalein →</Link>
      </div>
    );
  }
  const total = rows.reduce((a, r) => a + r.value, 0);
  return (
    <div className="space-y-4">
      <KpiRow cols={4}>
        <KpiCard icon={Wheat} color="#a16207" label="Saamaan ki qeemat" value={cost(total)} hint={`${rows.length} cheezein`} />
        <KpiCard icon={AlertTriangle} color="#d97706" label="Kam" value={String(rows.filter((r) => r.low).length)} hint="hadd se neeche" />
        <KpiCard icon={AlertTriangle} color="#e11d48" label="Khatam" value={String(rows.filter((r) => r.out).length)} hint="kuch nahi bana sakte" />
        <KpiCard icon={Snowflake} color="#0284c7" label="Fridge wala" value={String(rows.filter((r) => r.requiresRefrigeration).length)} hint={cost(rows.filter((r) => r.requiresRefrigeration).reduce((a, r) => a + r.value, 0))} />
      </KpiRow>
      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h3 className="text-[0.875rem] font-semibold text-slate-900">Banane ka saamaan · {shown.length}</h3>
          <label className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Maida, cheeni…" aria-label="Saamaan search"
              className="h-9 w-full rounded-xl bg-slate-100/80 pl-9 pr-3 text-[0.8125rem] outline-none focus:bg-white focus:ring-2 focus:ring-brand-500" />
          </label>
        </header>
        <div className="overflow-x-auto">
          <Table minWidth="38rem" className="[&>table]:text-[0.8125rem]">
            <THead className="bg-slate-50/70 text-left text-[0.6875rem] uppercase tracking-wide text-slate-500">
              <Tr><Th className="px-4 py-2">Saamaan</Th><Th className="px-2 py-2 text-right">Abhi hai</Th><Th className="px-2 py-2 text-right">Hadd</Th><Th className="px-2 py-2 text-right">Rate</Th><Th className="px-2 py-2 text-right">Qeemat</Th><Th className="px-4 py-2 text-right">Aakhri purchase</Th></Tr>
            </THead>
            <TBody className="divide-y divide-slate-100">
              {shown.map((r) => (
                <Tr key={r.id}>
                  <Td className="text-inherit px-4 py-2">
                    <span className="font-medium text-slate-900">{r.name}</span>
                    {r.requiresRefrigeration && <Snowflake className="ml-1 inline h-3.5 w-3.5 text-sky-500" aria-label="Fridge" />}
                    <span className="block text-[0.6875rem] text-slate-500">{r.category}</span>
                  </Td>
                  <Td className={cn('px-2 py-2 text-right tabular-nums', r.out ? 'font-semibold text-rose-700' : r.low ? 'font-semibold text-amber-700' : 'text-slate-800')}>{qty(r.have)} {r.unit}</Td>
                  <Td className="px-2 py-2 text-right tabular-nums text-slate-500">{qty(r.level)}</Td>
                  <Td className="text-inherit px-2 py-2 text-right tabular-nums">{cost(r.rate)}</Td>
                  <Td className="text-inherit px-2 py-2 text-right font-semibold tabular-nums">{cost(r.value)}</Td>
                  <Td className="px-4 py-2 text-right text-slate-500">{r.lastPurchaseDate ? `${dateText(r.lastPurchaseDate)} · ${ageText(r.since)}` : '—'}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
