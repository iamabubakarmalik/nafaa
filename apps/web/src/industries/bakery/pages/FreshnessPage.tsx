/**
 * Freshness and wastage: batches on the shelf by time left (sell, sell
 * cheap or throw away), the wastage log with reasons and cost for a period
 * (thrown batches, failed baking, raw materials, damage), and analytics.
 *
 * Keys: N new batch · / search · 1 shelf · 2 wastage · 3 analytics · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BarChart3, CheckCircle2, Clock, FileSpreadsheet, Filter, Flame, GraduationCap, Layers, Package, Percent, Plus, RefreshCw,
  Tag, Timer, Trash2, Wheat,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { freshnessApi, type FreshnessLog, type WasteSource } from '../api/freshness.api';
import { BatchActionModal, NewBatchModal, type BatchAction } from '../components/fresh/BatchModals';
import { SOURCE, WasteAnalytics, WasteRecord, useWastage } from '../components/fresh/Wastage';
import { LoadFailed } from '../components/charts';
import { FRESH_KEY, apiError, dateTime, downloadCsv, fmtQty, hoursTo } from '../components/meta';

type Tab = 'live' | 'waste' | 'analytics';
type View = 'urgent' | 'all' | 'expired';

const VIEW_LABEL: Record<View, string> = { urgent: '24 ghante me', all: 'Sab shelf par', expired: 'Waqt guzar gaya' };

function leftPhrase(h: number) {
  if (h <= 0) { const p = -h; return p < 24 ? `${Math.max(Math.round(p), 1)} ghante pehle guzar gaya` : `${Math.round(p / 24)} din pehle guzar gaya`; }
  if (h < 1) return `${Math.max(Math.round(h * 60), 1)} minute baqi`;
  return h < 24 ? `${Math.round(h)} ghante baqi` : `${Math.round(h / 24)} din baqi`;
}

export default function FreshnessPage() {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const canManage = usePermission(PERMISSIONS.BAKERY_PRODUCTION_MANAGE);
  const { cost, costHidden } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('live');
  const [view, setView] = useState<View>('urgent');
  const [source, setSource] = useState<'' | WasteSource>('');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<{ log: FreshnessLog; mode: BatchAction } | null>(null);
  const [adding, setAdding] = useState(false);

  const period = resolveRange(range, startHour);
  const liveQ = useQuery({ queryKey: [FRESH_KEY, 'live'], queryFn: () => freshnessApi.list({ active: 'true' }), refetchInterval: 60_000 });
  const productsQ = useQuery({ queryKey: ['bakery-all-products'], queryFn: () => fetchAllProducts({ isActive: undefined }), staleTime: 5 * 60_000 });
  const wasteQ = useWastage(period);
  const check = useMutation({
    mutationFn: freshnessApi.runCheck,
    onSuccess: (r: { checked?: number; expired?: number }) => { toast.success(`${r?.checked ?? 0} batch dekhe — ${r?.expired ?? 0} ka waqt guzar gaya`); qc.invalidateQueries({ queryKey: [FRESH_KEY] }); },
    onError: (e) => toast.error(apiError(e, 'Check nahi hua')),
  });

  const costOf = useMemo(() => new Map(((productsQ.data?.items ?? []) as Array<{ id: string; costPrice?: number }>).map((p) => [p.id, Number(p.costPrice || 0)])), [productsQ.data]);
  const live = useMemo(() => (liveQ.data ?? []).filter((f) => f.status !== 'DISCARDED' && f.currentQty > 0)
    .map((f) => ({ ...f, left: hoursTo(f.expiryDate || f.bestBefore) ?? 0, value: f.currentQty * (costOf.get(f.productId) ?? 0) }))
    .sort((a, b) => a.left - b.left), [liveQ.data, costOf]);
  const stats = useMemo(() => {
    const expired = live.filter((f) => f.left <= 0);
    const soon = live.filter((f) => f.left > 0 && f.left <= 6);
    const day = live.filter((f) => f.left <= 24);
    return { expired, soon, day, pieces: live.reduce((s, f) => s + f.currentQty, 0), atRisk: day.reduce((s, f) => s + f.value, 0), expiredValue: expired.reduce((s, f) => s + f.value, 0) };
  }, [live]);
  const t = search.trim().toLowerCase();
  const shown = live.filter((f) => (view === 'all' || (view === 'expired' ? f.left <= 0 : f.left <= 24)) && (!t || f.productName.toLowerCase().includes(t) || (f.batchNumber ?? '').toLowerCase().includes(t)));
  const w = wasteQ.data?.totals;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setAdding(true); }
      if (e.key === '1') setTab('live');
      if (e.key === '2') setTab('waste');
      if (e.key === '3') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); if (tab === 'analytics') setTab('live'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage, tab]);

  const printDoc = (): PrintDoc => tab === 'live' ? {
    title: `Shelf ka maal — ${VIEW_LABEL[view]}`,
    meta: [['Batch', String(shown.length)], ['Pieces', fmtQty(shown.reduce((s, f) => s + f.currentQty, 0))]],
    sections: [{ kind: 'table', columns: [{ label: 'Cheez' }, { label: 'Batch', wideOnly: true }, { label: 'Baqi', align: 'right' }, { label: 'Kab tak', align: 'right' }, { label: 'Kya kiya', align: 'right' }],
      rows: shown.map((f) => [f.productName, f.batchNumber ?? '', fmtQty(f.currentQty), dateTime(f.expiryDate || f.bestBefore), '______']) }],
  } : {
    title: 'Zaya ka record',
    subtitle: period ? rangeLabel(period.from, period.to) : undefined,
    meta: [['Dafa', String(w?.count ?? 0)], ...(costHidden ? [] : [['Lagat', cost(w?.cost ?? 0)] as [string, string]])],
    sections: [{ kind: 'table', columns: [{ label: 'Kab' }, { label: 'Cheez' }, { label: 'Wajah', wideOnly: true }, { label: 'Miqdar', align: 'right' }, { label: 'Lagat', align: 'right' }],
      rows: (wasteQ.data?.rows ?? []).filter((r) => !source || r.source === source).map((r) => [dateTime(r.at), r.name, r.reason, `${fmtQty(r.qty)} ${r.unit}`, r.cost != null ? cost(r.cost) : '']) }],
  };

  return (
    <PageShell>
      <PageHero
        title="Taazgi aur zaya"
        chip={<><Timer /> Freshness</>}
        meta="Jo aaj nahi bika woh kal kachra — jaldi bechein, aur jo phenka us ka hisaab"
        busy={liveQ.isFetching && !liveQ.isLoading}
        loading={liveQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab === 'analytics'} /></span>
          <button type="button" title="CSV" className={heroIconButton} onClick={() => tab === 'live'
            ? downloadCsv('taazgi', ['Cheez', 'Batch', 'Bana', 'Baqi', 'Bika', 'Zaya', 'Kab tak'], shown.map((f) => [f.productName, f.batchNumber, f.initialQty, f.currentQty, f.soldQty, f.wastedQty, dateTime(f.expiryDate || f.bestBefore)]))
            : downloadCsv('zaya', ['Kab', 'Kahan se', 'Cheez', 'Wajah', 'Miqdar', 'Unit', 'Lagat'], (wasteQ.data?.rows ?? []).map((r) => [dateTime(r.at), SOURCE[r.source].label, r.name, r.reason, r.qty, r.unit, r.cost]))}>
            <FileSpreadsheet className="h-4 w-4" />
          </button>
          {canManage && <button type="button" onClick={() => check.mutate()} disabled={check.isPending} title="Sab batch ka waqt dobara dekhein" className={heroButton}><RefreshCw className={cn('h-4 w-4', check.isPending && 'animate-spin')} /><span className="hidden sm:inline">Dobara check</span></button>}
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setAdding(true)} title="Naya batch (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya batch</button>}
        </>}
        stats={[
          { label: '24 ghante me kharab', value: costHidden ? stats.day.length : cost(stats.atRisk), hint: `${stats.day.length} batch` },
          { label: 'Waqt guzar gaya', value: stats.expired.length, hint: stats.expired.length && !costHidden ? cost(stats.expiredValue) : undefined },
          { label: period ? 'Zaya is muddat' : 'Zaya', value: w ? (costHidden ? fmtQty(w.pieces) : cost(w.cost ?? 0)) : '—', hint: w?.wastePct != null ? `${w.wastePct}%` : undefined },
        ]}
      />

      <KpiRow cols={5}>
        {liveQ.isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Flame} color={stats.expired.length ? '#e11d48' : '#64748b'} label="Waqt guzar gaya" value={stats.expired.length} hint={stats.expired.length ? 'Aaj hi hatayein' : 'Koi nahi'} onClick={() => { setTab('live'); setView('expired'); }} active={tab === 'live' && view === 'expired'} />
          <KpiCard icon={Clock} color="#d97706" label="6 ghante me" value={stats.soon.length} hint="Discount laga dein" onClick={() => { setTab('live'); setView('urgent'); }} active={tab === 'live' && view === 'urgent'} />
          <KpiCard icon={Package} color="#0891b2" label="Shelf par" value={fmtQty(stats.pieces)} hint={`${live.length} batch`} onClick={() => { setTab('live'); setView('all'); }} active={tab === 'live' && view === 'all'} />
          <KpiCard icon={Trash2} color="#e11d48" label="Zaya" value={w ? (costHidden ? fmtQty(w.pieces) : cost(w.cost ?? 0)) : '—'} hint={period ? rangeLabel(period.from, period.to) : ''} onClick={() => setTab('waste')} active={tab === 'waste'} />
          <KpiCard icon={Percent} color={w?.wastePct != null && w.wastePct > 10 ? '#e11d48' : '#16a34a'} label="Zaya ki sharah" value={w?.wastePct != null ? `${w.wastePct}%` : '—'} hint="10% se kam achha" onClick={() => setTab('analytics')} active={tab === 'analytics'} />
        </>}
      </KpiRow>

      {tab === 'live' ? (
        <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Cheez ya batch…" label="Dhoondein" />}
          chips={view !== 'urgent' ? <FilterChip onRemove={() => setView('urgent')}>{VIEW_LABEL[view]}</FilterChip> : undefined} onClear={() => { setView('urgent'); setSearch(''); }}>
          <FilterMenu icon={Filter} label={VIEW_LABEL[view]} value={view} active={view !== 'urgent'} onChange={setView}
            options={[{ value: 'urgent', label: '24 ghante me kharab' }, { value: 'expired', label: 'Waqt guzar gaya' }, { value: 'all', label: 'Sab shelf par' }]} />
        </FilterBar>
      ) : (
        <FilterBar
          search={tab === 'waste' ? <SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Cheez ya wajah…" label="Dhoondein" /> : <p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Is muddat me kya, kyun aur kitne ka phenka</p>}
          chips={tab === 'waste' && (source || search) ? <>
            {source && <FilterChip onRemove={() => setSource('')}>{SOURCE[source].label}</FilterChip>}
            {search && <FilterChip onRemove={() => setSearch('')}>"{search}"</FilterChip>}
          </> : undefined}
          onClear={() => { setSource(''); setSearch(''); }}>
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="thisMonth" allowAll={false} />
          {tab === 'waste' && <FilterMenu icon={Layers} label={source ? SOURCE[source].label : 'Kahan se'} value={source} active={!!source} onChange={setSource}
            options={[{ value: '' as const, label: 'Sab' }, ...(Object.keys(SOURCE) as WasteSource[]).map((k) => ({ value: k, label: SOURCE[k].label, icon: SOURCE[k].icon }))]} />}
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> naya batch · </>}<Kbd>/</Kbd> dhoondein · <Kbd>1</Kbd>-<Kbd>3</Kbd> tabs</>}
        tabs={[
          { id: 'live', label: 'Shelf par', icon: Timer, count: stats.day.length || null },
          { id: 'waste', label: 'Zaya ka record', icon: Trash2, count: w?.count ?? null },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <WasteAnalytics range={period} onReason={(r) => { setSearch(r); setTab('waste'); }} />
        : tab === 'waste' ? (<>
          <div className="flex flex-wrap gap-2 text-[0.8125rem]">
            <Link to="/bakery/ingredients" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Wheat className="h-4 w-4" />Kachcha maal zaya likhein</Link>
            <Link to="/damage" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Package className="h-4 w-4" />Khareeda hua maal kharab</Link>
          </div>
          <WasteRecord range={period} source={source} search={search} />
        </>)
          : liveQ.isError && !liveQ.data ? <LoadFailed what="Batch" retry={() => liveQ.refetch()} />
            : liveQ.isLoading ? <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
              : !shown.length ? (
                <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-success-500" />
                  <p className="mt-3 font-semibold text-slate-900">{view === 'expired' ? 'Kisi batch ka waqt nahi guzra' : view === 'urgent' ? 'Agle 24 ghante me kuch kharab nahi ho raha' : 'Shelf par koi batch nahi'}</p>
                  <p className="mt-1 text-sm text-slate-500">Baking me "Ban gaya" par taazgi ka batch khud banta hai — ya "Naya batch" se haath se jorein.</p>
                  {view !== 'all' && live.length > 0 && <Button className="mt-4" variant="secondary" onClick={() => setView('all')}>Sab batch dekhein</Button>}
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
                  {shown.map((f) => {
                    const gone = f.left <= 0;
                    const soon = !gone && f.left <= 6;
                    const sold = f.initialQty ? Math.round((f.soldQty / f.initialQty) * 100) : 0;
                    return (
                      <li key={f.id} className="px-3 py-3 sm:px-4">
                        <div className="flex items-center gap-3">
                          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', gone ? 'bg-rose-50 text-rose-600' : soon ? 'bg-amber-50 text-amber-600' : 'bg-success-50 text-success-700')}><Clock className="h-5 w-5" /></span>
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-1.5"><Link to={`/bakery-products/${f.productId}`} className="truncate font-semibold text-slate-900 hover:text-brand-700">{f.productName}</Link>{f.batchNumber && <span className="text-[0.75rem] text-slate-400">#{f.batchNumber}</span>}</p>
                            <p className={cn('text-[0.75rem]', gone ? 'font-semibold text-rose-700' : soon ? 'font-semibold text-amber-700' : 'text-slate-500')}>{leftPhrase(f.left)} · {dateTime(f.expiryDate || f.bestBefore)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-bold tabular-nums text-slate-900">{fmtQty(f.currentQty)} <span className="text-[0.75rem] font-medium text-slate-500">/ {fmtQty(f.initialQty)}</span></p>
                            {f.value > 0 && !costHidden && <p className="text-[0.6875rem] tabular-nums text-amber-700">{cost(f.value)}</p>}
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 sm:ml-[3.25rem]"><div className="h-full rounded-full bg-success-500" style={{ width: `${Math.min(sold, 100)}%` }} /></div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:ml-[3.25rem]">
                          <span className="mr-auto text-[0.6875rem] text-slate-500">{sold}% bik chuka{f.discountedQty ? ` · ${fmtQty(f.discountedQty)} sasta` : ''}{f.wastedQty ? ` · ${fmtQty(f.wastedQty)} zaya` : ''}</span>
                          {canManage && <>
                            <Button size="xs" variant="secondary" onClick={() => setAction({ log: f, mode: 'sale' })} leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}>Bik gaya</Button>
                            <Button size="xs" variant="secondary" onClick={() => setAction({ log: f, mode: 'discount' })} leftIcon={<Tag className="h-3.5 w-3.5" />}>Sasta becha</Button>
                            <Button size="xs" variant="critical" onClick={() => setAction({ log: f, mode: 'discard' })} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>Phenk diya</Button>
                          </>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

      {action && <BatchActionModal log={action.log} mode={action.mode} onClose={() => setAction(null)} />}
      {adding && <NewBatchModal onClose={() => setAdding(false)} />}

      {guide.isOpen && (
        <PageGuide title="Taazgi aur zaya — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Timer, color: '#0891b2', title: 'Shelf par kya hai', text: 'Har batch kab tak theek hai — jo pehle kharab hoga woh sab se upar. Baking me "Ban gaya" par batch khud banta hai.' },
            { icon: Tag, color: '#d97706', title: 'Jaldi bechein', text: '6 ghante se kam bacha ho to discount laga kar bechein — "Sasta becha" likhein taake pata rahe kitna bacha liya.' },
            { icon: Trash2, color: '#e11d48', title: 'Phenk diya', text: 'Kitne phenke aur kyun. "Stock se bhi ghatayein" on ho to damage report banti hai; manager manzoor kare to stock kam hota hai.' },
            { icon: Flame, color: '#ea580c', title: 'Zaya ka record', text: 'Shelf ka phenka, baking me kharab, kachcha maal zaya aur damage report — sab ek jagah, wajah aur lagat ke saath.' },
            { icon: BarChart3, color: '#7c3aed', title: 'Analytics', text: 'Kis wajah aur kis cheez me sab se zyada nuqsaan. Zaya ki sharah 10% se upar ho to batch chhota karein.' },
            { icon: AlertTriangle, color: '#64748b', title: 'Dobara check', text: 'Sab batch ka haal waqt ke hisaab se dobara lagta hai — taaza, kal ka, jaldi kharab, waqt guzar gaya.' },
          ]}
          tips={[
            '"Kya banana hai" (Baking) zaya kam karne ka sab se achha tareeqa hai — bikri ke hisaab se banayein.',
            'Lagat product ki cost price se aati hai — cost na likhi ho to recipe se.',
            'Batch sambhalne ke liye "Bakery production sambhalna" ki ijazat chahiye.',
          ]}
          shortcuts={[['N', 'naya batch'], ['/', 'dhoondein'], ['1', 'shelf'], ['2', 'zaya'], ['3', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
