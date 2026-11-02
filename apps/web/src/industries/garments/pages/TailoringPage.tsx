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
import { t as tr } from '@core/i18n';

type Tab = 'orders' | 'analytics';
type Sort = NonNullable<TailoringQuery['sort']>;

const VIEWS: Array<{ id: TailoringView; label: string; icon: typeof Scissors }> = [
  { id: 'active', label: tr('Chal rahe'), icon: ListChecks },
  { id: 'today', label: tr('Aaj dena hai'), icon: Clock },
  { id: 'tomorrow', label: tr('Kal dena hai'), icon: CalendarDays },
  { id: 'late', label: tr('Late'), icon: AlertTriangle },
  { id: 'trial', label: tr('Trial / fitting'), icon: Ruler },
  { id: 'ready', label: tr('Tayyar — lene aana hai'), icon: CheckCircle2 },
  { id: 'unpaid', label: tr('Paisa baqi'), icon: Wallet },
  { id: 'done', label: tr('De diye / cancel'), icon: Receipt },
  { id: 'all', label: tr('Sab'), icon: Scissors },
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
      title: tr('Silai orders — {{view}}', { view: viewLabel(view) }),
      subtitle: period ? rangeLabel(period.from, period.to) : tr('Sab tareekhen'),
      meta: [[tr('Orders'), String(all.total)], ...(all.totals ? [[tr('Kul'), formatPKR(all.totals.value)] as [string, string], [tr('Baqi lena'), formatPKR(all.totals.due)] as [string, string]] : [])],
      sections: [{
        kind: 'table',
        columns: [{ label: tr('Kab') }, { label: tr('Order'), wideOnly: true }, { label: tr('Customer') }, { label: tr('Kapre'), wideOnly: true }, { label: tr('Karigar'), wideOnly: true }, { label: tr('Halat'), wideOnly: true }, { label: tr('Kul'), align: 'right' }, { label: tr('Baqi'), align: 'right' }],
        rows: all.items.map((o) => [
          dayOnly(o.promisedDate), o.orderNumber, `${o.customerName ?? ''} ${o.customerPhone ?? ''}`.trim(),
          o.items.map((i) => `${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.garmentName}`).join(', '), o.tailorName ?? '—',
          tailoringStatus(o.orderStatus).label, formatPKR(o.total), formatPKR(dueOf(o)),
        ]),
      }],
      footer: all.total > all.items.length ? tr('Pehle {{count}} orders (kul {{total}})', { count: all.items.length, total: all.total }) : undefined,
    };
  };

  const counts = data?.counts;
  return (
    <PageShell>
      <PageHero
        title={tr('Silai orders')}
        chip={<><Scissors /> {' '}{tr('Tailoring')}</>}
        meta={tr('Naap, advance, trial aur delivery — sab ek jagah')}
        busy={(listQ.isFetching && !listQ.isLoading) || sumQ.isFetching}
        loading={sumQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'orders' || !rows.length} /></span>
          <Link to="/garments/measurements" className={heroButton}><Ruler className="h-4 w-4" /><span className="hidden sm:inline">{tr('Naap')}</span></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <Link to="/garments/tailoring/new" title={tr('Naya order (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Naya order')}</Link>}
        </>}
        stats={open ? [
          { label: tr('Chal rahe orders'), value: open.count, hint: sales(open.value) },
          { label: tr('Aaj dena hai'), value: open.today, hint: open.late ? tr('{{late}} late', { late: open.late }) : undefined },
          { label: tr('Lena baqi'), value: sales(open.due), hint: open.unpaid ? tr('{{unpaid}} orders', { unpaid: open.unpaid }) : undefined },
        ] : [{ label: tr('Chal rahe orders'), value: '—' }]}
      />

      <KpiRow cols={5}>
        {!open ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Clock} color="#d97706" label={tr('Aaj dena hai')} value={open.today} hint={open.urgent ? tr('{{urgent}} bohat jaldi wale', { urgent: open.urgent }) : tr('Waqt par tayyar karein')} onClick={() => pick('today')} active={tab === 'orders' && view === 'today'} />
          <KpiCard icon={AlertTriangle} color={open.late ? '#e11d48' : '#64748b'} label={tr('Late')} value={open.late} hint={open.late ? tr('Customer ko foran batayein') : tr('Koi late nahi')} onClick={() => pick('late')} active={tab === 'orders' && view === 'late'} />
          <KpiCard icon={Ruler} color="#7c3aed" label={tr('Trial / fitting')} value={open.trial} hint={tr('Customer ko bulayein')} onClick={() => pick('trial')} active={tab === 'orders' && view === 'trial'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label={tr('Tayyar')} value={open.ready} hint={tr('Lene aana hai')} onClick={() => pick('ready')} active={tab === 'orders' && view === 'ready'} />
          <KpiCard icon={Wallet} color="#0891b2" label={tr('Lena baqi')} value={sales(open.due)} hint={tr('Advance jama {{advance}}', { advance: sales(open.advance) })} onClick={() => pick('unpaid')} active={tab === 'orders' && view === 'unpaid'} />
        </>}
      </KpiRow>

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">{tr('Jo orders is period me book hue ya diye gaye')}</p>}>
          <DateRangeMenu value={aRange} onChange={setARange} startHour={startHour} defaultPreset="thisMonth" allowAll={false} />
        </FilterBar>
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Customer, phone, order #, kapre ka naam…')} label={tr('Search')} />}
          chips={filtered ? <>
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>{tr('Dena: {{from}}', { from: rangeLabel(period.from, period.to) })}</FilterChip>}
            {tailorId && <FilterChip onRemove={() => setTailorId('')}>{tr('Karigar: {{value}}', { value: tailors.find((t) => t.id === tailorId)?.name ?? '—' })}</FilterChip>}
            {priority && <FilterChip onRemove={() => setPriority('')}>{PRIORITIES.find((p) => p.value === priority)?.label}</FilterChip>}
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'active'} onChange={setView} width="w-72"
            options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon, hint: counts ? tr('{{value}} orders', { value: counts[v.id] }) : undefined }))} />
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label={tr('Dene ki date')} />
          {tailors.length > 0 && (
            <FilterMenu icon={UserRound} label={tr('Karigar')} value={tailorId} active={!!tailorId} onChange={setTailorId}
              options={[{ value: '', label: tr('Sab karigar') }, ...tailors.map((t) => ({ value: t.id, label: t.name }))]} />
          )}
          <FilterMenu icon={Flame} label={tr('Jaldi')} value={priority} active={!!priority} onChange={setPriority}
            options={[{ value: '', label: tr('Sab') }, ...PRIORITIES.map((p) => ({ value: p.value as string, label: p.label }))]} />
          <FilterMenu icon={ArrowDownWideNarrow} label={sort === 'amount' ? tr('Bari amount pehle') : sort === 'recent' ? tr('Naye pehle') : tr('Jo pehle dena')} value={sort} onChange={setSort} align="right"
            options={[{ value: 'due', label: tr('Jo pehle dena hai') }, { value: 'recent', label: tr('Naye book pehle') }, { value: 'amount', label: tr('Bari amount pehle') }]} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> {' '}{tr('naya ·')}{' '} </>}<Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>1</Kbd>-<Kbd>2</Kbd> {' '}{tr('tabs')}</>}
        tabs={[
          { id: 'orders', label: tr('Orders'), icon: ListChecks, count: data?.total ?? null },
          { id: 'analytics', label: tr('Analytics'), icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <TailoringAnalytics range={aPeriod} /> : (<>
        {data && data.total > 0 && data.totals && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <span className="text-slate-500">{viewLabel(view)}</span>
            <span className="font-semibold text-slate-900">{tr('{{total}} orders · {{sales}}', { total: data.total, sales: sales(data.totals.value) })}</span>
            <span className="text-success-700">{tr('Advance {{advance}}', { advance: sales(data.totals.advance) })}</span>
            {data.totals.due > 0 && <button type="button" onClick={() => setView('unpaid')} className="text-amber-700 hover:underline">{tr('Lena baqi {{due}}', { due: sales(data.totals.due) })}</button>}
          </div>
        )}

        {listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : listQ.isError && !data ? (
          <LoadFailed what={tr('Orders')} retry={() => listQ.refetch()} />
        ) : !rows.length ? (
          <EmptyList icon={Scissors}
            title={filtered ? tr('Is filter me koi order nahi') : view === 'late' ? tr('Koi order late nahi — shabash') : view === 'today' ? tr('Aaj koi suit nahi dena') : tr('Koi order nahi')}
            text={tr('Customer ka naap lein, kapra aur design likhein, advance lein aur parchi dein — tayyar hone par WhatsApp karein.')}>
            {canManage && <Button onClick={() => navigate('/garments/tailoring/new')} leftIcon={<Plus className="h-4 w-4" />}>{tr('Naya order')}</Button>}
            {filtered && <Button variant="ghost" onClick={clear}>{tr('Filter saaf karein')}</Button>}
            {!filtered && view !== 'all' && <Button variant="ghost" onClick={() => setView('all')}>{tr('Sab orders dekhein')}</Button>}
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
        <PageGuide title={tr('Silai orders — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#db2777', title: tr('Order likhein'), text: tr('"Naya order": customer, naap, kapre (customer ka ya dukaan ka), silai ka rate, kab dena hai aur advance. Parchi customer ko, karigar parchi karigar ko.') },
            { icon: Scissors, color: '#7c3aed', title: tr('Agla qadam — ek button'), text: tr('Pakka → cutting → silai → trial → tayyar → de diya. Ghalti ho to "Ek qadam peeche".') },
            { icon: Receipt, color: '#16a34a', title: tr('"De diya" = asli bill'), text: tr('Suit dete hi bill banta hai: silai ki amount Sale me aati hai, dukaan ka kapra stock se nikalta hai, aur jo baqi rahe woh customer ke khate me. Ek order ka bill do dafa nahi banta.') },
            { icon: Wallet, color: '#0891b2', title: tr('Advance'), text: tr('Advance customer ke khate me jama hota hai aur bill me khud kat jata hai. Cash, card, bank ya JazzCash — jo aaya woh chunein.') },
            { icon: Printer, color: '#ea580c', title: tr('Parchi'), text: tr('Customer ki parchi me amount aur baqi; karigar ki parchi me sirf naap aur design. Dukaan ke bill design me chhapti hai.') },
            { icon: MessageCircle, color: '#22c55e', title: tr('WhatsApp'), text: tr('Tayyar hote hi WhatsApp button se customer ko bata dein — baqi amount khud likha hota hai.') },
          ]}
          tips={[
            tr('Aaj aur Late wale card roz subah dekhein — Eid se pehle har din ginti karein.'),
            tr('Har garment ki silai alag likhein ({{a}}, {{b}}) — analytics me pata chalta hai kya zyada silta hai.', { a: garmentLabel('SHALWAR_KAMEEZ'), b: garmentLabel('WAISTCOAT') }),
            tr('Cancel karne se advance khud wapas nahi hota — customer ke khate me jama rehta hai.'),
          ]}
          shortcuts={[['N', tr('naya order')], ['/', tr('dhoondein')], ['1', tr('orders')], ['2', tr('analytics')], ['G', tr('guide')]]}
        />
      )}
    </PageShell>
  );
}
