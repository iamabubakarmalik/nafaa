/**
 * Distribution home: what is waiting at each step today (approve, invoice,
 * load, on the van, recoveries to verify), the day's cash from load sheets,
 * the oldest credit and a booker-wise table for the day.
 *
 * Keys: O orders · L load sheets · R recoveries.
 */

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, BadgeCheck, ClipboardList, FileText, HandCoins, MapPin, PackageCheck, RefreshCw, Timer, Truck, Users, Wallet,
} from 'lucide-react';
import {
  KpiCard, KpiRow, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, heroButton, heroIconButton, Kbd,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { DIST_KEY, distributionApi } from '../api/distribution.api';
import { DistributionGate } from '../components/DistributionGate';
import { useMoney } from '../hooks/useDistribution';
import { Empty, Panel, Pill } from '../components/parts';
import { dayKeyLabel, partyName, rs, SHEET_STATUS } from '../lib/meta';

export default function DistributionDashboardPage() {
  return <DistributionGate><Dashboard /></DistributionGate>;
}

function Dashboard() {
  const navigate = useNavigate();
  const money = useMoney();
  const canReports = usePermission(PERMISSIONS.REPORTS_VIEW);
  const canKhata = usePermission(PERMISSIONS.KHATA_VIEW);

  const dashQ = useQuery({ queryKey: [DIST_KEY, 'dashboard'], queryFn: distributionApi.dashboard, refetchInterval: 60_000 });
  const d = dashQ.data;
  const date = d?.date;
  const dsrQ = useQuery({ queryKey: [DIST_KEY, 'dsr', date], queryFn: () => distributionApi.dsr({ date }), enabled: !!date && canReports });
  const sheetsQ = useQuery({ queryKey: [DIST_KEY, 'sheets', 'day', date], queryFn: () => distributionApi.loadSheets({ from: date, to: date, limit: 20 }), enabled: !!date });
  const overdueQ = useQuery({ queryKey: [DIST_KEY, 'recoveries', 'overdue-top'], queryFn: () => distributionApi.recoveries({ overdueOnly: true, limit: 6 }), enabled: canKhata });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 'o') navigate('/distribution/orders');
      else if (k === 'l') navigate('/distribution/load-sheets');
      else if (k === 'r') navigate('/distribution/recoveries');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const w = d?.waiting;
  const sheets = sheetsQ.data?.sheets.filter((s) => s.status !== 'CANCELLED') ?? [];
  const cash = sheets.reduce((a, s) => ({ expected: a.expected + s.expectedCash, handed: a.handed + (s.handedIn ?? 0), short: a.short + (s.status === 'SETTLED' ? s.shortAmount : 0) }), { expected: 0, handed: 0, short: 0 });
  const vans = (w?.openSheets.OPEN?.count ?? 0) + (w?.openSheets.DISPATCHED?.count ?? 0);

  return (
    <PageShell>
      <PageHero
        title="Distribution"
        chip={<><Truck /> {date ? dayKeyLabel(date) : 'Aaj'}</>}
        meta="Booker ke orders se le kar delivery aur recovery tak — aaj kya baqi hai"
        busy={dashQ.isFetching && !dashQ.isLoading}
        loading={dashQ.isLoading}
        actions={<>
          <Link to="/distribution/orders" title="Orders" className={heroButton}><ClipboardList className="h-4 w-4" /><span className="hidden sm:inline">Orders</span></Link>
          <Link to="/distribution/load-sheets" title="Load sheets" className={heroButton}><Truck className="h-4 w-4" /><span className="hidden sm:inline">Load sheets</span></Link>
          <button type="button" onClick={() => void dashQ.refetch()} title="Taaza karein" aria-label="Taaza karein" className={heroIconButton}><RefreshCw className={cn('h-4 w-4', dashQ.isFetching && 'animate-spin')} /></button>
        </>}
        stats={d ? [
          { label: 'Aaj ke orders', value: String(d.today.orders), hint: money(d.today.value) },
          { label: 'Visits', value: `${d.today.productiveVisits}/${d.today.visits}`, hint: 'order wali / kul' },
          { label: 'Market me udhaar', value: money(d.receivable.amount), hint: `${d.receivable.customers} customers` },
        ] : [{ label: 'Aaj ke orders', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!w ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={BadgeCheck} color="#d97706" label="Approve baqi" value={String(w.toApprove.count)} hint={money(w.toApprove.value)} onClick={() => navigate('/distribution/orders?status=BOOKED')} />
          <KpiCard icon={FileText} color={w.invoiceProblems ? '#e11d48' : '#2563eb'} label="Invoice baqi" value={String(w.approvedNotInvoiced.count)}
            hint={w.invoiceProblems ? `${w.invoiceProblems} me masla` : money(w.approvedNotInvoiced.value)} onClick={() => navigate('/distribution/orders?status=APPROVED')} />
          <KpiCard icon={PackageCheck} color="#7c3aed" label="Load baqi" value={String(w.toLoad.count)} hint={money(w.toLoad.value)} onClick={() => navigate('/distribution/orders?status=INVOICED')} />
          <KpiCard icon={Truck} color="#ea580c" label="Gaari par" value={String(w.onVans.count)} hint={`${vans} sheet · ${money(w.onVans.value)}`} onClick={() => navigate('/distribution/load-sheets')} />
          <KpiCard icon={HandCoins} color="#059669" label="Verify baqi" value={String(w.collectionsToVerify.count)} hint={money(w.collectionsToVerify.amount)} onClick={() => navigate('/distribution/recoveries?tab=verify')} />
        </>}
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <Panel className="lg:col-span-2" flush title="Booker — aaj" sub={canReports ? 'Visit, order aur recovery har booker ki' : undefined}
          right={canReports && <Link to="/reports?tab=distribution" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">Poori report <ArrowRight className="h-3.5 w-3.5" /></Link>}>
          {!canReports ? <Empty icon={<Users className="h-5 w-5" />} text="Booker ki report dekhne ke liye Reports ki permission chahiye." />
            : !dsrQ.data ? <div className="p-4"><Skeleton className="h-40 rounded-2xl" /></div>
              : !dsrQ.data.bookers.length ? <Empty icon={<Users className="h-5 w-5" />} text="Aaj abhi kisi booker ne visit ya order nahi kiya." />
                : (
                  <div className="overflow-x-auto pb-2">
                    <Table minWidth="36rem" className="[&_table]:text-[0.8125rem]">
                      <THead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                        <Tr>
                          <Th className="px-4 py-2 sm:px-5">Booker</Th>
                          <Th className="px-3 py-2 text-right">Visits</Th>
                          <Th className="px-3 py-2 text-right">Strike</Th>
                          <Th className="px-3 py-2 text-right">Orders</Th>
                          <Th className="px-3 py-2 text-right">Value</Th>
                          <Th className="px-4 py-2 text-right sm:px-5">Recovery</Th>
                        </Tr>
                      </THead>
                      <TBody className="divide-y divide-slate-100">
                        {dsrQ.data.bookers.map((b) => (
                          <Tr key={b.bookerId} className="hover:bg-slate-50/80">
                            <Td className="px-4 py-2.5 sm:px-5">
                              <div className="font-semibold text-slate-900">{b.bookerName}</div>
                              <div className="truncate text-[0.75rem] text-slate-500">{b.routes.join(' · ') || 'Route nahi'}</div>
                            </Td>
                            <Td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{b.visited}/{b.planned}{b.outOfRangeCheckIns > 0 && <div className="text-[0.6875rem] text-amber-700">{b.outOfRangeCheckIns} door se</div>}</Td>
                            <Td className="whitespace-nowrap px-3 py-2.5 text-right"><Pill tone={b.strikeRate >= 70 ? 'green' : b.strikeRate >= 40 ? 'amber' : 'rose'}>{Math.round(b.strikeRate)}%</Pill></Td>
                            <Td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{b.orders}<div className="text-[0.6875rem] text-slate-500">{b.linesPerCall} lines/call</div></Td>
                            <Td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{money(b.value)}<div className="text-[0.6875rem] font-normal text-slate-500">drop {money(b.dropSize)}</div></Td>
                            <Td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums sm:px-5">{money(b.collected)}{b.collectedPending > 0 && <div className="text-[0.6875rem] text-amber-700">{money(b.collectedPending)} baqi</div>}</Td>
                          </Tr>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Aaj ka cash" sub="Load sheets se — expected aur jama hua">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Money label="Expected" value={money(cash.expected)} />
              <Money label="Jama hua" value={money(cash.handed)} />
              <Money label={cash.short >= 0 ? 'Kam' : 'Zyada'} value={money(Math.abs(cash.short))} tone={cash.short > 0 ? 'rose' : cash.short < 0 ? 'green' : undefined} />
            </div>
            <ul className="mt-3 divide-y divide-slate-100">
              {!sheetsQ.data ? <li className="py-2"><Skeleton className="h-10 rounded-xl" /></li>
                : !sheets.length ? <li className="py-4 text-center text-[0.8125rem] text-slate-500">Aaj ki koi load sheet nahi</li>
                  : sheets.slice(0, 5).map((s) => (
                    <li key={s.id}>
                      <Link to={`/distribution/load-sheets/${s.id}`} className="flex items-center gap-2 py-2 hover:opacity-80">
                        <Truck className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{s.number} <span className="font-normal text-slate-500">· {s.routeName ?? s.deliveryUserName ?? `${s.invoiceCount} invoices`}</span></span>
                          <span className="block text-[0.75rem] text-slate-500">{money(s.totalValue)}{s.status === 'SETTLED' && s.shortAmount ? ` · ${s.shortAmount > 0 ? 'kam' : 'zyada'} ${rs(Math.abs(s.shortAmount))}` : ''}</span>
                        </span>
                        <Pill tone={SHEET_STATUS[s.status].tone}>{SHEET_STATUS[s.status].label}</Pill>
                      </Link>
                    </li>
                  ))}
            </ul>
          </Panel>

          {canKhata && (
            <Panel title="Purana udhaar" sub={overdueQ.data ? `${overdueQ.data.totals.customers} customers · ${money(overdueQ.data.totals.balance)}` : 'Credit days se zyada'}
              right={<Link to="/distribution/recoveries" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Sab</Link>}>
              {!overdueQ.data ? <Skeleton className="h-28 rounded-xl" />
                : !overdueQ.data.customers.length ? <p className="py-3 text-center text-[0.8125rem] text-slate-500">Kisi ka udhaar purana nahi</p> : (
                  <ul className="divide-y divide-slate-100">
                    {overdueQ.data.customers.map((r) => (
                      <li key={r.customer.id} className="flex items-center gap-2 py-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><AlertTriangle className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{partyName(r.customer)}</span>
                          <span className="flex min-w-0 items-center gap-1 text-[0.75rem] text-slate-500"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{r.routeName ?? 'Route nahi'}</span></span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-[0.8125rem] font-semibold tabular-nums text-slate-900">{money(r.balance)}</span>
                          <span className="inline-flex items-center gap-0.5 text-[0.6875rem] font-semibold text-rose-600"><Timer className="h-3 w-3" />{r.dueDays} din</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
            </Panel>
          )}
        </div>
      </div>

      <p className="hidden items-center justify-center gap-1.5 text-[0.75rem] text-slate-400 sm:flex">
        <Wallet className="h-3.5 w-3.5" /> <Kbd>O</Kbd> orders · <Kbd>L</Kbd> load sheets · <Kbd>R</Kbd> recoveries
      </p>
    </PageShell>
  );
}

function Money({ label, value, tone }: { label: string; value: string; tone?: 'rose' | 'green' }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-2 py-2.5">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={cn('mt-0.5 truncate text-[0.875rem] font-bold tabular-nums text-slate-900', tone === 'rose' && 'text-rose-600', tone === 'green' && 'text-success-700')}>{value}</div>
    </div>
  );
}
