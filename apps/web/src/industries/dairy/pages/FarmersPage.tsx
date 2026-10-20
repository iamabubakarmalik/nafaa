/**
 * Gawalas: the shop's milk suppliers. Rate per litre and fat bonus, what
 * the shop owes each one, and weekly / monthly payment from the drawer.
 * A gawala is switched off, never deleted; slips and the account stay.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, GraduationCap, ListChecks, Milk, Plus, PowerOff, Wallet, Warehouse } from 'lucide-react';
import {
  FilterBar, FilterChip, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { farmersApi, type DairyFarmer, type FarmerPayInput } from '../api/farmers.api';
import { FarmerFormModal } from '../components/FarmerFormModal';
import { FarmerPayModal } from '../components/FarmerPayModal';
import { Empty, ListCard, ListLoading, Pill } from '../components/ui';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { CYCLE, DAIRY_KEYS, MONEY_KEYS, errorText, liters, shortDate } from '../lib/meta';

type Tab = 'active' | 'owed' | 'off' | 'all';
const TABS: Array<{ id: Tab; label: string; icon: typeof Milk }> = [
  { id: 'active', label: 'Chalu', icon: Milk },
  { id: 'owed', label: 'Dena hai', icon: Wallet },
  { id: 'off', label: 'Band', icon: PowerOff },
  { id: 'all', label: 'Sab', icon: ListChecks },
];
const inTab = (f: DairyFarmer, t: Tab) => (t === 'all' ? true : t === 'active' ? f.isActive : t === 'off' ? !f.isActive : f.currentBalance > 0.009);

export default function FarmersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { cost: money } = useMasked();
  const canEdit = usePermission(PERMISSIONS.SUPPLIERS_EDIT);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [form, setForm] = useState<DairyFarmer | 'new' | null>(null);
  const [paying, setPaying] = useState<DairyFarmer | null>(null);

  const listQ = useQuery({ queryKey: [DAIRY_KEYS.farmers, q], queryFn: () => farmersApi.all({ search: q || undefined }) });
  const totalsQ = useQuery({ queryKey: [DAIRY_KEYS.farmers, 'totals'], queryFn: () => farmersApi.totals() });
  const all = useMemo(() => listQ.data ?? [], [listQ.data]);
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, all.filter((f) => inTab(f, t.id)).length])) as Record<Tab, number>, [all]);
  const rows = all.filter((f) => inTab(f, tab));
  const t = totalsQ.data;
  usePageKeys(searchRef, canEdit ? { n: () => setForm('new') } : {});

  const pay = useMutation({
    mutationFn: ({ f, v }: { f: DairyFarmer; v: FarmerPayInput }) => farmersApi.payment(f.id, v),
    onSuccess: () => { MONEY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); qc.invalidateQueries({ queryKey: ['cash-register'] }); setPaying(null); toast.success('Payment likh di'); },
    onError: (e) => toast.error(errorText(e, 'Payment save nahi hui')),
  });

  const exportCsv = () => {
    if (!rows.length) { toast.error('Is filter me koi gawala nahi'); return; }
    downloadCsv('gawale.csv', [
      ['Number', 'Naam', 'Phone', 'Gaon', 'Rate', 'Fat bonus', 'Payment', 'Kul doodh (L)', 'Dena hai', 'Aakhri doodh'],
      ...rows.map((f) => [f.farmerNumber, f.name, f.phone, f.village, f.ratePerLiter, f.fatBonusRate, CYCLE[f.paymentCycle], f.totalSupplied, f.currentBalance, f.lastSupplyDate?.slice(0, 10)]),
    ]);
  };
  const printDoc = (): PrintDoc => ({
    title: 'Gawalon ka hisaab', subtitle: TABS.find((x) => x.id === tab)?.label,
    meta: [['Gawale', String(rows.length)], ['Dena hai', money(rows.reduce((s, f) => s + Math.max(f.currentBalance, 0), 0))]],
    sections: [{
      kind: 'table', title: 'Gawale',
      columns: [{ label: 'Gawala' }, { label: 'Gaon', wideOnly: true }, { label: 'Rate' }, { label: 'Dena hai', align: 'right' }],
      rows: rows.map((f) => [`${f.name} (${f.farmerNumber})`, f.village ?? '', String(f.ratePerLiter), money(f.currentBalance)]),
    }],
  });

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Gawale — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#16a34a', title: 'Naya gawala', text: 'Naam, phone, gaon aur ek liter ka rate. Fat zyada ho to har point par bonus — collection me khud lagta hai.' },
            { icon: Warehouse, color: '#2563eb', title: 'Doodh aaya', text: '"Doodh ki entry" page par subah aur shaam ka doodh likhein — stock me jata hai aur gawale ka hisaab barhta hai.' },
            { icon: Wallet, color: '#d97706', title: 'Payment', text: 'Hafte ya mahine baad "Payment" dabayein — galle se cash ya bank / JazzCash account se. Purani parchiyan pehle ada hoti hain.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya gawala'], ['G', 'guide']]} />
      )}

      <PageHero title="Gawale" busy={listQ.isFetching && !listQ.isLoading} loading={listQ.isLoading || !t}
        meta="Doodh dene wale — rate, fat bonus aur kitna dena hai"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/dairy/supplies" className={heroButton}><Warehouse className="h-4 w-4" />Doodh ki entry</Link>
          {canEdit && <button type="button" onClick={() => setForm('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya gawala</button>}
        </>}
        stats={[
          { label: 'Dena hai', value: money(t?.totalPayable ?? 0) },
          { label: 'Chalu gawale', value: String(t?.activeFarmers ?? 0) },
          { label: 'Kul doodh aaya', value: liters(t?.lifetimeSupplied ?? 0) },
        ]} />

      <KpiRow cols={4}>
        {!t ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Milk} color="#0ea5e9" label="Chalu" value={counts.active} onClick={() => setTab('active')} active={tab === 'active'} />
            <KpiCard icon={Wallet} color="#e11d48" label="Dena hai" value={counts.owed} hint={money(t.totalPayable)} onClick={() => setTab('owed')} active={tab === 'owed'} />
            <KpiCard icon={Wallet} color="#16a34a" label="Ab tak diya" value={money(t.lifetimePaid)} />
            <KpiCard icon={PowerOff} color="#64748b" label="Band" value={counts.off} onClick={() => setTab('off')} active={tab === 'off'} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, number, phone, CNIC ya gaon…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined} onClear={() => setSearch('')} />

      <ViewTabs value={tab} onChange={setTab} hint="Gawale par click kar ke parchiyan aur payment dekhein" tabs={TABS.map((x) => ({ id: x.id, label: x.label, icon: x.icon, count: listQ.data ? counts[x.id] : null }))} />

      <ListCard>
        {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
          <Empty icon={Milk} title={search || tab !== 'all' ? 'Is filter me koi gawala nahi' : 'Abhi koi gawala nahi'} text="Jo log dukaan ko doodh dete hain unhe yahan jorein."
            action={canEdit ? <button type="button" onClick={() => setForm('new')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg"><Plus className="h-4 w-4" />Naya gawala</button> : undefined} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((f) => (
              <li key={f.id} className="grid gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_10rem_9rem_9rem_auto] lg:items-center">
                <button type="button" onClick={() => navigate(`/dairy/farmers/${f.id}`)} className="min-w-0 text-left">
                  <p className="truncate font-semibold text-slate-900 hover:underline">{f.name} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{f.farmerNumber}</span></p>
                  <p className="truncate text-[0.75rem] text-slate-500">{[f.phone, f.village].filter(Boolean).join(' · ') || '—'}</p>
                </button>
                <p className="text-[0.8125rem] text-slate-700">{money(f.ratePerLiter)}/L{f.fatBonusRate ? <span className="block text-[0.75rem] text-slate-500">Fat bonus {money(f.fatBonusRate)}/point</span> : null}</p>
                <p className="text-[0.8125rem] text-slate-600">{CYCLE[f.paymentCycle] ?? f.paymentCycle} payment<span className="block text-[0.75rem] text-slate-500">Aakhri doodh {shortDate(f.lastSupplyDate)}</span></p>
                <p className={cn('text-[0.875rem] font-semibold tabular-nums', f.currentBalance > 0.009 ? 'text-rose-700' : 'text-slate-500')}>{f.currentBalance > 0.009 ? `${money(f.currentBalance)} dena` : f.currentBalance < -0.009 ? `${money(-f.currentBalance)} advance diya` : 'Saaf'}</p>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {!f.isActive && <Pill tone="bg-slate-100 text-slate-600 ring-slate-200">Band</Pill>}
                  {canEdit && f.currentBalance > 0.009 && <button type="button" onClick={() => setPaying(f)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-[0.8125rem] font-semibold text-brand-fg"><Wallet className="h-4 w-4" />Payment</button>}
                  {canEdit && <button type="button" onClick={() => setForm(f)} className="inline-flex h-9 items-center rounded-lg px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Badlein</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ListCard>

      {form && <FarmerFormModal farmer={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
      {paying && <FarmerPayModal name={paying.name} due={Math.max(paying.currentBalance, 0)} busy={pay.isPending} onSubmit={(v) => pay.mutate({ f: paying, v })} onClose={() => setPaying(null)} />}
    </PageShell>
  );
}
