/**
 * Baking: the plan of a business day with the oven steps and "made"; what
 * to bake that day (orders due plus the expected counter sale); the record
 * of plans for a period; and analytics of planned, made and failed.
 *
 * Keys: N new plan · 1 plan · 2 what to bake · 3 record · 4 analytics · / search · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, CalendarDays, CheckCircle2, ChefHat, Flame, GraduationCap, Layers, ListChecks, Plus, Printer, Sparkles, Timer, Wheat,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { Button, DateRangeMenu, FilterBar, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue, Table, THead, TBody, Tr, Th, Td } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { productionApi, type ProductionPlan } from '../api/production.api';
import { PlanBuilder, type BuilderLine } from '../components/production/PlanBuilder';
import { PlanCard, itemStatus } from '../components/production/PlanCard';
import { ProductionAnalytics } from '../components/production/ProductionAnalytics';
import { SuggestPanel } from '../components/production/SuggestPanel';
import { LoadFailed } from '../components/charts';
import { PRODUCTION_KEY, dayOnly, fmtQty, flavorLabel, sizeLabel, timeOnly } from '../components/meta';

type Tab = 'plan' | 'suggest' | 'record' | 'analytics';

export default function ProductionPage() {
  const startHour = useBusinessDayStart();
  const canManage = usePermission(PERMISSIONS.BAKERY_PRODUCTION_MANAGE);
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const today = businessDayKey(new Date(), startHour);
  const dayKey = (offset: number) => businessDayKey(new Date(Date.now() + offset * 86_400_000), startHour);

  const [tab, setTab] = useState<Tab>('plan');
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [builder, setBuilder] = useState<{ plan?: ProductionPlan; lines?: BuilderLine[] } | null>(null);

  const period = resolveRange(range, startHour);
  const dayQ = useQuery({ queryKey: [PRODUCTION_KEY, 'day', date], queryFn: () => productionApi.listPlans({ from: date, to: date }), refetchInterval: 60_000 });
  const recordQ = useQuery({ queryKey: [PRODUCTION_KEY, 'record', period], queryFn: () => productionApi.listPlans(period ?? {}), enabled: tab === 'record', placeholderData: (p) => p });
  const suggestQ = useQuery({ queryKey: [PRODUCTION_KEY, 'suggest', date], queryFn: () => productionApi.suggest(date), staleTime: 60_000 });

  const plans = dayQ.data ?? [];
  const items = plans.flatMap((p) => p.items ?? []);
  const stats = useMemo(() => {
    const open = items.filter((i) => i.status !== 'COMPLETED');
    const planned = items.reduce((s, i) => s + i.plannedQty, 0);
    const produced = items.reduce((s, i) => s + i.producedQty, 0);
    const failed = items.reduce((s, i) => s + i.failedQty, 0);
    return {
      planned, produced, failed,
      toMake: open.reduce((s, i) => s + i.plannedQty, 0), openLines: open.length,
      inOven: items.filter((i) => i.status === 'BAKING').length,
      donePct: planned ? Math.round((produced / planned) * 100) : 0,
      failRate: produced + failed ? Math.round((failed / (produced + failed)) * 1000) / 10 : 0,
    };
  }, [items]);
  const s = suggestQ.data;
  const t = search.trim().toLowerCase();
  const shownPlans = t ? plans.filter((p) => p.planNumber.toLowerCase().includes(t) || p.items.some((i) => i.productName.toLowerCase().includes(t))) : plans;
  const isToday = date === today;
  const dateTitle = isToday ? 'Aaj' : date === dayKey(1) ? 'Kal' : dayOnly(`${date}T12:00:00`);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setBuilder({}); }
      if (e.key === '1') setTab('plan');
      if (e.key === '2') setTab('suggest');
      if (e.key === '3') setTab('record');
      if (e.key === '4') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('plan'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const printDoc = (): PrintDoc => ({
    title: `Baking plan — ${dateTitle}`,
    subtitle: dayOnly(`${date}T12:00:00`),
    meta: [['Plans', String(plans.length)], ['Banana hai', fmtQty(stats.planned)]],
    sections: [
      ...plans.map((p) => ({
        kind: 'table' as const,
        title: `${p.planNumber}${p.shift ? ` · ${p.shift}` : ''}`,
        columns: [{ label: 'Cheez' }, { label: 'Kitne', align: 'right' as const }, { label: 'Oven', wideOnly: true }, { label: 'Baker', wideOnly: true }, { label: 'Bane', align: 'right' as const }, { label: 'Kharab', align: 'right' as const }],
        rows: p.items.map((i) => [i.productName, fmtQty(i.plannedQty), i.ovenNumber ?? '____', i.bakerName ?? '______', i.status === 'COMPLETED' ? fmtQty(i.producedQty) : '____', i.status === 'COMPLETED' ? fmtQty(i.failedQty) : '____']),
      })),
      ...(s?.customCakes.length ? [{
        kind: 'table' as const, title: 'Us din ke cake order',
        columns: [{ label: 'Waqt' }, { label: 'Customer' }, { label: 'Cake' }, { label: 'Likhna', wideOnly: true }],
        rows: s.customCakes.map((c) => [timeOnly(c.neededBy), c.customerName, `${sizeLabel(c.size)} ${flavorLabel(c.flavor)}`, c.messageOnCake ?? '']),
      }] : []),
    ],
    footer: plans.length ? undefined : 'Is din ka koi plan nahi bana',
  });

  return (
    <PageShell>
      <PageHero
        title="Baking"
        chip={<><CalendarDays /> {dateTitle}</>}
        meta="Kya banana hai, oven me kya hai, kitna bana aur kitna kharab"
        busy={dayQ.isFetching && !dayQ.isLoading}
        loading={dayQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Kitchen sheet" disabled={!plans.length && !s?.customCakes.length} /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setBuilder({})} title="Naya plan (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya plan</button>}
        </>}
        stats={[
          { label: 'Banana baqi', value: fmtQty(stats.toMake), hint: stats.openLines ? `${stats.openLines} cheezein` : undefined },
          { label: 'Ban gaya', value: `${stats.donePct}%`, hint: `${fmtQty(stats.produced)} / ${fmtQty(stats.planned)}` },
          { label: 'Order us din', value: s ? s.totals.orders : '—' },
        ]}
      />

      <KpiRow cols={5}>
        {dayQ.isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Layers} color="#d97706" label="Banana baqi" value={fmtQty(stats.toMake)} hint={`${stats.openLines} cheezein`} onClick={() => setTab('plan')} active={tab === 'plan'} />
          <KpiCard icon={Flame} color="#ea580c" label="Oven me" value={stats.inOven} hint="Abhi bake ho raha" onClick={() => setTab('plan')} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label="Ban gaya" value={fmtQty(stats.produced)} hint={`${stats.donePct}% poora`} onClick={() => setTab('plan')} />
          <KpiCard icon={Timer} color={stats.failRate > 5 ? '#e11d48' : '#64748b'} label="Kharab" value={fmtQty(stats.failed)} hint={`${stats.failRate}% nuqsaan`} onClick={() => setTab('analytics')} active={tab === 'analytics'} />
          <KpiCard icon={Sparkles} color="#7c3aed" label="Andaza" value={s ? fmtQty(s.totals.suggested) : '—'} hint={s ? `${s.rows.filter((r) => r.suggested > 0).length} cheezein banani chahiye` : 'Ban raha hai…'} onClick={() => setTab('suggest')} active={tab === 'suggest'} />
        </>}
      </KpiRow>

      {tab === 'record' || tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">{tab === 'record' ? 'Is period ke saare plan' : 'Is period ka hisaab — plan ki date se'}</p>}>
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" allowAll={false} />
        </FilterBar>
      ) : (
        <FilterBar search={tab === 'plan' ? <SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Cheez ya plan number…" label="Search" /> : <p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Kis din ke liye banana hai — kal ka plan aaj shaam bana lein</p>}>
          <div className="flex flex-wrap items-center gap-1.5">
            {[0, 1, 2].map((o) => {
              const k = dayKey(o);
              return <button key={o} type="button" onClick={() => setDate(k)} className={cn('h-10 rounded-full px-3.5 text-[0.8125rem] font-semibold ring-1 transition', date === k ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{o === 0 ? 'Aaj' : o === 1 ? 'Kal' : 'Parson'}</button>;
            })}
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Din chunein" className="h-10 rounded-full border border-slate-200 bg-white px-3 text-[0.8125rem] text-slate-700" />
          </div>
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> naya plan · </>}<Kbd>1</Kbd>-<Kbd>4</Kbd> tabs</>}
        tabs={[
          { id: 'plan', label: `${dateTitle} ka kaam`, icon: ChefHat, count: plans.length || null },
          { id: 'suggest', label: 'Kya banana hai', icon: Sparkles },
          { id: 'record', label: 'Record', icon: ListChecks },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        <ProductionAnalytics range={period} />
      ) : tab === 'suggest' ? (
        <SuggestPanel date={date} canManage={canManage} onPlan={(lines) => setBuilder({ lines })} />
      ) : tab === 'record' ? (
        recordQ.isError && !recordQ.data ? <LoadFailed what="Plans" retry={() => recordQ.refetch()} />
          : !recordQ.data ? <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            : <PlanRecord plans={recordQ.data} periodText={period ? rangeLabel(period.from, period.to) : ''} onOpen={(p) => { setDate(businessDayKey(new Date(p.planDate), startHour)); setTab('plan'); }} />
      ) : dayQ.isError && !dayQ.data ? (
        <LoadFailed what="Plan" retry={() => dayQ.refetch()} />
      ) : dayQ.isLoading ? (
        <Skeleton className="h-64 rounded-3xl" />
      ) : !shownPlans.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <ChefHat className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{t ? 'Kuch nahi mila' : `${dateTitle} ka koi plan nahi`}</p>
          <p className="mt-1 text-sm text-slate-500">"Kya banana hai" se orders aur sale ka andaza dekh kar ek click me plan banayein.</p>
          {canManage && !t && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button onClick={() => setTab('suggest')} leftIcon={<Sparkles className="h-4 w-4" />}>Kya banana hai</Button>
              <Button variant="secondary" onClick={() => setBuilder({})} leftIcon={<Plus className="h-4 w-4" />}>Khud plan banayein</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">{shownPlans.map((p) => <PlanCard key={p.id} plan={p} canManage={canManage} onAddItems={(plan) => setBuilder({ plan })} />)}</div>
      )}

      {builder && <PlanBuilder date={date} plan={builder.plan} initial={builder.lines} onClose={() => setBuilder(null)} onDone={() => { setBuilder(null); setTab('plan'); }} />}

      {guide.isOpen && (
        <PageGuide title="Baking — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Sparkles, color: '#7c3aed', title: 'Kya banana hai', text: 'Us din ke cake aur bare order, aur pichle 4 hafton me usi din ki sale dekh kar har cheez ki ginti khud aati hai. Ginti badlein aur plan banayein.' },
            { icon: Plus, color: '#d97706', title: 'Plan', text: 'Subah (ya raat ko agle din ka) plan banayein: kya, kitna aur kaunsi shift. Kal ka plan "Kal" chun kar banayein.' },
            { icon: Flame, color: '#ea580c', title: 'Oven me daala', text: 'Temperature aur oven number likhein — baad me pata chalta hai kahan kharabi zyada hoti hai.' },
            { icon: CheckCircle2, color: '#16a34a', title: 'Ban gaya', text: 'Kitne theek bane aur kitne kharab. Chahein to maal stock me, recipe ka saamaan kachche maal se, aur freshness ka batch — sab ek saath.' },
            { icon: Wheat, color: '#a16207', title: 'Recipe ka saamaan', text: 'Product me recipe bani ho to "Recipe ka saamaan ghatayein" se maida, cheeni waghera khud kam hote hain aur cost likhi jati hai.' },
            { icon: Printer, color: '#0891b2', title: 'Kitchen sheet', text: 'Upar se din ka plan print karein — baker khaali jagah me oven, naam aur ginti likh sakta hai.' },
          ]}
          tips={[
            'Kharab hone wali cheez ki wajah zaroor likhein — Freshness aur waste ke record me jati hai.',
            '"Stock me daalein" tabhi on karein agar aap bana hua maal kahin aur se stock me nahi daalte — warna do dafa ginega.',
            'Plan likhne aur badalne ke liye "Bakery production sambhalna" ki permission chahiye.',
          ]}
          shortcuts={[['N', 'naya plan'], ['1', 'aaj ka kaam'], ['2', 'kya banana hai'], ['3', 'record'], ['4', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function PlanRecord({ plans, periodText, onOpen }: { plans: ProductionPlan[]; periodText: string; onOpen: (p: ProductionPlan) => void }) {
  if (!plans.length) return <div className="rounded-3xl bg-white px-6 py-14 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">{periodText} me koi plan nahi</div>;
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <Table minWidth="40rem" className="text-[0.8125rem] [&_table]:text-[0.8125rem]">
          <THead>
            <Tr className="bg-slate-50/70 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
              <Th className="px-4 py-2.5">Din</Th><Th className="px-2 py-2.5">Plan</Th><Th className="px-2 py-2.5">Halat</Th>
              <Th className="px-2 py-2.5 text-right">Socha</Th><Th className="px-2 py-2.5 text-right">Bana</Th><Th className="px-4 py-2.5 text-right">Kharab</Th>
            </Tr>
          </THead>
          <TBody>
            {plans.map((p) => {
              const planned = p.items.reduce((s, i) => s + i.plannedQty, 0);
              const made = p.items.reduce((s, i) => s + i.producedQty, 0);
              const failed = p.items.reduce((s, i) => s + i.failedQty, 0);
              const st = itemStatus(p.status);
              return (
                <Tr key={p.id} onClick={() => onOpen(p)} className="cursor-pointer hover:bg-slate-50">
                  <Td className="px-4 py-2.5 text-slate-700">{dayOnly(p.planDate)}</Td>
                  <Td className="px-2 py-2.5"><span className="font-medium text-slate-900">{p.planNumber}</span>{p.shift ? <span className="text-slate-500"> · {p.shift}</span> : null}<span className="block text-[0.6875rem] text-slate-500">{p.items.length} cheezein</span></Td>
                  <Td className="px-2 py-2.5"><span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}>{st.label}</span></Td>
                  <Td className="px-2 py-2.5 text-right tabular-nums">{fmtQty(planned)}</Td>
                  <Td className="px-2 py-2.5 text-right tabular-nums text-success-700">{fmtQty(made)}</Td>
                  <Td className={cn('px-4 py-2.5 text-right tabular-nums', failed ? 'text-rose-700' : 'text-slate-400')}>{fmtQty(failed)}</Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
    </div>
  );
}
