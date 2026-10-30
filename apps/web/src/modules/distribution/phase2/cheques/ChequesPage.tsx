/**
 * Cheque register (PDC): cheques taken from customers, by the date written
 * on them. Deposit, clear, or bounce (which takes the payment back off the
 * khata with a note). A cheque's payment reaches the khata when its
 * collection is verified on Recoveries.
 *
 * Keys: 1-5 tabs.
 */

import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Banknote, CalendarClock, CheckCircle2, Landmark, RefreshCw, XCircle } from 'lucide-react';
import {
  Button, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Table, TBody, Td, Th, THead, Tr, ViewTabs, heroIconButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { isDialogOpen } from '@core/lib/shortcuts';
import { DIST_KEY, distError } from '../../api/distribution.api';
import { CHEQUE_STATUS_LABEL, phase2Api, type ChequeRow, type ChequeStatus } from '../../api/phase2.api';
import { DistributionGate } from '../../components/DistributionGate';
import { Empty, Pill } from '../../components/parts';
import { useMoney } from '../../hooks/useDistribution';
import { COLLECTION_STATUS, dayYearLabel, partyName, partySub, rs, typingInField, type Tone } from '../../lib/meta';
import { useDebounced } from '../../setup/shared';

const KEY = [DIST_KEY, 'cheques'] as const;
type Tab = 'due' | 'open' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'due', label: 'Is hafte' }, { id: 'open', label: 'Sab khule' }, { id: 'DEPOSITED', label: 'Bank me' }, { id: 'CLEARED', label: 'Clear' }, { id: 'BOUNCED', label: 'Bounce' },
];
const STATUS_TONE: Record<ChequeStatus, Tone> = { RECEIVED: 'amber', DEPOSITED: 'blue', CLEARED: 'green', BOUNCED: 'rose', CANCELLED: 'slate' };

export default function ChequesPage() {
  return <DistributionGate><Cheques /></DistributionGate>;
}

