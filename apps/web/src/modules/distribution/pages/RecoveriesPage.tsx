/**
 * Recoveries: who owes what and for how long (ageing by route and by
 * customer), the queue of field collections waiting for the office to verify
 * (bulk verify or reject), money taken at the office, and the printed
 * recovery sheet a collector takes along a route.
 *
 * Keys: 1-3 tabs · C collect · V verify ticked · P print sheet.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, BadgeCheck, CheckCircle2, Clock, HandCoins, History, ListChecks, MapPin, MessageCircle, Printer, RefreshCw, Timer, Wallet, X, XCircle } from 'lucide-react';
import {
  Button, Checkbox, FilterBar, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Table, TBody, Td, Th, THead, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen } from '@core/lib/shortcuts';
import { DIST_KEY, distError, distributionApi, type Ageing, type MoneyMethod, type RecoveryRow } from '../api/distribution.api';
import { DistributionGate } from '../components/DistributionGate';
import { useMoney } from '../hooks/useDistribution';
import { BulkBar, Empty, Panel, Pill } from '../components/parts';
import { COLLECTION_STATUS, dayLabel, dayTime, METHOD_LABEL, METHODS, partyName, partySub, rs, typingInField } from '../lib/meta';
import { printRecoverySheet } from '../print/distPrint';
import { ReminderQueue } from '../components/ReminderQueue';
import { reminderLink } from '../lib/reminder';
import { useAuthStore } from '@core/stores/auth.store';

type Tab = 'ageing' | 'verify' | 'history';
const BUCKETS: Array<{ k: keyof Ageing; label: string; color: string }> = [
  { k: 'd0_7', label: '0–7 din', color: '#16a34a' }, { k: 'd8_15', label: '8–15 din', color: '#65a30d' }, { k: 'd16_30', label: '16–30 din', color: '#d97706' },
  { k: 'd31_60', label: '31–60 din', color: '#ea580c' }, { k: 'd60_plus', label: '60+ din', color: '#e11d48' },
];

export default function RecoveriesPage() {
  return <DistributionGate><Recoveries /></DistributionGate>;
}

function Recoveries() {
  const qc = useQueryClient();
  const money = useMoney();
  const canVerify = usePermission(PERMISSIONS.DISTRIBUTION_COLLECTIONS_VERIFY);
  const canCollect = usePermission(PERMISSIONS.DISTRIBUTION_COLLECTIONS_COLLECT);
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'verify' ? 'verify' : 'ageing');
  const [routeId, setRouteId] = useState(params.get('routeId') ?? '');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [collectFor, setCollectFor] = useState<RecoveryRow | 'pick' | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [sheetAsk, setSheetAsk] = useState(false);
  const [historyStatus, setHistoryStatus] = useState('');
  const [remindAll, setRemindAll] = useState(false);
  const shop = useAuthStore((st) => st.tenant?.name ?? '');

  const routesQ = useQuery({ queryKey: [DIST_KEY, 'routes'], queryFn: () => distributionApi.routes(), staleTime: 5 * 60_000 });
  const recQ = useQuery({
    queryKey: [DIST_KEY, 'recoveries', routeId, overdueOnly, search],
    queryFn: () => distributionApi.recoveries({ routeId: routeId || undefined, overdueOnly: overdueOnly || undefined, search: search.trim() || undefined, limit: 500 }),
    placeholderData: keepPreviousData,
  });
  const pendQ = useQuery({
    queryKey: [DIST_KEY, 'collections', 'PENDING', routeId],
    queryFn: () => distributionApi.collections({ status: 'PENDING', routeId: routeId || undefined, limit: 200 }),
  });
  const histQ = useQuery({
    queryKey: [DIST_KEY, 'collections', 'history', historyStatus, routeId],
    queryFn: () => distributionApi.collections({ status: historyStatus || undefined, routeId: routeId || undefined, limit: 100 }),
    enabled: tab === 'history',
    placeholderData: keepPreviousData,
  });
  const overdueQ = useQuery({
    queryKey: [DIST_KEY, 'recoveries', 'overdue', routeId],
    queryFn: () => distributionApi.recoveries({ routeId: routeId || undefined, overdueOnly: true, limit: 500 }),
    enabled: remindAll,
  });
  const r = recQ.data;
  const pending = pendQ.data?.collections ?? [];
  const pendingTotal = pendQ.data?.totals.PENDING;
  useEffect(() => setPicked(new Set()), [tab, routeId]);

  const byRoute = useMemo(() => {
    const m = new Map<string, { name: string; customers: number; balance: number; overdue: number; ageing: Ageing }>();
    (r?.customers ?? []).forEach((row) => {
      const k = row.routeName ?? 'Route nahi';
      const cur = m.get(k) ?? { name: k, customers: 0, balance: 0, overdue: 0, ageing: { d0_7: 0, d8_15: 0, d16_30: 0, d31_60: 0, d60_plus: 0 } };
      cur.customers += 1; cur.balance += row.balance; if (row.overdue) cur.overdue += row.balance;
      BUCKETS.forEach((b) => { cur.ageing[b.k] += row.ageing[b.k]; });
      m.set(k, cur);
    });
    return [...m.values()].sort((a, b) => b.balance - a.balance);
  }, [r]);

  const refresh = () => qc.invalidateQueries({ queryKey: [DIST_KEY] });
  const verify = useMutation({
    mutationFn: (ids: string[]) => distributionApi.verify(ids),
    onSuccess: (res) => {
      const bad = res.results.filter((x) => !x.ok);
      if (res.verified) toast.success(`${res.verified} recovery verify — khata me jama`);
      bad.forEach((b) => toast.error(b.error ?? 'Verify nahi hui'));
      setPicked(new Set()); refresh();
    },
    onError: (e) => toast.error(distError(e)),
  });
  const reject = useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason: string }) => distributionApi.reject(ids, reason || undefined),
    onSuccess: (res) => { toast.success(`${res.rejected} recovery reject`); setRejecting(false); setPicked(new Set()); refresh(); },
    onError: (e) => toast.error(distError(e)),
  });

  const printSheet = async (rid: string) => {
    try { printRecoverySheet(await distributionApi.recoverySheet(rid)); setSheetAsk(false); } catch (e) { toast.error(distError(e, 'Print nahi hua')); }
  };
  const askPrint = () => (routeId ? void printSheet(routeId) : setSheetAsk(true));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingInField() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (/^[1-3]$/.test(k)) setTab((['ageing', 'verify', 'history'] as Tab[])[Number(k) - 1]);
      else if (k === 'c' && canCollect) { e.preventDefault(); setCollectFor('pick'); }
      else if (k === 'p') { e.preventDefault(); askPrint(); }
      else if (k === 'v' && canVerify && picked.size) { e.preventDefault(); verify.mutate([...picked]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const routeName = routesQ.data?.find((x) => x.id === routeId)?.name;
  const pickedPending = pending.filter((c) => picked.has(c.id));

  return (
    <PageShell>
      <PageHero
        back="/distribution" backLabel="Distribution"
        title="Recoveries"
        chip={<><HandCoins /> Udhaar ki wasooli</>}
        meta="Kis ka kitna udhaar kitne din se — field se aayi recovery verify karein, phir khata me jati hai"
        busy={recQ.isFetching && !recQ.isLoading}
        loading={recQ.isLoading}
        actions={<>
          <button type="button" onClick={() => void refresh()} title="Taaza karein" aria-label="Taaza karein" className={heroIconButton}><RefreshCw className={cn('h-4 w-4', recQ.isFetching && 'animate-spin')} /></button>
          {!!r?.totals.overdueCustomers && (
            <button type="button" onClick={() => setRemindAll(true)} title="Sab overdue ko WhatsApp yaad-dehani" className={heroButton}>
              <MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">Sab overdue ko bhejein</span>
            </button>
          )}
          <button type="button" onClick={askPrint} title="Recovery sheet (P)" className={heroButton}><Printer className="h-4 w-4" /><span className="hidden sm:inline">Recovery sheet</span></button>
          {canCollect && <button type="button" onClick={() => setCollectFor('pick')} title="Paisa mila (C)" className={heroPrimaryButton}><Wallet className="h-4 w-4" /><span className="hidden sm:inline">Paisa mila</span></button>}
        </>}
        stats={r ? [
          { label: 'Kul udhaar', value: money(r.totals.balance), hint: `${r.totals.customers} customers` },
          { label: 'Purana (overdue)', value: money(r.totals.overdueBalance), hint: `${r.totals.overdueCustomers} customers` },
          { label: 'Verify baqi', value: money(pendingTotal?.amount ?? 0), hint: `${pendingTotal?.count ?? 0} recovery` },
        ] : [{ label: 'Kul udhaar', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!r ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : BUCKETS.map((b) => (
          <KpiCard key={b.k} icon={b.k === 'd0_7' ? Clock : b.k === 'd60_plus' ? AlertTriangle : Timer} color={b.color} label={b.label} value={money(r.totals.ageing[b.k])}
            hint={r.totals.balance ? `${Math.round((r.totals.ageing[b.k] / r.totals.balance) * 100)}% udhaar ka` : '—'} />
        ))}
      </KpiRow>

      <FilterBar
        search={tab === 'ageing' ? <SearchField value={search} onChange={setSearch} placeholder="Customer, dukaan ya phone" /> : undefined}
        onClear={routeId || overdueOnly ? () => { setRouteId(''); setOverdueOnly(false); } : undefined}>
        <FilterMenu icon={MapPin} label="Route" value={routeId} active={!!routeId} valueLabel={routeName}
          options={[{ value: '', label: 'Sab routes' }, ...(routesQ.data ?? []).map((x) => ({ value: x.id, label: x.name, hint: x.area ?? undefined }))]} onChange={setRouteId} />
        {tab === 'ageing' && (
          <FilterMenu icon={AlertTriangle} label="Purana" value={overdueOnly ? 'on' : 'off'} active={overdueOnly} valueLabel={overdueOnly ? 'Sirf purana' : undefined}
            options={[{ value: 'off', label: 'Sab udhaar' }, { value: 'on', label: 'Sirf purana', hint: 'Credit days se zyada' }]} onChange={(v) => setOverdueOnly(v === 'on')} />
        )}
        {tab === 'history' && (
          <FilterMenu icon={History} label="Halat" value={historyStatus} active={!!historyStatus} valueLabel={historyStatus ? COLLECTION_STATUS[historyStatus as keyof typeof COLLECTION_STATUS].label : undefined}
            options={[{ value: '', label: 'Sab' }, ...(['PENDING', 'VERIFIED', 'REJECTED'] as const).map((s) => ({ value: s, label: COLLECTION_STATUS[s].label }))]} onChange={setHistoryStatus} />
        )}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        tabs={[
          { id: 'ageing', label: 'Udhaar', icon: Timer, count: r?.total ?? null },
          { id: 'verify', label: 'Verify baqi', icon: ListChecks, count: pendingTotal?.count ?? pending.length },
          { id: 'history', label: 'Recoveries', icon: History },
        ]}
        hint={<><Kbd>1</Kbd>-<Kbd>3</Kbd> tabs{canCollect && <> · <Kbd>C</Kbd> paisa mila</>} · <Kbd>P</Kbd> sheet</>} />

      {tab === 'ageing' && (
        <div className="space-y-4">
          {byRoute.length > 1 && !routeId && (
            <Panel flush title="Route war" sub="Har route par kitna udhaar kitna purana">
              <div className="overflow-x-auto pb-1">
                <Table minWidth="46rem" className="[&_table]:text-[0.8125rem]">
                  <THead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                    <Tr><Th className="px-4 py-2 sm:px-5">Route</Th><Th className="px-3 py-2 text-right">Customers</Th>{BUCKETS.map((b) => <Th key={b.k} className="px-3 py-2 text-right">{b.label}</Th>)}<Th className="px-4 py-2 text-right sm:px-5">Kul</Th></Tr>
                  </THead>
                  <TBody className="divide-y divide-slate-100">
                    {byRoute.map((x) => {
                      const id = routesQ.data?.find((rt) => rt.name === x.name)?.id;
                      return (
                        <Tr key={x.name} className={cn(id && 'cursor-pointer hover:bg-slate-50/80')} onClick={() => id && setRouteId(id)}>
                          <Td className="px-4 py-2.5 font-semibold text-slate-900 sm:px-5">{x.name}</Td>
                          <Td className="px-3 py-2.5 text-right tabular-nums">{x.customers}</Td>
                          {BUCKETS.map((b) => <Td key={b.k} className={cn('px-3 py-2.5 text-right tabular-nums', x.ageing[b.k] ? 'text-slate-800' : 'text-slate-300')}>{x.ageing[b.k] ? money(x.ageing[b.k]) : '—'}</Td>)}
                          <Td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900 sm:px-5">{money(x.balance)}</Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            </Panel>
          )}
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {!r ? <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
              : !r.customers.length ? <Empty icon={<CheckCircle2 className="h-5 w-5" />} text={overdueOnly ? 'Kisi ka udhaar purana nahi.' : 'Is filter me kisi par udhaar nahi.'} />
                : <>
                  <div className="hidden overflow-x-auto md:block">
                    <Table minWidth="54rem" className="[&_table]:text-[0.8125rem]">
                      <THead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                        <Tr>
                          <Th className="px-4 py-2 sm:px-5">Customer</Th><Th className="px-3 py-2">Route</Th><Th className="px-3 py-2 text-right">Udhaar</Th>
                          <Th className="px-3 py-2">Kitna purana</Th><Th className="px-3 py-2">Pichli payment</Th><Th className="px-4 py-2 text-right sm:px-5" />
                        </Tr>
                      </THead>
                      <TBody className="divide-y divide-slate-100">
                        {r.customers.map((row) => (
                          <Tr key={row.customer.id} className={cn('hover:bg-slate-50/80', row.overdue && 'bg-rose-50/30')}>
                            <Td className="max-w-[16rem] px-4 py-2.5 sm:px-5">
                              <div className="truncate font-semibold text-slate-900">{partyName(row.customer)}</div>
                              <div className="truncate text-[0.75rem] text-slate-500">{[partySub(row.customer), row.customer.phone].filter(Boolean).join(' · ')}</div>
                            </Td>
                            <Td className="px-3 py-2.5 text-slate-700">{row.routeName ?? '—'}</Td>
                            <Td className="px-3 py-2.5 text-right tabular-nums">
                              <div className="font-semibold text-slate-900">{money(row.balance)}</div>
                              {row.customer.creditLimit > 0 && row.balance > row.customer.creditLimit && <div className="text-[0.6875rem] text-rose-600">had {rs(row.customer.creditLimit)} se upar</div>}
                              {row.pendingCollected > 0 && <div className="text-[0.6875rem] text-amber-700">{rs(row.pendingCollected)} verify baqi</div>}
                            </Td>
                            <Td className="px-3 py-2.5"><AgeBar row={row} /></Td>
                            <Td className="px-3 py-2.5 text-[0.75rem] text-slate-600">{row.lastPaymentAt ? <>{dayLabel(row.lastPaymentAt)} · {rs(row.lastPaymentAmount ?? 0)}</> : 'Kabhi nahi'}</Td>
                            <Td className="px-4 py-2.5 sm:px-5">
                              <div className="flex items-center justify-end gap-1.5">
                                <WaButton row={row} shop={shop} />
                                {canCollect && <Button size="sm" variant="secondary" onClick={() => setCollectFor(row)}>Paisa mila</Button>}
                              </div>
                            </Td>
                          </Tr>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                  <ul className="divide-y divide-slate-100 md:hidden">
                    {r.customers.map((row) => (
                      <li key={row.customer.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate text-[0.875rem] font-semibold text-slate-900">{partyName(row.customer)}</span>
                            <span className="block truncate text-[0.75rem] text-slate-500">{row.routeName ?? '—'} · {row.customer.phone ?? ''}</span>
                          </span>
                          <span className="shrink-0 text-right text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(row.balance)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <AgeBar row={row} />
                          <div className="flex shrink-0 items-center gap-1.5">
                            <WaButton row={row} shop={shop} />
                            {canCollect && <Button size="sm" variant="secondary" onClick={() => setCollectFor(row)}>Paisa mila</Button>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>}
          </section>
        </div>
      )}

      {tab === 'verify' && (
        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {pendQ.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            : !pending.length ? <Empty icon={<BadgeCheck className="h-5 w-5" />} text="Koi recovery verify ke liye baqi nahi. Booker ya delivery wale ki recovery yahan aayegi." />
              : <>
                <ul className="divide-y divide-slate-100">
                  <li className="flex items-center gap-3 px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400 sm:px-5">
                    {canVerify && <Checkbox aria-label="Sab chunein" checked={pending.every((c) => picked.has(c.id))} onChange={(e) => setPicked(e.target.checked ? new Set(pending.map((c) => c.id)) : new Set())} />}
                    <span className="flex-1">Customer · kis ne liya</span><span>Amount</span>
                  </li>
                  {pending.map((c) => (
                    <li key={c.id} className={cn('flex items-center gap-3 px-4 py-2.5 sm:px-5', picked.has(c.id) && 'bg-brand-50/40')}>
                      {canVerify && <Checkbox aria-label={partyName(c.customer)} checked={picked.has(c.id)} onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.875rem] font-semibold text-slate-900">{partyName(c.customer)}</span>
                        <span className="block truncate text-[0.75rem] text-slate-500">{c.collectedByName ?? '—'} · {dayTime(c.collectedAt)} · {METHOD_LABEL[c.method]}{c.reference ? ` · ${c.reference}` : ''}{c.kind === 'INVOICE_CASH' && c.saleNumber ? ` · ${c.saleNumber}` : ''}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[0.9375rem] font-bold tabular-nums text-slate-900">{money(c.amount)}</span>
                        {c.customer && <span className="block text-[0.6875rem] text-slate-500">udhaar {rs(c.customer.balance)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                {canVerify && picked.size > 0 && (
                  <BulkBar>
                    <span className="text-[0.8125rem] font-semibold">{picked.size} chune · {money(pickedPending.reduce((a, c) => a + c.amount, 0))}</span>
                    <span className="flex-1" />
                    <Button size="sm" variant="success" loading={verify.isPending} leftIcon={<BadgeCheck className="h-4 w-4" />} onClick={() => verify.mutate([...picked])}>Verify (V)</Button>
                    <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setRejecting(true)}>Reject</Button>
                    <button type="button" onClick={() => setPicked(new Set())} aria-label="Chunna khatam" className="rounded-lg p-1.5 text-white/70 hover:bg-white/10"><X className="h-4 w-4" /></button>
                  </BulkBar>
                )}
                {!canVerify && <p className="px-5 pb-4 text-[0.8125rem] text-slate-500">Verify sirf manager ya malik kar sakta hai.</p>}
              </>}
        </section>
      )}

      {tab === 'history' && (
        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {!histQ.data ? <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            : !histQ.data.collections.length ? <Empty icon={<History className="h-5 w-5" />} text="Abhi koi recovery nahi." />
              : (
                <div className="overflow-x-auto">
                  <Table minWidth="44rem" className="[&_table]:text-[0.8125rem]">
                    <THead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                      <Tr><Th className="px-4 py-2 sm:px-5">Customer</Th><Th className="px-3 py-2">Kis ne · kab</Th><Th className="px-3 py-2">Type</Th><Th className="px-3 py-2 text-right">Amount</Th><Th className="px-4 py-2 sm:px-5">Halat</Th></Tr>
                    </THead>
                    <TBody className="divide-y divide-slate-100">
                      {histQ.data.collections.map((c) => (
                        <Tr key={c.id}>
                          <Td className="max-w-[16rem] px-4 py-2.5 sm:px-5"><div className="truncate font-semibold text-slate-900">{partyName(c.customer)}</div><div className="truncate text-[0.75rem] text-slate-500">{partySub(c.customer)}</div></Td>
                          <Td className="px-3 py-2.5 text-[0.75rem] text-slate-600">{c.collectedByName ?? '—'}<div>{dayTime(c.collectedAt)}</div></Td>
                          <Td className="px-3 py-2.5 text-[0.75rem] text-slate-600">{c.kind === 'INVOICE_CASH' ? `Invoice ${c.saleNumber ?? ''}` : 'Purana udhaar'} · {METHOD_LABEL[c.method]}</Td>
                          <Td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{money(c.amount)}</Td>
                          <Td className="px-4 py-2.5 sm:px-5"><Pill tone={COLLECTION_STATUS[c.status].tone}>{COLLECTION_STATUS[c.status].label}</Pill>
                            {c.rejectReason && <div className="mt-0.5 text-[0.6875rem] text-rose-600">{c.rejectReason}</div>}
                            {c.verifiedByName && c.status === 'VERIFIED' && <div className="mt-0.5 text-[0.6875rem] text-slate-500">{c.verifiedByName}</div>}</Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
        </section>
      )}

      {collectFor && <CollectModal row={collectFor === 'pick' ? null : collectFor} rows={r?.customers ?? []} onClose={() => setCollectFor(null)} />}
      {rejecting && <RejectModal count={picked.size} busy={reject.isPending} onClose={() => setRejecting(false)} onReject={(reason) => reject.mutate({ ids: [...picked], reason })} />}
      {sheetAsk && (
        <Modal open onClose={() => setSheetAsk(false)} size="sm" title="Recovery sheet" description="Kis route ki sheet print karein?">
          <ul className="divide-y divide-slate-100">
            {(routesQ.data ?? []).map((rt) => (
              <li key={rt.id}>
                <button type="button" onClick={() => void printSheet(rt.id)} className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-slate-50">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="min-w-0 flex-1"><span className="block text-[0.875rem] font-semibold text-slate-900">{rt.name}</span><span className="block truncate text-[0.75rem] text-slate-500">{rt.area}</span></span>
                  <Printer className="h-4 w-4 text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
      {remindAll && (overdueQ.data
        ? <ReminderQueue rows={overdueQ.data.customers} shop={shop} onClose={() => setRemindAll(false)} />
        : <ReminderLoading onClose={() => setRemindAll(false)} />)}
    </PageShell>
  );
}

function AgeBar({ row }: { row: RecoveryRow }) {
  const total = row.balance > 0 ? BUCKETS.reduce((a, b) => a + row.ageing[b.k], 0) || row.balance : 1;
  return (
    <div className="min-w-[8rem]">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
        {BUCKETS.map((b) => row.ageing[b.k] > 0 && <span key={b.k} title={`${b.label}: ${rs(row.ageing[b.k])}`} style={{ width: `${(row.ageing[b.k] / total) * 100}%`, background: b.color }} />)}
      </div>
      <div className={cn('mt-1 text-[0.6875rem]', row.overdue ? 'font-semibold text-rose-600' : 'text-slate-500')}>
        {row.dueDays != null ? `${row.dueDays} din purana` : '—'}{row.creditDays ? ` · had ${row.creditDays} din` : ''}
      </div>
    </div>
  );
}

function CollectModal({ row, rows, onClose }: { row: RecoveryRow | null; rows: RecoveryRow[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState(row?.customer.id ?? '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<MoneyMethod>('CASH');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [clientRef] = useState(() => crypto.randomUUID?.() ?? String(Date.now()));
  const cur = rows.find((x) => x.customer.id === customerId) ?? row;
  const save = useMutation({
    mutationFn: () => {
      if (!customerId) throw new Error('Customer chunein');
      if (!(Number(amount) > 0)) throw new Error('Amount likhein');
      return distributionApi.collect({ clientRef, customerId, amount: Number(amount), method, reference: reference.trim() || undefined, note: note.trim() || undefined });
    },
    onSuccess: (r) => {
      toast.success(r.collection.status === 'VERIFIED' ? 'Paisa khata me jama ho gaya' : 'Recovery save — verify ke baad khata me jayegi');
      qc.invalidateQueries({ queryKey: [DIST_KEY] });
      onClose();
    },
    onError: (e) => toast.error(distError(e, 'Save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Paisa mila" description="Office me ya field se aaya purana udhaar"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-3">
        {row ? (
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="text-[0.875rem] font-semibold text-slate-900">{partyName(row.customer)}</div>
            <div className="text-[0.75rem] text-slate-500">Udhaar {rs(row.balance)}{row.dueDays != null ? ` · ${row.dueDays} din purana` : ''}</div>
          </div>
        ) : (
          <Select label="Customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}
            options={[{ value: '', label: 'Chunein' }, ...rows.map((x) => ({ value: x.customer.id, label: `${partyName(x.customer)} — ${rs(x.balance)}` }))]} />
        )}
        <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
          <Input label="Amount" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            hint={cur ? <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => setAmount(String(cur.balance))}>Poora {rs(cur.balance)}</button> : undefined} />
          <Select label="Tareeqa" value={method} onChange={(e) => setMethod(e.target.value as MoneyMethod)} options={METHODS.map((m) => ({ value: m, label: METHOD_LABEL[m] }))} />
        </div>
        {method !== 'CASH' && <Input label="Reference" placeholder="Transaction ID / cheque no." value={reference} onChange={(e) => setReference(e.target.value)} />}
        <Input label="Note" placeholder="Zaroori nahi" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}

function RejectModal({ count, busy, onClose, onReject }: { count: number; busy: boolean; onClose: () => void; onReject: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open onClose={onClose} size="sm" title={`${count} recovery reject karein?`} description="Reject recovery khata me nahi jati. Wajah collector ko dikhegi."
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant="danger" loading={busy} onClick={() => onReject(reason.trim())}>Reject</Button></>}>
      <Input label="Wajah" autoFocus placeholder="Misal: paisa jama nahi hua" value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>
  );
}

/** WhatsApp reminder for one customer; greyed out without a phone number. */
function WaButton({ row, shop }: { row: RecoveryRow; shop: string }) {
  const href = row.balance > 0 ? reminderLink(row.customer, row.balance, row.dueDays, shop) : null;
  const cls = 'flex h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[0.75rem] font-semibold';
  if (!href) {
    return <span title="Phone number nahi" className={cn(cls, 'cursor-not-allowed text-slate-300')}><MessageCircle className="h-4 w-4" /><span className="hidden lg:inline">WhatsApp</span></span>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title="WhatsApp yaad-dehani" aria-label="WhatsApp yaad-dehani"
      className={cn(cls, 'bg-success-50 text-success-700 hover:bg-success-100')}>
      <MessageCircle className="h-4 w-4" /><span className="hidden lg:inline">Yaad-dehani</span>
    </a>
  );
}

function ReminderLoading({ onClose }: { onClose: () => void }) {
  return (
    <Modal open onClose={onClose} size="md" title="Sab overdue ko WhatsApp">
      <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
    </Modal>
  );
}
