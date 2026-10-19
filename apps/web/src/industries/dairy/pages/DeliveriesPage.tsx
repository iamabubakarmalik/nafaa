/**
 * Home delivery day sheet: the day's list is made from each customer's
 * fixed quantity, the rider marks each house delivered, naga (skipped) or
 * a changed quantity. Delivered entries post a bill on the customer's
 * khata (DLV-…), so the day book, cash register and profit report see them.
 * Undoing a delivered entry voids that bill (needs "Bill void").
 */

import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Ban, CalendarDays, CheckCheck, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, GraduationCap, ListChecks, Milk, Pencil,
  Plus, Route as RouteIcon, Truck, Undo2, Wallet,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Segmented, Select, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { dairyDeliveriesApi, type DairyDelivery } from '../api/deliveries.api';
import { dairyCustomersApi, type DairyCustomer } from '../api/customers.api';
import { routesApi } from '../api/routes.api';
import { Empty, ListCard, ListLoading, Pill, ReasonModal } from '../components/ui';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { DAIRY_KEYS, DELIVERY_STATUS, MONEY_KEYS, PAY_METHODS, dayKey, errorText, liters, numIn, qty, shiftDay, slotLabel, slotNow, type Slot } from '../lib/meta';

type Tab = 'all' | 'pending' | 'delivered' | 'skipped';
const TABS: Array<{ id: Tab; label: string; icon: typeof ListChecks }> = [
  { id: 'pending', label: 'Baqi', icon: Clock },
  { id: 'delivered', label: 'Pohancha', icon: CheckCircle2 },
  { id: 'skipped', label: 'Naga / cancel', icon: Ban },
  { id: 'all', label: 'Sab', icon: ListChecks },
];
const inTab = (d: DairyDelivery, t: Tab) => (t === 'all' ? true : t === 'pending' ? d.status === 'SCHEDULED'
  : t === 'delivered' ? d.status === 'DELIVERED' : d.status === 'SKIPPED' || d.status === 'CANCELLED');

