/**
 * Alterations: garments handed in for fitting (bought here or elsewhere),
 * what is due today, late or ready, and the money to collect; the record by
 * view with search, date and job-type filters; and analytics. The token,
 * WhatsApp, payments and the bill at hand-over work from the row.
 *
 * Keys: N new · / search · 1 tickets · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BarChart3, Ban, CalendarClock, CheckCircle2, ChevronDown, Clock, Filter, GraduationCap, ListChecks, MessageCircle,
  Pencil, Phone, Plus, Printer, Receipt, Ruler, Scissors, Shirt, Undo2, UserRound, Wallet,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, Card, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { waLink } from '@core/lib/whatsapp/templates';
import { useAuthStore } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { TakePaymentModal } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { alterationsApi, type AlterationQuery, type AlterationStatus, type AlterationTicket, type AlterationView } from '../api/alterations.api';
import { AlterationForm } from '../components/alteration/AlterationForm';
import { AnalyticsSkeleton, CardTitle, EmptyList, LoadFailed, Pager, RankedBars, StatTile } from '../components/charts';
import { CancelModal, Pill } from '../components/fields';
import {
  ALTERATION_KEY, ALTERATION_PREV, ALTERATION_TYPES, MONEY_KEYS, alterationNext, alterationStatus, apiError, daysFrom, dayOnly, dueOf, isClosed, whenText,
} from '../components/meta';
import { useGarmentsCan } from '../components/permissions';
import { alterationMessage, printAlterationSlip } from '../components/slips';

type Tab = 'tickets' | 'analytics';
const VIEWS: Array<{ id: AlterationView; label: string; icon: typeof Ruler }> = [
  { id: 'active', label: 'Chal rahe', icon: ListChecks },
  { id: 'today', label: 'Aaj dena hai', icon: Clock },
  { id: 'late', label: 'Late', icon: AlertTriangle },
  { id: 'ready', label: 'Tayyar — lene aana hai', icon: CheckCircle2 },
  { id: 'unpaid', label: 'Paisa baqi', icon: Wallet },
  { id: 'done', label: 'De diye / cancel', icon: Receipt },
  { id: 'all', label: 'Sab', icon: Ruler },
];
const viewLabel = (v: AlterationView) => VIEWS.find((x) => x.id === v)?.label ?? v;
const due = (t: AlterationTicket) => dueOf({ total: t.charges, paidAmount: t.paidAmount });

export default function AlterationsPage() {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const { manage } = useGarmentsCan();
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  useReceiptSetup();

  const [tab, setTab] = useState<Tab>('tickets');
  const [view, setView] = useState<AlterationView>('active');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [aRange, setARange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ ticket: AlterationTicket | null } | null>(null);
  const [payOn, setPayOn] = useState<AlterationTicket | null>(null);
  const [deliverOn, setDeliverOn] = useState<AlterationTicket | null>(null);
  const [cancelOn, setCancelOn] = useState<AlterationTicket | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, range, type, query]);

  const period = resolveRange(range, startHour);
  const aPeriod = resolveRange(aRange, startHour);
  const q: AlterationQuery = { view, page, limit: 30, search: query || undefined, type: type || undefined, ...(period ?? {}) };
  const listQ = useQuery({ queryKey: [ALTERATION_KEY, 'page', q], queryFn: () => alterationsApi.page(q), placeholderData: (p) => p, refetchInterval: 60_000, enabled: tab === 'tickets' });
  const sumQ = useQuery({ queryKey: [ALTERATION_KEY, 'summary', tab === 'analytics' ? aPeriod : null], queryFn: () => alterationsApi.summary(tab === 'analytics' ? aPeriod ?? undefined : undefined), placeholderData: (p) => p, refetchInterval: 60_000 });
  const refresh = () => [ALTERATION_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const status = useMutation({
    mutationFn: ({ t, to, paidNow, method }: { t: AlterationTicket; to: AlterationStatus; paidNow?: number; method?: PaymentMethod }) =>
      alterationsApi.updateStatus(t.id, to, paidNow === undefined ? undefined : { paidNow, paymentMethod: method }),
    onSuccess: (t) => {
      toast.success(t.status === 'DELIVERED' ? `${t.ticketNumber} de diya${t.bill ? ` — bill ${t.bill.saleNumber}` : ''}` : `${t.ticketNumber}: ${alterationStatus(t.status).label}`);
      setDeliverOn(null); refresh();
    },
    onError: (e) => toast.error(apiError(e, 'Halat nahi badli')),
  });
  const pay = useMutation({
    mutationFn: ({ t, amount, method }: { t: AlterationTicket; amount: number; method: PaymentMethod }) => alterationsApi.payment(t.id, amount, method),
    onSuccess: (t) => { toast.success(`${t.ticketNumber}: payment darj`); setPayOn(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Payment darj nahi hui')),
  });
  const next = (t: AlterationTicket) => {
    const n = alterationNext(t.status);
    if (!n) return;
    if (n.to !== 'DELIVER') { status.mutate({ t, to: n.to }); return; }
    // A free alteration has no bill; it is just handed back.
    if (t.charges <= 0) status.mutate({ t, to: 'DELIVERED', paidNow: 0 });
    else setDeliverOn(t);
  };

  const data = listQ.data;
  const rows = data?.items ?? [];
  const open = sumQ.data?.open;
  const filtered = !!type || !!query || range.preset !== 'all';
  const clear = () => { setType(''); setSearch(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); };
  const pick = (v: AlterationView) => { setTab('tickets'); setView(v); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && manage) { e.preventDefault(); setForm({ ticket: null }); }
      if (e.key === '1') setTab('tickets');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('tickets'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [manage]);

  const printDoc = async (): Promise<PrintDoc> => {
    const all = await alterationsApi.page({ ...q, page: 1, limit: 100 });
    return {
      title: `Alterations — ${viewLabel(view)}`,
      subtitle: period ? rangeLabel(period.from, period.to) : 'Sab tareekhen',
      meta: [['Tickets', String(all.total)], ...(all.totals ? [['Lena baqi', formatPKR(all.totals.due)] as [string, string]] : [])],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Kab' }, { label: 'Token', wideOnly: true }, { label: 'Customer' }, { label: 'Kapra' }, { label: 'Kaam', wideOnly: true }, { label: 'Halat', wideOnly: true }, { label: 'Charges', align: 'right' }],
        rows: all.items.map((t) => [dayOnly(t.promisedDate), t.ticketNumber, `${t.customerName ?? ''} ${t.customerPhone ?? ''}`.trim(), t.garmentDescription, t.alterationType, alterationStatus(t.status).label, formatPKR(t.charges)]),
      }],
    };
  };

  const counts = data?.counts;
  return (
    <PageShell>
      <PageHero
        title="Alterations"
        chip={<><Ruler /> Fitting</>}
        meta="Kapra lein, token dein, waqt par wapas karein"
        busy={(listQ.isFetching && !listQ.isLoading) || sumQ.isFetching}
        loading={sumQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'tickets' || !rows.length} /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {manage && <button type="button" onClick={() => setForm({ ticket: null })} title="Naya (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Kapra lein</button>}
        </>}
        stats={open ? [
          { label: 'Chal rahe', value: open.count, hint: sales(open.value) },
          { label: 'Aaj dena hai', value: open.today, hint: open.late ? `${open.late} late` : undefined },
          { label: 'Lena baqi', value: sales(open.due) },
        ] : [{ label: 'Chal rahe', value: '—' }]}
      />

      <KpiRow cols={4}>
        {!open ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Clock} color="#d97706" label="Aaj dena hai" value={open.today} hint="Waqt par tayyar karein" onClick={() => pick('today')} active={tab === 'tickets' && view === 'today'} />
          <KpiCard icon={AlertTriangle} color={open.late ? '#e11d48' : '#64748b'} label="Late" value={open.late} hint={open.late ? 'Customer ko batayein' : 'Koi late nahi'} onClick={() => pick('late')} active={tab === 'tickets' && view === 'late'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label="Tayyar" value={open.ready} hint="Lene aana hai" onClick={() => pick('ready')} active={tab === 'tickets' && view === 'ready'} />
          <KpiCard icon={Wallet} color="#0891b2" label="Lena baqi" value={sales(open.due)} hint={`${open.count} tickets par`} onClick={() => pick('unpaid')} active={tab === 'tickets' && view === 'unpaid'} />
        </>}
      </KpiRow>

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Jo kapre is period me wapas diye gaye</p>}>
          <DateRangeMenu value={aRange} onChange={setARange} startHour={startHour} defaultPreset="thisMonth" allowAll={false} />
        </FilterBar>
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Customer, phone, token #, kapra…" label="Search" />}
          chips={filtered ? <>
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>Aaya: {rangeLabel(period.from, period.to)}</FilterChip>}
            {type && <FilterChip onRemove={() => setType('')}>{type}</FilterChip>}
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'active'} onChange={setView} width="w-72"
            options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon, hint: counts ? `${counts[v.id]} tickets` : undefined }))} />
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label="Kapra aaya" />
          <FilterMenu icon={Scissors} label="Kaam" value={type} active={!!type} onChange={setType} align="right"
            options={[{ value: '', label: 'Har kaam' }, ...ALTERATION_TYPES.map((t) => ({ value: t, label: t }))]} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{manage && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[{ id: 'tickets', label: 'Tickets', icon: ListChecks, count: data?.total ?? null }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]} />

      {tab === 'analytics' ? (
        !sumQ.data ? (sumQ.isError ? <LoadFailed what="Analytics" retry={() => sumQ.refetch()} /> : <AnalyticsSkeleton />) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile icon={Shirt} label="Kapre aaye" value={sumQ.data.period.received} tone="brand" />
              <StatTile icon={CheckCircle2} label="Wapas diye" value={sumQ.data.period.delivered} sub={sales(sumQ.data.period.value)} tone="green" />
              <StatTile icon={Clock} label="Waqt par" value={sumQ.data.period.onTimePct === null ? '—' : `${sumQ.data.period.onTimePct}%`} tone="violet" />
              <StatTile icon={Receipt} label="Muft alteration" value={sumQ.data.period.free} sub={`${sumQ.data.period.fromOwnSales} yahan ke bill se`} tone="amber" />
            </div>
            <Card className="rounded-2xl" title={<CardTitle icon={Scissors}>Kaunsa kaam zyada</CardTitle>} description="Wapas diye kapre, kaam ke hisaab se — click karein to sirf woh">
              <RankedBars onPick={(k) => { setType(sumQ.data!.period.types.find((t) => t.type.toLowerCase() === k)?.type ?? ''); setView('all'); setTab('tickets'); }}
                rows={sumQ.data.period.types.map((t) => ({ key: t.type.toLowerCase(), label: t.type, value: t.count, display: `${t.count} · ${sales(t.value)}` }))} />
            </Card>
          </div>
        )
      ) : (<>
        {data && data.total > 0 && data.totals && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <span className="text-slate-500">{viewLabel(view)}</span>
            <span className="font-semibold text-slate-900">{data.total} tickets · {sales(data.totals.value)}</span>
            {data.totals.due > 0 && <button type="button" onClick={() => setView('unpaid')} className="text-amber-700 hover:underline">Lena baqi {sales(data.totals.due)}</button>}
          </div>
        )}
        {listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : listQ.isError && !data ? <LoadFailed what="Tickets" retry={() => listQ.refetch()} /> : !rows.length ? (
          <EmptyList icon={Ruler} title={filtered ? 'Is filter me kuch nahi' : view === 'late' ? 'Koi late nahi — shabash' : 'Koi kapra nahi'}
            text="Customer ka kapra lein, kya badalna hai likhein aur token dein. Tayyar hone par WhatsApp karein.">
            {manage && <Button onClick={() => setForm({ ticket: null })} leftIcon={<Plus className="h-4 w-4" />}>Kapra lein</Button>}
            {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
          </EmptyList>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((t) => (
              <Row key={t.id} t={t} manage={manage} shopName={shopName} busy={status.isPending && status.variables?.t.id === t.id}
                onNext={() => next(t)} onBack={() => { const p = ALTERATION_PREV[t.status]; if (p) status.mutate({ t, to: p }); }}
                onPay={() => setPayOn(t)} onEdit={() => setForm({ ticket: t })} onCancel={() => setCancelOn(t)} />
            ))}
          </ul>
        )}
        {data && <Pager page={page} pages={data.pages} onPage={setPage} />}
      </>)}

      {form && <AlterationForm ticket={form.ticket} onClose={() => setForm(null)} onSaved={(t) => { if (!form.ticket) printAlterationSlip(t, shopName); }} />}
      {payOn && (
        <TakePaymentModal title="Advance / payment" description={`${payOn.customerName ?? ''} · ${payOn.ticketNumber} · ${formatPKR(due(payOn))} baqi`}
          amount={due(payOn)} max={due(payOn)} loading={pay.isPending} hint="Khate me advance ban kar jama hota hai; kapra dete waqt bill me kat jata hai."
          onConfirm={(amount, method) => pay.mutate({ t: payOn, amount, method })} onClose={() => setPayOn(null)} />
      )}
      {deliverOn && (
        <TakePaymentModal title="Kapra de diya — bill" confirmLabel="Bill banayein"
          description={`${deliverOn.customerName ?? ''} · ${deliverOn.ticketNumber} · charges ${formatPKR(deliverOn.charges)}, advance ${formatPKR(deliverOn.paidAmount)}`}
          amount={due(deliverOn)} max={due(deliverOn)} allowZero loading={status.isPending}
          onConfirm={(amount, method) => status.mutate({ t: deliverOn, to: 'DELIVERED', paidNow: amount, method })} onClose={() => setDeliverOn(null)} />
      )}
      {cancelOn && (
        <CancelModal title={`${cancelOn.customerName ?? ''} · ${cancelOn.ticketNumber}`} paid={cancelOn.paidAmount}
          onConfirm={(reason) => alterationsApi.updateStatus(cancelOn.id, 'CANCELLED', { reason: reason || undefined }).then(refresh)} onClose={() => setCancelOn(null)} />
      )}

      {guide.isOpen && (
        <PageGuide title="Alterations — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#db2777', title: 'Kapra lein', text: '"Kapra lein": customer, kaunsa kapra, kya badalna hai, charges aur kab lena hai. Token khud print hota hai.' },
            { icon: Scissors, color: '#7c3aed', title: 'Kaam', text: 'Kaam shuru → tayyar → de diya. Ghalti ho to "Ek qadam peeche".' },
            { icon: Receipt, color: '#16a34a', title: 'De diya = bill', text: 'Charges ho to dete waqt bill banta hai aur Sale me aata hai; baqi customer ke khate me. Muft alteration ka bill nahi banta.' },
            { icon: MessageCircle, color: '#22c55e', title: 'WhatsApp', text: 'Tayyar hone par WhatsApp se bata dein.' },
          ]}
          shortcuts={[['N', 'naya'], ['/', 'dhoondein'], ['1', 'tickets'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Row({ t, manage, shopName, busy, onNext, onBack, onPay, onEdit, onCancel }: {
  t: AlterationTicket; manage: boolean; shopName: string; busy: boolean;
  onNext: () => void; onBack: () => void; onPay: () => void; onEdit: () => void; onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const st = alterationStatus(t.status);
  const closed = isClosed(t.status);
  const d = daysFrom(t.promisedDate);
  const late = !closed && d !== null && d < 0 && t.status !== 'READY';
  const soon = !closed && d !== null && d >= 0 && d <= 1;
  const left = due(t);
  const next = alterationNext(t.status);
  const wa = waLink(t.customerPhone, alterationMessage(t, shopName));
  return (
    <li className={cn(closed && 'bg-slate-50/60')}>
      <div className="flex items-start gap-3 px-3 py-3 sm:px-4">
        <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', late ? 'bg-rose-50 text-rose-600' : t.status === 'READY' ? 'bg-success-50 text-success-600' : soon ? 'bg-amber-50 text-amber-600' : closed ? 'bg-slate-100 text-slate-400' : 'bg-violet-50 text-violet-600')}>
          <Ruler className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold text-slate-900">{t.customerName || 'Customer'}</span>
            <Pill tone={st.tone}>{st.label}</Pill>
            <span className="font-mono text-[0.6875rem] text-slate-400">{t.ticketNumber}</span>
          </div>
          <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">{t.garmentDescription} — <span className="font-medium">{t.alterationType}</span></p>
          <p className={cn('mt-0.5 flex flex-wrap items-center gap-x-3 text-[0.75rem]', late ? 'font-semibold text-rose-700' : soon ? 'font-semibold text-amber-700' : 'text-slate-500')}>
            <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{closed ? (t.status === 'DELIVERED' ? `Diya ${dayOnly(t.deliveredAt)}` : 'Cancel') : t.promisedDate ? `${whenText(t.promisedDate)} · ${dayOnly(t.promisedDate)}` : 'Date nahi'}</span>
            {t.tailorName && <span className="inline-flex items-center gap-1 font-normal text-slate-500"><UserRound className="h-3 w-3" />{t.tailorName}</span>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold tabular-nums text-slate-900">{t.charges > 0 ? formatPKR(t.charges) : 'Muft'}</p>
          {t.charges > 0 && (t.status === 'DELIVERED'
            ? <p className="text-[0.6875rem] text-slate-500">{left > 0.5 ? `${formatPKR(left)} khate me` : 'Poora mila'}</p>
            : left > 0.5 ? <p className="text-[0.6875rem] font-semibold text-amber-700">{formatPKR(left)} baqi</p> : <p className="text-[0.6875rem] text-success-700">Poora mila</p>)}
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Aur kaam" aria-expanded={open} className="mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} /></button>
      </div>
      {manage && !closed && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3 sm:px-4 sm:pl-[4.25rem]">
          {next && <Button size="sm" variant={next.to === 'DELIVER' ? 'success' : 'primary'} loading={busy} onClick={onNext} leftIcon={next.to === 'DELIVER' ? <Receipt className="h-4 w-4" /> : <Scissors className="h-4 w-4" />}>{next.label}</Button>}
          {left > 0.5 && <Button size="sm" variant="secondary" onClick={onPay} leftIcon={<Wallet className="h-4 w-4" />}>Paisa mila</Button>}
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-success-700 ring-1 ring-success-200 hover:bg-success-50"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
        </div>
      )}
      {open && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[0.8125rem] sm:pl-[4.25rem]">
          {t.alterationDetails && <p className="whitespace-pre-line rounded-xl bg-white px-3 py-2 text-slate-700 ring-1 ring-slate-200">{t.alterationDetails}</p>}
          {t.notes && <p className="whitespace-pre-line text-slate-600">{t.notes}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => printAlterationSlip(t, shopName)} leftIcon={<Printer className="h-4 w-4" />}>Token</Button>
            {t.customerPhone && <a href={`tel:${t.customerPhone}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200"><Phone className="h-4 w-4" />{t.customerPhone}</a>}
            {t.bill && <Link to={`/sales/${t.bill.id}/receipt`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200"><Receipt className="h-4 w-4" />Bill {t.bill.saleNumber}</Link>}
            {manage && !closed && <Button size="sm" variant="ghost" onClick={onEdit} leftIcon={<Pencil className="h-4 w-4" />}>Badlein</Button>}
            {manage && !closed && ALTERATION_PREV[t.status] && <Button size="sm" variant="ghost" onClick={onBack} disabled={busy} leftIcon={<Undo2 className="h-4 w-4" />}>Ek qadam peeche</Button>}
            {manage && !closed && <Button size="sm" variant="ghost" className="text-rose-700" onClick={onCancel} leftIcon={<Ban className="h-4 w-4" />}>Cancel</Button>}
          </div>
        </div>
      )}
    </li>
  );
}
