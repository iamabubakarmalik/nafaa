/**
 * Contractor khata: every contractor's live udhaar from the customer khata
 * (the same figures as Khata, day book and reports), how old it is, the
 * limit, and the terms (days, guarantor, cheque). Payments are taken on the
 * customer's khata page.
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Ban, BookOpen, Clock, Download, Edit3, GraduationCap, HardHat, ListChecks, Lock, Plus, RotateCcw, Wallet } from 'lucide-react';
import {
  Button, FilterBar, FilterChip, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { creditAccountsApi, type CreditAccount } from '../api/credit-accounts.api';
import { ContractorFormModal } from '../components/ContractorFormModal';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { errorText, shortDate } from '../lib/meta';

type Linked = CreditAccount & { khataLinked?: boolean };
type Tab = 'owing' | 'over' | 'old' | 'all' | 'stopped';
const TABS: Array<{ id: Tab; label: string; icon: typeof ListChecks; match: (a: Linked) => boolean }> = [
  { id: 'owing', label: 'Udhaar wale', icon: Wallet, match: (a) => a.currentBalance > 0.009 && a.status !== 'CLOSED' },
  { id: 'over', label: 'Had se upar', icon: AlertTriangle, match: (a) => a.creditLimit > 0 && a.currentBalance > a.creditLimit },
  { id: 'old', label: '90 din se purana', icon: Clock, match: (a) => a.ageOver90Days > 0 },
  { id: 'all', label: 'Sab', icon: ListChecks, match: (a) => a.status !== 'CLOSED' },
  { id: 'stopped', label: 'Roka / band', icon: Lock, match: (a) => a.status === 'SUSPENDED' || a.status === 'CLOSED' },
];

export default function CreditAccountsPage() {
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const guide = usePageGuide();
  const canManage = usePermission(PERMISSIONS.KHATA_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('owing');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ account?: Linked } | null>(null);
  const [action, setAction] = useState<{ account: Linked; kind: 'suspend' | 'close' } | null>(null);
  const q = useDebounced(search.trim());

  const { data = [], isLoading, isFetching } = useQuery({ queryKey: ['hardware-contractors', q], queryFn: () => creditAccountsApi.list({ search: q || undefined }) as Promise<Linked[]> });
  usePageKeys(searchRef, canManage ? { n: () => setForm({}) } : {});

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, data.filter(t.match).length])) as Record<Tab, number>, [data]);
  const rows = useMemo(() => data.filter(TABS.find((t) => t.id === tab)!.match), [data, tab]);
  const open = data.filter((a) => a.status !== 'CLOSED');
  const total = open.reduce((s, a) => s + Math.max(a.currentBalance, 0), 0);
  const age = (k: 'age0To30Days' | 'age31To60Days' | 'age61To90Days' | 'ageOver90Days') => open.reduce((s, a) => s + (a[k] || 0), 0);

  const reactivate = useMutation({
    mutationFn: (id: string) => creditAccountsApi.reactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hardware-contractors'] }); toast.success('Udhaar dobara chalu'); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });

  const exportCsv = () => {
    if (!rows.length) { toast.error('Is list me koi thekedar nahi'); return; }
    downloadCsv('thekedar-khata.csv', [
      ['Account', 'Naam', 'Karobar', 'Phone', 'Udhaar', 'Had', '0-30', '31-60', '61-90', '90+', 'Aakhri payment', 'Status'],
      ...rows.map((a) => [a.accountNumber, a.customerName, a.businessName, a.customerPhone, a.currentBalance, a.creditLimit, a.age0To30Days, a.age31To60Days, a.age61To90Days, a.ageOver90Days, a.lastPaymentDate?.slice(0, 10), a.status]),
    ]);
  };
  const printDoc = (): PrintDoc => ({
    title: 'Thekedar khata', subtitle: TABS.find((t) => t.id === tab)!.label,
    meta: [['Kul udhaar', money(total)], ['90 din se purana', money(age('ageOver90Days'))]],
    sections: [{
      kind: 'table', title: 'Thekedar',
      columns: [{ label: 'Naam' }, { label: 'Phone', wideOnly: true }, { label: 'Udhaar', align: 'right' }, { label: '90+', align: 'right', wideOnly: true }],
      rows: rows.map((a) => [a.businessName ? `${a.customerName} (${a.businessName})` : a.customerName, a.customerPhone ?? '', money(a.currentBalance), money(a.ageOver90Days)]),
    }],
  });

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Thekedar khata — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: HardHat, color: '#a16207', title: 'Thekedar jorein', text: 'Customer chunein, udhaar ki had aur din likhein. Had POS par bhi lagti hai.' },
            { icon: Wallet, color: '#2563eb', title: 'Udhaar', text: 'POS par bill "Udhaar" se banayein — ye khud yahan aur Khata me aata hai.' },
            { icon: BookOpen, color: '#16a34a', title: 'Paisa lena', text: '"Paisa lein" se customer ka khata khulta hai — wahan receiving, statement aur WhatsApp yaad dihani.' },
            { icon: Clock, color: '#e11d48', title: 'Purana udhaar', text: '90 din se purana udhaar laal me. Had se upar ho to "Rokein" — naya udhaar band.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya thekedar'], ['G', 'guide']]} />
      )}

      <PageHero title="Thekedar khata" chip={`${counts.owing} par udhaar`} busy={isFetching && !isLoading} loading={isLoading}
        meta="Contractor ka udhaar — customer khate se live"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setForm({})} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya thekedar</button>}
        </>}
        stats={[
          { label: 'Kul udhaar', value: money(total) },
          { label: '90 din se purana', value: money(age('ageOver90Days')) },
          { label: 'Had se upar', value: String(counts.over), hint: 'thekedar' },
        ]} />

      <KpiRow cols={4}>
        {isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Wallet} color="#16a34a" label="0–30 din" value={money(age('age0To30Days'))} />
            <KpiCard icon={Clock} color="#d97706" label="31–60 din" value={money(age('age31To60Days'))} />
            <KpiCard icon={Clock} color="#ea580c" label="61–90 din" value={money(age('age61To90Days'))} />
            <KpiCard icon={AlertTriangle} color="#e11d48" label="90 din se upar" value={money(age('ageOver90Days'))} onClick={() => setTab('old')} active={tab === 'old'} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, karobar, phone, CNIC ya account…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined} onClear={() => setSearch('')} />

      <ViewTabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: counts[t.id] }))} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><HardHat className="h-7 w-7" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{search ? 'Is search me koi thekedar nahi' : 'Is list me koi thekedar nahi'}</h3>
            <p className="mt-1 text-[0.875rem] text-slate-500">Udhaar par maal lene wale thekedar ka khata banayein.</p>
            <button type="button" onClick={() => setForm({})} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg"><Plus className="h-4 w-4" />Naya thekedar</button>
          </div>
        ) : (
          <Table minWidth="56rem">
            <THead><Tr><Th>Thekedar</Th><Th align="right">Udhaar</Th><Th>Had</Th><Th>Purana</Th><Th>Aakhri payment</Th><Th align="right">Kaam</Th></Tr></THead>
            <TBody>
              {rows.map((a) => {
                const pct = a.creditLimit > 0 ? Math.min((a.currentBalance / a.creditLimit) * 100, 100) : 0;
                const over = a.creditLimit > 0 && a.currentBalance > a.creditLimit;
                return (
                  <Tr key={a.id}>
                    <Td>
                      <p className="font-semibold text-slate-900">{a.customerName}{a.status === 'SUSPENDED' && <span className="ml-1.5 rounded bg-rose-100 px-1.5 text-[0.6875rem] font-semibold text-rose-700">Roka hua</span>}{a.status === 'CLOSED' && <span className="ml-1.5 rounded bg-slate-100 px-1.5 text-[0.6875rem] font-semibold text-slate-600">Band</span>}</p>
                      <p className="text-[0.75rem] text-slate-500">{[a.businessName, a.customerPhone, a.accountNumber].filter(Boolean).join(' · ')}</p>
                      {!a.khataLinked && <p className="text-[0.6875rem] font-medium text-amber-700">Customer khate se nahi jura — "Badlein" se customer chunein</p>}
                    </Td>
                    <Td align="right" className={cn('text-[0.9375rem] font-bold tabular-nums', a.currentBalance > 0 ? 'text-slate-900' : 'text-slate-400')}>{money(a.currentBalance)}</Td>
                    <Td>
                      {a.creditLimit > 0 ? (
                        <div className="w-28">
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', over ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} /></div>
                          <p className={cn('mt-0.5 text-[0.6875rem] tabular-nums', over ? 'font-semibold text-rose-600' : 'text-slate-500')}>{money(a.creditLimit)}{a.creditDays ? ` · ${a.creditDays} din` : ''}</p>
                        </div>
                      ) : <span className="text-[0.75rem] text-slate-400">Koi had nahi</span>}
                    </Td>
                    <Td className="text-[0.75rem] tabular-nums">
                      {a.ageOver90Days > 0 ? <span className="font-semibold text-rose-600">90+ : {money(a.ageOver90Days)}</span>
                        : a.age61To90Days > 0 ? <span className="text-orange-600">61–90 : {money(a.age61To90Days)}</span>
                          : a.age31To60Days > 0 ? <span className="text-amber-700">31–60 : {money(a.age31To60Days)}</span> : <span className="text-slate-400">—</span>}
                    </Td>
                    <Td className="text-[0.8125rem] text-slate-600">{a.lastPaymentDate ? shortDate(a.lastPaymentDate) : 'Kabhi nahi'}</Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        {a.customerId && <Link to={`/customers/${a.customerId}`} className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-600 px-2.5 text-[0.75rem] font-semibold text-brand-fg"><BookOpen className="h-3.5 w-3.5" />Paisa lein</Link>}
                        {canManage && <button type="button" title="Badlein" onClick={() => setForm({ account: a })} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Edit3 className="h-4 w-4" /></button>}
                        {!canManage ? null : a.status === 'SUSPENDED' || a.status === 'CLOSED'
                          ? <button type="button" title="Dobara chalu" onClick={() => reactivate.mutate(a.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50"><RotateCcw className="h-4 w-4" /></button>
                          : <button type="button" title="Naya udhaar rokein" onClick={() => setAction({ account: a, kind: 'suspend' })} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Ban className="h-4 w-4" /></button>}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </section>

      {form && <ContractorFormModal account={form.account} onClose={() => setForm(null)} />}
      {action && <StopModal account={action.account} onClose={() => setAction(null)} />}
    </PageShell>
  );
}

function StopModal({ account, onClose }: { account: Linked; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const settled = account.currentBalance <= 0.01;
  const run = useMutation({
    mutationFn: (kind: 'suspend' | 'close') => (kind === 'close' ? creditAccountsApi.close(account.id, reason.trim()) : creditAccountsApi.suspend(account.id, reason.trim())),
    onSuccess: (_, kind) => { qc.invalidateQueries({ queryKey: ['hardware-contractors'] }); toast.success(kind === 'close' ? 'Khata band — record mehfooz' : 'Naya udhaar ruk gaya'); onClose(); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`${account.customerName} — udhaar rokein?`}
      description="Counter par udhaar ki had abhi ke baqi tak aa jayegi — naya udhaar manager PIN ke bagair nahi. Purana hisaab nahi badalta."
      footer={<>
        <Button variant="secondary" onClick={onClose}>Wapas</Button>
        {settled && <Button variant="ghost" loading={run.isPending && run.variables === 'close'} onClick={() => run.mutate('close')}>Khata band</Button>}
        <Button variant="danger" loading={run.isPending && run.variables === 'suspend'} onClick={() => run.mutate('suspend')}>Udhaar rokein</Button>
      </>}>
      <label className="block">
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Wajah</span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Payment late, had se upar…" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-[0.875rem] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
      </label>
    </Modal>
  );
}