const longDate = (key: string) => new Intl.DateTimeFormat('en-PK', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${key}T12:00:00`));

export default function DeliveriesPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canVoid = usePermission(PERMISSIONS.SALES_VOID);
  const searchRef = useRef<HTMLInputElement>(null);
  const [params] = useSearchParams();
  const [date, setDate] = useState(dayKey());
  const [slot, setSlot] = useState<Slot>(slotNow());
  const [routeId, setRouteId] = useState(params.get('route') ?? '');
  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [editing, setEditing] = useState<DairyDelivery | null>(null);
  const [undo, setUndo] = useState<{ d: DairyDelivery; kind: 'skip' | 'cancel' } | null>(null);
  const [adding, setAdding] = useState(false);
  const today = dayKey();

  const sheetQ = useQuery({
    queryKey: [DAIRY_KEYS.deliveries, date, slot, routeId, q],
    queryFn: () => dairyDeliveriesApi.sheet({ from: date, to: date, slot, routeId: routeId || undefined, search: q || undefined }),
    refetchInterval: 60_000,
  });
  const summaryQ = useQuery({ queryKey: [DAIRY_KEYS.deliveries, 'summary', date], queryFn: () => dairyDeliveriesApi.summary(date) });
  const routesQ = useQuery({ queryKey: [DAIRY_KEYS.routes, 'active'], queryFn: () => routesApi.all({ active: true }), staleTime: 5 * 60_000 });

  const all = useMemo(() => sheetQ.data ?? [], [sheetQ.data]);
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, all.filter((d) => inTab(d, t.id)).length])) as Record<Tab, number>, [all]);
  const rows = all.filter((d) => inTab(d, tab));
  const pending = all.filter((d) => d.status === 'SCHEDULED');
  const s = summaryQ.data;
  const routeName = routesQ.data?.find((r) => r.id === routeId)?.name;

  const refresh = () => MONEY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const generate = useMutation({
    mutationFn: () => dairyDeliveriesApi.generate({ date, slot, routeId: routeId || undefined }),
    onSuccess: (r) => { refresh(); toast.success(r.generatedCount ? `${r.generatedCount} ghar list me aa gaye` : 'List pehle se bani hui hai — koi naya ghar nahi'); setTab('pending'); },
    onError: (e) => toast.error(errorText(e, 'List nahi bani')),
  });
  const deliverOne = useMutation({
    mutationFn: (d: DairyDelivery) => dairyDeliveriesApi.deliver(d.id, { deliveredQty: d.scheduledQty }),
    onSuccess: (_r, d) => { refresh(); toast.success(`${d.customer?.name ?? 'Customer'} — ${liters(d.scheduledQty)} pohancha, khate me likha`); },
    onError: (e) => toast.error(errorText(e, 'Delivery save nahi hui')),
  });
  const deliverAll = useMutation({
    mutationFn: () => dairyDeliveriesApi.confirmAll({ date, slot, routeId: routeId || undefined, ids: pending.map((d) => d.id) }),
    onSuccess: (r) => {
      refresh();
      if (r.failed.length) toast.warning(`${r.done} pohanchi, ${r.failed.length} reh gayi`, { description: r.failed[0]?.reason });
      else toast.success(`${r.done} delivery pohanchi — sab khaton me likh di`);
    },
    onError: (e) => toast.error(errorText(e, 'Delivery save nahi hui')),
  });
  const undoM = useMutation({
    mutationFn: ({ d, kind, reason, managerPin }: { d: DairyDelivery; kind: 'skip' | 'cancel'; reason: string; managerPin?: string }) =>
      (kind === 'skip' ? dairyDeliveriesApi.markSkipped(d.id, { reason: reason || undefined, managerPin }) : dairyDeliveriesApi.markCancelled(d.id, { reason: reason || undefined, managerPin })),
    onSuccess: (_r, v) => { refresh(); setUndo(null); toast.success(v.kind === 'skip' ? 'Naga likh diya' : 'Delivery cancel'); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });

  usePageKeys(searchRef, { n: () => setAdding(true), arrowleft: () => setDate((d) => shiftDay(d, -1)), arrowright: () => setDate((d) => (d < today ? shiftDay(d, 1) : d)) });

  const exportCsv = () => {
    if (!all.length) { toast.error('Is din ki koi delivery nahi'); return; }
    downloadCsv(`delivery-${date}-${slot.toLowerCase()}.csv`, [
      ['Customer', 'Number', 'Phone', 'Pata', 'Route', 'Waqt', 'Quantity', 'Diya', 'Rate', 'Amount', 'Status'],
      ...all.map((d) => [d.customer?.name, d.customer?.customerNumber, d.customer?.phone, d.customer?.address, d.customer?.route?.name, slotLabel(d.slot),
        d.scheduledQty, d.deliveredQty, d.ratePerLiter, d.status === 'DELIVERED' ? d.totalAmount : '', DELIVERY_STATUS[d.status]?.label]),
    ]);
  };
  const printDoc = (): PrintDoc => ({
    title: `Delivery list — ${slotLabel(slot)}`, subtitle: `${longDate(date)}${routeName ? ` · ${routeName}` : ''}`,
    meta: [['Ghar', String(all.filter((d) => d.status !== 'CANCELLED').length)], ['Doodh', liters(all.filter((d) => d.status !== 'CANCELLED').reduce((t, d) => t + d.scheduledQty, 0))]],
    sections: [{
      kind: 'table', title: 'Ghar',
      columns: [{ label: 'Customer' }, { label: 'Pata', wideOnly: true }, { label: 'Quantity' }, { label: 'Diya' }, { label: 'Sign / note' }],
      rows: all.filter((d) => d.status !== 'CANCELLED').map((d) => [`${d.customer?.name ?? ''} (${d.customer?.customerNumber ?? ''})`, [d.customer?.address, d.customer?.area].filter(Boolean).join(', '), liters(d.scheduledQty), d.status === 'DELIVERED' ? liters(d.deliveredQty) : '', '']),
    }],
  });

  const loading = sheetQ.isLoading;
  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Ghar delivery — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: ListChecks, color: '#2563eb', title: 'List banayein', text: 'Subah ya shaam chun kar "List banayein" dabayein — har customer ki roz ki quantity se list ban jati hai. Ruke hue customer list me nahi aate.' },
            { icon: CheckCircle2, color: '#16a34a', title: 'Pohancha', text: 'Rider wapas aaye to har ghar par ✓ dabayein, ya "Sab pohancha" se baqi sab ek saath. Har delivery customer ke khate me bill ban kar likhi jati hai.' },
            { icon: Pencil, color: '#d97706', title: 'Kam / zyada diya', text: 'Pencil se asal quantity likhein. Darwaze par paise mile hon to wahin likhein — baqi khate me jata hai.' },
            { icon: Undo2, color: '#e11d48', title: 'Naga aur ghalti', text: 'Ghar band tha to Naga. Pohanchi hui delivery badalne se us ka bill void hota hai — is ke liye "Bill void" ki permission chahiye.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'extra delivery'], ['←/→', 'pichla / agla din'], ['G', 'guide']]} />
      )}

      <PageHero title="Ghar delivery" chip={<><CalendarDays />{date === today ? 'Aaj' : longDate(date)}</>} busy={sheetQ.isFetching && !loading} loading={loading}
        meta={`${slotLabel(slot)} ki list${routeName ? ` · ${routeName}` : ''} — pohanchi delivery khud khate me likhi jati hai`}
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Rider ki list" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={() => setAdding(true)} className={heroButton}><Plus className="h-4 w-4" />Extra delivery</button>
          <button type="button" onClick={() => generate.mutate()} disabled={generate.isPending || date > today} className={heroPrimaryButton}><ListChecks className="h-4 w-4" />{generate.isPending ? 'Ban rahi…' : 'List banayein'}</button>
        </>}
        stats={[
          { label: 'Doodh gaya', value: liters(s?.totalLiters ?? 0), hint: `Subah ${liters(s?.morningLiters)} · Shaam ${liters(s?.eveningLiters)}` },
          { label: 'Khate me likha', value: money(s?.totalRevenue ?? 0) },
          { label: 'Darwaze par mila', value: money(s?.collected ?? 0) },
        ]} />

      <KpiRow cols={4}>
        {!s ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Clock} color="#d97706" label="Baqi" value={counts.pending} hint={pending.length ? liters(pending.reduce((t, d) => t + d.scheduledQty, 0)) : 'Sab ho gayi'} onClick={() => setTab('pending')} active={tab === 'pending'} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Pohancha" value={counts.delivered} onClick={() => setTab('delivered')} active={tab === 'delivered'} />
            <KpiCard icon={Ban} color="#64748b" label="Naga / cancel" value={counts.skipped} onClick={() => setTab('skipped')} active={tab === 'skipped'} />
            <KpiCard icon={Wallet} color="#2563eb" label="Aaj ka total (sab waqt)" value={money(s.totalRevenue)} hint={`${s.deliveredCount} delivery`} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Customer ka naam, number, phone ya pata…" />}
        chips={search.trim() || routeId ? <>
          {routeId && <FilterChip onRemove={() => setRouteId('')}>{routeName ?? 'Route'}</FilterChip>}
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setRouteId(''); }}>
        <div className="flex items-center gap-1 rounded-xl ring-1 ring-slate-200">
          <button type="button" onClick={() => setDate((d) => shiftDay(d, -1))} aria-label="Pichla din" className="flex h-10 w-9 items-center justify-center text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
          <input type="date" value={date} max={shiftDay(today, 1)} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-10 bg-transparent text-[0.8125rem] font-semibold text-slate-800 outline-none" />
          <button type="button" onClick={() => setDate((d) => shiftDay(d, 1))} disabled={date > today} aria-label="Agla din" className="flex h-10 w-9 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <Segmented value={slot} onChange={(v) => setSlot(v as Slot)} items={[{ value: 'MORNING', label: 'Subah' }, { value: 'EVENING', label: 'Shaam' }]} />
        <FilterMenu icon={RouteIcon} label={routeName ?? 'Route'} value={routeId} active={!!routeId} onChange={setRouteId}
          options={[{ value: '', label: 'Sab route' }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: r.name, hint: r.areaName ?? undefined }))]} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: sheetQ.data ? counts[t.id] : null }))}
        right={tab === 'pending' && pending.length > 0 && date <= today ? (
          <Button size="sm" leftIcon={<CheckCheck className="h-4 w-4" />} loading={deliverAll.isPending} onClick={() => deliverAll.mutate()}>Sab pohancha ({pending.length})</Button>
        ) : undefined} />

      <ListCard>
        {loading ? <ListLoading /> : rows.length === 0 ? (
          all.length === 0 ? (
            <Empty icon={Truck} title={`${slotLabel(slot)} ki list abhi nahi bani`} text="Har customer ki roz ki quantity se list banti hai. Naya customer Customers me jorein."
              action={<Button leftIcon={<ListChecks className="h-4 w-4" />} loading={generate.isPending} disabled={date > today} onClick={() => generate.mutate()}>List banayein</Button>} />
          ) : <Empty icon={CheckCircle2} title={tab === 'pending' ? 'Sab ghar ho gaye' : 'Is tab me kuch nahi'} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((d) => {
              const st = DELIVERY_STATUS[d.status];
              const done = d.status === 'DELIVERED';
              const changed = done && Math.abs(d.deliveredQty - d.scheduledQty) > 0.0005;
              return (
                <li key={d.id} className="grid gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.6fr)_8rem_8rem_8rem_auto] lg:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{d.customer?.name ?? 'Customer'} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{d.customer?.customerNumber}</span></p>
                    <p className="truncate text-[0.75rem] text-slate-500">{[d.customer?.address, d.customer?.area, d.customer?.route?.name].filter(Boolean).join(' · ') || '—'}{d.skipReason ? ` · ${d.skipReason}` : ''}</p>
                  </div>
                  <p className="text-[0.875rem] tabular-nums text-slate-800">
                    {done ? liters(d.deliveredQty) : liters(d.scheduledQty)}
                    {changed && <span className="ml-1 text-[0.75rem] text-amber-700">(roz {qty(d.scheduledQty)})</span>}
                  </p>
                  <p className="text-[0.8125rem] tabular-nums text-slate-600">{money(d.ratePerLiter)}/L · <span className="font-semibold text-slate-900">{money(done ? d.totalAmount : d.ratePerLiter * d.scheduledQty)}</span></p>
                  <Pill tone={st?.tone ?? ''}>{st?.label ?? d.status}{done && d.paidAmount > 0 ? ` · ${money(d.paidAmount)} mila` : ''}</Pill>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {d.status === 'SCHEDULED' || d.status === 'SKIPPED' ? (
                      <>
                        <Button size="sm" variant="success" leftIcon={<CheckCircle2 className="h-4 w-4" />} loading={deliverOne.isPending && deliverOne.variables?.id === d.id} disabled={date > today} onClick={() => deliverOne.mutate(d)}>Pohancha</Button>
                        <Button size="sm" variant="secondary" aria-label="Quantity ya paise likh kar" onClick={() => setEditing(d)}><Pencil className="h-4 w-4" /></Button>
                        {d.status === 'SCHEDULED' && <Button size="sm" variant="ghost" onClick={() => setUndo({ d, kind: 'skip' })}>Naga</Button>}
                      </>
                    ) : done ? (
                      <>
                        <Button size="sm" variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} disabled={!canVoid} title={canVoid ? 'Quantity badlein' : '"Bill void" ki permission chahiye'} onClick={() => setEditing(d)}>Badlein</Button>
                        <Button size="sm" variant="ghost" disabled={!canVoid} title={canVoid ? undefined : '"Bill void" ki permission chahiye'} onClick={() => setUndo({ d, kind: 'skip' })}>Naga tha</Button>
                      </>
                    ) : null}
                    {d.status !== 'CANCELLED' && d.status !== 'DELIVERED' && <Button size="sm" variant="ghost" aria-label="Cancel" onClick={() => setUndo({ d, kind: 'cancel' })}><Ban className="h-4 w-4" /></Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ListCard>

      {editing && <DeliverModal delivery={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); refresh(); }} />}
      {undo && (
        <ReasonModal title={undo.kind === 'skip' ? `${undo.d.customer?.name ?? ''} — naga` : 'Delivery cancel'} danger={undo.kind === 'cancel'}
          description={undo.d.status === 'DELIVERED' ? 'Ye delivery khate me likhi ja chuki — us ka bill void hoga aur doodh stock me wapas aayega' : undefined}
          cta={undo.kind === 'skip' ? 'Naga likhein' : 'Cancel karein'} withPin={undo.d.status === 'DELIVERED'} busy={undoM.isPending}
          presets={undo.kind === 'skip' ? ['Ghar band tha', 'Customer ne mana kiya', 'Bahar gaye hain', 'Rider nahi gaya'] : ['Ghalti se bani', 'Customer chhor gaya']}
          onSubmit={(v) => undoM.mutate({ d: undo.d, kind: undo.kind, ...v })} onClose={() => setUndo(null)} />
      )}
      {adding && <ExtraDeliveryModal date={date} slot={slot} onClose={() => setAdding(false)} onDone={() => { setAdding(false); refresh(); }} />}
    </PageShell>
  );
}

/** Delivered with a different quantity, money taken at the door, or a correction. */
function DeliverModal({ delivery: d, onClose, onDone }: { delivery: DairyDelivery; onClose: () => void; onDone: () => void }) {
  const { sales: money } = useMasked();
  const posted = d.status === 'DELIVERED';
  const [q, setQ] = useState(qty(posted ? d.deliveredQty : d.scheduledQty));
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState('CASH');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const n = numIn(q) ?? 0;
  const amount = Math.round(n * d.ratePerLiter * 100) / 100;
  const save = useMutation({
    mutationFn: () => dairyDeliveriesApi.deliver(d.id, { deliveredQty: n, paidAmount: numIn(paid) ?? undefined, paymentMethod: method, managerPin: pin || undefined }),
    onSuccess: () => { toast.success(posted ? 'Delivery badal di — naya bill khate me' : 'Delivery save'); onDone(); },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const submit = () => {
    const e: Record<string, string> = {};
    if (!(n > 0) || n > 1000) e.qty = 'Quantity 0 se zyada aur 1000 se kam';
    const p = numIn(paid) ?? 0;
    if (p < 0) e.paid = 'Paise manfi nahi ho sakte';
    if (p > amount + 0.01) e.paid = `Bill sirf ${money(amount)} ka hai — zyada paise customer ke khate me "Payment" se lein`;
    setErr(e);
    if (Object.keys(e).length) return;
    save.mutate();
  };
  const steps = [0.5, 1, 1.5, 2, 3, 5];
  return (
    <Modal open onClose={onClose} size="sm" title={`${d.customer?.name ?? 'Customer'} — ${slotLabel(d.slot)}`}
      description={posted ? 'Purana bill void hoga aur nayi quantity ka bill khate me likha jayega' : `Roz ki quantity ${liters(d.scheduledQty)} · rate ${money(d.ratePerLiter)}`}
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={submit}>{posted ? 'Badal dein' : 'Pohancha'}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <Input label="Kitna diya (liter)" inputMode="decimal" autoFocus value={q} onChange={(e) => setQ(e.target.value)} error={err.qty} hint={`Bill: ${money(amount)}`} />
        <div className="flex flex-wrap gap-1.5">{steps.map((v) => <button key={v} type="button" onClick={() => setQ(String(v))} className={cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold ring-1', n === v ? 'bg-slate-900 text-white ring-slate-900' : 'ring-slate-200 hover:bg-slate-50')}>{v} L</button>)}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Darwaze par mile (marzi)" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} error={err.paid} hint="Baqi khate me" />
          <Select label="Kaise" value={method} onChange={(e) => setMethod(e.target.value)} options={PAY_METHODS} />
        </div>
        {posted && <Input label="Manager PIN" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} hint="Dukaan ne void par PIN lagaya ho to zaroori hai" />}
        <p className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600"><Milk className="h-4 w-4 text-sky-600" />Doodh stock se nikalta hai aur bill customer ke khate me jata hai.</p>
      </form>
    </Modal>
  );
}

/** A delivery outside the fixed list: one-off order or extra milk. */
function ExtraDeliveryModal({ date, slot, onClose, onDone }: { date: string; slot: Slot; onClose: () => void; onDone: () => void }) {
  const { sales: money } = useMasked();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [picked, setPicked] = useState<DairyCustomer | null>(null);
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [now, setNow] = useState(true);
  const [err, setErr] = useState('');
  const listQ = useQuery({
    queryKey: [DAIRY_KEYS.customers, 'pick', q],
    queryFn: () => dairyCustomersApi.page({ tab: 'all', search: q || undefined, limit: 8 }),
    enabled: !picked,
  });
  const save = useMutation({
    mutationFn: () => dairyDeliveriesApi.add({
      dairyCustomerId: picked!.id, deliveryDate: date, slot, scheduledQty: numIn(amount)!, ratePerLiter: numIn(rate) ?? undefined, deliverNow: now,
    }),
    onSuccess: () => { toast.success(now ? 'Delivery khate me likh di' : 'List me jor di'); onDone(); },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const submit = () => {
    if (!picked) { setErr('Customer chunein'); return; }
    const n = numIn(amount);
    if (!n || n <= 0 || n > 1000) { setErr('Quantity 0 se zyada aur 1000 se kam'); return; }
    setErr('');
    save.mutate();
  };
  return (
    <Modal open onClose={onClose} size="md" title={`Extra delivery — ${slotLabel(slot)}`} description="Roz ki list ke ilawa — jaise mehmaan aaye, ya jab maange wala customer"
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={submit}>{now ? 'Pohancha — khate me likhein' : 'List me jorein'}</Button></>}>
      <div className="space-y-3">
        {picked ? (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
            <div><p className="font-semibold text-slate-900">{picked.name}</p><p className="text-[0.75rem] text-slate-500">{picked.customerNumber} · {picked.address ?? picked.phone ?? ''}</p></div>
            <button type="button" onClick={() => setPicked(null)} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Badlein</button>
          </div>
        ) : (
          <div>
            <SearchField value={search} onChange={setSearch} placeholder="Customer ka naam, number ya phone…" />
            <ul className="mt-2 max-h-56 divide-y divide-slate-100 overflow-auto rounded-xl ring-1 ring-slate-200">
              {(listQ.data?.items ?? []).filter((c) => c.status !== 'CLOSED').map((c) => (
                <li key={c.id}><button type="button" onClick={() => { setPicked(c); if (c.customRate) setRate(String(c.customRate)); }} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50">
                  <span><span className="font-medium text-slate-900">{c.name}</span> <span className="text-[0.75rem] text-slate-500">{c.customerNumber}</span></span>
                  <span className="text-[0.75rem] text-slate-500">{c.area ?? ''}</span>
                </button></li>
              ))}
              {listQ.data && listQ.data.items.length === 0 && <li className="px-3 py-4 text-center text-[0.8125rem] text-slate-500">Koi customer nahi mila — pehle Customers me jorein</li>}
            </ul>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Quantity (liter)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input label="Rate (marzi)" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} hint="Khali = customer ya dukaan ka rate" />
        </div>
        {numIn(amount) && numIn(rate) ? <p className="text-[0.8125rem] text-slate-600">Bill: {money((numIn(amount) ?? 0) * (numIn(rate) ?? 0))}</p> : null}
        <label className="flex items-center gap-2 text-[0.875rem] text-slate-700"><input type="checkbox" checked={now} onChange={(e) => setNow(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />Abhi de diya (khate me abhi likhein)</label>
        {err && <p className="text-[0.8125rem] font-medium text-rose-600">{err}</p>}
      </div>
    </Modal>
  );
}
