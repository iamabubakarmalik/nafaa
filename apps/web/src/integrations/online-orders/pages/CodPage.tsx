/**
 * COD and courier money: what is still on the road, what the courier has
 * collected but not paid in, settlements received (by reference and day),
 * parcels that came back (RTO) and each courier's numbers. Orders are
 * marked paid from the courier's settlement sheet, by hand or by pasting
 * its CNs.
 *
 * Keys: / search · 1–5 tabs · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  CheckCircle2, ChevronDown, ClipboardPaste, Clock, Download, GraduationCap, Hourglass, ListChecks, PackageX, ReceiptText, RotateCcw,
  Truck, Wallet,
} from 'lucide-react';
import { Button, Card, DateRangeMenu, FilterBar, FilterChip, FilterMenu, heroButton, heroIconButton, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, resolveRange, SearchField, Skeleton, Table, TBody, Td, Textarea, Th, THead, Tr, ViewTabs } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { useReportRange } from '@modules/reports/prefs';
import { apiErrorMessage, onlineOrdersApi } from '../api/online-orders.api';
import { OrderDrawer } from '../components/orders/OrderDrawer';
import { brandIcon, courierBrand, whenText } from '../lib/labels';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { downloadCsv, orderNo } from '../lib/orders';
import { codDoc } from '../lib/print';

type Tab = 'with' | 'transit' | 'settled' | 'rto' | 'couriers';
const NO_COURIER = 'Courier nahi likha';
const keyDay = (k: string) => new Intl.DateTimeFormat('en-PK', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${k}T12:00:00`));
const daysSince = (iso?: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null);

export default function CodPage() {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const theme = useChartTheme();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('with');
  const [range, setRange] = useReportRange('thisMonth');
  const [courier, setCourier] = useState('');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [reference, setReference] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [openBatch, setOpenBatch] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const period = resolveRange(range, startHour);
  const periodText = period ? rangeLabel(period.from, period.to) : 'Sab tareekhen';
  const summaryQ = useQuery({ queryKey: ['cod-summary'], queryFn: onlineOrdersApi.codSummary, refetchInterval: 60_000 });
  const historyQ = useQuery({
    queryKey: ['cod-history', period?.from, period?.to],
    queryFn: () => onlineOrdersApi.codHistory(period ?? {}),
    placeholderData: (p) => p,
  });
  const transitQ = useQuery({
    queryKey: ['online-orders', 'cod-transit'],
    queryFn: () => onlineOrdersApi.list({ status: 'OUT_FOR_DELIVERY', pay: 'COD', limit: 200 }),
    enabled: tab === 'transit',
  });

  const s = summaryQ.data;
  const h = historyQ.data;
  const term = search.trim().toLowerCase();
  const courierOk = (name: string | null | undefined) => !courier || (name ?? NO_COURIER) === courier;
  const match = (...fields: Array<string | null | undefined>) => !term || fields.filter(Boolean).join(' ').toLowerCase().includes(term);

  const withRows = useMemo(() => (s?.withCourier ?? []).filter((o) =>
    courierOk(o.courier) && match(o.externalOrderNumber, o.externalOrderId, o.customerName, o.trackingNumber, o.customerCity),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [s, courier, term]);
  const transitRows = useMemo(() => (transitQ.data?.items ?? []).filter((o) =>
    courierOk(o.courierLabel) && match(o.externalOrderNumber, o.externalOrderId, o.customerName, o.trackingNumber, o.customerCity),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [transitQ.data, courier, term]);
  const batches = useMemo(() => (h?.settlements ?? []).filter((b) =>
    (!courier || b.couriers.includes(courier)) && match(b.ref, ...b.orders.map((o) => `${o.number} ${o.customerName} ${o.trackingNumber ?? ''}`)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [h, courier, term]);
  const returns = useMemo(() => (h?.returns ?? []).filter((r) =>
    courierOk(r.courier) && match(r.number, r.customerName, r.trackingNumber, r.customerCity, r.reason),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [h, courier, term]);

  const courierNames = useMemo(() => [...new Set((s?.couriers ?? []).map((c) => c.name))], [s]);
  const late = (s?.withCourier ?? []).filter((o) => (o.daysWaiting ?? 0) >= 7);
  const pickedRows = withRows.filter((r) => picked.has(r.id));
  const pickedValue = pickedRows.reduce((a, r) => a + r.total, 0);
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  useEffect(() => { setPicked(new Set()); }, [courier]);

  const settle = useMutation({
    mutationFn: () => onlineOrdersApi.settleCod([...picked], reference.trim() || undefined),
    onSuccess: (r) => {
      toast.success(`${r.settled} orders ka paisa mil gaya`);
      setPicked(new Set());
      setReference('');
      ['cod-summary', 'cod-history', 'online-orders', 'online-report'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  /** Pick rows whose CN or order number appears in the pasted settlement sheet. */
  const pickFromSheet = (text: string) => {
    const tokens = new Set(text.split(/[\s,;|\t]+/).map((x) => x.trim().replace(/^#/, '').toLowerCase()).filter((x) => x.length >= 3));
    const hits = withRows.filter((o) => (o.trackingNumber && tokens.has(o.trackingNumber.toLowerCase())) || tokens.has(String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#/, '').toLowerCase()));
    setPicked(new Set(hits.map((o) => o.id)));
    setPasteOpen(false);
    if (hits.length) toast.success(`${hits.length} order mil gaye · ${formatPKR(hits.reduce((a, o) => a + o.total, 0))} — ab "Paisa mil gaya" dabayein`);
    else toast.error('Sheet ka koi CN ya order number list me nahi mila');
  };

  const exportCsv = () => {
    const rows: unknown[][] = tab === 'settled'
      ? [['Date', 'Ref', 'Order', 'Customer', 'Courier', 'CN', 'Amount'], ...batches.flatMap((b) => b.orders.map((o) => [b.day, b.ref ?? '', o.number, o.customerName, o.courier, o.trackingNumber ?? '', o.total]))]
      : tab === 'rto'
        ? [['Order', 'Customer', 'Shehar', 'Courier', 'CN', 'Wajah', 'Wapas aaya', 'Amount'], ...returns.map((r) => [r.number, r.customerName, r.customerCity ?? '', r.courier, r.trackingNumber ?? '', r.reason ?? '', new Date(r.returnedAt).toLocaleDateString('en-PK'), r.total])]
        : tab === 'transit'
          ? [['Order', 'Customer', 'Shehar', 'Courier', 'CN', 'Bheja', 'Amount'], ...transitRows.map((o) => [orderNo(o), o.customerName, o.customerCity ?? '', o.courierLabel ?? '', o.trackingNumber ?? '', o.dispatchedAt ? new Date(o.dispatchedAt).toLocaleDateString('en-PK') : '', o.total])]
          : tab === 'couriers'
            ? [['Courier', 'Raste me', 'Courier ke paas', 'Is mahine mila', 'Bheje (30 din)', 'Wapas (30 din)', 'RTO %'], ...(s?.couriers ?? []).map((c) => [c.name, c.inTransitValue, c.withCourierValue, c.settledMonthValue, c.dispatched30, c.returned30, c.rtoRate])]
            : [['Order', 'Customer', 'Shehar', 'Courier', 'CN', 'Deliver hua', 'Din', 'Amount'], ...withRows.map((o) => [o.externalOrderNumber ?? o.externalOrderId, o.customerName, o.customerCity ?? '', o.courier ?? '', o.trackingNumber ?? '', o.deliveredAt ? new Date(o.deliveredAt).toLocaleDateString('en-PK') : '', o.daysWaiting ?? '', o.total])];
    if (rows.length < 2) { toast.error('Is list me kuch nahi'); return; }
    downloadCsv(`cod-${tab}.csv`, rows);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const tabs: Tab[] = ['with', 'transit', 'settled', 'rto', 'couriers'];
      if (/^[1-5]$/.test(e.key)) setTab(tabs[Number(e.key) - 1]);
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const dated = tab === 'settled' || tab === 'rto';
  const filtered = !!courier || !!term;

  return (
    <PageShell>
      <PageHero
        title="COD & courier"
        chip={<><Wallet />Paisa kahan hai</>}
        meta="Raste me, courier ke paas, mila aur wapas — courier-wise"
        busy={summaryQ.isFetching || historyQ.isFetching}
        loading={summaryQ.isLoading}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={exportCsv} className={cn(heroButton, 'hidden sm:inline-flex')}><Download className="h-4 w-4" /> CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={() => codDoc(s!, h, periodText)} disabled={!s} /></span>
          <Link to="/online-store/couriers" className={cn(heroButton, 'hidden sm:inline-flex')}><Truck className="h-4 w-4" /> Couriers</Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={cn(heroIconButton, 'hidden sm:flex')}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={s ? [
          { label: `Courier ke paas · ${s.totals.withCourier} parcel`, value: money(s.totals.withCourierValue) },
          { label: 'Raste me (COD)', value: money(s.totals.inTransitValue), hint: `${s.totals.inTransit}` },
          { label: 'Is mahine mila', value: money(s.totals.settledMonthValue), hint: `${s.totals.settledMonth} order` },
          { label: 'RTO (30 din)', value: `${s.totals.rtoRate}%`, hint: `${s.totals.returned30} / ${s.totals.dispatched30}` },
        ] : [{ label: 'Courier ke paas', value: '' }, { label: 'Raste me', value: '' }, { label: 'Is mahine mila', value: '' }, { label: 'RTO', value: '' }]}
      />

      {summaryQ.isError && !s ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Hisaab nahi khula</p>
          <p className="mt-1 text-[0.8125rem] text-slate-500">{apiErrorMessage(summaryQ.error)}</p>
          <Button className="mt-3" variant="secondary" onClick={() => summaryQ.refetch()}>Dobara koshish</Button>
        </div>
      ) : (<>
        <KpiRow>
          {!s ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
            <KpiCard icon={Wallet} color="#ea580c" label="Courier ke paas" value={money(s.totals.withCourierValue)} hint={`${s.totals.withCourier} deliver · paisa nahi aaya`}
              onClick={() => setTab('with')} active={tab === 'with'} />
            <KpiCard icon={Truck} color="#0284c7" label="Raste me (COD)" value={money(s.totals.inTransitValue)} hint={`${s.totals.inTransit} parcel`}
              onClick={() => setTab('transit')} active={tab === 'transit'} />
            <KpiCard icon={ReceiptText} color="#16a34a" label="Settlement mila" value={h ? money(h.totals.settledValue) : '—'} hint={h ? `${h.totals.settled} order · ${periodText}` : periodText}
              onClick={() => setTab('settled')} active={tab === 'settled'} />
            <KpiCard icon={PackageX} color="#e11d48" label="Wapas aaye (RTO)" value={h ? h.totals.returned : '—'} hint={h ? `${money(h.totals.returnedValue)} ka maal` : undefined}
              onClick={() => setTab('rto')} active={tab === 'rto'} />
            <KpiCard icon={Hourglass} color="#d97706" label="7+ din se atka" value={money(late.reduce((a, o) => a + o.total, 0))} hint={`${late.length} parcel · courier se poochein`}
              onClick={() => { setTab('with'); setSearch(''); }} />
          </>}
        </KpiRow>

        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Order #, CN, customer ya shehar…" label="Search" />}
          chips={filtered ? <>
            {courier && <FilterChip onRemove={() => setCourier('')}>{courier}</FilterChip>}
            {term && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          </> : undefined}
          onClear={() => { setCourier(''); setSearch(''); }}>
          {dated && <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="thisMonth" allowAll={false} />}
          {courierNames.length > 0 && (
            <FilterMenu icon={Truck} label="Courier" value={courier} active={!!courier} onChange={setCourier}
              options={[{ value: '', label: 'Sab couriers' }, ...courierNames.map((n) => ({ value: n, label: n, icon: brandIcon(courierBrand(n)) }))]} />
          )}
        </FilterBar>

        <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd>-<Kbd>5</Kbd> tabs · <Kbd>/</Kbd> search</>}
          tabs={[
            { id: 'with', label: 'Courier ke paas', icon: Wallet, count: s?.totals.withCourier ?? null },
            { id: 'transit', label: 'Raste me', icon: Truck, count: s?.totals.inTransit ?? null },
            { id: 'settled', label: 'Settlements', icon: ReceiptText, count: h?.settlements.length ?? null },
            { id: 'rto', label: 'Wapas (RTO)', icon: RotateCcw, count: h?.totals.returned ?? null },
            { id: 'couriers', label: 'Courier-wise', icon: ListChecks },
          ]} />

        {!s ? <Skeleton className="h-64 rounded-3xl" /> : tab === 'with' ? (
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
              <p className="text-[0.8125rem] text-slate-500">Customer ne courier ko paisa de diya, courier ne abhi jama nahi karwaya. Settlement sheet se mila kar chunein.</p>
              <Button size="sm" variant="secondary" leftIcon={<ClipboardPaste className="h-4 w-4" />} onClick={() => setPasteOpen(true)} disabled={!withRows.length}>Sheet se milayein</Button>
            </header>
            {picked.size > 0 && (
              <div className="sticky top-2 z-10 mx-3 mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-white shadow-lg sm:mx-4">
                <span className="text-[0.8125rem] font-semibold">{picked.size} chune · {money(pickedValue)}</span>
                <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Settlement / cheque ref (zaroori nahi)"
                  className="h-8 min-w-[12rem] flex-1 rounded-lg border border-white/20 bg-white/10 px-2.5 text-[0.8125rem] text-white placeholder:text-white/50 outline-none" />
                <button type="button" onClick={() => setPicked(new Set())} className="h-8 rounded-lg px-3 text-[0.8125rem] font-semibold hover:bg-white/10">Chhoro</button>
                <Button size="sm" variant="success" loading={settle.isPending} leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => settle.mutate()}>Paisa mil gaya</Button>
              </div>
            )}
            {!withRows.length ? (
              <Empty icon={CheckCircle2} title={filtered ? 'Is filter me kuch nahi' : 'Kisi courier ke paas paisa nahi atka'} text="Deliver hue sab COD orders ka paisa aa chuka hai." />
            ) : (
              <ul className="divide-y divide-slate-100">
                <li className="flex items-center gap-3 px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400 sm:px-5">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" aria-label="Sab chunein"
                    checked={withRows.every((r) => picked.has(r.id))} onChange={(e) => setPicked(e.target.checked ? new Set(withRows.map((r) => r.id)) : new Set())} />
                  <span className="flex-1">Order · customer · courier</span><span className="hidden w-32 text-right sm:block">Deliver hua</span><span className="w-24 text-right">Amount</span>
                </li>
                {withRows.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80 sm:px-5">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={picked.has(o.id)} onChange={() => toggle(o.id)} aria-label={`#${o.externalOrderNumber ?? o.externalOrderId} chunein`} />
                    <button type="button" onClick={() => setOrderId(o.id)} className="min-w-0 flex-1 text-left">
                      <span className="block text-[0.875rem] font-semibold text-slate-900">#{o.externalOrderNumber ?? o.externalOrderId} <span className="font-normal text-slate-600">· {o.customerName}{o.customerCity ? ` · ${o.customerCity}` : ''}</span></span>
                      <span className="flex min-w-0 items-center gap-1.5 truncate text-[0.75rem] text-slate-500"><BrandLogo name={courierBrand(o.courier)} size={16} />{o.courier ?? NO_COURIER}{o.trackingNumber ? <span className="font-mono"> · {o.trackingNumber}</span> : null}</span>
                    </button>
                    <span className="hidden w-32 text-right text-[0.75rem] text-slate-500 sm:block">
                      {o.deliveredAt ? whenText(o.deliveredAt) : '—'}
                      {(o.daysWaiting ?? 0) >= 7 && <span className="ml-1 rounded-full bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">{o.daysWaiting} din</span>}
                    </span>
                    <span className="w-24 text-right text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(o.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : tab === 'transit' ? (
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {transitQ.isLoading ? <div className="p-4"><Skeleton className="h-40 rounded-xl" /></div> : !transitRows.length ? (
              <Empty icon={Truck} title="Abhi koi COD parcel raste me nahi" text="Courier ko diye hue COD orders yahan dikhte hain jab tak deliver na hon." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {transitRows.map((o) => {
                  const d = daysSince(o.dispatchedAt);
                  return (
                    <li key={o.id}>
                      <button type="button" onClick={() => setOrderId(o.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50/80 sm:px-5">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.875rem] font-semibold text-slate-900">#{orderNo(o)} <span className="font-normal text-slate-600">· {o.customerName}{o.customerCity ? ` · ${o.customerCity}` : ''}</span></span>
                          <span className="flex min-w-0 items-center gap-1.5 truncate text-[0.75rem] text-slate-500"><BrandLogo name={courierBrand(o.courierCode ?? o.courierLabel)} size={16} />{o.courierLabel ?? NO_COURIER}{o.trackingNumber ? <span className="font-mono"> · {o.trackingNumber}</span> : null}{o.courierTrail?.label ? ` · ${o.courierTrail.label}` : ''}</span>
                        </span>
                        <span className={cn('hidden text-[0.75rem] sm:block', (d ?? 0) >= 5 ? 'font-semibold text-amber-700' : 'text-slate-500')}>{d == null ? '' : d === 0 ? 'aaj bheja' : `${d} din se`}</span>
                        <span className="w-24 text-right text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(o.total)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : tab === 'settled' ? (
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {historyQ.isLoading ? <div className="p-4"><Skeleton className="h-40 rounded-xl" /></div> : !batches.length ? (
              <Empty icon={ReceiptText} title="Is period me koi settlement nahi" text='"Courier ke paas" se orders chun kar "Paisa mil gaya" dabayein — yahan record banega.' />
            ) : (
              <ul className="divide-y divide-slate-100">
                {batches.map((b) => {
                  const key = `${b.ref ?? ''}|${b.day}`;
                  const isOpen = openBatch === key;
                  return (
                    <li key={key}>
                      <button type="button" onClick={() => setOpenBatch(isOpen ? null : key)} aria-expanded={isOpen}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/80 sm:px-5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-50 text-success-700"><ReceiptText className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.875rem] font-semibold text-slate-900">{keyDay(b.day)} {b.ref ? <span className="font-mono font-normal text-slate-600">· ref {b.ref}</span> : <span className="font-normal text-slate-400">· bina ref</span>}</span>
                          <span className="block truncate text-[0.75rem] text-slate-500">{b.count} order · {b.couriers.join(', ')}</span>
                        </span>
                        <span className="text-[0.9375rem] font-bold tabular-nums text-success-700">{money(b.value)}</span>
                        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition', isOpen && 'rotate-180')} />
                      </button>
                      {isOpen && (
                        <ul className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 sm:pl-[4.25rem]">
                          {b.orders.map((o) => (
                            <li key={o.id} className="flex items-center gap-3 py-1.5 text-[0.8125rem]">
                              <button type="button" onClick={() => setOrderId(o.id)} className="font-semibold text-slate-900 hover:underline">#{o.number}</button>
                              <span className="min-w-0 flex-1 truncate text-slate-600">{o.customerName} · {o.courier}{o.trackingNumber ? ` · ${o.trackingNumber}` : ''}</span>
                              <span className="tabular-nums text-slate-900">{money(o.total)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : tab === 'rto' ? (
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {historyQ.isLoading ? <div className="p-4"><Skeleton className="h-40 rounded-xl" /></div> : !returns.length ? (
              <Empty icon={PackageX} title="Is period me koi parcel wapas nahi aaya" text="Wapas (RTO) par bill void hota hai aur stock khud wapas aa jata hai." />
            ) : (
              <div className="overflow-x-auto">
                <Table minWidth="44rem" className="[&_table]:text-[0.8125rem]">
                  <THead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                    <Tr><Th className="px-4 py-2 sm:px-5">Order</Th><Th className="px-3 py-2">Courier · CN</Th><Th className="px-3 py-2">Wajah</Th><Th className="px-3 py-2">Wapas aaya</Th><Th className="px-4 py-2 text-right sm:px-5">Amount</Th></Tr>
                  </THead>
                  <TBody className="divide-y divide-slate-100">
                    {returns.map((r) => (
                      <Tr key={r.id} className="hover:bg-slate-50/80">
                        <Td className="px-4 py-2.5 sm:px-5">
                          <button type="button" onClick={() => setOrderId(r.id)} className="font-semibold text-slate-900 hover:underline">#{r.number}</button>
                          <div className="text-[0.75rem] text-slate-500">{r.customerName}{r.customerCity ? ` · ${r.customerCity}` : ''}</div>
                        </Td>
                        <Td className="px-3 py-2.5 text-slate-600"><span className="inline-flex items-center gap-1.5"><BrandLogo name={courierBrand(r.courier)} size={16} />{r.courier}</span>{r.trackingNumber && <div className="font-mono text-[0.75rem] text-slate-500">{r.trackingNumber}</div>}</Td>
                        <Td className="max-w-[14rem] truncate px-3 py-2.5 text-slate-600">{r.reason ?? '—'}</Td>
                        <Td className="px-3 py-2.5 text-slate-600">{whenText(r.returnedAt)}{r.daysOut != null && <div className="text-[0.75rem] text-slate-400">{r.daysOut} din bahar raha</div>}</Td>
                        <Td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900 sm:px-5">{money(r.total)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </section>
        ) : (
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="rounded-2xl lg:col-span-3" flush title="Courier-wise hisaab" description="Raste me, courier ke paas aur is mahine mila — RTO pichhle 30 din ka">
              {!s.couriers.length ? <Empty icon={Truck} title="Abhi koi parcel nahi bheja" text='Order par "Rider/courier ko de diya" me courier aur CN daalein — hisaab yahan banega.' /> : (
                <div className="overflow-x-auto">
                  <Table minWidth="36rem" className="[&_table]:text-[0.8125rem]">
                    <THead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                      <Tr><Th className="px-4 py-2 sm:px-5">Courier</Th><Th className="px-3 py-2 text-right">Raste me</Th><Th className="px-3 py-2 text-right">Courier ke paas</Th><Th className="px-3 py-2 text-right">Mila</Th><Th className="px-4 py-2 text-right sm:px-5">RTO</Th></Tr>
                    </THead>
                    <TBody className="divide-y divide-slate-100">
                      {s.couriers.map((c) => (
                        <Tr key={c.code} className="cursor-pointer hover:bg-slate-50/80" onClick={() => { setCourier(c.name); setTab('with'); }}>
                          <Td className="px-4 py-2.5 font-semibold text-slate-900 sm:px-5"><span className="inline-flex items-center gap-2"><BrandLogo name={courierBrand(c.code || c.name)} size={22} />{c.name}</span></Td>
                          <Td className="px-3 py-2.5 text-right tabular-nums">{money(c.inTransitValue)} <span className="text-slate-400">· {c.inTransit}</span></Td>
                          <Td className={cn('px-3 py-2.5 text-right tabular-nums', c.withCourierValue > 0 && 'font-semibold text-orange-700')}>{money(c.withCourierValue)} <span className="font-normal text-slate-400">· {c.withCourier}</span></Td>
                          <Td className="px-3 py-2.5 text-right tabular-nums">{money(c.settledMonthValue)} <span className="text-slate-400">· {c.settledMonth}</span></Td>
                          <Td className="px-4 py-2.5 text-right sm:px-5">
                            <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', c.rtoRate >= 25 ? 'bg-rose-50 text-rose-700' : c.rtoRate >= 12 ? 'bg-amber-50 text-amber-800' : 'bg-success-50 text-success-700')}>{c.rtoRate}%</span>
                            <span className="ml-1.5 text-[0.75rem] text-slate-400">{c.returned30}/{c.dispatched30}</span>
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
            </Card>
            <Card className="rounded-2xl lg:col-span-2" title="Paisa kis courier ke paas" description="Raste me aur deliver ho kar atka hua">
              <div className="h-[16.25rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.couriers} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke={theme.grid} vertical={false} />
                    <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                    <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n === 'inTransitValue' ? 'Raste me' : 'Courier ke paas']} {...theme.tooltip} />
                    <Legend formatter={(v) => (v === 'inTransitValue' ? 'Raste me' : 'Courier ke paas')} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="inTransitValue" stackId="m" fill={theme.primarySoft} barSize={26} />
                    <Bar dataKey="withCourierValue" stackId="m" fill="#ea580c" radius={[6, 6, 0, 0]} barSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}
      </>)}

      {pasteOpen && <PasteSheet onClose={() => setPasteOpen(false)} onPick={pickFromSheet} />}
      {orderId && <OrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />}
      {guide.isOpen && (
        <PageGuide title="COD & courier — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Truck, color: '#0284c7', title: 'Raste me', text: 'Courier ko diye COD parcels jo abhi deliver nahi hue. Bahut din ho jayein to courier se poochein.' },
            { icon: Wallet, color: '#ea580c', title: 'Courier ke paas', text: 'Parcel deliver ho gaya, customer ne courier ko paisa de diya — magar courier ne abhi aap ko jama nahi karwaya.' },
            { icon: ClipboardPaste, color: '#7c3aed', title: 'Settlement sheet', text: 'Courier ki sheet aaye to "Sheet se milayein" me CN paste karein — orders khud chune jate hain. Ref likh kar "Paisa mil gaya" dabayein.' },
            { icon: ReceiptText, color: '#16a34a', title: 'Settlements', text: 'Har settlement din aur ref ke hisaab se — kis din kitna paisa aaya aur kaun se orders the.' },
            { icon: RotateCcw, color: '#e11d48', title: 'Wapas (RTO)', text: 'Customer ne parcel nahi liya. Bill void hota hai, stock wapas — aur wajah yahan dikhti hai.' },
            { icon: Clock, color: '#d97706', title: '7+ din', text: 'Jo paisa hafte se zyada courier ke paas atka ho, us ki list courier ko bhejein.' },
          ]}
          tips={[
            'Kuch couriers (jaise PostEx) settlement khud batate hain — wahan paisa aate hi order khud "mil gaya" ho jata hai.',
            'Settlement aur RTO tab par tareekh lagti hai; baqi lists hamesha poori hain.',
            'Rider ne delivery charge khud rakh liya ho to woh amount yahan se minus hoti hai.',
          ]}
          shortcuts={[['1', 'courier ke paas'], ['2', 'raste me'], ['3', 'settlements'], ['4', 'RTO'], ['5', 'courier-wise'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Empty({ icon: Icon, title, text }: { icon: typeof Wallet; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Icon className="h-5 w-5" /></span>
      <p className="mt-3 font-semibold text-slate-900">{title}</p>
      <p className="mt-1 max-w-md text-[0.8125rem] text-slate-500">{text}</p>
    </div>
  );
}

function PasteSheet({ onClose, onPick }: { onClose: () => void; onPick: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <Modal open onClose={onClose} size="md" title="Settlement sheet se milayein"
      description="Courier ki sheet (Excel ya PDF) se CN ya order number copy karke yahan paste karein. Jo list me milenge woh chun liye jayenge."
      footer={<div className="flex w-full justify-end gap-2"><Button variant="ghost" onClick={onClose}>Rehne dein</Button><Button disabled={!text.trim()} onClick={() => onPick(text)}>Orders chunein</Button></div>}>
      <Textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={8} aria-label="CN ya order number" placeholder={'CN ya order number — har line par ek, ya comma se alag\nMaslan:\n12345678901\n#1042'}
        className="font-mono text-[0.8125rem]" />
    </Modal>
  );
}