function Cheques() {
  const qc = useQueryClient();
  const money = useMoney();
  const [tab, setTab] = useState<Tab>('due');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [bouncing, setBouncing] = useState<ChequeRow | null>(null);
  const s = useDebounced(search.trim(), 300);
  useEffect(() => setPage(1), [tab, s]);

  const params = tab === 'due' ? { due: 'week' as const } : tab === 'open' ? { status: 'RECEIVED,DEPOSITED' } : { status: tab };
  const q = useQuery({ queryKey: [...KEY, tab, s, page], queryFn: () => phase2Api.cheques({ ...params, search: s || undefined, page, limit: 50 }), placeholderData: keepPreviousData });
  const rows = q.data?.cheques ?? [];
  const totals = q.data?.totals ?? {};
  const due = q.data?.due;

  const done = (msg: string) => () => { toast.success(msg); qc.invalidateQueries({ queryKey: KEY }); qc.invalidateQueries({ queryKey: [DIST_KEY, 'collections'] }); };
  const deposit = useMutation({ mutationFn: (id: string) => phase2Api.depositCheque(id), onSuccess: done('Bank me jama likh diya'), onError: (e) => toast.error(distError(e)) });
  const clear = useMutation({ mutationFn: (id: string) => phase2Api.clearCheque(id), onSuccess: done('Cheque clear'), onError: (e) => toast.error(distError(e, 'Clear nahi hua')) });
  const cancel = useMutation({ mutationFn: (id: string) => phase2Api.cancelCheque(id), onSuccess: done('Cheque cancel'), onError: (e) => toast.error(distError(e)) });
  const bounce = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => phase2Api.bounceCheque(id, reason),
    onSuccess: () => { setBouncing(null); done('Bounce likh diya — khata me wapas chadh gaya')(); },
    onError: (e) => toast.error(distError(e, 'Bounce nahi hua')),
  });
  const busy = deposit.isPending || clear.isPending || cancel.isPending;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingInField() || isDialogOpen()) return;
      if (/^[1-5]$/.test(e.key)) setTab(TABS[Number(e.key) - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <PageShell>
      <PageHero
        back="/distribution" backLabel="Distribution"
        title="Cheques"
        chip={<><Landmark /> PDC register</>}
        meta="Customers ke cheque — date aane par bank me jama, clear ya bounce. Bounce par payment khate se wapas."
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<button type="button" onClick={() => void q.refetch()} title="Refresh" aria-label="Taaza karein" className={heroIconButton}><RefreshCw className={cn('h-4 w-4', q.isFetching && 'animate-spin')} /></button>}
      />

      <KpiRow>
        <KpiCard icon={CalendarClock} color="#d97706" label="Aaj tak jama karne wale" value={money(due?.today.amount ?? 0)} hint={`${due?.today.count ?? 0} cheques`} onClick={() => setTab('due')} active={tab === 'due'} />
        <KpiCard icon={CalendarClock} color="#2563eb" label="Is hafte" value={money(due?.week.amount ?? 0)} hint={`${due?.week.count ?? 0} cheques`} onClick={() => setTab('due')} />
        <KpiCard icon={Banknote} color="#0891b2" label="Bank me (clear baqi)" value={money(totals.DEPOSITED?.amount ?? 0)} hint={`${totals.DEPOSITED?.count ?? 0} cheques`} onClick={() => setTab('DEPOSITED')} active={tab === 'DEPOSITED'} />
        <KpiCard icon={AlertTriangle} color="#e11d48" label="Bounce" value={money(totals.BOUNCED?.amount ?? 0)} hint={`${totals.BOUNCED?.count ?? 0} cheques`} onClick={() => setTab('BOUNCED')} active={tab === 'BOUNCED'} />
      </KpiRow>

      <ViewTabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ id: t.id, label: t.label, count: t.id === tab ? q.data?.total ?? null : null }))}
        right={<div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-[0.75rem] text-slate-500 lg:inline-flex"><Kbd>1</Kbd>-<Kbd>5</Kbd> tabs</span>
          <SearchField value={search} onChange={setSearch} placeholder="Cheque no. ya bank" />
        </div>} />

      <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {q.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          : !rows.length ? <Empty icon={<Landmark className="h-5 w-5" />} text="Is filter me koi cheque nahi. Cheque Recoveries me 'Cheque' chun kar ya phone se recovery me likha jata hai." />
            : <div className="overflow-x-auto">
              <Table minWidth="58rem" className="[&_table]:text-[0.8125rem]">
                <THead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                  <Tr>
                    <Th className="px-4 py-2">Customer</Th>
                    <Th className="px-3 py-2">Bank · Cheque</Th>
                    <Th className="px-3 py-2">Cheque date</Th>
                    <Th className="px-3 py-2 text-right">Amount</Th>
                    <Th className="px-3 py-2">Halat</Th>
                    <Th className="px-3 py-2">Collection</Th>
                    <Th className="px-4 py-2" />
                  </Tr>
                </THead>
                <TBody className="divide-y divide-slate-100">
                  {rows.map((c) => {
                    const open = c.status === 'RECEIVED' || c.status === 'DEPOSITED';
                    const col = c.collectionStatus ? COLLECTION_STATUS[c.collectionStatus as keyof typeof COLLECTION_STATUS] : null;
                    return (
                      <Tr key={c.id}>
                        <Td className="max-w-[14rem] px-4 py-2"><div className="truncate font-medium text-slate-900">{partyName(c.customer)}</div><div className="truncate text-[0.75rem] text-slate-500">{partySub(c.customer)}</div></Td>
                        <Td className="px-3 py-2"><div className="text-slate-900">{c.bankName}</div><div className="font-mono text-[0.75rem] text-slate-500">#{c.chequeNo}</div></Td>
                        <Td className="whitespace-nowrap px-3 py-2">
                          <div className="text-slate-900">{dayYearLabel(c.chequeDate)}</div>
                          <div className="flex gap-1">{c.postDated && <Pill tone="violet">PDC</Pill>}{c.overdue && <Pill tone="rose">Date guzar gayi</Pill>}</div>
                        </Td>
                        <Td className="px-3 py-2 text-right font-semibold tabular-nums">{money(c.amount)}</Td>
                        <Td className="px-3 py-2"><Pill tone={STATUS_TONE[c.status]}>{CHEQUE_STATUS_LABEL[c.status]}</Pill>
                          {c.bounceReason && <div className="mt-0.5 max-w-[10rem] truncate text-[0.6875rem] text-rose-600">{c.bounceReason}</div>}</Td>
                        <Td className="px-3 py-2">{col ? <Pill tone={col.tone}>{col.label}</Pill> : <span className="text-slate-400">—</span>}</Td>
                        <Td className="px-4 py-2 text-right">
                          {open && <span className="inline-flex flex-wrap justify-end gap-1.5">
                            {c.status === 'RECEIVED' && <Button size="sm" variant="secondary" disabled={busy} onClick={() => deposit.mutate(c.id)}>Deposit</Button>}
                            <Button size="sm" variant="secondary" disabled={busy} leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => clear.mutate(c.id)}>Clear</Button>
                            <Button size="sm" variant="secondary" disabled={busy} leftIcon={<XCircle className="h-3.5 w-3.5" />} onClick={() => setBouncing(c)}>Bounce</Button>
                            {c.status === 'RECEIVED' && c.collectionStatus !== 'VERIFIED' && <Button size="sm" variant="ghost" disabled={busy} onClick={() => cancel.mutate(c.id)}>Cancel</Button>}
                          </span>}
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
              {(q.data?.total ?? 0) > 50 && (
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[0.8125rem] text-slate-600">
                  <span>{(page - 1) * 50 + 1}–{Math.min(page * 50, q.data!.total)} / {q.data!.total}</span>
                  <span className="flex gap-2">
                    <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                    <Button size="sm" variant="secondary" disabled={page * 50 >= q.data!.total} onClick={() => setPage(page + 1)}>Next</Button>
                  </span>
                </div>
              )}
            </div>}
      </section>

      {bouncing && <BounceModal cheque={bouncing} busy={bounce.isPending} onClose={() => setBouncing(null)} onSubmit={(reason) => bounce.mutate({ id: bouncing.id, reason })} />}
    </PageShell>
  );
}

function BounceModal({ cheque, busy, onClose, onSubmit }: { cheque: ChequeRow; busy: boolean; onClose: () => void; onSubmit: (reason?: string) => void }) {
  const [reason, setReason] = useState('');
  const verified = cheque.collectionStatus === 'VERIFIED';
  return (
    <Modal open onClose={onClose} size="sm" title={`Cheque #${cheque.chequeNo} bounce`} description={`${partyName(cheque.customer)} · ${cheque.bankName} · ${rs(cheque.amount)}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" loading={busy} onClick={() => onSubmit(reason.trim() || undefined)}>Bounce likhein</Button></>}>
      <div className="space-y-3">
        <p className={cn('rounded-xl px-3 py-2 text-[0.8125rem]', verified ? 'bg-rose-50 text-rose-800' : 'bg-slate-50 text-slate-700')}>
          {verified ? `Payment khate se wapas — ${rs(cheque.amount)} udhaar dobara chadh jayega (note ke sath).` : 'Is cheque ki collection abhi verify nahi hui thi — woh reject ho jayegi, khata nahi badlega.'}
        </p>
        <Input autoFocus label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Account me paise nahi (insufficient funds)" />
      </div>
    </Modal>
  );
}
