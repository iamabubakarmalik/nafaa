/**
 * Order desk: every booked order with filters for status, route, booker and
 * date. Keyboard-first: ↑↓ or J/K move, Space ticks, Enter opens, A approve
 * (approval makes the invoice), I invoice, L load sheet, P print, N new.
 * Bulk actions work on the ticked orders, or on the highlighted one.
 * Orders over the credit limit ask for the manager PIN once per run.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BadgeCheck, CalendarDays, ClipboardList, MapPin, Plus, Printer, Receipt, RefreshCw, Truck, UserRound, X, XCircle,
} from 'lucide-react';
import {
  Alert, Button, Checkbox, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, PageHero, PageShell, SearchField, Skeleton, Table, TBody, Td, Th, THead, Tr, ViewTabs,
  confirmDialog, heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useBusinessDayStart } from '@core/lib/business-day';
import { isDialogOpen } from '@core/lib/shortcuts';
import { DIST_KEY, distError, distributionApi, type OrderDetail, type OrderRow } from '../api/distribution.api';
import { DistributionGate } from '../components/DistributionGate';
import { useMoney } from '../hooks/useDistribution';
import { BulkBar, Empty, Pill } from '../components/parts';
import { OrderDrawer } from '../components/OrderDrawer';
import { OrderEditor } from '../components/OrderEditor';
import { LoadSheetModal } from '../components/LoadSheetModal';
import { approveOrInvoice, type RunResult } from '../lib/actions';
import { dayTime, ORDER_STATUS, partyName, partySub, typingInField } from '../lib/meta';
import { printInvoices } from '../print/distPrint';

type Tab = 'BOOKED' | 'APPROVED' | 'INVOICED' | 'LOADED' | 'DONE' | 'ALL';
const TAB_STATUS: Record<Tab, string | undefined> = {
  BOOKED: 'BOOKED', APPROVED: 'APPROVED,INVOICING', INVOICED: 'INVOICED', LOADED: 'LOADED', DONE: 'DELIVERED,PARTIAL,RETURNED', ALL: undefined,
};
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'BOOKED', label: 'Booked' }, { id: 'APPROVED', label: 'Approved' }, { id: 'INVOICED', label: 'Invoiced' },
  { id: 'LOADED', label: 'Gaari par' }, { id: 'DONE', label: 'Delivered' }, { id: 'ALL', label: 'Sab' },
];
const PAGE = 50;

export default function DistributionOrdersPage() {
  return <DistributionGate><Desk /></DistributionGate>;
}

function Desk() {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const money = useMoney();
  const canManage = usePermission(PERMISSIONS.DISTRIBUTION_ORDERS_MANAGE);
  const canBook = usePermission(PERMISSIONS.DISTRIBUTION_ORDERS_BOOK);
  const canLoad = usePermission(PERMISSIONS.DISTRIBUTION_LOADSHEETS_MANAGE);
  const [params, setParams] = useSearchParams();
  const initial = params.get('status');
  const [tab, setTab] = useState<Tab>(() => (TABS.find((t) => TAB_STATUS[t.id]?.startsWith(initial ?? '-'))?.id ?? (initial ? 'ALL' : 'BOOKED')));
  const [search, setSearch] = useState('');
  const [routeId, setRouteId] = useState('');
  const [bookerId, setBookerId] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [editor, setEditor] = useState<OrderDetail | 'new' | null>(null);
  const [loadIds, setLoadIds] = useState<string[] | null>(null);
  const [failures, setFailures] = useState<RunResult[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const period = resolveRange(range, startHour);
  const filters = { status: TAB_STATUS[tab], routeId: routeId || undefined, bookedById: bookerId || undefined, search: search.trim() || undefined, from: period?.from, to: period?.to };
  useEffect(() => { setPage(1); setCursor(0); setPicked(new Set()); }, [tab, routeId, bookerId, search, range]);
  useEffect(() => { if (params.get('status')) { params.delete('status'); setParams(params, { replace: true }); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const listQ = useQuery({
    queryKey: [DIST_KEY, 'orders', filters, page],
    queryFn: () => distributionApi.orders({ ...filters, page, limit: PAGE }),
    placeholderData: keepPreviousData,
  });
  const routesQ = useQuery({ queryKey: [DIST_KEY, 'routes'], queryFn: () => distributionApi.routes(), staleTime: 5 * 60_000 });
  const rows = listQ.data?.orders ?? [];
  const bookers = useMemo(() => {
    const m = new Map<string, string>();
    (routesQ.data ?? []).forEach((r) => { if (r.bookerId) m.set(r.bookerId, r.bookerName ?? 'Booker'); });
    rows.forEach((o) => { if (o.bookedByName) m.set(o.bookedById, o.bookedByName); });
    return [...m.entries()];
  }, [routesQ.data, rows]);

  const targets = useCallback((): OrderRow[] => {
    if (picked.size) return rows.filter((o) => picked.has(o.id));
    return rows[cursor] ? [rows[cursor]] : [];
  }, [picked, rows, cursor]);

  const refresh = () => qc.invalidateQueries({ queryKey: [DIST_KEY] });

  const run = useMutation({
    mutationFn: ({ kind, ids }: { kind: 'approve' | 'invoice'; ids: string[] }) => approveOrInvoice(kind, ids),
    onSuccess: (r, v) => {
      const bad = r.results.filter((x) => !x.ok);
      setFailures(bad);
      if (r.invoiced) toast.success(`${r.invoiced} Invoice ban gaye`);
      if (bad.length) toast.error(`${bad.length} order me masla — upar dekhein`);
      if (r.pinSkipped) toast.message('PIN ke bagair credit wale orders Approved par ruk gaye');
      if (!r.invoiced && !bad.length) toast.message(v.kind === 'approve' ? 'Koi order approve nahi hua' : 'Kuch nahi badla');
      setPicked(new Set());
      refresh();
    },
    onError: (e) => toast.error(distError(e)),
  });

  const cancel = useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason?: string }) => distributionApi.cancel(ids, reason),
    onSuccess: (r) => {
      const ok = r.results.filter((x) => x.ok).length;
      const bad = r.results.filter((x) => !x.ok);
      if (ok) toast.success(`${ok} order cancel`);
      bad.forEach((b) => toast.error(`${b.orderNumber}: ${b.error}`));
      setPicked(new Set());
      refresh();
    },
    onError: (e) => toast.error(distError(e)),
  });

  const doApprove = (list = targets()) => {
    const ids = list.filter((o) => o.status === 'BOOKED').map((o) => o.id);
    if (!canManage) return toast.error('Approve ki permission nahi');
    if (!ids.length) return toast.message('Sirf Booked orders approve hote hain');
    run.mutate({ kind: 'approve', ids });
  };
  const doInvoice = (list = targets()) => {
    const ids = list.filter((o) => o.status === 'APPROVED' || o.status === 'INVOICING').map((o) => o.id);
    if (!canManage) return toast.error('Invoice ki permission nahi');
    if (!ids.length) return toast.message('Invoice sirf Approved orders ka banta hai — Booked ko A se approve karein');
    run.mutate({ kind: 'invoice', ids });
  };
  const doLoad = (list = targets()) => {
    const ids = list.filter((o) => o.status === 'INVOICED' && !o.loadSheetId).map((o) => o.id);
    if (!canLoad) return toast.error('Load sheet ki permission nahi');
    if (!ids.length) return toast.message('Sirf Invoiced orders load sheet me jate hain');
    setLoadIds(ids);
  };
  const doPrint = async (list = targets()) => {
    const ids = list.filter((o) => o.saleId).map((o) => o.id);
    if (!ids.length) return toast.message('Pehle Invoice banayein');
    try { printInvoices(await distributionApi.printInvoices(ids)); } catch (e) { toast.error(distError(e, 'Print nahi hua')); }
  };
  const doCancel = async (list = targets()) => {
    const ids = list.filter((o) => o.status === 'BOOKED' || o.status === 'APPROVED').map((o) => o.id);
    if (!ids.length) return toast.message('Sirf Booked ya Approved order cancel hota hai');
    if (await confirmDialog({ title: `${ids.length} order cancel karein?`, text: 'Cancel order wapas nahi aata. Booker ko naya order book karna hoga.', danger: true, yes: 'Cancel karein' })) cancel.mutate({ ids });
  };

  const step = useCallback((dir: 1 | -1) => {
    setCursor((c) => {
      const n = Math.max(0, Math.min(rows.length - 1, c + dir));
      if (openId && rows[n]) setOpenId(rows[n].id);
      return n;
    });
  }, [rows, openId]);

  useEffect(() => {
    tableRef.current?.querySelector(`[data-row="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingInField() || isDialogOpen() || openId) return;
      const k = e.key;
      if (k === 'ArrowDown' || k === 'j' || k === 'J') { e.preventDefault(); step(1); }
      else if (k === 'ArrowUp' || k === 'k' || k === 'K') { e.preventDefault(); step(-1); }
      else if (k === ' ' && rows[cursor] && !(document.activeElement instanceof HTMLInputElement)) { e.preventDefault(); setPicked((p) => { const n = new Set(p); const id = rows[cursor].id; if (n.has(id)) n.delete(id); else n.add(id); return n; }); }
      else if (k === 'Enter' && rows[cursor]) { e.preventDefault(); setOpenId(rows[cursor].id); }
      else if (k === 'a' || k === 'A') { e.preventDefault(); doApprove(); }
      else if (k === 'i' || k === 'I') { e.preventDefault(); doInvoice(); }
      else if (k === 'l' || k === 'L') { e.preventDefault(); doLoad(); }
      else if (k === 'p' || k === 'P') { e.preventDefault(); void doPrint(); }
      else if ((k === 'n' || k === 'N') && canBook) { e.preventDefault(); setEditor('new'); }
      else if (k === 'x' || k === 'X') { e.preventDefault(); setPicked((p) => (p.size === rows.length ? new Set() : new Set(rows.map((o) => o.id)))); }
      else if (/^[1-6]$/.test(k)) setTab(TABS[Number(k) - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const pickedRows = rows.filter((o) => picked.has(o.id));
  const pickedValue = pickedRows.reduce((a, o) => a + o.total, 0);
  const total = listQ.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const routeName = routesQ.data?.find((r) => r.id === routeId)?.name;
  const bookerName = bookers.find(([id]) => id === bookerId)?.[1];
  const drawerOrder = openId;

  return (
    <PageShell>
      <PageHero
        back="/distribution" backLabel="Distribution"
        title="Orders"
        chip={<><ClipboardList /> Order desk</>}
        meta="Booker ke orders approve karein — Invoice khud banta hai — phir load sheet me daalein"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <button type="button" onClick={() => void refresh()} title="Taaza karein" aria-label="Taaza karein" className={heroIconButton}><RefreshCw className={cn('h-4 w-4', listQ.isFetching && 'animate-spin')} /></button>
          {canLoad && <button type="button" onClick={() => setLoadIds([])} className={heroButton}><Truck className="h-4 w-4" /><span className="hidden sm:inline">Load sheet</span></button>}
          {canBook && <button type="button" onClick={() => setEditor('new')} title="Naya order (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Naya order</span></button>}
        </>}
        stats={listQ.data ? [
          { label: 'Orders', value: String(total) },
          { label: 'Value', value: money(listQ.data.totalValue) },
        ] : [{ label: 'Orders', value: '—' }]}
      />

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Order no., customer, dukaan ya phone" />}
        chips={(routeId || bookerId) && <>
          {routeId && <FilterChip onRemove={() => setRouteId('')}>{routeName ?? 'Route'}</FilterChip>}
          {bookerId && <FilterChip onRemove={() => setBookerId('')}>{bookerName ?? 'Booker'}</FilterChip>}
        </>}
        onClear={routeId || bookerId ? () => { setRouteId(''); setBookerId(''); } : undefined}>
        <FilterMenu icon={MapPin} label="Route" value={routeId} active={!!routeId} valueLabel={routeName}
          options={[{ value: '', label: 'Sab routes' }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: r.name, hint: r.area ?? undefined }))]} onChange={setRouteId} />
        <FilterMenu icon={UserRound} label="Booker" value={bookerId} active={!!bookerId} valueLabel={bookerName}
          options={[{ value: '', label: 'Sab bookers' }, ...bookers.map(([id, name]) => ({ value: id, label: name }))]} onChange={setBookerId} />
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="all" />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ id: t.id, label: t.label, count: t.id === tab ? total : null }))}
        hint={<><Kbd>A</Kbd> approve · <Kbd>I</Kbd> invoice · <Kbd>L</Kbd> load · <Kbd>Space</Kbd> chunein · <Kbd>Enter</Kbd> kholein</>} />

      {failures.length > 0 && (
        <Alert tone="danger" icon={<AlertTriangle className="h-4 w-4" />}
          action={<button type="button" onClick={() => setFailures([])} aria-label="Band" className="rounded-lg p-1 hover:bg-rose-100"><X className="h-4 w-4" /></button>}>
          <div className="font-semibold">{failures.length} order ka Invoice nahi bana</div>
          <ul className="mt-1 space-y-0.5">{failures.slice(0, 6).map((f) => <li key={f.id}><b>{f.orderNumber}</b>: {f.error ?? 'Masla'}</li>)}</ul>
        </Alert>
      )}

      <section ref={tableRef} className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {listQ.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          : !rows.length ? <Empty icon={<ClipboardList className="h-5 w-5" />} text={tab === 'BOOKED' ? 'Koi order approve ke liye baqi nahi. Booker ke naye orders yahan aayenge.' : 'Is filter me koi order nahi.'}
            action={canBook && tab === 'BOOKED' ? <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditor('new')}>Naya order</Button> : undefined} />
            : <>
              <div className="hidden overflow-x-auto md:block">
                <Table minWidth="58rem" className="[&_table]:text-[0.8125rem]">
                  <THead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                    <Tr>
                      <Th className="w-10 px-4 py-2 sm:px-5"><Checkbox aria-label="Sab chunein (X)" checked={rows.length > 0 && rows.every((o) => picked.has(o.id))} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((o) => o.id)) : new Set())} /></Th>
                      <Th className="px-3 py-2">Order</Th>
                      <Th className="px-3 py-2">Customer</Th>
                      <Th className="px-3 py-2">Route · Booker</Th>
                      <Th className="px-3 py-2 text-right">Total</Th>
                      <Th className="px-3 py-2">Halat</Th>
                      <Th className="px-4 py-2 sm:px-5">Invoice · Sheet</Th>
                    </Tr>
                  </THead>
                  <TBody className="divide-y divide-slate-100">
                    {rows.map((o, i) => (
                      <Tr key={o.id} data-row={i} onClick={() => { setCursor(i); setOpenId(o.id); }}
                        className={cn('cursor-pointer hover:bg-slate-50/80', i === cursor && 'bg-brand-50/50 shadow-[inset_3px_0_0] shadow-brand-500', picked.has(o.id) && 'bg-brand-50/30')}>
                        <Td className="px-4 py-2.5 sm:px-5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox aria-label={o.orderNumber} checked={picked.has(o.id)} onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; })} />
                        </Td>
                        <Td className="px-3 py-2.5">
                          <div className="whitespace-nowrap font-semibold text-slate-900">{o.orderNumber} <span className="ml-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] font-medium text-slate-500">{o.itemCount} items</span></div>
                          <div className="whitespace-nowrap text-[0.75rem] text-slate-500">{dayTime(o.bookedAt)}</div>
                        </Td>
                        <Td className="max-w-[16rem] px-3 py-2.5">
                          <div className="truncate font-semibold text-slate-900">{partyName(o.customer)}</div>
                          <div className="truncate text-[0.75rem] text-slate-500">{partySub(o.customer) || o.customer?.phone}</div>
                        </Td>
                        <Td className="max-w-[12rem] px-3 py-2.5">
                          <div className="truncate text-slate-700">{o.routeName ?? '—'}</div>
                          <div className="truncate text-[0.75rem] text-slate-500">{o.bookedByName}</div>
                        </Td>
                        <Td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{money(o.total)}
                          {o.schemeDiscount > 0 && <div className="whitespace-nowrap text-[0.6875rem] font-normal text-success-700">scheme −{money(o.schemeDiscount)}</div>}</Td>
                        <Td className="px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>
                            {o.creditWarning && <span title={o.creditWarning} className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-amber-800"><AlertTriangle className="h-3 w-3" />Credit</span>}
                            {o.invoiceError && <span title={o.invoiceError} className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-rose-700"><XCircle className="h-3 w-3" />Masla</span>}
                          </div>
                        </Td>
                        <Td className="px-4 py-2.5 text-[0.75rem] text-slate-600 sm:px-5">
                          <div>{o.saleNumber ?? '—'}</div>
                          {o.loadSheetNumber && <div className="text-slate-500">{o.loadSheetNumber}</div>}
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
              <ul className="divide-y divide-slate-100 md:hidden">
                {rows.map((o, i) => (
                  <li key={o.id} className={cn('flex items-start gap-3 px-4 py-3', picked.has(o.id) && 'bg-brand-50/40')}>
                    <Checkbox aria-label={o.orderNumber} checked={picked.has(o.id)} onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; })} />
                    <button type="button" onClick={() => { setCursor(i); setOpenId(o.id); }} className="min-w-0 flex-1 text-left">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[0.875rem] font-semibold text-slate-900">{partyName(o.customer)}</span>
                        <span className="shrink-0 text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(o.total)}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">{o.orderNumber} · {o.routeName ?? '—'} · {dayTime(o.bookedAt)}</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>
                        {o.creditWarning && <Pill tone="amber">Credit</Pill>}
                        {o.invoiceError && <Pill tone="rose">Masla</Pill>}
                        {o.saleNumber && <span className="text-[0.6875rem] text-slate-500">{o.saleNumber}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[0.8125rem] text-slate-600 sm:px-5">
                  <span>{(page - 1) * PAGE + 1}–{Math.min(page * PAGE, total)} / {total}</span>
                  <span className="flex gap-2">
                    <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Pichla</Button>
                    <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Agla</Button>
                  </span>
                </div>
              )}
              {picked.size > 0 && (
                <BulkBar>
                  <span className="text-[0.8125rem] font-semibold">{picked.size} chune · {money(pickedValue)}</span>
                  <span className="flex-1" />
                  {canManage && pickedRows.some((o) => o.status === 'BOOKED') && <Button size="sm" variant="success" loading={run.isPending} leftIcon={<BadgeCheck className="h-4 w-4" />} onClick={() => doApprove(pickedRows)}>Approve + Invoice</Button>}
                  {canManage && pickedRows.some((o) => o.status === 'APPROVED') && <Button size="sm" loading={run.isPending} leftIcon={<Receipt className="h-4 w-4" />} onClick={() => doInvoice(pickedRows)}>Invoice</Button>}
                  {canLoad && pickedRows.some((o) => o.status === 'INVOICED' && !o.loadSheetId) && <Button size="sm" leftIcon={<Truck className="h-4 w-4" />} onClick={() => doLoad(pickedRows)}>Load sheet</Button>}
                  {pickedRows.some((o) => o.saleId) && <Button size="sm" variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => void doPrint(pickedRows)}>Print</Button>}
                  {canManage && pickedRows.some((o) => o.status === 'BOOKED' || o.status === 'APPROVED') && <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => void doCancel(pickedRows)}>Cancel</Button>}
                  <button type="button" onClick={() => setPicked(new Set())} aria-label="Chunna khatam" className="rounded-lg p-1.5 text-white/70 hover:bg-white/10"><X className="h-4 w-4" /></button>
                </BulkBar>
              )}
            </>}
      </section>

      <p className="hidden items-center justify-center gap-1.5 text-[0.75rem] text-slate-400 md:flex">
        <CalendarDays className="h-3.5 w-3.5" /><Kbd>↑</Kbd><Kbd>↓</Kbd> ya <Kbd>J</Kbd><Kbd>K</Kbd> chalein · <Kbd>X</Kbd> sab · <Kbd>P</Kbd> print · <Kbd>N</Kbd> naya · <Kbd>1</Kbd>–<Kbd>6</Kbd> tabs · <Kbd>/</Kbd> search
      </p>

      {drawerOrder && (
        <OrderDrawer orderId={drawerOrder} onClose={() => setOpenId(null)} onStep={rows.length > 1 ? step : undefined}
          actions={{
            canManage, canBook, canLoad, busy: run.isPending,
            onEdit: (o) => setEditor(o),
            onApprove: (o) => run.mutate({ kind: 'approve', ids: [o.id] }),
            onInvoice: (o) => run.mutate({ kind: 'invoice', ids: [o.id] }),
            onLoad: (o) => setLoadIds([o.id]),
            onCancel: (o) => void doCancel([o as unknown as OrderRow]),
            onPrint: (o) => void doPrint([o as unknown as OrderRow]),
          }} />
      )}
      {editor && <OrderEditor order={editor === 'new' ? null : editor} onClose={() => setEditor(null)} onSaved={(o) => setOpenId(o.id)} />}
      {loadIds && <LoadSheetModal orderIds={loadIds.length ? loadIds : undefined} onClose={() => setLoadIds(null)} />}
    </PageShell>
  );
}

