/**
 * Lab: every test order with server-side search, status and period
 * filters. From the row: take the fee (billed as a sale), mark the sample,
 * enter results and print the report. Walk-in lab patients can be ordered
 * here without a doctor visit.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Beaker, CheckCircle2, Download, FlaskConical, GraduationCap, Plus, Printer, TestTube, Timer, Wallet } from 'lucide-react';
import {
  Badge, Button, DateRangeMenu, FilterBar, FilterChip, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import type { FeePayment } from '../api/appointments.api';
import { labOrdersApi, type LabOrderRow } from '../api/lab-orders.api';
import { FeePayModal } from '../components/FeePayModal';
import { LabResultsModal, NewLabOrderModal } from '../components/LabModals';
import { ListCard, ListFailed, ListLoading, Pager } from '../components/ListBits';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { LAB_STATUS, apiError, dateTime, dayBounds, drName, patientLine, r2 } from '../lib/meta';
import { printLabReport } from '../lib/print';

type Tab = 'PENDING' | 'REPORTED' | 'all' | 'CANCELLED';
const LIMIT = 30;

export default function LabOrdersPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canManage = usePermission(PERMISSIONS.CLINIC_RECORDS_MANAGE);
  const canBill = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('PENDING');
  const [search, setSearch] = useState('');
  const [due, setDue] = useState(false);
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [results, setResults] = useState<LabOrderRow | null>(null);
  const [paying, setPaying] = useState<LabOrderRow | null>(null);
  const q = useDebounced(search.trim());
  usePageKeys(searchRef, { n: () => canManage && setAdding(true) });
  useEffect(() => { setPage(1); }, [q, due, range, tab]);

  const params = useMemo(() => {
    const r = resolveRange(range, 0);
    return {
      search: q || undefined, status: tab === 'all' ? undefined : tab, paymentStatus: due ? 'DUE' : undefined, limit: LIMIT,
      ...(r && { from: r.from === 'all' ? undefined : dayBounds(r.from).from, to: dayBounds(r.to).to }),
    };
  }, [q, due, range, tab]);
  const list = useQuery({ queryKey: ['clinic-lab-orders', params, page], queryFn: () => labOrdersApi.page({ ...params, page }), placeholderData: (p) => p, refetchInterval: 60_000 });
  const data = list.data;
  const by = data?.summary.byStatus ?? {};
  const refresh = () => qc.invalidateQueries({ queryKey: ['clinic-lab-orders'] });

  const pay = useMutation({
    mutationFn: (body: FeePayment) => labOrdersApi.addPayment(paying!.id, body),
    onSuccess: (res) => { toast.success(`Bill ${res.sale.saleNumber} ban gaya`); setPaying(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Bill nahi bana')),
  });
  const cancel = useMutation({
    mutationFn: (o: LabOrderRow) => labOrdersApi.updateStatus(o.id, 'CANCELLED'),
    onSuccess: () => { toast.success('Order cancel'); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const exportCsv = async () => {
    try {
      const all = await labOrdersApi.page({ ...params, page: 1, limit: 200 });
      if (!all.items.length) { toast.error('Koi order nahi'); return; }
      downloadCsv('lab-orders.csv', [['Order', 'Tareekh', 'Mareez', 'MR', 'Doctor', 'Test', 'Status', 'Fees', 'Bill bana'],
        ...all.items.map((o) => [o.orderNumber, o.orderedAt.slice(0, 10), o.patient?.fullName, o.patient?.mrn, drName(o.doctor), o.tests.map((t) => `${t.testName}${t.result ? `: ${t.result}` : ''}`).join('; '), LAB_STATUS[o.status].label, o.totalCost, o.paidAmount])]);
    } catch (e) { toast.error(apiError(e, 'File nahi bani')); }
  };

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Lab — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Order', text: 'Visit se doctor test likhta hai; bahar se aaya mareez ho to yahan "Naya order".' },
            { icon: Wallet, color: '#d97706', title: 'Fees', text: 'Rs button se fees — cash, card, do tareeqe ya khata. Har payment bill banti hai.' },
            { icon: Beaker, color: '#7c3aed', title: 'Sample aur result', text: 'Result button: sample liya, har test ka result, unit aur normal range.' },
            { icon: Printer, color: '#16a34a', title: 'Report', text: 'Ghair-mamooli result laal me — A4 report print kar ke mareez ko dein.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya order'], ['G', 'guide']]} />
      )}
      {adding && <NewLabOrderModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); refresh(); }} />}
      {results && <LabResultsModal order={results} patient={results.patient ? { ...results.patient, mrn: results.patient.mrn } : null} doctor={results.doctor} onClose={() => setResults(null)} onSaved={() => { setResults(null); refresh(); }} />}
      {paying && <FeePayModal title={`Lab ${paying.orderNumber}`} description={`${paying.patient?.fullName ?? ''} · baqi ${money(r2(paying.totalCost - paying.paidAmount))}`}
        due={r2(paying.totalCost - paying.paidAmount)} busy={pay.isPending} onClose={() => setPaying(null)} onPay={(b) => pay.mutate(b)} />}

      <PageHero title="Lab" chip={<><TestTube />{data?.total ?? 0}</>} busy={list.isFetching && !list.isLoading} loading={list.isLoading}
        meta="Test, sample, result aur fees"
        actions={<>
          <button type="button" onClick={() => void exportCsv()} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setAdding(true)} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya order</button>}
        </>}
        stats={[
          { label: 'Fees (is filter me)', value: money(data?.summary.fees ?? 0) },
          { label: 'Bill ban gaya', value: money(data?.summary.billed ?? 0) },
          { label: 'Baqi', value: money(data?.summary.due ?? 0) },
        ]} />

      <KpiRow cols={4}>
        {list.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Timer} color="#2563eb" label="Likhe gaye" value={by.ORDERED ?? 0} hint="Sample abhi nahi" onClick={() => setTab('PENDING')} active={tab === 'PENDING'} />
            <KpiCard icon={Beaker} color="#d97706" label="Lab me" value={(by.SAMPLE_COLLECTED ?? 0) + (by.IN_PROGRESS ?? 0)} onClick={() => setTab('PENDING')} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Report tayyar" value={(by.REPORTED ?? 0) + (by.COMPLETED ?? 0)} onClick={() => setTab('REPORTED')} active={tab === 'REPORTED'} />
            <KpiCard icon={Wallet} color="#b45309" label="Fees baqi" value={money(data?.summary.due ?? 0)} onClick={() => setDue((v) => !v)} active={due} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Mareez, MR, order number ya test…" />}
        chips={(due || q) ? <>{due && <FilterChip onRemove={() => setDue(false)}>Fees baqi</FilterChip>}{q && <FilterChip onRemove={() => setSearch('')}>"{q}"</FilterChip>}</> : undefined}
        onClear={() => { setSearch(''); setDue(false); }}>
        <DateRangeMenu value={range} onChange={setRange} startHour={0} />
      </FilterBar>

      <ViewTabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'PENDING', label: 'Baqi', icon: FlaskConical }, { id: 'REPORTED', label: 'Report tayyar' }, { id: 'all', label: 'Sab' }, { id: 'CANCELLED', label: 'Cancel' }]} />

      <ListCard>
        {list.isLoading ? <ListLoading /> : list.isError ? <ListFailed onRetry={() => list.refetch()} /> : !data?.items.length ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><TestTube className="h-7 w-7" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">Is filter me koi order nahi</h3>
            {canManage && <Button className="mt-4" onClick={() => setAdding(true)} leftIcon={<Plus className="h-4 w-4" />}>Naya order</Button>}
          </div>
        ) : (
          <>
            <Table minWidth="60rem">
              <THead><Tr><Th>Order</Th><Th>Mareez</Th><Th>Test</Th><Th>Status</Th><Th align="right">Fees</Th><Th align="right" /></Tr></THead>
              <TBody>
                {data.items.map((o) => {
                  const left = r2(o.totalCost - o.paidAmount);
                  return (
                    <Tr key={o.id}>
                      <Td className="whitespace-nowrap"><p className="font-semibold text-slate-900">{o.orderNumber}</p><p className="text-[0.75rem] text-slate-500">{dateTime(o.orderedAt)}{o.urgency !== 'ROUTINE' && <span className="ml-1 font-semibold text-rose-600">{o.urgency}</span>}</p></Td>
                      <Td>{o.patient ? <Link to={`/clinic/patients/${o.patient.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{patientLine(o.patient)}</Link> : '—'}<p className="text-[0.75rem] text-slate-500">{o.patient?.mrn} · {drName(o.doctor)}</p></Td>
                      <Td className="max-w-xs">{o.tests.map((t) => <span key={t.id} className={t.isAbnormal || t.isCritical ? 'font-semibold text-rose-700' : ''}>{t.testName}{t.result ? `: ${t.result}` : ''}; </span>)}{o.labName && <p className="text-[0.75rem] text-slate-500">{o.labName}</p>}</Td>
                      <Td><Badge variant={LAB_STATUS[o.status].variant}>{LAB_STATUS[o.status].label}</Badge></Td>
                      <Td align="right"><p className="font-semibold">{money(o.totalCost)}</p>{left > 0 && o.status !== 'CANCELLED' && <Badge size="xs" variant="warning">{money(left)} baqi</Badge>}</Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1">
                          {canBill && left > 0 && o.status !== 'CANCELLED' && <Button size="xs" variant="secondary" leftIcon={<Wallet className="h-3.5 w-3.5" />} onClick={() => setPaying(o)}>Fees</Button>}
                          {canManage && o.status !== 'CANCELLED' && <Button size="xs" onClick={() => setResults(o)}>Result</Button>}
                          <Button size="xs" variant="ghost" aria-label="Report print" onClick={() => void printLabReport(o, o.patient ? { ...o.patient } : null, o.doctor)}><Printer className="h-3.5 w-3.5" /></Button>
                          {canManage && o.paidAmount <= 0 && !['CANCELLED', 'REPORTED', 'COMPLETED'].includes(o.status) && <Button size="xs" variant="ghost" onClick={() => cancel.mutate(o)}>Cancel</Button>}
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
      </ListCard>
    </PageShell>
  );
}
