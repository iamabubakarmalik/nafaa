/**
 * Regular supply plans: a hotel's daily chicken, a family's weekly mutton.
 * "Aaj ka order" makes the delivery as a weight order at today's rates with
 * the agreed discount; it is weighed and billed from the orders page, so
 * stock and money follow the bill. Plans can be paused, resumed or closed.
 *
 * Keys: N new plan · / search · 1 plans · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BarChart3, Ban, CalendarClock, FileSpreadsheet, GraduationCap, Package, Pause, Pencil, Play, Plus, Trash2, Truck } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, FilterBar, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { subscriptionsApi, type Subscription, type SubscriptionFreq } from '../api/subscriptions.api';
import { CustomerPick, ItemPick, type PickedCustomer } from '../components/pickers';
import { FormRow, ListFrame, Pill, inputBox, useConfirm, usePageKeys, useSaveKey, type Tone } from '../components/ui';
import { KEYS, apiError, dateOnly, decimal, kg } from '../lib/meta';
import { t as tr } from '@core/i18n';

type View = 'list' | 'analytics';
const FREQ: Array<{ value: SubscriptionFreq; label: string }> = [
  { value: 'DAILY', label: tr('Roz') }, { value: 'ALTERNATE_DAY', label: tr('Ek din chhor kar') }, { value: 'WEEKLY', label: tr('Hafte me ek') },
  { value: 'BIWEEKLY', label: tr('Do hafte me ek') }, { value: 'MONTHLY', label: tr('Mahine me ek') },
];
const freqLabel = (v: string) => FREQ.find((f) => f.value === v)?.label ?? v;
const STATUS: Record<string, { label: string; tone: Tone }> = { ACTIVE: { label: tr('Chalu'), tone: 'emerald' }, PAUSED: { label: tr('Ruki hui'), tone: 'amber' }, CANCELLED: { label: tr('Band'), tone: 'rose' }, EXPIRED: { label: tr('Khatam'), tone: 'slate' }, COMPLETED: { label: tr('Poori'), tone: 'slate' } };
const isDue = (s: Subscription) => s.status === 'ACTIVE' && !!s.nextDeliveryDate && new Date(s.nextDeliveryDate).getTime() <= Date.now() + 86_400_000;

interface Line { productId: string; name: string; kg: string }

function PlanForm({ s, onClose, onDone }: { s: Subscription | null; onClose: () => void; onDone: () => void }) {
  const [customer, setCustomer] = useState<PickedCustomer | null>(s ? { id: s.customerId, name: s.contactPerson ?? 'Customer', phone: s.contactPhone ?? null, balance: 0 } : null);
  const [freq, setFreq] = useState<SubscriptionFreq>(s?.frequency ?? 'DAILY');
  const [address, setAddress] = useState(s?.deliveryAddress ?? '');
  const [slot, setSlot] = useState(s?.deliveryTimeSlot ?? '');
  const [discount, setDiscount] = useState(s?.discountPct ? String(s.discountPct) : '');
  const [lines, setLines] = useState<Line[]>(s?.standardItems.map((i) => ({ productId: i.productId, name: i.productName, kg: String(i.kg) })) ?? []);
  const [notes, setNotes] = useState(s?.notes ?? '');
  const [tried, setTried] = useState(false);
  const errors: Record<string, string> = {};
  if (!customer) errors.customer = tr('Customer chunein');
  if (!address.trim()) errors.address = tr('Delivery ka pata likhein');
  if (!lines.length) errors.lines = tr('Kam se kam ek item');
  if (lines.some((l) => !(Number(l.kg) > 0))) errors.kg = tr('Har item ke kg likhein');
  if (discount !== '' && !(Number(discount) >= 0 && Number(discount) <= 50)) errors.discount = tr('Discount 0 se 50% tak');
  const err = (k: string) => (tried ? errors[k] : undefined);
  const save = useMutation({
    mutationFn: () => {
      const body = { customerId: customer!.id, frequency: freq, deliveryAddress: address.trim(), deliveryTimeSlot: slot.trim() || null, discountPct: Number(discount) || 0, notes: notes.trim() || null, standardItems: lines.map((l) => ({ productId: l.productId, kg: Number(l.kg) })) };
      return s ? subscriptionsApi.update(s.id, body) : subscriptionsApi.create(body);
    },
    onSuccess: (r) => { toast.success(s ? tr('Plan badal diya') : tr('Plan {{subscriptionNumber}} ban gaya', { subscriptionNumber: r.subscriptionNumber })); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Plan save nahi hua'))),
  });
  const submit = () => { setTried(true); const f = Object.values(errors)[0]; if (f) { toast.error(f); return; } if (!save.isPending) save.mutate(); };
  useSaveKey(submit);
  return (
    <Modal open onClose={onClose} size="lg" title={s ? tr('{{subscriptionNumber}} badlein', { subscriptionNumber: s.subscriptionNumber }) : tr('Naya supply plan')} description={tr('Ctrl+S se save')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} onClick={submit}>{tr('Save')}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <FormRow label={tr('Customer')} error={err('customer')}><CustomerPick value={customer} onChange={setCustomer} /></FormRow>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormRow label={tr('Kitni dafa')}><select value={freq} onChange={(e) => setFreq(e.target.value as SubscriptionFreq)} className={inputBox}>{FREQ.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select></FormRow>
          <FormRow label={tr('Waqt (marzi)')}><input value={slot} onChange={(e) => setSlot(e.target.value)} maxLength={60} className={inputBox} placeholder={tr('Subah 9 se 10')} /></FormRow>
          <FormRow label={tr('Discount %')} error={err('discount')}><input inputMode="decimal" value={discount} onChange={(e) => setDiscount(decimal(e.target.value))} className={cn(inputBox, 'text-end')} placeholder="0" /></FormRow>
        </div>
        <FormRow label={tr('Delivery ka pata')} error={err('address')}><input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={1000} className={inputBox} aria-invalid={!!err('address')} /></FormRow>
        <div className="space-y-2">
          <p className="text-[0.8125rem] font-medium text-slate-700">{tr('Har delivery me')}</p>
          {lines.map((l, i) => (
            <div key={l.productId} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-[0.875rem] ring-1 ring-slate-200">{l.name}</span>
              <input inputMode="decimal" aria-label={tr('{{name}} kg', { name: l.name })} value={l.kg} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, kg: decimal(e.target.value) } : x)))} placeholder="kg" className="h-10 w-24 rounded-lg bg-slate-100 px-2 text-end outline-none focus:bg-white focus:ring-2 focus:ring-brand-500" />
              <button type="button" aria-label={tr('Hatayein')} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <ItemPick onPick={(i) => setLines((ls) => [...ls, { productId: i.id, name: i.name, kg: '' }])} exclude={lines.map((l) => l.productId)} placeholder={tr('Item jorein: murgi dressed, boneless…')} error={err('lines') ?? err('kg')} />
          <p className="text-[0.75rem] text-slate-500">{tr('Rate har delivery ke din ka lagta hai — plan me rate fix nahi hota.')}</p>
        </div>
        <Input label={tr('Note (marzi)')} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
      </form>
    </Modal>
  );
}

function ReasonModal({ title, yes, onConfirm, onClose }: { title: string; yes: string; onConfirm: (r: string) => Promise<unknown>; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const go = useMutation({ mutationFn: () => onConfirm(reason.trim()), onSuccess: onClose, onError: (e) => toast.error(apiError(e, tr('Nahi hua'))) });
  return (
    <Modal open onClose={onClose} size="sm" title={title}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button variant="danger" loading={go.isPending} onClick={() => go.mutate()}>{yes}</Button></>}>
      <Input data-autofocus label={tr('Wajah (marzi)')} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
    </Modal>
  );
}

export default function SubscriptionsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales } = useMasked();
  const canEdit = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  const canPos = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('list');
  const [status, setStatus] = useState('ACTIVE');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<{ kind: 'new' } | { kind: 'edit' | 'pause' | 'cancel'; s: Subscription } | null>(null);
  const [ask, confirmDialog] = useConfirm();
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const listQ = useQuery({ queryKey: [KEYS.subs, status, query], queryFn: () => subscriptionsApi.list({ status: status || undefined, search: query || undefined }), placeholderData: (p) => p });
  const rows = listQ.data ?? [];
  const active = rows.filter((s) => s.status === 'ACTIVE');
  const due = active.filter(isDue);
  const refresh = () => [KEYS.subs, KEYS.orders].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const deliver = useMutation({
    mutationFn: (s: Subscription) => subscriptionsApi.deliver(s.id),
    onSuccess: (o) => {
      toast.success(tr('Order {{orderNumber}} ban gaya — {{total}}', { orderNumber: o.orderNumber, total: formatPKR(o.total) }), { action: { label: tr('Orders'), onClick: () => navigate('/meat/weight-orders?tab=today') } });
      refresh();
    },
    onError: (e) => toast.error(apiError(e, tr('Order nahi bana'))),
  });
  const resume = useMutation({ mutationFn: (s: Subscription) => subscriptionsApi.resume(s.id), onSuccess: () => { toast.success(tr('Plan dobara chalu')); refresh(); }, onError: (e) => toast.error(apiError(e, tr('Nahi hua'))) });

  usePageKeys({ n: canEdit ? () => setDialog({ kind: 'new' }) : undefined, '1': () => setView('list'), '2': () => setView('analytics'), g: guide.open }, searchRef);

  const printDoc = (): PrintDoc => ({
    title: 'Supply plans', subtitle: STATUS[status]?.label ?? 'Sab',
    sections: [{ kind: 'table', columns: [{ label: '#' }, { label: 'Customer' }, { label: 'Kitni dafa' }, { label: 'Items' }, { label: 'Agli delivery' }, { label: 'Mahana andaza', align: 'right' }],
      rows: rows.map((s) => [s.subscriptionNumber, `${s.contactPerson ?? ''} ${s.contactPhone ?? ''}`, freqLabel(s.frequency), s.standardItems.map((i) => `${i.productName} ${i.kg}kg`).join(', '), dateOnly(s.nextDeliveryDate), formatPKR(s.monthlyEstimate)]) }],
  });

  return (
    <PageShell>
      <PageHero
        title={tr('Supply plans')}
        chip={<><CalendarClock /> {' '}{tr('Roz / hafte ki delivery')}</>}
        meta={tr('Hotel ki roz ki murgi, ghar ka hafte ka mutton — har delivery ek order ban kar bill hoti hai')}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!rows.length} /></span>
          <button type="button" title={tr('CSV')} className={heroIconButton} disabled={!rows.length}
            onClick={() => downloadCsv('supply-plans.csv', [['#', tr('Customer'), tr('Phone'), tr('Kitni dafa'), tr('Items'), tr('Kg / mahina'), tr('Mahana andaza'), tr('Discount %'), tr('Deliveries'), tr('Halat')], ...rows.map((s) => [s.subscriptionNumber, s.contactPerson, s.contactPhone, freqLabel(s.frequency), s.standardItems.map((i) => `${i.productName} ${i.kg}`).join('; '), s.totalMonthlyKg, s.monthlyEstimate, s.discountPct, s.totalDeliveries, STATUS[s.status]?.label])])}>
            <FileSpreadsheet className="h-4 w-4" />
          </button>
          <Link to="/meat/weight-orders" className={heroButton}><Package className="h-4 w-4" /><span className="hidden sm:inline">{tr('Orders')}</span></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setDialog({ kind: 'new' })} title={tr('Naya plan (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Naya plan')}</button>}
        </>}
        stats={[{ label: tr('Chalu'), value: active.length }, { label: tr('Aaj / kal'), value: due.length }, { label: tr('Mahana andaza'), value: sales(active.reduce((t, s) => t + s.monthlyEstimate, 0)) }]}
      />

      <KpiRow cols={4}>
        {listQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={CalendarClock} color="#16a34a" label={tr('Chalu plan')} value={active.length} onClick={() => setStatus('ACTIVE')} active={status === 'ACTIVE'} />
          <KpiCard icon={Truck} color={due.length ? '#d97706' : '#64748b'} label={tr('Delivery aaj / kal')} value={due.length} hint={tr('Order banayein')} />
          <KpiCard icon={Package} color="#0891b2" label={tr('Kg / mahina')} value={kg(active.reduce((t, s) => t + s.totalMonthlyKg, 0))} hint={tr('Andaza')} />
          <KpiCard icon={Pause} color="#a16207" label={tr('Ruki hui')} value={rows.filter((s) => s.status === 'PAUSED').length} onClick={() => setStatus('PAUSED')} active={status === 'PAUSED'} />
        </>}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Plan #, naam, phone, pata…')} label={tr('Search')} />}>
        <FilterMenu icon={CalendarClock} label={STATUS[status]?.label ?? tr('Sab')} value={status} active={status !== 'ACTIVE'} onChange={setStatus}
          options={[...Object.entries(STATUS).slice(0, 3).map(([value, s]) => ({ value, label: s.label })), { value: '', label: tr('Sab') }]} />
      </FilterBar>

      <ViewTabs value={view} onChange={setView} hint={<>{tr('{{value}}/ search · 1-2 tabs', { value: canEdit ? tr('N naya · ') : '' })}</>}
        tabs={[{ id: 'list', label: tr('Plans'), icon: CalendarClock, count: rows.length }, { id: 'analytics', label: tr('Analytics'), icon: BarChart3 }]} />

      {view === 'analytics' ? (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <h3 className="font-semibold text-slate-900">{tr('Chalu plans — mahine ka maal')}</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {Object.entries(active.reduce<Record<string, number>>((acc, s) => {
              const per = s.totalMonthlyKg / Math.max(s.standardItems.reduce((t, i) => t + i.kg, 0), 0.001);
              for (const i of s.standardItems) acc[i.productName] = (acc[i.productName] ?? 0) + i.kg * per;
              return acc;
            }, {})).sort((a, b) => b[1] - a[1]).map(([n, v]) => <li key={n} className="flex justify-between py-2 text-[0.875rem]"><span>{n}</span><span className="font-semibold tabular-nums">{kg(v)}</span></li>)}
            {!active.length && <li className="py-6 text-center text-sm text-slate-500">{tr('Koi chalu plan nahi')}</li>}
          </ul>
        </div>
      ) : (
        <ListFrame loading={listQ.isLoading} error={listQ.isError && !listQ.data} onRetry={() => listQ.refetch()}
          empty={!rows.length ? { icon: CalendarClock, title: tr('Koi plan nahi'), text: tr('Jo customer roz ya har hafte leta hai us ka plan banayein — har delivery par ek click se order ban jata hai.'), actions: canEdit ? <Button onClick={() => setDialog({ kind: 'new' })} leftIcon={<Plus className="h-4 w-4" />}>{tr('Naya plan')}</Button> : undefined } : null}>
          {rows.map((s) => (
            <li key={s.id} className={cn('px-4 py-3 sm:px-5', isDue(s) && 'bg-amber-50/50')}>
              <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-slate-900">{s.contactPerson ?? tr('Customer')}</span>
                    <span className="text-[0.75rem] text-slate-500">{s.subscriptionNumber}</span>
                    <Pill tone={STATUS[s.status]?.tone}>{STATUS[s.status]?.label ?? s.status}</Pill>
                    <Pill>{freqLabel(s.frequency)}</Pill>
                    {s.discountPct > 0 && <Pill tone="amber">{tr('{{discountPct}}% discount', { discountPct: s.discountPct })}</Pill>}
                  </div>
                  <p className="mt-0.5 text-[0.8125rem] text-slate-600">{s.standardItems.map((i) => `${i.productName} ${kg(i.kg)}`).join(' · ')}</p>
                  <p className="text-[0.75rem] text-slate-500">{tr('{{deliveryAddress}}{{value}} · {{totalDeliveries}} delivery ho chuki{{value2}}', { deliveryAddress: s.deliveryAddress, value: s.deliveryTimeSlot ? ` · ${s.deliveryTimeSlot}` : '', totalDeliveries: s.totalDeliveries, value2: s.pauseReason ? tr(' · Ruki: {{pauseReason}}', { pauseReason: s.pauseReason }) : '' })}</p>
                </div>
                <div className="text-end text-[0.8125rem]">
                  <p className={cn('font-semibold', isDue(s) && 'text-amber-700')}>{tr('Agli: {{nextDeliveryDate}}', { nextDeliveryDate: dateOnly(s.nextDeliveryDate) })}</p>
                  <p className="text-slate-500">{tr('~{{monthlyEstimate}} / mahina', { monthlyEstimate: sales(s.monthlyEstimate) })}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.status === 'ACTIVE' && canPos && <Button size="sm" variant={isDue(s) ? 'primary' : 'secondary'} loading={deliver.isPending && deliver.variables?.id === s.id} leftIcon={<Truck className="h-3.5 w-3.5" />} onClick={async () => {
                  if (!isDue(s) && !(await ask({ title: tr('Abhi order banayein?'), text: tr('Agli delivery {{nextDeliveryDate}} ko hai. Pehle bana dein to agli tareekh aage chali jayegi.', { nextDeliveryDate: dateOnly(s.nextDeliveryDate) }), yes: tr('Haan, banayein') }))) return;
                  deliver.mutate(s);
                }}>{tr('Aaj ka order')}</Button>}
                {canEdit && s.status === 'ACTIVE' && <Button size="sm" variant="ghost" leftIcon={<Pause className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'pause', s })}>{tr('Rokein')}</Button>}
                {canEdit && s.status === 'PAUSED' && <Button size="sm" variant="secondary" leftIcon={<Play className="h-3.5 w-3.5" />} onClick={() => resume.mutate(s)}>{tr('Dobara chalayein')}</Button>}
                {canEdit && s.status !== 'CANCELLED' && <>
                  <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'edit', s })}>{tr('Badlein')}</Button>
                  <Button size="sm" variant="ghost" leftIcon={<Ban className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'cancel', s })}>{tr('Band karein')}</Button>
                </>}
              </div>
            </li>
          ))}
        </ListFrame>
      )}

      {(dialog?.kind === 'new' || dialog?.kind === 'edit') && <PlanForm s={dialog.kind === 'edit' ? dialog.s : null} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog?.kind === 'pause' && <ReasonModal title={tr('{{subscriptionNumber}} rokein?', { subscriptionNumber: dialog.s.subscriptionNumber })} yes={tr('Rokein')} onClose={() => { setDialog(null); refresh(); }} onConfirm={(r) => subscriptionsApi.pause(dialog.s.id, r)} />}
      {dialog?.kind === 'cancel' && <ReasonModal title={tr('{{subscriptionNumber}} band karein?', { subscriptionNumber: dialog.s.subscriptionNumber })} yes={tr('Band karein')} onClose={() => { setDialog(null); refresh(); }} onConfirm={(r) => subscriptionsApi.cancel(dialog.s.id, r)} />}
      {confirmDialog}

      {guide.isOpen && (
        <PageGuide title={tr('Supply plans')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#16a34a', title: tr('Plan'), text: tr('Customer, kitni dafa, pata aur har delivery ke items aur kg. Discount % har order par khud lagta hai.') },
            { icon: Truck, color: '#d97706', title: tr('Aaj ka order'), text: tr('Delivery ke din "Aaj ka order" dabayein — aaj ke rate par order banta hai, agli tareekh aage chali jati hai.') },
            { icon: Package, color: '#0891b2', title: tr('Tol kar bill'), text: tr('Order ki list me asal wazan likh kar bill banayein — stock, sale aur khata wahin se.') },
          ]}
          tips={[tr('Plan banane ke liye Customers edit ki ijazat; order ke liye POS ki.'), tr('Ek plan ka order khula ho to doosra nahi banta — pehle wo dein.')]}
          shortcuts={[['N', tr('naya plan')], ['/', 'dhoondein'], ['1', 'plans'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
