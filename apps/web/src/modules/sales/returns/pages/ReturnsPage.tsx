/**
 * Returns: every return for a period with totals for the whole filter and
 * the return rate against sales; search by return or bill number, customer,
 * phone, product or IMEI; open a return to see what went back on the shelf,
 * how the money went back and who approved it, print its slip, or return
 * more from the same bill. A new return starts from a bill (typed or
 * scanned) and opens the shared return form.
 *
 * Keys: N new return · B scan a bill · / search · A analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BarChart3, BookOpen, GraduationCap, ListChecks, MessageSquareText, Package, PackageCheck, PackageX, Percent,
  Printer, Receipt, RotateCcw, ScanLine, ShieldCheck, Store, UserRound, Wallet,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import { teamApi } from '@modules/organization/team/api/team.api';
import { receiptLink } from '@modules/sales/history/receiptPrefs';
import { salesApi, type PaymentMethod, type Sale } from '@modules/sales/sales/api/sales.api';
import { returnsApi, type CreatedReturn, type ReturnQuery, type ReturnRow } from '../api/returns.api';
import { FindBillModal } from '../components/FindBillModal';
import { RETURNS_KEY, REASONS, methodColor, methodLabel, qtyText, when } from '../components/meta';
import { returnsDoc } from '../components/print';
import { ReturnDrawer } from '../components/ReturnDrawer';
import { ReturnModal } from '../components/ReturnModal';
import { ReturnsAnalytics } from '../components/ReturnsAnalytics';
import { ReturnSlipModal } from '../components/ReturnSlipModal';
import { t as tr } from '@core/i18n';

type Tab = 'record' | 'analytics';

export default function ReturnsPage() {
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const canReturn = usePermission(PERMISSIONS.RETURNS_CREATE);
  const [params, setParams] = useSearchParams();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [method, setMethod] = useState<'' | PaymentMethod>('');
  const [reason, setReason] = useState('');
  const [staffId, setStaffId] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(search.trim());
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>('record');
  const [finding, setFinding] = useState<{ initial: string; scan: boolean } | null>(null);
  const [returning, setReturning] = useState<Sale | null>(null);
  const [open, setOpen] = useState<ReturnRow | null>(null);
  const [slip, setSlip] = useState<ReturnRow | null>(null);
  const [moreLoading, setMoreLoading] = useState(false);
  const guide = usePageGuide();

  // ?bill=S-1042 (from a link or another page) starts a return from that bill.
  useEffect(() => {
    const bill = params.get('bill');
    if (bill) {
      setFinding({ initial: bill, scan: false });
      setParams((p) => { p.delete('bill'); return p; }, { replace: true });
    }
  }, [params, setParams]);
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [range, method, reason, staffId, query]);

  const period = resolveRange(range, startHour);
  const filters: Omit<ReturnQuery, 'page' | 'limit'> = {
    ...(period ?? {}), method: method || undefined, reason: reason || undefined, staffId: staffId || undefined, search: query || undefined,
  };
  const q: ReturnQuery = { ...filters, page, limit: 30 };

  const listQ = useQuery({ queryKey: [RETURNS_KEY, 'records', q], queryFn: () => returnsApi.records(q), placeholderData: (prev) => prev });
  const { data: team = [] } = useQuery({ queryKey: ['team'], queryFn: () => teamApi.list().catch(() => []), staleTime: 5 * 60_000 });

  const data = listQ.data;
  const t = data?.totals;
  const rows = data?.items ?? [];
  const filtered = !!method || !!reason || !!staffId || !!query;
  const periodText = period ? `${period.from} — ${period.to}` : tr('Sab tareekhen');
  const reasonText = reason === 'none' ? tr('Bina wajah') : reason;
  const filterText = [method && methodLabel(method), reasonText, staffId && team.find((m) => m.id === staffId)?.fullName, query && `"${query}"`].filter(Boolean).join(' · ');
  const printDoc = async () => returnsDoc(await returnsApi.records({ ...filters, page: 1, limit: 200 }), periodText, filterText);

  const startNew = (scan = false) => { if (canReturn) setFinding({ initial: '', scan }); else toast.error(tr('Return ki permission nahi — malik se poochein')); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 'n') { e.preventDefault(); startNew(); }
      if (k === 'b') { e.preventDefault(); startNew(true); }
      if (k === 'a') { e.preventDefault(); setTab((v) => (v === 'record' ? 'analytics' : 'record')); }
      if (e.key === '/') { e.preventDefault(); setTab('record'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReturn]);

  const clear = () => { setMethod(''); setReason(''); setStaffId(''); setSearch(''); };

  /** After a return: offer its slip straight away. */
  const done = (created?: CreatedReturn) => {
    setReturning(null);
    setOpen(null);
    if (!created || created.repeated) return;
    toast(tr('Return ki parchi chahiye?'), {
      action: {
        label: tr('Print'),
        onClick: () => {
          void returnsApi.records({ search: created.returnNumber, limit: 1 })
            .then((r) => { if (r.items[0]) setSlip(r.items[0]); })
            .catch(() => toast.error(tr('Parchi nahi bani — record me se print karein')));
        },
      },
    });
  };

  const returnMore = async (r: ReturnRow) => {
    setMoreLoading(true);
    try { setReturning(await salesApi.getOne(r.sale.id)); }
    catch { toast.error(tr('Bill khul nahi saka')); }
    finally { setMoreLoading(false); }
  };

  return (
    <PageShell>
      <PageHero
        title={tr('Maal return')}
        chip={<><RotateCcw /> {' '}{tr('Returns')}</>}
        meta={tr('Customer ka maal wapas — paisa, stock aur khata ek saath')}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <button type="button" onClick={() => startNew(true)} title={tr('Bill ya IMEI scan (B)')} className={heroButton}>
            <ScanLine className="h-4 w-4" /> <span className="hidden sm:inline">{tr('Bill scan')}</span>
          </button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab === 'analytics' || !rows.length} /></span>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canReturn && <button type="button" onClick={() => startNew()} title={tr('Nayi return (N)')} className={heroPrimaryButton}><RotateCcw className="h-4 w-4" /> {' '}{tr('Nayi return')}</button>}
        </>}
        stats={t ? [
          { label: tr('Kul wapas'), value: money(t.refunded), hint: tr('{{count}} return', { count: t.count }) },
          { label: tr('Sale ka'), value: `${t.rate}%`, hint: tr('{{salesTotal}} sale', { salesTotal: money(t.salesTotal) }) },
          { label: tr('Haath me diye'), value: money(t.payout), hint: t.khata ? tr('{{khata}} khate se', { khata: money(t.khata) }) : undefined },
          { label: tr('Cheezein wapas'), value: qtyText(t.qty) },
        ] : [{ label: tr('Kul wapas'), value: '—' }]}
      />

      <KpiRow cols={4}>
        {!t ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={RotateCcw} color="#ea580c" label={tr('Return')} value={t.count} hint={tr('{{bills}} bill se', { bills: t.bills })} />
          <KpiCard icon={Wallet} color="#e11d48" label={tr('Paisa wapas')} value={money(t.refunded)}
            hint={t.khata ? tr('{{payout}} haath me · {{khata}} khata', { payout: money(t.payout), khata: money(t.khata) }) : tr('Sab haath me diya')} />
          <KpiCard icon={PackageCheck} color="#16a34a" label={tr('Stock me wapas')} value={qtyText(t.restockedQty)}
            hint={t.writtenOffQty ? tr('{{writtenOffQty}} kharab — stock me nahi', { writtenOffQty: qtyText(t.writtenOffQty) }) : tr('Sab dobara bikne layak')} />
          <KpiCard icon={Percent} color="#d97706" label={tr('Return ki sharah')} value={`${t.rate}%`} hint={tr('Sale ka · {{billRate}}% bill par return', { billRate: t.billRate })}
            onClick={() => setTab('analytics')} active={tab === 'analytics'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Return ya bill number, customer, phone, product ya IMEI…')} label={tr('Return search')} />}
        chips={filtered ? <>
          {method && <FilterChip onRemove={() => setMethod('')}>{methodLabel(method)}</FilterChip>}
          {reason && <FilterChip onRemove={() => setReason('')}>{reasonText}</FilterChip>}
          {staffId && <FilterChip onRemove={() => setStaffId('')}>{team.find((m) => m.id === staffId)?.fullName ?? tr('Staff')}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        <FilterMenu icon={Wallet} label={tr('Kaise wapas')} value={method} active={!!method} onChange={setMethod}
          options={[{ value: '' as const, label: tr('Har tareeqa') }, ...POS_PAYMENT_METHODS.map((m) => ({ value: m.id as PaymentMethod, label: m.label, icon: m.icon, color: m.color }))]} />
        <FilterMenu icon={MessageSquareText} label={tr('Wajah')} value={reason} active={!!reason} onChange={setReason}
          options={[{ value: '', label: tr('Sab wajah') }, ...REASONS.map((r) => ({ value: r, label: tr(r) })), { value: 'none', label: tr('Bina wajah'), hint: tr('Jin par wajah nahi likhi') }]} />
        {team.length > 1 && (
          <FilterMenu icon={UserRound} label={tr('Staff')} value={staffId} active={!!staffId} onChange={setStaffId} align="right"
            options={[{ value: '', label: tr('Sab staff') }, ...team.map((m) => ({ value: m.id, label: m.fullName }))]} />
        )}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        hint={<><Kbd>N</Kbd> {' '}{tr('nayi return ·')}{' '} <Kbd>B</Kbd> {' '}{tr('scan ·')}{' '} <Kbd>A</Kbd> {' '}{tr('analytics ·')}{' '} <Kbd>/</Kbd> {' '}{tr('search')}</>}
        tabs={[
          { id: 'record', label: tr('Record'), icon: ListChecks, count: data?.total ?? null },
          { id: 'analytics', label: tr('Analytics'), icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <ReturnsAnalytics filters={filters} money={money} /> : (<>
        {listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[4.5rem] rounded-xl" />)}</div>
        ) : !rows.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <RotateCcw className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{filtered ? tr('Is filter me koi return nahi') : tr('Is period me koi maal wapas nahi aaya')}</p>
            <p className="mt-1 text-sm text-slate-500">{tr('Customer maal wapas laye to bill scan karein ya bill number likhein — stock, khata aur golak khud theek ho jate hain.')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {canReturn && <Button onClick={() => startNew()} leftIcon={<RotateCcw className="h-4 w-4" />}>{tr('Nayi return')}</Button>}
              {filtered && <Button variant="ghost" onClick={clear}>{tr('Filter saaf karein')}</Button>}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((r) => <Row key={r.id} r={r} money={money} onOpen={() => setOpen(r)} onPrint={() => setSlip(r)} />)}
          </ul>
        )}

        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>{tr('Pichla')}</Button>
            <span className="text-sm text-slate-600">{tr('Safha {{page}} / {{pages}}', { page, pages: data.pages })}</span>
            <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>{tr('Agla')}</Button>
          </div>
        )}
      </>)}

      {finding && (
        <FindBillModal initial={finding.initial} scan={finding.scan} onClose={() => setFinding(null)}
          onPick={(sale) => { setFinding(null); setReturning(sale); }} />
      )}
      {returning && <ReturnModal sale={returning} onClose={() => setReturning(null)} onDone={done} />}
      {open && (
        <ReturnDrawer r={open} money={money} onClose={() => setOpen(null)} onPrint={() => setSlip(open)}
          onMore={() => void returnMore(open)} moreLoading={moreLoading} />
      )}
      {slip && <ReturnSlipModal r={slip} onClose={() => setSlip(null)} />}

      {guide.isOpen && (
        <PageGuide title={tr('Maal return — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: ScanLine, color: '#2563eb', title: tr('Bill search'), text: tr('"Nayi return" dabayein. Bill ka barcode scan karein, ya bill number, customer ka phone ya phone ka IMEI likhein.') },
            { icon: Package, color: '#ea580c', title: tr('Kya wapas aaya'), text: tr('Har cheez ki quantity chunein ya "Poora bill wapas". Rate wohi lagta hai jo customer ne diya tha — discount ke baad.') },
            { icon: PackageX, color: '#e11d48', title: tr('Stock ya kharab'), text: tr('"Stock me wapas" se maal dobara bikne ke liye shelf par aata hai. "Kharab" wala stock me nahi aata aur nuqsan me likha jata hai.') },
            { icon: BookOpen, color: '#7c3aed', title: tr('Paisa aur khata'), text: tr('Udhaar bill par pehle us bill ka baqi udhaar khate se kam hota hai, baqi amount cash, wallet ya bank se wapas.') },
            { icon: Printer, color: '#0891b2', title: tr('Parchi print'), text: tr('Return ke baad ya record me kisi return ko khol kar parchi print karein — customer ko saboot, dukaan ko record.') },
            { icon: BarChart3, color: '#d97706', title: tr('Analytics dekhein'), text: tr('Kaunsa maal sab se zyada wapas aata hai, kis wajah se, kis staff ke paas — aur sale ka kitna % wapas gaya.') },
          ]}
          tips={[
            tr('Settings me "Return par PIN" on ho to har return malik ke PIN se hoti hai — record me "Malik ka PIN se approve" likha aata hai.'),
            tr('Ek hi bill se kai dafa return ho sakti hai, magar jitna bika tha us se zyada kabhi nahi.'),
            tr('Galti se do dafa button dab jaye to dusri return nahi banti.'),
            tr('Return hamesha usi branch me hoti hai jahan bill bana tha.'),
          ]}
          shortcuts={[['N', tr('nayi return')], ['B', tr('bill scan')], ['/', tr('dhoondein')], ['A', tr('analytics')], ['G', tr('guide')]]}
        />
      )}
    </PageShell>
  );
}

