/**
 * Glasses and repair orders: the optical shop's main desk. Every order from
 * booking (advance) through the lab to hand-over, with server-side views,
 * search and period. From a row: send to lab, mark back / ready, take a
 * payment, hand over (the bill is made then), cancel, print the slip. The
 * Analytics tab shows labs (turnaround, late) and where orders stand.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlarmClock, BarChart3, CheckCircle2, Download, FlaskConical, Glasses, GraduationCap, ListChecks, MessageCircle, MoreHorizontal, Plus, Printer, Wallet, Wrench, XCircle,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { usePrinter } from '@core/print';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { lensOrdersApi, type LensOrderView, type OpticalLensOrder } from '../api/lens-orders.api';
import { OrderDialogs, useOrderActions, type OrderDialog } from '../components/OrderModals';
import { Bars, ListCard, ListState, Pager, Panel, Pill } from '../components/ui';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import {
  OPTICAL_KEYS, REPAIR, apiError, dayOnly, daysFrom, isOrderClosed, isOrderReady, nextOrderStep, orderStatusOf, rangeParams, waLink,
} from '../lib/meta';
import { labDoc, orderDoc } from '../lib/print';

type Tab = LensOrderView | 'analytics';
const LIMIT = 30;
const TABS: Array<{ id: Tab; label: string; icon?: typeof Glasses }> = [
  { id: 'open', label: 'Chal rahe', icon: Glasses }, { id: 'lab', label: 'Lab me' }, { id: 'ready', label: 'Tayyar' }, { id: 'late', label: 'Late' },
  { id: 'unpaid', label: 'Paisa baqi' }, { id: 'repairs', label: 'Repair' }, { id: 'delivered', label: 'De diye' }, { id: 'cancelled', label: 'Cancel' }, { id: 'all', label: 'Sab' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function LensOrdersPage() {
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const { print } = usePrinter();
  const canBill = usePermission(PERMISSIONS.POS_USE);
  const [params, setParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>((params.get('view') as Tab) || 'open');
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<OrderDialog>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const q = useDebounced(search.trim());
  const actions = useOrderActions(() => setDialog(null));
  usePageKeys(searchRef, { n: () => canBill && navigate('/optical/lens-orders/new'), r: () => canBill && navigate('/optical/lens-orders/new?type=repair'), a: () => setTab('analytics') });
  useEffect(() => { setPage(1); }, [q, range, tab]);
  useEffect(() => { if (tab !== 'open') setParams({ view: tab }, { replace: true }); else setParams({}, { replace: true }); }, [tab, setParams]);
  useEffect(() => { const v = (params.get('view') as Tab) || 'open'; if (v !== tab) setTab(v); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = useMemo(() => ({ view: tab === 'analytics' ? 'all' as const : tab, search: q || undefined, limit: LIMIT, ...rangeParams(resolveRange(range, 0)) }), [tab, q, range]);
  const list = useQuery({ queryKey: [OPTICAL_KEYS.orders, 'page', query, page], queryFn: () => lensOrdersApi.page({ ...query, page }), placeholderData: (p) => p, enabled: tab !== 'analytics', refetchInterval: 60_000 });
  const summary = useQuery({ queryKey: [OPTICAL_KEYS.orders, 'summary'], queryFn: lensOrdersApi.summary, refetchInterval: 60_000 });
  const s = summary.data;
  const data = list.data;

  const exportCsv = async () => {
    try {
      const all = await lensOrdersApi.page({ ...query, page: 1, limit: 100 });
      if (!all.items.length) { toast.error('Is filter me koi order nahi'); return; }
      downloadCsv('chashma-orders.csv', [['Order', 'Date', 'Customer', 'Mobile', 'Frame', 'Lens', 'Lab', 'Tayyar date', 'Halat', 'Kul', 'Mila', 'Baqi'],
        ...all.items.map((o) => [o.orderNumber, o.orderedAt.slice(0, 10), o.customerName, o.customerPhone, o.frameName, o.lensType === REPAIR ? 'Repair' : [o.lensType, o.lensIndex].filter(Boolean).join(' '), o.labName, o.expectedDate?.slice(0, 10), orderStatusOf(o.status).label, o.totalPrice, o.paidAmount, o.remainingAmount])]);
      if (all.total > all.items.length) toast.info(`Pehle ${all.items.length} order file me — period chhota karein`);
    } catch (e) { toast.error(apiError(e, 'File nahi bani')); }
  };

  const nextStep = (o: OpticalLensOrder) => {
    const step = nextOrderStep(o.status, o.lensType === REPAIR);
    if (!step) return null;
    if (step[0] === 'SENT_TO_LAB') return <Button size="xs" variant="secondary" leftIcon={<FlaskConical className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'lab', order: o })}>{step[1]}</Button>;
    return <Button size="xs" variant="secondary" loading={actions.step.isPending && actions.step.variables?.o.id === o.id} onClick={() => actions.step.mutate({ o, status: step[0] as OpticalLensOrder['status'] })}>{step[1]}</Button>;
  };

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Chashma orders — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Order aur advance', text: 'Naya order: customer, nuskha, frame aur lens. Advance yahin lein — cash drawer me aaj ki date par aata hai.' },
            { icon: FlaskConical, color: '#7c3aed', title: 'Lab', text: '"Lab bhejein" par lab ka naam aur wapas aane ki date. Date guzar jaye to order "Late" me aata hai.' },
            { icon: CheckCircle2, color: '#16a34a', title: 'Tayyar', text: 'Lab se aaye to "Lab se aa gaya", fit karke "Tayyar". Customer ko WhatsApp button se bata dein.' },
            { icon: Wallet, color: '#d97706', title: 'Dene par bill', text: '"De diya" par bill banta hai: frame stock se nikalta hai, baqi paisa lein ya khata me likhein.' },
          ]}
          tips={['Cancel par advance wapas dein ya khata me jama rakhein — dono hisaab me sahi aate hain.', 'Repair bhi isi desk par: "Repair" button (R).']}
          shortcuts={[['/', 'search'], ['N', 'naya order'], ['R', 'repair'], ['A', 'analytics'], ['G', 'guide']]} />
      )}
      <OrderDialogs dialog={dialog} close={() => setDialog(null)} actions={actions} />

      <PageHero title="Chashma orders" chip={<><Glasses />{tab === 'analytics' ? (s ? s.ordered + s.atLab + s.received + s.ready : 0) : data?.total ?? 0}</>}
        busy={list.isFetching && !list.isLoading} loading={summary.isLoading}
        meta="Advance → lab → tayyar → customer ko diya"
        actions={<>
          <button type="button" onClick={() => void exportCsv()} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canBill && <Link to="/optical/lens-orders/new?type=repair" className={heroButton}><Wrench className="h-4 w-4" /><span className="hidden sm:inline">Repair</span></Link>}
          {canBill && <Link to="/optical/lens-orders/new" className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya order</Link>}
        </>}
        stats={[
          { label: 'Chal rahe orders ki qeemat', value: money(s?.totalBilled ?? 0) },
          { label: 'Advance mil chuka', value: money(s?.totalCollected ?? 0) },
          { label: 'Lena baqi', value: money(s?.totalReceivable ?? 0) },
        ]} />

      <KpiRow>
        {summary.isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={ListChecks} color="#64748b" label="Naye order" value={s?.ordered ?? 0} hint="Abhi lab nahi gaye" onClick={() => setTab('lab')} />
            <KpiCard icon={FlaskConical} color="#2563eb" label="Lab me" value={s?.atLab ?? 0} hint={s?.dueToday ? `${s.dueToday} aaj aane hain` : undefined} onClick={() => setTab('lab')} active={tab === 'lab'} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Tayyar" value={(s?.received ?? 0) + (s?.ready ?? 0)} hint="Customer ko bulayein" onClick={() => setTab('ready')} active={tab === 'ready'} />
            <KpiCard icon={AlarmClock} color="#e11d48" label="Late" value={s?.overdue ?? 0} hint="Date guzar gayi" onClick={() => setTab('late')} active={tab === 'late'} />
            <KpiCard icon={Wrench} color="#a16207" label="Repair chal rahi" value={s?.repairsOpen ?? 0} onClick={() => setTab('repairs')} active={tab === 'repairs'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Order number, customer, mobile, frame ya lab…" />}
        chips={q || range.preset !== 'all' ? <>{q && <FilterChip onRemove={() => setSearch('')}>"{q}"</FilterChip>}{range.preset !== 'all' && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>Period</FilterChip>}</> : undefined}
        onClear={() => { setSearch(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); }}>
        <DateRangeMenu value={range} onChange={setRange} startHour={0} label="Order ki date" />
      </FilterBar>

      <ViewTabs<Tab> value={tab} onChange={setTab} tabs={TABS} hint={data && tab !== 'analytics' ? <>Is list me: kul {money(data.totals.value)} · baqi {money(data.totals.due)}</> : undefined} />

      {tab === 'analytics' ? <OrdersAnalytics /> : (
        <ListCard>
          <ListState loading={list.isLoading} error={list.isError} empty={!data?.items.length} onRetry={() => void list.refetch()} icon={Glasses}
            title={q ? `"${q}" se koi order nahi mila` : 'Is list me koi order nahi'} hint="Naya order banayein — advance, lab aur pickup sab yahin se."
            actions={canBill && <Button onClick={() => navigate('/optical/lens-orders/new')} leftIcon={<Plus className="h-4 w-4" />}>Naya order</Button>}>
            {data && (
              <>
                <Table minWidth="64rem">
                  <THead><Tr><Th>Order</Th><Th>Customer</Th><Th>Chashma</Th><Th>Lab / date</Th><Th>Halat</Th><Th align="right">Paisa</Th><Th align="right" /></Tr></THead>
                  <TBody>
                    {data.items.map((o) => {
                      const repair = o.lensType === REPAIR;
                      const closed = isOrderClosed(o.status);
                      const days = daysFrom(o.expectedDate);
                      const wa = waLink(o.customerPhone, isOrderReady(o.status)
                        ? `Assalam o alaikum ${o.customerName}, aap ka ${repair ? 'chashma repair ho kar' : 'chashma'} tayyar hai (${o.orderNumber}).${o.remainingAmount > 0 ? ` Baqi: Rs ${o.remainingAmount}.` : ''} Shukriya.`
                        : `Assalam o alaikum ${o.customerName}, aap ka order ${o.orderNumber} ${dayOnly(o.expectedDate)} tak tayyar hoga.`);
                      return (
                        <Tr key={o.id} interactive onClick={() => navigate(`/optical/lens-orders/${o.id}`)}>
                          <Td className="whitespace-nowrap">
                            <p className="font-semibold text-slate-900">{o.orderNumber}</p>
                            <p className="text-[0.75rem] text-slate-500">{dayOnly(o.orderedAt)}{repair && <span className="ml-1 rounded bg-amber-100 px-1 text-[0.6875rem] font-semibold text-amber-800">Repair</span>}</p>
                          </Td>
                          <Td><p className="font-medium text-slate-900">{o.customerName}</p><p className="text-[0.75rem] text-slate-500">{o.customerPhone}</p></Td>
                          <Td className="max-w-[16rem]"><p className="truncate text-slate-800">{o.frameName}</p><p className="truncate text-[0.75rem] text-slate-500">{repair ? 'Repair' : [o.lensType, o.lensIndex, o.lensCoatings.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}</p></Td>
                          <Td className="whitespace-nowrap">
                            <p className="text-slate-700">{o.labName ?? (repair ? 'Dukaan me' : '—')}</p>
                            <p className={days != null && days < 0 && !closed ? 'text-[0.75rem] font-semibold text-rose-600' : 'text-[0.75rem] text-slate-500'}>
                              {o.expectedDate ? (closed ? dayOnly(o.expectedDate) : days === 0 ? 'Aaj' : days != null && days < 0 ? `${-days} din late` : dayOnly(o.expectedDate)) : '—'}
                            </p>
                          </Td>
                          <Td><Pill meta={orderStatusOf(o.status)} /></Td>
                          <Td align="right" className="whitespace-nowrap"><p className="font-semibold tabular-nums">{money(o.totalPrice)}</p>{o.remainingAmount > 0.009 && o.status !== 'CANCELLED' && <p className="text-[0.75rem] font-medium text-amber-700">{money(o.remainingAmount)} baqi</p>}</Td>
                          <Td align="right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {canBill && !closed && nextStep(o)}
                              {canBill && !closed && isOrderReady(o.status) && <Button size="xs" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'deliver', order: o })}>De diya</Button>}
                              {canBill && !closed && o.remainingAmount > 0.009 && <Button size="xs" variant="ghost" aria-label="Payment lein" onClick={() => setDialog({ kind: 'pay', order: o })}><Wallet className="h-3.5 w-3.5" /></Button>}
                              {wa && !closed && <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"><MessageCircle className="h-3.5 w-3.5" /></a>}
                              <div className="relative">
                                <Button size="xs" variant="ghost" aria-label="Aur" onClick={() => setMenu(menu === o.id ? null : o.id)}><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                                {menu === o.id && (
                                  <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg" onMouseLeave={() => setMenu(null)}>
                                    <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[0.8125rem] hover:bg-slate-50" onClick={() => { setMenu(null); void print(orderDoc(o, repair)); }}><Printer className="h-3.5 w-3.5" />Customer parchi</button>
                                    {!repair && <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[0.8125rem] hover:bg-slate-50" onClick={() => { setMenu(null); void print(labDoc(o)); }}><FlaskConical className="h-3.5 w-3.5" />Lab parchi</button>}
                                    {canBill && !closed && <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[0.8125rem] text-rose-700 hover:bg-rose-50" onClick={() => { setMenu(null); setDialog({ kind: 'cancel', order: o }); }}><XCircle className="h-3.5 w-3.5" />Cancel</button>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
                <Pager page={page} total={data.total} limit={LIMIT} onPage={setPage} />
              </>
            )}
          </ListState>
        </ListCard>
      )}
    </PageShell>
  );
}

function OrdersAnalytics() {
  const { sales: money } = useMasked();
  const labs = useQuery({ queryKey: [OPTICAL_KEYS.orders, 'labs'], queryFn: lensOrdersApi.labPerformance });
  const summary = useQuery({ queryKey: [OPTICAL_KEYS.orders, 'summary'], queryFn: lensOrdersApi.summary });
  const s = summary.data;
  const rows = s ? [
    { key: 'o', label: 'Naye', value: s.ordered, color: '#64748b' },
    { key: 'l', label: 'Lab me', value: s.atLab, color: '#2563eb' },
    { key: 'r', label: 'Lab se aaye', value: s.received, color: '#7c3aed' },
    { key: 't', label: 'Tayyar', value: s.ready, color: '#16a34a' },
    { key: 'x', label: 'Late', value: s.overdue, color: '#e11d48' },
  ] : [];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Panel title="Orders kahan hain" hint={s ? `Is mahine ${s.monthlyOrders} order · ${money(s.monthlyValue)}` : undefined}>
        {summary.isLoading ? <Skeleton className="h-40 rounded-xl" /> : <Bars rows={rows} />}
      </Panel>
      <Panel title="Labs" hint="Kitne order, kitne din me wapas, kitne late">
        {labs.isLoading ? <Skeleton className="h-40 rounded-xl" /> : !labs.data?.length ? <p className="text-[0.8125rem] text-slate-500">Abhi kisi lab ko order nahi gaya</p> : (
          <Table minWidth="32rem">
            <THead><Tr><Th>Lab</Th><Th align="right">Order</Th><Th align="right">Ausat din</Th><Th align="right">Late</Th><Th align="right">Waqt par</Th><Th align="right">Lens ki sale</Th></Tr></THead>
            <TBody>
              {labs.data.map((l) => (
                <Tr key={l.labName}>
                  <Td className="font-medium">{l.labName}</Td><Td align="right">{l.totalOrders}</Td><Td align="right">{l.avgTurnaroundDays}</Td>
                  <Td align="right" className={l.lateDeliveries ? 'font-semibold text-rose-600' : ''}>{l.lateDeliveries}</Td><Td align="right">{l.onTimePct}%</Td><Td align="right">{money(l.lensRevenue)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
