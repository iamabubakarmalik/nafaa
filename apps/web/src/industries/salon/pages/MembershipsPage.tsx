/**
 * Memberships: the customers holding one (running, ending soon, ended,
 * cancelled) with what they saved, selling a membership (paid now, the
 * rest on khata), and the plans (price, days, discount on services).
 * The discount is applied on the counter bill.
 *
 * Keys: N sell membership · / search · 1 members · 2 plans · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlarmClock, Ban, Crown, Filter, GraduationCap, ListChecks, Pencil, Percent, Plus, Receipt, Sparkles, Users, Wallet } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import type { PrintDoc } from '@core/print';
import {
  Badge, Button, FilterBar, FilterChip, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Switch,
  Table, TBody, Td, Th, THead, Tr, Textarea, ViewTabs, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { membershipsApi, type Membership, type MembershipPlan, type MembershipTier } from '../api/memberships.api';
import { CancelModal, CustomerField, emptyCustomer, type CustomerValue } from '../components/fields';
import { EmptyList, HeroPrint, ListSkeleton, LoadFailed } from '../components/ui';
import { SALON_KEYS, TIERS, apiError, dateOf, tierOf } from '../lib/meta';
import { useSalonCan } from '../lib/permissions';

type Tab = 'members' | 'plans';
type Status = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | '';
const DAY = 86_400_000;
const daysLeft = (m: Membership) => Math.ceil((new Date(m.expiryDate).getTime() - Date.now()) / DAY);

export default function MembershipsPage() {
  const qc = useQueryClient();
  const can = useSalonCan();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('members');
  const [status, setStatus] = useState<Status>('ACTIVE');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selling, setSelling] = useState(false);
  const [plan, setPlan] = useState<MembershipPlan | 'new' | null>(null);
  const [cancel, setCancel] = useState<Membership | null>(null);
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const listQ = useQuery({ queryKey: [SALON_KEYS.memberships, 'list', status, query], queryFn: () => membershipsApi.list({ status: status || undefined, search: query || undefined }), placeholderData: (p) => p });
  const activeQ = useQuery({ queryKey: [SALON_KEYS.memberships, 'list', 'ACTIVE', ''], queryFn: () => membershipsApi.list({ status: 'ACTIVE' }) });
  const plansQ = useQuery({ queryKey: [SALON_KEYS.memberships, 'plans'], queryFn: () => membershipsApi.listPlans() });

  const rows = listQ.data ?? [];
  const active = activeQ.data ?? [];
  const ending = active.filter((m) => daysLeft(m) <= 15);
  const plans = plansQ.data ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && can.bill) { e.preventDefault(); setSelling(true); }
      if (e.key === '1') setTab('members');
      if (e.key === '2') setTab('plans');
      if (e.key === '/') { e.preventDefault(); setTab('members'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const printDoc = (): PrintDoc => ({
    title: 'Memberships',
    subtitle: status ? STATUS_LABEL[status] : 'Sab',
    meta: [['Members', String(rows.length)]],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Number', wideOnly: true }, { label: 'Customer' }, { label: 'Plan' }, { label: 'Khatam' }, { label: 'Bachat', align: 'right' }],
      rows: rows.map((m) => [m.membershipNumber, `${m.customer?.name ?? ''} ${m.customer?.phone ?? ''}`.trim(), m.plan?.name ?? '', dateOf(m.expiryDate), formatPKR(m.totalSaved)]),
    }],
  });

  return (
    <PageShell>
      <PageHero
        title="Memberships"
        chip={<><Crown /> Salon</>}
        meta="Plan bechein, discount counter par khud lagta hai"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={activeQ.isLoading}
        actions={<>
          <HeroPrint doc={printDoc} disabled={tab !== 'members' || !rows.length} />
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.bill && <button type="button" onClick={() => setSelling(true)} title="Membership bechein (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Membership bechein</button>}
        </>}
        stats={[
          { label: 'Chalti memberships', value: active.length },
          { label: '15 din me khatam', value: ending.length },
          { label: 'Members ki bachat', value: formatPKR(active.reduce((s, m) => s + m.totalSaved, 0)) },
        ]}
      />

      <KpiRow cols={4}>
        {activeQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Users} color="#db2777" label="Chalti" value={active.length} hint="Discount lag raha hai" onClick={() => { setTab('members'); setStatus('ACTIVE'); }} active={tab === 'members' && status === 'ACTIVE'} />
          <KpiCard icon={AlarmClock} color={ending.length ? '#d97706' : '#64748b'} label="Jald khatam" value={ending.length} hint="Renew ke liye call karein" />
          <KpiCard icon={Ban} color="#64748b" label="Khatam / cancel" value="Dekhein" hint="Purani memberships" onClick={() => { setTab('members'); setStatus('EXPIRED'); }} active={tab === 'members' && status === 'EXPIRED'} />
          <KpiCard icon={Sparkles} color="#ca8a04" label="Plans" value={plans.filter((p) => p.isActive).length} hint={`${plans.length - plans.filter((p) => p.isActive).length} band`} onClick={() => setTab('plans')} active={tab === 'plans'} />
        </>}
      </KpiRow>

      {tab === 'members' && (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Customer ka naam, phone ya MEM number…" />}
          chips={query || status !== 'ACTIVE' ? <>
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
            {status !== 'ACTIVE' && <FilterChip onRemove={() => setStatus('ACTIVE')}>{status ? STATUS_LABEL[status] : 'Sab'}</FilterChip>}
          </> : undefined}
          onClear={() => { setSearch(''); setStatus('ACTIVE'); }}>
          <FilterMenu icon={Filter} label={status ? STATUS_LABEL[status] : 'Sab'} value={status} active={status !== 'ACTIVE'} onChange={setStatus}
            options={[{ value: 'ACTIVE', label: 'Chalti' }, { value: 'EXPIRED', label: 'Khatam' }, { value: 'CANCELLED', label: 'Cancel' }, { value: '', label: 'Sab' }]} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab} hint={<>{can.bill && <><Kbd>N</Kbd> bechein · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[{ id: 'members', label: 'Members', icon: ListChecks, count: rows.length }, { id: 'plans', label: 'Plans', icon: Crown, count: plans.length }]} />

      {tab === 'members' ? (
        listQ.isLoading ? <ListSkeleton /> : listQ.isError ? <LoadFailed what="Memberships" retry={() => listQ.refetch()} /> : !rows.length ? (
          <EmptyList icon={Crown} title={query ? 'Is search me koi nahi' : 'Koi membership nahi'} text="Plan banayein (jaise Gold — 10% discount, 1 saal) aur customer ko bechein. Discount counter par khud lagta hai.">
            {can.bill && plans.length > 0 && <Button onClick={() => setSelling(true)} leftIcon={<Plus className="h-4 w-4" />}>Membership bechein</Button>}
            {can.catalog && !plans.length && <Button onClick={() => setPlan('new')} leftIcon={<Plus className="h-4 w-4" />}>Pehla plan banayein</Button>}
          </EmptyList>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <Table minWidth="44rem">
              <THead><Tr><Th>Customer</Th><Th>Plan</Th><Th>Khatam</Th><Th align="right">Paid</Th><Th align="right">Services / bachat</Th><Th /></Tr></THead>
              <TBody>
                {rows.map((m) => {
                  const left = daysLeft(m);
                  const tier = tierOf(m.plan?.tier);
                  return (
                    <Tr key={m.id}>
                      <Td><p className="font-medium text-slate-900">{m.customer?.name ?? '—'}</p><p className="text-[0.75rem] text-slate-500">{m.customer?.phone ?? ''} · {m.membershipNumber}</p></Td>
                      <Td><span className="inline-flex items-center gap-1.5"><Crown className="h-4 w-4" style={{ color: tier.color }} />{m.plan?.name}</span><p className="text-[0.75rem] text-slate-500">{m.plan?.discountPct}% discount</p></Td>
                      <Td>
                        {dateOf(m.expiryDate)}
                        <div>{m.status === 'ACTIVE' ? <Badge size="xs" variant={left <= 15 ? 'warning' : 'success'}>{left} din baqi</Badge> : <Badge size="xs" variant="default">{STATUS_LABEL[m.status as keyof typeof STATUS_LABEL] ?? m.status}</Badge>}</div>
                        {m.cancellationReason && <p className="text-[0.6875rem] text-slate-500">{m.cancellationReason}</p>}
                      </Td>
                      <Td align="right" className="tabular-nums">{formatPKR(m.amountPaid)}{m.plan && m.amountPaid < m.plan.price && <p className="text-[0.6875rem] text-amber-700">baqi khate me</p>}</Td>
                      <Td align="right" className="tabular-nums">{m.usedServices} · {formatPKR(m.totalSaved)}</Td>
                      <Td align="right">{can.bill && m.status === 'ACTIVE' && <Button size="sm" variant="ghost" onClick={() => setCancel(m)}>Cancel</Button>}</Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          </div>
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => {
            const tier = tierOf(p.tier);
            return (
              <div key={p.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80" style={{ borderTop: `4px solid ${tier.color}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-1.5 font-semibold text-slate-900"><Crown className="h-4 w-4" style={{ color: tier.color }} />{p.name}</p>
                    <p className="text-[0.8125rem] text-slate-500">{tier.label} · {p.durationDays} din</p>
                  </div>
                  {!p.isActive && <Badge size="xs">Band</Badge>}
                </div>
                <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{formatPKR(p.price)}</p>
                <p className="text-[0.8125rem] font-semibold text-success-700">{p.discountPct}% discount har service par</p>
                {!!p.benefits.length && <ul className="mt-2 list-inside list-disc text-[0.8125rem] text-slate-600">{p.benefits.slice(0, 4).map((b) => <li key={b}>{b}</li>)}</ul>}
                <p className="mt-2 text-[0.75rem] text-slate-500">{p.totalSubscribers} dafa bika</p>
                {can.catalog && <Button className="mt-3" size="sm" variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setPlan(p)}>Badlein</Button>}
              </div>
            );
          })}
          {can.catalog && (
            <button type="button" onClick={() => setPlan('new')} className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-700">
              <Plus className="h-6 w-6" /> Naya plan
            </button>
          )}
        </div>
      )}

      {selling && <SellModal plans={plans.filter((p) => p.isActive)} onClose={() => setSelling(false)} />}
      {plan && <PlanModal plan={plan === 'new' ? null : plan} onClose={() => setPlan(null)} />}
      {cancel && (
        <CancelModal title={`${cancel.membershipNumber} · ${cancel.customer?.name ?? ''}`} paid={0}
          onConfirm={async (reason) => { await membershipsApi.cancel(cancel.id, reason || undefined); qc.invalidateQueries({ queryKey: [SALON_KEYS.memberships] }); }}
          onClose={() => setCancel(null)} />
      )}

      {guide.isOpen && (
        <PageGuide title="Memberships — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Sparkles, color: '#ca8a04', title: 'Plan', text: 'Plan banayein: qeemat, kitne din aur services par kitna % discount. Jaise Gold — Rs 5,000, 365 din, 10%.' },
            { icon: Plus, color: '#db2777', title: 'Bechna', text: 'Customer chunein, plan chunein aur jo paisa mila likhein. Baqi customer ke khate me udhaar jata hai. Bill Sales me aata hai.' },
            { icon: Percent, color: '#16a34a', title: 'Discount', text: 'Counter par member customer chunte hi "Membership" ka nishan aata hai — lagate hi services par discount.' },
            { icon: Receipt, color: '#e11d48', title: 'Wapas paisa', text: 'Cancel sirf membership band karta hai. Paisa wapas karna ho to Sales me us ka bill void karein — membership khud cancel ho jati hai.' },
          ]}
          shortcuts={[['N', 'bechein'], ['/', 'dhoondein'], ['1', 'members'], ['2', 'plans'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

const STATUS_LABEL: Record<Exclude<Status, ''>, string> = { ACTIVE: 'Chalti', EXPIRED: 'Khatam', CANCELLED: 'Cancel' };

function SellModal({ plans, onClose }: { plans: MembershipPlan[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const p = plans.find((x) => x.id === planId);
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const amount = paid === '' ? p?.price ?? 0 : Number(paid) || 0;
  const error = !customer.customerId ? 'Customer chunein (membership customer ke naam hoti hai)' : !p ? 'Plan chunein' : amount < 0 || amount > p.price ? `Zyada se zyada ${formatPKR(p.price)}` : undefined;
  const save = useMutation({
    mutationFn: () => membershipsApi.subscribe({ planId, customerId: customer.customerId, amountPaid: amount, paymentMethod: method, notes: notes.trim() || undefined }),
    onSuccess: (m) => { toast.success(`${m.membershipNumber} ban gayi`); [SALON_KEYS.memberships, 'customers', 'salon-perks'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Membership nahi bani')),
  });
  return (
    <Modal open onClose={onClose} size="md" title="Membership bechein" description="Bill Sales me aata hai; jo paisa abhi na mile woh khate me udhaar"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>Bechein {formatPKR(amount)}</Button></>}>
      <div className="space-y-3">
        <CustomerField value={customer} onChange={setCustomer} compact />
        <Select label="Plan" value={planId} onChange={(e) => setPlanId(e.target.value)} options={plans.map((x) => ({ value: x.id, label: `${x.name} · ${formatPKR(x.price)} · ${x.durationDays} din · ${x.discountPct}%` }))} />
        <Input label="Abhi kitna mila" inputMode="decimal" value={paid} placeholder={String(p?.price ?? 0)} onChange={(e) => setPaid(e.target.value.replace(/[^\d.]/g, ''))}
          hint={p && amount < p.price ? `${formatPKR(p.price - amount)} khate me udhaar` : 'Poora paisa'} />
        {amount > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
        <Textarea label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} hint="Marzi hai" />
        {error && customer.customerId && <p className="text-[0.8125rem] text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

function PlanModal({ plan, onClose }: { plan: MembershipPlan | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(plan?.name ?? '');
  const [tier, setTier] = useState<MembershipTier>(plan?.tier ?? 'GOLD');
  const [price, setPrice] = useState(plan ? String(plan.price) : '');
  const [days, setDays] = useState(String(plan?.durationDays ?? 365));
  const [pct, setPct] = useState(String(plan?.discountPct ?? 10));
  const [benefits, setBenefits] = useState((plan?.benefits ?? []).join('\n'));
  const [active, setActive] = useState(plan?.isActive ?? true);
  const error = name.trim().length < 2 ? 'Plan ka naam likhein' : !(Number(price) >= 0) || price === '' ? 'Qeemat likhein' : !(Number(days) >= 1) ? 'Din likhein' : !(Number(pct) >= 0 && Number(pct) <= 100) ? 'Discount 0 se 100%' : undefined;
  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), tier, price: Number(price), durationDays: Number(days), discountPct: Number(pct), priorityBooking: false, benefits: benefits.split('\n').map((b) => b.trim()).filter(Boolean), isActive: active };
      return plan ? membershipsApi.updatePlan(plan.id, body) : membershipsApi.createPlan(body);
    },
    onSuccess: () => { toast.success('Plan save ho gaya'); qc.invalidateQueries({ queryKey: [SALON_KEYS.memberships] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Plan save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="md" title={plan ? `${plan.name} — badlein` : 'Naya plan'}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Naam" value={name} onChange={(e) => setName(e.target.value)} placeholder="Gold" maxLength={80} />
        <Select label="Tier" value={tier} onChange={(e) => setTier(e.target.value as MembershipTier)} options={TIERS.map((t) => ({ value: t.value, label: t.label }))} />
        <Input label="Qeemat" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} placeholder="5000" />
        <Input label="Kitne din" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} hint="365 = ek saal" />
        <Input label="Services par discount %" inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value.replace(/[^\d.]/g, ''))} hint="Counter par khud lagta hai" />
        <div className="flex items-end"><Switch label="Chalu" description="Band plan bikta nahi" checked={active} onChange={(e) => setActive(e.target.checked)} /></div>
        <Textarea wrapperClassName="sm:col-span-2" label="Faide (har line ek)" value={benefits} onChange={(e) => setBenefits(e.target.value)} rows={3} placeholder={'Birthday par free facial\nBooking me pehli bari'} />
        {error && <p className="text-[0.8125rem] text-rose-600 sm:col-span-2">{error}</p>}
      </div>
    </Modal>
  );
}
