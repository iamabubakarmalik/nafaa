/**
 * Karigars (carpenters) of the workshop: who is making what, how much is on
 * each bench, and their pay. Pay handed over from the drawer (daily wage,
 * per-job rate or advance) is saved as an expense, so the day book, cash
 * register and profit see it. A karigar is switched off, never deleted.
 *
 * Keys: N new karigar · / search · A analytics · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BarChart3, CheckCircle2, Download, GraduationCap, Hammer, ListChecks, Pencil, Phone, Plus, Power, UserRound, Users, Wallet } from 'lucide-react';
import {
  Button, FilterBar, FilterChip, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Textarea, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { carpentersApi, type CarpenterInput, type FurnitureCarpenter } from '../api/carpenters.api';
import { BarList, ConfirmModal, DueChip, Empty, Info, ListCard, ListLoading, MoneyModal, Pill } from '../components/ui';
import { useDebounced, usePageKeys, useSaveKey } from '../hooks/usePageKeys';
import { FURNITURE_KEYS, MONEY_KEYS, ORDER_STATUS, errorText, moneyText, numIn, phoneOk, shortDate } from '../lib/meta';

type Tab = 'active' | 'off' | 'analytics';
const SKILLS = ['Bed', 'Sofa', 'Almari', 'Dining', 'Kitchen', 'Polish', 'Gaddi / poshish', 'Carving', 'Fitting'];

export default function CarpentersPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money, cost } = useMasked();
  const canManage = usePermission(PERMISSIONS.STAFF_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [editing, setEditing] = useState<FurnitureCarpenter | 'new' | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const listQ = useQuery({ queryKey: [FURNITURE_KEYS.carpenters, 'list', q], queryFn: () => carpentersApi.list({ search: q || undefined }), placeholderData: (p) => p });
  usePageKeys(searchRef, { n: () => { if (canManage) setEditing('new'); }, a: () => setTab('analytics') });
  const refresh = () => [FURNITURE_KEYS.carpenters, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const all = listQ.data ?? [];
  const active = all.filter((c) => c.isActive);
  const rows = tab === 'off' ? all.filter((c) => !c.isActive) : active;
  const busy = active.reduce((s, c) => s + c.activeProjects, 0);
  const free = active.filter((c) => !c.activeProjects).length;

  const exportCsv = () => {
    if (!rows.length) { toast.error('Koi karigar nahi'); return; }
    downloadCsv('karigar.csv', [['Code', 'Naam', 'Phone', 'Kaam', 'Haath me', 'Mukammal', 'Dihari', 'Fi kaam', 'Workshop', 'Halat'],
      ...rows.map((c) => [c.employeeCode, c.name, c.phone, c.specializations.join(', '), c.activeProjects, c.completedProjects, c.dailyWage ?? '', c.perProjectRate ?? '', c.workshopLocation ?? '', c.isActive ? 'Kaam par' : 'Band'])]);
  };
  const printList = (): PrintDoc => ({
    title: 'Karigar',
    meta: [['Kaam par', String(active.length)], ['Haath me kaam', String(busy)]],
    sections: [{ kind: 'table', title: 'Karigar', columns: [{ label: 'Naam' }, { label: 'Phone' }, { label: 'Haath me', align: 'right' }, { label: 'Mukammal', align: 'right' }],
      rows: rows.map((c) => [`${c.name} (${c.employeeCode})`, c.phone, String(c.activeProjects), String(c.completedProjects)]) }],
  });
  const byRevenue = useMemo(() => active.map((c) => ({ key: c.id, label: c.name, count: c.completedProjects, value: Number(c.totalRevenue) || 0 })).sort((a, b) => b.value - a.value).slice(0, 12), [active]);
  const byLoad = useMemo(() => active.map((c) => ({ key: c.id, label: c.name, count: c.activeProjects, value: c.activeProjects })).sort((a, b) => b.value - a.value).slice(0, 12), [active]);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Karigar — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#16a34a', title: 'Karigar daalein', text: 'Naam, phone, kya banata hai, aur pay — dihari ya fi kaam. Code ek dafa lagta hai, us se payments jurti hain.' },
            { icon: Hammer, color: '#a16207', title: 'Kaam dein', text: 'Custom order par karigar dein. Yahan dikhta hai kis ke haath me kitna kaam hai — khali karigar ko naya kaam dein.' },
            { icon: Wallet, color: '#7c3aed', title: 'Pay', text: '"Pay dein" se drawer se diya paisa expense banta hai — din ka hisaab aur profit report me aata hai.' },
            { icon: Power, color: '#e11d48', title: 'Band karein', text: 'Karigar chhor jaye to band karein — us ka purana kaam aur pay ka record rehta hai.' },
          ]}
          shortcuts={[['N', 'naya karigar'], ['A', 'analytics'], ['/', 'search'], ['G', 'guide']]} />
      )}

      <PageHero title="Karigar" chip={<><Hammer /> Workshop</>} loading={listQ.isLoading} busy={listQ.isFetching && !listQ.isLoading}
        meta="Kaun kya bana raha hai, kitna kaam haath me, aur pay"
        actions={<>
          <Link to="/furniture/custom-orders" className={heroButton}><ListChecks className="h-4 w-4" /><span className="hidden sm:inline">Orders</span></Link>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setEditing('new')} title="Naya karigar (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" />Karigar</button>}
        </>}
        stats={[
          { label: 'Kaam par', value: String(active.length) },
          { label: 'Haath me kaam', value: String(busy) },
          { label: 'Khali', value: String(free) },
        ]} />

      <KpiRow cols={4}>
        <KpiCard icon={Users} color="#a16207" label="Kaam par" value={active.length} active={tab === 'active'} onClick={() => setTab('active')} />
        <KpiCard icon={Hammer} color="#7c3aed" label="Haath me kaam" value={busy} hint={free ? `${free} khali` : 'Sab masroof'} />
        <KpiCard icon={CheckCircle2} color="#16a34a" label="Mukammal kaam" value={active.reduce((s, c) => s + c.completedProjects, 0)} />
        <KpiCard icon={Power} color="#64748b" label="Band" value={all.length - active.length} active={tab === 'off'} onClick={() => setTab('off')} />
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, phone, code ya CNIC…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined}
        onClear={() => setSearch('')} />

      <ViewTabs value={tab} onChange={setTab} hint="Karigar kholein — kaam, pay aur hisaab"
        tabs={[
          { id: 'active', label: 'Kaam par', icon: Users, count: active.length },
          { id: 'off', label: 'Band', icon: Power },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <BarList title="Kis ne kitna kaam diya (bill qeemat)" money={money} rows={byRevenue} />
          <BarList title="Haath me kaam (orders)" money={(n) => `${n} order`} rows={byLoad} />
        </div>
      ) : (
        <ListCard>
          {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
            <Empty icon={Hammer} title={tab === 'off' ? 'Koi band karigar nahi' : 'Koi karigar nahi'} text="Workshop ke karigar daalein — order inhi ko diye jate hain."
              action={canManage && tab === 'active' ? <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" />Karigar daalein</Button> : undefined} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setOpenId(c.id)} className="grid w-full gap-2 px-4 py-3 text-left hover:bg-slate-50 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_9rem_9rem_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{c.name} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{c.employeeCode}</span></p>
                      <p className="truncate text-[0.75rem] text-slate-500">{[c.phone, c.specializations.join(', '), c.workshopLocation].filter(Boolean).join(' · ')}</p>
                    </div>
                    <p className="text-[0.8125rem] text-slate-700">{c.dailyWage ? `${cost(c.dailyWage)}/din` : c.perProjectRate ? `${cost(c.perProjectRate)}/kaam` : 'Pay likha nahi'}</p>
                    <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{c.activeProjects} haath me<span className="block text-[0.75rem] font-medium text-slate-500">{c.completedProjects} mukammal</span></p>
                    <div className="flex justify-end">{c.isActive ? <Pill tone={c.activeProjects ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}>{c.activeProjects ? 'Masroof' : 'Khali'}</Pill> : <Pill tone="bg-slate-100 text-slate-500 ring-slate-200">Band</Pill>}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ListCard>
      )}

      {editing && <FormModal carpenter={editing === 'new' ? null : editing} nextCode={`K-${String(all.length + 1).padStart(3, '0')}`} onClose={() => setEditing(null)} onDone={() => { setEditing(null); refresh(); }} />}
      {openId && <DetailModal id={openId} money={money} canManage={canManage} onEdit={(c) => { setOpenId(null); setEditing(c); }} onClose={() => setOpenId(null)} onChanged={refresh} />}
    </PageShell>
  );
}

function FormModal({ carpenter: c, nextCode, onClose, onDone }: { carpenter: FurnitureCarpenter | null; nextCode: string; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({
    employeeCode: c?.employeeCode ?? nextCode, name: c?.name ?? '', phone: c?.phone ?? '', cnic: c?.cnic ?? '', address: c?.address ?? '',
    specializations: c?.specializations ?? [], experienceYears: c?.experienceYears ? String(c.experienceYears) : '', workshopLocation: c?.workshopLocation ?? '',
    dailyWage: c?.dailyWage ? String(c.dailyWage) : '', perProjectRate: c?.perProjectRate ? String(c.perProjectRate) : '', notes: c?.notes ?? '',
  });
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const errors = {
    employeeCode: !v.employeeCode.trim() ? 'Code likhein' : undefined,
    name: !v.name.trim() ? 'Naam likhein' : undefined,
    phone: !v.phone.trim() ? 'Phone likhein' : !phoneOk(v.phone) ? '10 se 15 hindse' : undefined,
  };
  const [tried, setTried] = useState(false);
  const save = useMutation({
    mutationFn: () => {
      const payload: CarpenterInput = {
        employeeCode: v.employeeCode.trim(), name: v.name.trim(), phone: v.phone.trim(), cnic: v.cnic.trim() || undefined, address: v.address.trim() || undefined,
        specializations: v.specializations, experienceYears: v.experienceYears ? Math.round(Number(v.experienceYears)) : undefined, workshopLocation: v.workshopLocation.trim() || undefined,
        dailyWage: numIn(v.dailyWage) ?? undefined, perProjectRate: numIn(v.perProjectRate) ?? undefined, notes: v.notes.trim() || undefined,
      };
      return c ? carpentersApi.update(c.id, payload) : carpentersApi.create(payload);
    },
    onSuccess: () => { toast.success(c ? 'Karigar save' : 'Karigar add ho gaya'); onDone(); },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const submit = () => { setTried(true); if (!Object.values(errors).some(Boolean) && !save.isPending) save.mutate(); };
  useSaveKey(submit);
  const e = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  return (
    <Modal open onClose={onClose} size="lg" title={c ? `${c.name} — badlein` : 'Naya karigar'}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={submit}><CheckCircle2 className="h-4 w-4" />Save (Ctrl+S)</Button></>}>
      <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Code" required value={v.employeeCode} onChange={(x) => set({ employeeCode: x.target.value })} error={e('employeeCode')} disabled={!!c} hint={c ? 'Code nahi badalta' : 'Pay isi code se jurti hai'} />
          <Input label="Naam" required value={v.name} onChange={(x) => set({ name: x.target.value })} placeholder="Ustad Rafiq" error={e('name')} />
          <Input label="Phone" required inputMode="tel" value={v.phone} onChange={(x) => set({ phone: x.target.value })} placeholder="03001234567" error={e('phone')} />
          <Input label="CNIC" inputMode="numeric" value={v.cnic} onChange={(x) => set({ cnic: x.target.value })} hint="Marzi hai" />
          <Input label="Tajurba (saal)" inputMode="numeric" value={v.experienceYears} onChange={(x) => set({ experienceYears: x.target.value.replace(/\D/g, '') })} />
          <Input label="Workshop" value={v.workshopLocation} onChange={(x) => set({ workshopLocation: x.target.value })} placeholder="Main workshop" />
        </div>
        <div>
          <p className="mb-1 text-[0.8125rem] font-medium text-slate-700">Kya banata hai</p>
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((k) => {
              const on = v.specializations.includes(k);
              return <button key={k} type="button" onClick={() => set({ specializations: on ? v.specializations.filter((x) => x !== k) : [...v.specializations, k] })} className={`h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold ring-1 ${on ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'ring-slate-200 hover:bg-slate-50'}`}>{k}</button>;
            })}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Dihari (Rs / din)" inputMode="decimal" value={v.dailyWage} onChange={(x) => set({ dailyWage: moneyText(x.target.value) })} hint="Rozana pay leta hai to" />
          <Input label="Fi kaam (Rs)" inputMode="decimal" value={v.perProjectRate} onChange={(x) => set({ perProjectRate: moneyText(x.target.value) })} hint="Har order ka thekay ka rate" />
        </div>
        <Input label="Pata" value={v.address} onChange={(x) => set({ address: x.target.value })} hint="Marzi hai" />
        <Textarea label="Note" rows={2} value={v.notes} onChange={(x) => set({ notes: x.target.value })} />
      </form>
    </Modal>
  );
}

function DetailModal({ id, money, canManage, onEdit, onClose, onChanged }: {
  id: string; money: (n: number) => string; canManage: boolean; onEdit: (c: FurnitureCarpenter) => void; onClose: () => void; onChanged: () => void;
}) {
  const qc = useQueryClient();
  const canPay = usePermission(PERMISSIONS.EXPENSES_CREATE);
  const q = useQuery({ queryKey: [FURNITURE_KEYS.carpenters, 'one', id], queryFn: () => carpentersApi.getOne(id) });
  const [panel, setPanel] = useState<'pay' | 'off' | null>(null);
  const [orderId, setOrderId] = useState('');
  const changed = (msg: string) => { toast.success(msg); setPanel(null); onChanged(); qc.invalidateQueries({ queryKey: [FURNITURE_KEYS.carpenters, 'one', id] }); };
  const pay = useMutation({
    mutationFn: (v: { amount: number; paymentMethod: string; notes?: string }) => carpentersApi.pay(id, { amount: v.amount, paymentMethod: v.paymentMethod, note: v.notes, orderId: orderId || undefined }),
    onSuccess: (r) => changed(`Pay save — expense ${r.expenseNumber}`),
    onError: (e) => toast.error(errorText(e, 'Pay save nahi hui')),
  });
  const toggle = useMutation({
    mutationFn: (c: FurnitureCarpenter) => (c.isActive ? carpentersApi.deactivate(c.id) : carpentersApi.update(c.id, { employeeCode: c.employeeCode, name: c.name, phone: c.phone, isActive: true })),
    onSuccess: (r) => changed(r.isActive ? 'Karigar phir kaam par' : 'Karigar band'),
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });
  const c = q.data;
  if (!c) return <Modal open onClose={onClose} size="lg" title="Karigar"><ListLoading rows={4} /></Modal>;
  const jobs = [...(c.activeOrders ?? []), ...(c.recentCompleted ?? [])];
  return (
    <Modal open onClose={onClose} size="lg" title={`${c.name} · ${c.employeeCode}`} description={c.isActive ? `${c.activeProjects} kaam haath me` : 'Band'}
      footer={<div className="flex w-full flex-wrap items-center gap-2">
        {canManage && <Button size="sm" variant="ghost" onClick={() => (c.isActive ? setPanel('off') : toggle.mutate(c))}><Power className="h-3.5 w-3.5" />{c.isActive ? 'Band karein' : 'Phir kaam par'}</Button>}
        <span className="flex-1" />
        {canManage && <Button size="sm" variant="secondary" onClick={() => onEdit(c)}><Pencil className="h-3.5 w-3.5" />Badlein</Button>}
        {canPay && <Button size="sm" onClick={() => setPanel('pay')}><Wallet className="h-3.5 w-3.5" />Pay dein</Button>}
      </div>}>
      <div className="space-y-3 text-[0.875rem]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info icon={UserRound} title="Karigar">
            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"><Phone className="h-3.5 w-3.5" />{c.phone}</a>
            <p className="text-slate-600">{[c.specializations.join(', '), c.experienceYears ? `${c.experienceYears} saal` : null, c.workshopLocation].filter(Boolean).join(' · ') || '—'}</p>
          </Info>
          <Info icon={Wallet} title="Pay">
            <p className="font-semibold text-slate-900">{c.dailyWage ? `${money(c.dailyWage)}/din` : c.perProjectRate ? `${money(c.perProjectRate)}/kaam` : 'Rate likha nahi'}</p>
            <p className="text-slate-600">Is mahine diya: {money(c.paidThisMonth ?? 0)}</p>
          </Info>
        </div>
        <section>
          <h4 className="mb-1.5 text-[0.8125rem] font-semibold text-slate-700">Kaam</h4>
          {jobs.length === 0 ? <p className="rounded-xl bg-slate-50 px-3 py-2 text-slate-500">Koi kaam nahi</p> : (
            <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
              {jobs.map((o) => (
                <li key={o.id}>
                  <Link to={`/furniture/custom-orders/${o.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
                    <span className="min-w-0 flex-1 truncate"><span className="font-semibold text-slate-900">{o.productType}</span><span className="text-slate-500"> · {o.customerName}</span></span>
                    <span className="shrink-0 text-right text-[0.75rem] text-slate-500">{shortDate(o.expectedDeliveryDate)}<DueChip o={o} /></span>
                    <Pill tone={ORDER_STATUS[o.status]?.tone ?? ''}>{ORDER_STATUS[o.status]?.label ?? o.status}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        {(c.payments?.length ?? 0) > 0 && (
          <section>
            <h4 className="mb-1.5 text-[0.8125rem] font-semibold text-slate-700">Pay di gayi</h4>
            <ul className="space-y-1">
              {c.payments!.map((p) => <li key={p.id} className="flex justify-between gap-2 text-slate-700"><span className="truncate">{shortDate(p.createdAt)} · {p.title.replace(/^Karigar \[[^\]]+\]: /, '')}{p.description ? ` — ${p.description}` : ''}</span><span className="shrink-0 font-semibold tabular-nums">{money(p.amount)}</span></li>)}
            </ul>
          </section>
        )}
        {c.notes && <p className="whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2 text-slate-600">{c.notes}</p>}
      </div>
      {panel === 'pay' && (
        <MoneyModal title={`${c.name} ko pay`} description="Drawer se — expense me jata hai" due={c.dailyWage ?? c.perProjectRate ?? undefined} busy={pay.isPending} cta="Pay save" outgoing
          hint="Dihari, thekay ya advance"
          extra={(c.activeOrders?.length ?? 0) > 0 ? (
            <Select label="Kis order ka" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Kisi order ka nahi" options={(c.activeOrders ?? []).map((o) => ({ value: o.id, label: `${o.orderNumber} · ${o.productType}` }))} />
          ) : undefined}
          onSubmit={(v) => pay.mutate(v)} onClose={() => setPanel(null)} />
      )}
      {panel === 'off' && (
        <ConfirmModal title={`${c.name} ko band karein?`} cta="Band karein" danger busy={toggle.isPending} onClose={() => setPanel(null)} onConfirm={() => toggle.mutate(c)}
          text={c.activeProjects ? `${c.activeProjects} order abhi is ke paas hain — pehle doosre karigar ko dein.` : 'Purana kaam aur pay ka record rehta hai.'} />
      )}
    </Modal>
  );
}
