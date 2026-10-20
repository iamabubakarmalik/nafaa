/**
 * Nuskhe (prescriptions): every customer's eye power with server-side
 * search, views (chalu, muddat qareeb, purane, band) and type. Expiring
 * ones are the best reason to call a customer back for a new test. From a
 * row: open, make a glasses order, renew, print, WhatsApp.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, CalendarX, Download, FilePlus, FileText, Glasses, GraduationCap, MessageCircle, Printer, RefreshCw, Tag } from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { downloadCsv } from '@core/lib/csv';
import { usePrinter } from '@core/print';
import { prescriptionsApi, type OpticalPrescription, type RxView } from '../api/prescriptions.api';
import { ListCard, ListState, Pager } from '../components/ui';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { OPTICAL_KEYS, RX_TYPES, apiError, dayOnly, daysFrom, powerSummary, rangeParams, rxTypeLabel, waLink } from '../lib/meta';
import { rxDoc } from '../lib/print';

const LIMIT = 30;
const TABS: Array<{ id: RxView; label: string; icon?: typeof FileText }> = [
  { id: 'active', label: 'Chalu', icon: FileText }, { id: 'expiring', label: 'Muddat qareeb' }, { id: 'expired', label: 'Muddat khatam' }, { id: 'inactive', label: 'Band' }, { id: 'all', label: 'Sab' },
];

export default function PrescriptionsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { print } = usePrinter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<RxView>('active');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());
  usePageKeys(searchRef, { n: () => navigate('/optical/prescriptions/new') });
  useEffect(() => { setPage(1); }, [q, range, tab, type]);

  const query = useMemo(() => ({ view: tab, search: q || undefined, type: type || undefined, limit: LIMIT, ...rangeParams(resolveRange(range, 0)) }), [tab, q, type, range]);
  const list = useQuery({ queryKey: [OPTICAL_KEYS.rx, 'page', query, page], queryFn: () => prescriptionsApi.page({ ...query, page }), placeholderData: (p) => p });
  const summary = useQuery({ queryKey: [OPTICAL_KEYS.rx, 'summary'], queryFn: prescriptionsApi.summary });
  const s = summary.data;
  const data = list.data;

  const renew = useMutation({
    mutationFn: (rx: OpticalPrescription) => prescriptionsApi.renew(rx.id),
    onSuccess: (n) => { toast.success(`Naya nuskha ${n.prescriptionNumber} — purana band`); qc.invalidateQueries({ queryKey: [OPTICAL_KEYS.rx] }); navigate(`/optical/prescriptions/${n.id}/edit`); },
    onError: (e) => toast.error(apiError(e, 'Renew nahi hua')),
  });

  const exportCsv = async () => {
    try {
      const all = await prescriptionsApi.page({ ...query, page: 1, limit: 100 });
      if (!all.items.length) { toast.error('Is filter me koi nuskha nahi'); return; }
      downloadCsv('nuskhe.csv', [['Nuskha', 'Date', 'Customer', 'Mobile', 'Type', 'Doctor', 'R SPH', 'R CYL', 'R AXIS', 'R ADD', 'L SPH', 'L CYL', 'L AXIS', 'L ADD', 'PD', 'Muddat'],
        ...all.items.map((r) => [r.prescriptionNumber, r.prescriptionDate.slice(0, 10), r.customerName, r.customerPhone, rxTypeLabel(r.prescriptionType), r.doctorName ?? r.prescribedBy, r.rightSph, r.rightCyl, r.rightAxis, r.rightAdd, r.leftSph, r.leftCyl, r.leftAxis, r.leftAdd, r.pupilDistance, r.expiryDate?.slice(0, 10)])]);
    } catch (e) { toast.error(apiError(e, 'File nahi bani')); }
  };

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Nuskhe — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: FilePlus, color: '#2563eb', title: 'Naya nuskha', text: 'Bahar ke doctor ka nuskha yahan likhein (N). Dukaan ke eye test ka nuskha result se khud banta hai.' },
            { icon: Glasses, color: '#7c3aed', title: 'Chashma order', text: 'Nuskhe se seedha chashma order — number khud aa jata hai.' },
            { icon: CalendarClock, color: '#d97706', title: 'Muddat qareeb', text: 'Jin ka nuskha 60 din me purana ho raha hai unhein WhatsApp karein — naya test, naya chashma.' },
            { icon: RefreshCw, color: '#16a34a', title: 'Renew', text: 'Number wahi rahe to renew — naya number aur nayi muddat, purana band.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya nuskha'], ['G', 'guide']]} />
      )}
      <PageHero title="Nuskhe" chip={<><FileText />{data?.total ?? 0}</>} busy={list.isFetching && !list.isLoading} loading={summary.isLoading}
        meta="Har customer ka aankh ka number"
        actions={<>
          <button type="button" onClick={() => void exportCsv()} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/optical/prescriptions/new" className={heroPrimaryButton}><FilePlus className="h-4 w-4" />Naya nuskha</Link>
        </>}
        stats={[{ label: 'Chalu nuskhe', value: s?.active ?? 0 }, { label: 'Is mahine bane', value: s?.thisMonth ?? 0 }, { label: 'Kul', value: s?.total ?? 0 }]} />

      <KpiRow cols={4}>
        {summary.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={FileText} color="#2563eb" label="Chalu" value={s?.active ?? 0} onClick={() => setTab('active')} active={tab === 'active'} />
            <KpiCard icon={CalendarClock} color="#d97706" label="60 din me khatam" value={s?.expiringSoon ?? 0} hint="Naye test ke liye bulayein" onClick={() => setTab('expiring')} active={tab === 'expiring'} />
            <KpiCard icon={CalendarX} color="#e11d48" label="Muddat khatam" value={s?.expired ?? 0} onClick={() => setTab('expired')} active={tab === 'expired'} />
            <KpiCard icon={FilePlus} color="#16a34a" label="Is mahine" value={s?.thisMonth ?? 0} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Nuskha number, customer, mobile ya doctor…" />}
        chips={q || type || range.preset !== 'all' ? <>
          {q && <FilterChip onRemove={() => setSearch('')}>"{q}"</FilterChip>}
          {type && <FilterChip onRemove={() => setType('')}>{rxTypeLabel(type)}</FilterChip>}
          {range.preset !== 'all' && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>Period</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setType(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); }}>
        <FilterMenu icon={Tag} label="Type" value={type} active={!!type} onChange={setType} options={[{ value: '', label: 'Sab type' }, ...RX_TYPES]} />
        <DateRangeMenu value={range} onChange={setRange} startHour={0} label="Nuskhe ki date" />
      </FilterBar>

      <ViewTabs<RxView> value={tab} onChange={setTab} tabs={TABS} />

      <ListCard>
        <ListState loading={list.isLoading} error={list.isError} empty={!data?.items.length} onRetry={() => void list.refetch()} icon={FileText}
          title={q ? `"${q}" se koi nuskha nahi mila` : 'Is list me koi nuskha nahi'} hint="Bahar ka nuskha likhein ya eye test ke result se banayein."
          actions={<Button onClick={() => navigate('/optical/prescriptions/new')} leftIcon={<FilePlus className="h-4 w-4" />}>Naya nuskha</Button>}>
          {data && (
            <>
              <Table minWidth="58rem">
                <THead><Tr><Th>Nuskha</Th><Th>Customer</Th><Th>Number</Th><Th>Doctor</Th><Th>Muddat</Th><Th align="right" /></Tr></THead>
                <TBody>
                  {data.items.map((rx) => {
                    const d = daysFrom(rx.expiryDate);
                    const wa = waLink(rx.customerPhone, `Assalam o alaikum ${rx.customerName}, aap ki aankh ka number ${dayOnly(rx.prescriptionDate)} ko check hua tha. Naya eye test karwa lein — ham se waqt le lein. Shukriya.`);
                    return (
                      <Tr key={rx.id} interactive onClick={() => navigate(`/optical/prescriptions/${rx.id}`)}>
                        <Td className="whitespace-nowrap"><p className="font-semibold text-slate-900">{rx.prescriptionNumber}</p><p className="text-[0.75rem] text-slate-500">{dayOnly(rx.prescriptionDate)} · {rxTypeLabel(rx.prescriptionType)}</p></Td>
                        <Td><p className="font-medium text-slate-900">{rx.customerName}</p><p className="text-[0.75rem] text-slate-500">{rx.customerPhone ?? '—'}</p></Td>
                        <Td className="max-w-[18rem]"><p className="truncate font-mono text-[0.75rem] text-slate-700">{powerSummary(rx) || '—'}</p>{rx.pupilDistance != null && <p className="text-[0.75rem] text-slate-500">PD {rx.pupilDistance}</p>}</Td>
                        <Td>{rx.doctorName ?? rx.prescribedBy ?? '—'}{rx.clinicName && <p className="text-[0.75rem] text-slate-500">{rx.clinicName}</p>}</Td>
                        <Td className="whitespace-nowrap">
                          {!rx.isActive ? <span className="text-slate-500">Band</span> : d == null ? '—' : d < 0 ? <span className="font-semibold text-rose-600">{-d} din pehle khatam</span> : d <= 60 ? <span className="font-semibold text-amber-700">{d} din baqi</span> : dayOnly(rx.expiryDate)}
                        </Td>
                        <Td align="right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {rx.isActive && (d == null || d >= 0) && <Button size="xs" variant="secondary" leftIcon={<Glasses className="h-3.5 w-3.5" />} onClick={() => navigate(`/optical/lens-orders/new?rx=${rx.id}`)}>Chashma</Button>}
                            {rx.isActive && d != null && d < 30 && <Button size="xs" variant="ghost" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} loading={renew.isPending && renew.variables?.id === rx.id} onClick={() => renew.mutate(rx)}>Renew</Button>}
                            <Button size="xs" variant="ghost" aria-label="Print" onClick={() => void print(rxDoc(rx))}><Printer className="h-3.5 w-3.5" /></Button>
                            {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"><MessageCircle className="h-3.5 w-3.5" /></a>}
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
    </PageShell>
  );
}
