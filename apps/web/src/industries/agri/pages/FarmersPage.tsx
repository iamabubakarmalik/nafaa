/**
 * Farmers: every farmer's live udhaar from the customer khata (the same
 * figures as Khata, the day book and the reports), split into what is due
 * because the season's harvest has passed and what is still within the
 * season. Payments are taken here or on the farmer's khata page.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownUp, Ban, BarChart3, BookOpen, Download, Edit3, GraduationCap, ListChecks, Lock, MapPin, MessageCircle, Plus, RotateCcw, Sprout, Tractor, Wallet,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, type FilterOption,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { useAuthStore } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { farmersApi, type Farmer, type FarmerTab } from '../api/farmers.api';
import { Pager } from '../components/Pager';
import { PayModal } from '../components/PayModal';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { errorText, shortDate, isoDay } from '../lib/meta';

type View = FarmerTab | 'analytics';
type Sort = 'name' | 'owed' | 'due' | 'new' | 'land';

const TABS: Array<{ id: FarmerTab; label: string; icon: typeof ListChecks }> = [
  { id: 'all', label: 'Sab', icon: ListChecks },
  { id: 'owing', label: 'Udhaar wale', icon: Wallet },
  { id: 'due', label: 'Wasooli ka waqt', icon: AlertTriangle },
  { id: 'over', label: 'Had se upar', icon: Ban },
  { id: 'suspended', label: 'Roke hue', icon: Lock },
];
const SORTS: Array<FilterOption<Sort>> = [
  { value: 'name', label: 'Naam' }, { value: 'owed', label: 'Zyada udhaar pehle' }, { value: 'due', label: 'Zyada wasooli pehle' },
  { value: 'new', label: 'Naye pehle' }, { value: 'land', label: 'Zyada zameen pehle' },
];
const FARMERS_KEY = 'agri-farmers';

/** WhatsApp link with a polite reminder of what is owed. */
function reminder(f: Farmer, shop: string, money: (n: number) => string) {
  const phone = f.phone.replace(/\D/g, '').replace(/^0/, '92');
  const due = f.dueNow ?? 0;
  const text = `Assalam o alaikum ${f.fullName} sahab, ${shop} se. Aap ke khate me ${money(f.currentBalance)} baqi hain${due > 0 ? ` (pichle season ke ${money(due)} — katai ho chuki)` : ''}. Meharbani farma kar jald ada kar dein. Shukriya`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export default function FarmersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canManage = usePermission(PERMISSIONS.AGRI_FARMERS_MANAGE);
  const canCollect = usePermission(PERMISSIONS.KHATA_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('all');
  const [sort, setSort] = useState<Sort>('name');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pay, setPay] = useState<Farmer | null>(null);
  const [stop, setStop] = useState<Farmer | null>(null);
  const q = useDebounced(search.trim());
  const tab: FarmerTab = view === 'analytics' ? 'all' : view;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [FARMERS_KEY, 'page', q, tab, sort, page],
    queryFn: () => farmersApi.page({ search: q || undefined, tab, sort, page, limit: 30 }),
    placeholderData: keepPreviousData,
  });
  usePageKeys(searchRef, canManage ? { n: () => navigate('/agri/farmers/new') } : {});
  const rows = data?.items ?? [];
  const s = data?.stats;
  const refresh = () => { qc.invalidateQueries({ queryKey: [FARMERS_KEY] }); qc.invalidateQueries({ queryKey: ['agri-farmers-all'] }); };

  const collect = useMutation({
    mutationFn: (v: { f: Farmer; amount: number; method: string; note: string }) => farmersApi.payment(v.f.id, { amount: v.amount, paymentMethod: v.method, note: v.note || undefined }),
    onSuccess: (_, v) => { refresh(); qc.invalidateQueries({ queryKey: ['customers'] }); toast.success(`${v.f.fullName} se ${money(v.amount)} wasool — khate me likh diya`); setPay(null); },
    onError: (e) => toast.error(errorText(e, 'Wasooli nahi hui')),
  });
  const reactivate = useMutation({
    mutationFn: (id: string) => farmersApi.reactivate(id),
    onSuccess: () => { refresh(); toast.success('Udhaar dobara chalu'); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });

  const setTab = (v: View) => { setView(v); setPage(1); };
  const exportCsv = () => {
    if (!rows.length) { toast.error('Is list me koi farmer nahi'); return; }
    downloadCsv('farmers.csv', [
      ['Number', 'Naam', 'Phone', 'Gaon', 'Zila', 'Acre', 'Fasal', 'Udhaar', 'Wasooli ka waqt', 'Had', 'Aakhri khareed', 'Aakhri payment', 'Status'],
      ...rows.map((f) => [f.farmerNumber, f.fullName, f.phone, f.village, f.district, f.landAreaAcres, f.primaryCrops.join(' / '), f.currentBalance, f.dueNow, f.creditLimit, isoDay(f.lastPurchaseAt), isoDay(f.lastPaymentAt), f.status]),
    ]);
  };
  const printDoc = (): PrintDoc => ({
    title: 'Farmers ka udhaar', subtitle: `${TABS.find((t) => t.id === tab)!.label} · ${s?.season ?? ''}`,
    meta: [['Kul udhaar', money(s?.owed)], ['Wasooli ka waqt', money(s?.dueNow)]],
    sections: [{
      kind: 'table', title: 'Farmers',
      columns: [{ label: 'Naam' }, { label: 'Gaon', wideOnly: true }, { label: 'Phone', wideOnly: true }, { label: 'Udhaar', align: 'right' }, { label: 'Wasooli', align: 'right' }],
      rows: rows.map((f) => [f.fullName, f.village ?? '', f.phone, money(f.currentBalance), money(f.dueNow)]),
    }],
  });

  const shopName = useAuthStore((st) => st.tenant?.name) ?? 'hamari dukaan';
  const chips = search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined;

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Farmers — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Tractor, color: '#65a30d', title: 'Farmer banayein', text: 'Naam, phone, gaon, zameen aur fasal. Is ka customer khata khud ban jata hai (isi phone ka customer ho to wohi jur jata hai).' },
            { icon: Wallet, color: '#2563eb', title: 'Season ka udhaar', text: 'POS par farmer chun kar "Udhaar" se bill banayein. Rabi (Oct–Mar) ka udhaar 31 May tak, Kharif (Apr–Sep) ka 15 Dec tak wapas aata hai.' },
            { icon: AlertTriangle, color: '#e11d48', title: 'Wasooli', text: '"Wasooli ka waqt" tab me wo farmers jin ki katai guzar gayi. "Wasool" se paisa lein — khata, day book aur drawer sab me aata hai.' },
            { icon: Ban, color: '#d97706', title: 'Udhaar rokna', text: 'Rokne se POS par udhaar ki had abhi ke baqi tak aa jati hai — naya udhaar manager PIN ke bagair nahi.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya farmer'], ['G', 'guide']]} />
      )}

      <PageHero title="Farmers" chip={s?.season ?? 'Season'} busy={isFetching && !isLoading} loading={isLoading}
        meta="Udhaar customer khate se live — season ke hisaab se"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <Link to="/agri/farmers/new" className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya farmer</Link>}
        </>}
        stats={[
          { label: 'Kul udhaar', value: money(s?.owed) },
          { label: 'Wasooli ka waqt', value: money(s?.dueNow), hint: 'katai guzar gayi' },
          { label: 'Is season ka', value: money(s?.notDue) },
        ]} />

      <KpiRow cols={5}>
        {isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Tractor} color="#65a30d" label="Farmers" value={s?.farmers ?? 0} onClick={() => setTab('all')} active={view === 'all'} />
            <KpiCard icon={Wallet} color="#2563eb" label="Udhaar wale" value={data?.counts.owing ?? 0} hint={money(s?.owed)} onClick={() => setTab('owing')} active={view === 'owing'} />
            <KpiCard icon={AlertTriangle} color="#e11d48" label="Wasooli ka waqt" value={data?.counts.due ?? 0} hint={money(s?.dueNow)} onClick={() => setTab('due')} active={view === 'due'} />
            <KpiCard icon={Ban} color="#d97706" label="Had se upar" value={data?.counts.over ?? 0} onClick={() => setTab('over')} active={view === 'over'} />
            <KpiCard icon={Sprout} color="#0891b2" label="Kul zameen" value={`${Math.round(s?.acres ?? 0)} acre`} hint={s?.advance ? `Advance ${money(s.advance)}` : undefined} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Naam, phone, CNIC, gaon, zila ya fasal…" />}
        chips={chips} onClear={() => setSearch('')}>
        <FilterMenu icon={ArrowDownUp} label={SORTS.find((o) => o.value === sort)!.label} value={sort} options={SORTS} onChange={(v) => { setSort(v); setPage(1); }} active={sort !== 'name'} align="right" />
      </FilterBar>

      <ViewTabs value={view} onChange={setTab}
        tabs={[...TABS.map((t) => ({ id: t.id as View, label: t.label, icon: t.icon, count: data?.counts[t.id] ?? null })), { id: 'analytics' as View, label: 'Analytics', icon: BarChart3 }]} />

      {view === 'analytics' ? <Analytics data={data} money={money} /> : (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-50 text-lime-700"><Tractor className="h-7 w-7" /></span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{search ? 'Is search me koi farmer nahi' : 'Is list me koi farmer nahi'}</h3>
              <p className="mt-1 text-[0.875rem] text-slate-500">Season ka udhaar lene wale farmer yahan jorein.</p>
              {canManage && <Link to="/agri/farmers/new" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg"><Plus className="h-4 w-4" />Naya farmer</Link>}
            </div>
          ) : (
            <>
              <Table minWidth="60rem">
                <THead><Tr><Th>Farmer</Th><Th>Zameen / fasal</Th><Th align="right">Udhaar</Th><Th>Season</Th><Th>Aakhri payment</Th><Th align="right">Kaam</Th></Tr></THead>
                <TBody>
                  {rows.map((f) => {
                    const pct = f.creditLimit > 0 ? Math.min((f.currentBalance / f.creditLimit) * 100, 100) : 0;
                    const stopped = f.status === 'SUSPENDED' || f.status === 'CLOSED';
                    return (
                      <Tr key={f.id} interactive onClick={() => navigate(`/agri/farmers/${f.id}`)}>
                        <Td>
                          <p className="font-semibold text-slate-900">{f.fullName}{stopped && <span className="ml-1.5 rounded bg-rose-100 px-1.5 text-[0.6875rem] font-semibold text-rose-700">Roka hua</span>}</p>
                          <p className="text-[0.75rem] text-slate-500">{[f.farmerNumber, f.phone].join(' · ')}</p>
                          <p className="flex items-center gap-1 text-[0.75rem] text-slate-500"><MapPin className="h-3 w-3" />{[f.village, f.district].filter(Boolean).join(', ') || '—'}</p>
                          {!f.khataLinked && <p className="text-[0.6875rem] font-medium text-amber-700">Khata nahi jura — farmer khol kar "Khata jorein"</p>}
                        </Td>
                        <Td className="text-[0.8125rem] text-slate-600">
                          {f.landAreaAcres ? `${f.landAreaAcres} acre` : '—'}
                          {f.primaryCrops.length > 0 && <p className="text-[0.75rem] text-slate-500">{f.primaryCrops.slice(0, 3).join(', ')}</p>}
                        </Td>
                        <Td align="right">
                          <p className={cn('text-[0.9375rem] font-bold tabular-nums', f.currentBalance > 0 ? 'text-slate-900' : 'text-slate-400')}>{money(f.currentBalance)}</p>
                          {f.creditLimit > 0 && (
                            <div className="ml-auto mt-1 w-24">
                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', f.overLimit ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} /></div>
                              <p className={cn('mt-0.5 text-[0.6875rem] tabular-nums', f.overLimit ? 'font-semibold text-rose-600' : 'text-slate-500')}>had {money(f.creditLimit)}</p>
                            </div>
                          )}
                        </Td>
                        <Td className="text-[0.75rem]">
                          {(f.seasons ?? []).length === 0 ? <span className="text-slate-400">—</span> : (f.seasons ?? []).map((x) => (
                            <p key={x.key} className={cn('tabular-nums', x.due ? 'font-semibold text-rose-600' : 'text-slate-600')}>{x.label}: {money(x.owed)}{x.due ? ' · waqt guzra' : ` · ${shortDate(x.recoveryBy)} tak`}</p>
                          ))}
                        </Td>
                        <Td className="text-[0.8125rem] text-slate-600">{f.lastPaymentAt ? shortDate(f.lastPaymentAt) : 'Kabhi nahi'}</Td>
                        <Td align="right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {canCollect && f.khataLinked && f.currentBalance > 0 && <button type="button" onClick={() => setPay(f)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-600 px-2.5 text-[0.75rem] font-semibold text-brand-fg"><Wallet className="h-3.5 w-3.5" />Wasool</button>}
                            {f.currentBalance > 0 && <a href={reminder(f, shopName, money)} target="_blank" rel="noreferrer" title="WhatsApp yaad dihani" className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50"><MessageCircle className="h-4 w-4" /></a>}
                            <Link to={`/agri/farmers/${f.id}`} title="Khata" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><BookOpen className="h-4 w-4" /></Link>
                            {canManage && <Link to={`/agri/farmers/${f.id}/edit`} title="Badlein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Edit3 className="h-4 w-4" /></Link>}
                            {!canManage ? null : stopped
                              ? <button type="button" title="Dobara chalu" onClick={() => reactivate.mutate(f.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50"><RotateCcw className="h-4 w-4" /></button>
                              : <button type="button" title="Naya udhaar rokein" onClick={() => setStop(f)} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Ban className="h-4 w-4" /></button>}
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
              <Pager page={data?.page ?? 1} limit={data?.limit ?? 30} total={data?.total ?? 0} onPage={setPage} />
            </>
          )}
        </section>
      )}

      {pay && (
        <PayModal title={`${pay.fullName} se wasooli`} description="Customer khate me likha jayega — day book aur drawer me aata hai" max={pay.currentBalance}
          suggest={[pay.dueNow ?? 0, pay.currentBalance]} busy={collect.isPending} onClose={() => setPay(null)}
          onPay={(v) => collect.mutate({ f: pay, ...v })} />
      )}
      {stop && <StopModal farmer={stop} onClose={() => setStop(null)} onDone={refresh} />}
    </PageShell>
  );
}

function Analytics({ data, money }: { data?: Awaited<ReturnType<typeof farmersApi.page>>; money: (n: number) => string }) {
  const a = data?.analytics;
  const bars = (list: Array<{ name: string; count: number }>) => {
    const max = Math.max(1, ...list.map((x) => x.count));
    return list.length === 0 ? <p className="py-6 text-center text-[0.8125rem] text-slate-500">Abhi data nahi</p> : (
      <ul className="space-y-2">{list.map((x) => (
        <li key={x.name} className="text-[0.8125rem]">
          <div className="flex justify-between"><span className="font-medium text-slate-700">{x.name}</span><span className="tabular-nums text-slate-500">{x.count}</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-lime-500" style={{ width: `${(x.count / max) * 100}%` }} /></div>
        </li>
      ))}</ul>
    );
  };
  const seasons = a?.seasons ?? [];
  const maxOwed = Math.max(1, ...seasons.map((x) => x.owed));
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
        <h3 className="mb-3 text-[0.9375rem] font-semibold text-slate-900">Udhaar season ke hisaab se</h3>
        {seasons.length === 0 ? <p className="py-6 text-center text-[0.8125rem] text-slate-500">Koi udhaar nahi</p> : (
          <ul className="space-y-2">{seasons.map((x) => (
            <li key={x.key} className="text-[0.8125rem]">
              <div className="flex justify-between"><span className={cn('font-medium', x.due ? 'text-rose-700' : 'text-slate-700')}>{x.label}{x.due ? ' · waqt guzra' : ''}</span><span className="tabular-nums text-slate-600">{money(x.owed)}</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', x.due ? 'bg-rose-500' : 'bg-sky-500')} style={{ width: `${(x.owed / maxOwed) * 100}%` }} /></div>
            </li>
          ))}</ul>
        )}
      </section>
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80"><h3 className="mb-3 text-[0.9375rem] font-semibold text-slate-900">Kaun si fasal</h3>{bars(a?.crops ?? [])}</section>
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80"><h3 className="mb-3 text-[0.9375rem] font-semibold text-slate-900">Kis zile me</h3>{bars(a?.districts ?? [])}</section>
    </div>
  );
}

function StopModal({ farmer, onClose, onDone }: { farmer: Farmer; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const run = useMutation({
    mutationFn: () => farmersApi.suspend(farmer.id, reason.trim()),
    onSuccess: () => { onDone(); toast.success('Naya udhaar ruk gaya'); onClose(); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });
  const reasons = useMemo(() => ['Pichle season ka baqi', 'Had se upar', 'Payment late', 'Zila chhor gaya'], []);
  return (
    <Modal open onClose={onClose} size="sm" title={`${farmer.fullName} — udhaar rokein?`}
      description="POS par udhaar ki had abhi ke baqi tak aa jayegi — naya udhaar manager PIN ke bagair nahi. Purana hisaab nahi badalta."
      footer={<>
        <Button variant="secondary" onClick={onClose}>Wapas</Button>
        <Button variant="danger" loading={run.isPending} onClick={() => run.mutate()}>Udhaar rokein</Button>
      </>}>
      <label className="block">
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Wajah</span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Payment late, had se upar…" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-[0.875rem] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" data-autofocus />
      </label>
      <div className="mt-2 flex flex-wrap gap-1.5">{reasons.map((r) => <button key={r} type="button" onClick={() => setReason(r)} className="h-7 rounded-lg bg-slate-100 px-2 text-[0.75rem] text-slate-700 hover:bg-slate-200">{r}</button>)}</div>
    </Modal>
  );
}
