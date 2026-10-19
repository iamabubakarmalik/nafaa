/**
 * Stitching orders: what is due today, what is late, at trial or ready,
 * and the money still to collect; the record by view (active, today, late…)
 * with search, due-date, karigar and priority filters; and analytics. The
 * next step, payments, the slips, WhatsApp and the bill at hand-over all
 * work from the row.
 *
 * Keys: N new order · / search · 1 orders · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, CalendarDays, CheckCircle2, Clock, Filter, Flame, GraduationCap, ListChecks,
  MessageCircle, Plus, Printer, Receipt, Ruler, Scissors, UserRound, Wallet,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  Button, heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { tailoringApi, type TailoringQuery, type TailoringView } from '../api/tailoring.api';
import { EmptyList, LoadFailed, Pager } from '../components/charts';
import { useTailors } from '../components/fields';
import { PRIORITIES, TAILORING_KEY, dayOnly, dueOf, garmentLabel, tailoringStatus } from '../components/meta';
import { useGarmentsCan } from '../components/permissions';
import { TailoringAnalytics } from '../components/tailoring/TailoringAnalytics';
import { TailoringRow } from '../components/tailoring/TailoringRow';
import { useTailoringActions } from '../components/tailoring/useTailoringActions';

type Tab = 'orders' | 'analytics';
type Sort = NonNullable<TailoringQuery['sort']>;

const VIEWS: Array<{ id: TailoringView; label: string; icon: typeof Scissors }> = [
  { id: 'active', label: 'Chal rahe', icon: ListChecks },
  { id: 'today', label: 'Aaj dena hai', icon: Clock },
  { id: 'tomorrow', label: 'Kal dena hai', icon: CalendarDays },
  { id: 'late', label: 'Late', icon: AlertTriangle },
  { id: 'trial', label: 'Trial / fitting', icon: Ruler },
  { id: 'ready', label: 'Tayyar — lene aana hai', icon: CheckCircle2 },
  { id: 'unpaid', label: 'Paisa baqi', icon: Wallet },
  { id: 'done', label: 'De diye / cancel', icon: Receipt },
  { id: 'all', label: 'Sab', icon: Scissors },
];
const viewLabel = (v: TailoringView) => VIEWS.find((x) => x.id === v)?.label ?? v;

export default function TailoringPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const startHour = useBusinessDayStart();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const { manage: canManage } = useGarmentsCan();
  const { sales } = useMasked();
  const guide = usePageGuide();
  const tailors = useTailors();
  const searchRef = useRef<HTMLInputElement>(null);
  useReceiptSetup();

  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'orders');
  const [view, setView] = useState<TailoringView>((params.get('view') as TailoringView) || 'active');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [aRange, setARange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const [tailorId, setTailorId] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState<Sort>('due');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, range, tailorId, priority, sort, query]);
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (tab === 'orders') next.delete('tab'); else next.set('tab', tab);
    if (view === 'active') next.delete('view'); else next.set('view', view);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, view]);

  const period = resolveRange(range, startHour);
  const aPeriod = resolveRange(aRange, startHour);
  const q: TailoringQuery = {
    view, page, limit: 30, sort, search: query || undefined, tailorId: tailorId || undefined, priority: priority || undefined, ...(period ?? {}),
  };
  const listQ = useQuery({ queryKey: [TAILORING_KEY, 'page', q], queryFn: () => tailoringApi.page(q), placeholderData: (p) => p, refetchInterval: 60_000, enabled: tab === 'orders' });
  const sumQ = useQuery({ queryKey: [TAILORING_KEY, 'summary', 'open'], queryFn: () => tailoringApi.summary(), refetchInterval: 60_000 });
  const act = useTailoringActions();

  const data = listQ.data;
  const rows = data?.items ?? [];
  const open = sumQ.data?.open;
  const filtered = !!tailorId || !!priority || !!query || range.preset !== 'all';
  const clear = () => { setTailorId(''); setPriority(''); setSearch(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); };
  const pick = (v: TailoringView) => { setTab('orders'); setView(v); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); navigate('/garments/tailoring/new'); }
      if (e.key === '1') setTab('orders');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('orders'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage, navigate]);

  const printDoc = async (): Promise<PrintDoc> => {
    const all = await tailoringApi.page({ ...q, page: 1, limit: 100 });
    return {
      title: `Silai orders — ${viewLabel(view)}`,
      subtitle: period ? rangeLabel(period.from, period.to) : 'Sab tareekhen',
      meta: [['Orders', String(all.total)], ...(all.totals ? [['Kul', formatPKR(all.totals.value)] as [string, string], ['Baqi lena', formatPKR(all.totals.due)] as [string, string]] : [])],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Kab' }, { label: 'Order', wideOnly: true }, { label: 'Customer' }, { label: 'Kapre', wideOnly: true }, { label: 'Karigar', wideOnly: true }, { label: 'Halat', wideOnly: true }, { label: 'Kul', align: 'right' }, { label: 'Baqi', align: 'right' }],
        rows: all.items.map((o) => [
          dayOnly(o.promisedDate), o.orderNumber, `${o.customerName ?? ''} ${o.customerPhone ?? ''}`.trim(),
          o.items.map((i) => `${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.garmentName}`).join(', '), o.tailorName ?? '—',
          tailoringStatus(o.orderStatus).label, formatPKR(o.total), formatPKR(dueOf(o)),
        ]),
      }],
      footer: all.total > all.items.length ? `Pehle ${all.items.length} orders (kul ${all.total})` : undefined,
    };
  };

  const counts = data?.counts;
  return (
    <PageShell>
      <PageHero
        title="Silai orders"
        chip={<><Scissors /> Tailoring</>}
        meta="Naap, advance, trial aur delivery — sab ek jagah"
        busy={(listQ.isFetching && !listQ.isLoading) || sumQ.isFetching}
        loading={sumQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'orders' || !rows.length} /></span>
          <Link to="/garments/measurements" className={heroButton}><Ruler className="h-4 w-4" /><span className="hidden sm:inline">Naap</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <Link to="/garments/tailoring/new" title="Naya order (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya order</Link>}
        </>}
        stats={open ? [
          { label: 'Chal rahe orders', value: open.count, hint: sales(open.value) },
          { label: 'Aaj dena hai', value: open.today, hint: open.late ? `${open.late} late` : undefined },
          { label: 'Lena baqi', value: sales(open.due), hint: open.unpaid ? `${open.unpaid} orders` : undefined },
        ] : [{ label: 'Chal rahe orders', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!open ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Clock} color="#d97706" label="Aaj dena hai" value={open.today} hint={open.urgent ? `${open.urgent} bohat jaldi wale` : 'Waqt par tayyar karein'} onClick={() => pick('today')} active={tab === 'orders' && view === 'today'} />
          <KpiCard icon={AlertTriangle} color={open.late ? '#e11d48' : '#64748b'} label="Late" value={open.late} hint={open.late ? 'Customer ko foran batayein' : 'Koi late nahi'} onClick={() => pick('late')} active={tab === 'orders' && view === 'late'} />
          <KpiCard icon={Ruler} color="#7c3aed" label="Trial / fitting" value={open.trial} hint="Customer ko bulayein" onClick={() => pick('trial')} active={tab === 'orders' && view === 'trial'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label="Tayyar" value={open.ready} hint="Lene aana hai" onClick={() => pick('ready')} active={tab === 'orders' && view === 'ready'} />
          <KpiCard icon={Wallet} color="#0891b2" label="Lena baqi" value={sales(open.due)} hint={`Advance jama ${sales(open.advance)}`} onClick={() => pick('unpaid')} active={tab === 'orders' && view === 'unpaid'} />
        </>}
      </KpiRow>

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Jo orders is period me book hue ya diye gaye</p>}>
          <DateRangeMenu value={aRange} onChange={setARange} startHour={startHour} defaultPreset="thisMonth" allowAll={false} />
        </FilterBar>
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Customer, phone, order #, kapre ka naam…" label="Search" />}
          chips={filtered ? <>
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>Dena: {rangeLabel(period.from, period.to)}</FilterChip>}
            {tailorId && <FilterChip onRemove={() => setTailorId('')}>Karigar: {tailors.find((t) => t.id === tailorId)?.name ?? '—'}</FilterChip>}
            {priority && <FilterChip onRemove={() => setPriority('')}>{PRIORITIES.find((p) => p.value === priority)?.label}</FilterChip>}
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'active'} onChange={setView} width="w-72"
            options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon, hint: counts ? `${counts[v.id]} orders` : undefined }))} />
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label="Dene ki date" />
          {tailors.length > 0 && (
            <FilterMenu icon={UserRound} label="Karigar" value={tailorId} active={!!tailorId} onChange={setTailorId}
              options={[{ value: '', label: 'Sab karigar' }, ...tailors.map((t) => ({ value: t.id, label: t.name }))]} />
          )}
          <FilterMenu icon={Flame} label="Jaldi" value={priority} active={!!priority} onChange={setPriority}
            options={[{ value: '', label: 'Sab' }, ...PRIORITIES.map((p) => ({ value: p.value as string, label: p.label }))]} />
          <FilterMenu icon={ArrowDownWideNarrow} label={sort === 'amount' ? 'Bari amount pehle' : sort === 'recent' ? 'Naye pehle' : 'Jo pehle dena'} value={sort} onChange={setSort} align="right"
            options={[{ value: 'due', label: 'Jo pehle dena hai' }, { value: 'recent', label: 'Naye book pehle' }, { value: 'amount', label: 'Bari amount pehle' }]} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[
          { id: 'orders', label: 'Orders', icon: ListChecks, count: data?.total ?? null },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <TailoringAnalytics range={aPeriod} /> : (<>
        {data && data.total > 0 && data.totals && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <span className="text-slate-500">{viewLabel(view)}</span>
            <span className="font-semibold text-slate-900">{data.total} orders · {sales(data.totals.value)}</span>
            <span className="text-success-700">Advance {sales(data.totals.advance)}</span>
            {data.totals.due > 0 && <button type="button" onClick={() => setView('unpaid')} className="text-amber-700 hover:underline">Lena baqi {sales(data.totals.due)}</button>}
          </div>
        )}

        {listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : listQ.isError && !data ? (
          <LoadFailed what="Orders" retry={() => listQ.refetch()} />
        ) : !rows.length ? (
          <EmptyList icon={Scissors}
            title={filtered ? 'Is filter me koi order nahi' : view === 'late' ? 'Koi order late nahi — shabash' : view === 'today' ? 'Aaj koi suit nahi dena' : 'Koi order nahi'}
            text="Customer ka naap lein, kapra aur design likhein, advance lein aur parchi dein — tayyar hone par WhatsApp karein.">
            {canManage && <Button onClick={() => navigate('/garments/tailoring/new')} leftIcon={<Plus className="h-4 w-4" />}>Naya order</Button>}
            {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
            {!filtered && view !== 'all' && <Button variant="ghost" onClick={() => setView('all')}>Sab orders dekhein</Button>}
          </EmptyList>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((o) => <TailoringRow key={o.id} o={o} a={act} canManage={canManage} shopName={shopName} />)}
          </ul>
        )}
        {data && <Pager page={page} pages={data.pages} onPage={setPage} />}
      </>)}

      {act.modals}

      {guide.isOpen && (
        <PageGuide title="Silai orders — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#db2777', title: 'Order likhein', text: '"Naya order": customer, naap, kapre (customer ka ya dukaan ka), silai ka rate, kab dena hai aur advance. Parchi customer ko, karigar parchi karigar ko.' },
            { icon: Scissors, color: '#7c3aed', title: 'Agla qadam — ek button', text: 'Pakka → cutting → silai → trial → tayyar → de diya. Ghalti ho to "Ek qadam peeche".' },
            { icon: Receipt, color: '#16a34a', title: '"De diya" = asli bill', text: `Suit dete hi bill banta hai: silai ki amount Sale me aati hai, dukaan ka kapra stock se nikalta hai, aur jo baqi rahe woh customer ke khate me. Ek order ka bill do dafa nahi banta.` },
            { icon: Wallet, color: '#0891b2', title: 'Advance', text: 'Advance customer ke khate me jama hota hai aur bill me khud kat jata hai. Cash, card, bank ya JazzCash — jo aaya woh chunein.' },
            { icon: Printer, color: '#ea580c', title: 'Parchi', text: 'Customer ki parchi me amount aur baqi; karigar ki parchi me sirf naap aur design. Dukaan ke bill design me chhapti hai.' },
            { icon: MessageCircle, color: '#22c55e', title: 'WhatsApp', text: 'Tayyar hote hi WhatsApp button se customer ko bata dein — baqi amount khud likha hota hai.' },
          ]}
          tips={[
            'Aaj aur Late wale card roz subah dekhein — Eid se pehle har din ginti karein.',
            `Har garment ki silai alag likhein (${garmentLabel('SHALWAR_KAMEEZ')}, ${garmentLabel('WAISTCOAT')}) — analytics me pata chalta hai kya zyada silta hai.`,
            'Cancel karne se advance khud wapas nahi hota — customer ke khate me jama rehta hai.',
          ]}
          shortcuts={[['N', 'naya order'], ['/', 'dhoondein'], ['1', 'orders'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