function Row({ r, money, onOpen, onPrint }: { r: ReturnRow; money: (n: number) => string; onOpen: () => void; onPrint: () => void }) {
  const items = r.items.map((i) => `${i.name} × ${qtyText(i.quantity)}`).join(', ');
  const stock = r.writtenOffQty > 0
    ? { label: r.restockedQty > 0 ? tr('Kuch kharab') : tr('Kharab'), icon: PackageX, tone: 'bg-rose-50 text-rose-700 ring-rose-200' }
    : { label: tr('Stock me wapas'), icon: PackageCheck, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
  const color = methodColor(r.refundMethod);
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2.5 transition hover:bg-slate-50/70 sm:flex-nowrap sm:px-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100"><RotateCcw className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onOpen} className="font-semibold text-slate-900 hover:text-brand-700">{r.sale.customer?.name ?? tr('Walk-in')}</button>
          <Link to={receiptLink(r.sale.id)} title={tr('Asal bill kholein')}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[0.6875rem] text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"><Receipt className="h-3 w-3" />{r.sale.saleNumber}</Link>
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', stock.tone)}><stock.icon className="h-3 w-3" />{stock.label}</span>
          {r.approvedBy && <span title={tr('{{approvedBy}} se approve', { approvedBy: r.approvedBy })} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-medium text-emerald-700 ring-1 ring-emerald-200"><ShieldCheck className="h-3 w-3" />{tr('PIN')}</span>}
        </span>
        <button type="button" onClick={onOpen} className="block w-full min-w-0 text-start">
          <span className="mt-0.5 block truncate text-[0.8125rem] text-slate-600">{items}{r.reason && <span className="text-slate-400"> · {tr(r.reason)}</span>}</span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-slate-400">
            <span className="font-mono">{r.returnNumber}</span> · {when(r.returnedAt)}{r.createdBy ? ` · ${r.createdBy.fullName}` : ''}
            {r.shop && <span className="inline-flex items-center gap-0.5"> · <Store className="h-3 w-3" />{r.shop.name}</span>}
          </span>
        </button>
      </div>
      <div className="ms-auto text-end">
        <p className="text-base font-bold tabular-nums text-rose-700">−{money(r.refundAmount)}</p>
        <p className="inline-flex items-center gap-1 text-[0.75rem] text-slate-500">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{methodLabel(r.refundMethod)}{r.khataAmount > 0 && tr(' + khata')}
        </p>
      </div>
      <button type="button" onClick={onPrint} aria-label={tr('Parchi print')} title={tr('Parchi print')} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        <Printer className="h-4 w-4" />
      </button>
    </li>
  );
}
