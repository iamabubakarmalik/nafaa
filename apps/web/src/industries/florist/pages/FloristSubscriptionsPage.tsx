/**
 * Flower subscriptions: fresh flowers delivered on a fixed round (daily,
 * weekly, every two weeks, monthly) to a home or office. Each delivery
 * written here becomes a bill on the customer's khata, so it shows in
 * sales, profit and udhaar; the customer pays through the khata. Paused
 * rounds are not owed. Subscriptions are closed, never deleted.
 */

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, CheckCircle2, Download, GraduationCap, ListChecks, Pause, Pencil, Play, Plus, Repeat, Truck, Wallet, XCircle } from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Textarea, ViewTabs,
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
import {
  floristSubscriptionsApi, type FloristSubscription, type SubscriptionFrequency, type SubscriptionInput,
} from '../api/subscriptions.api';
import { ConfirmModal, Empty, ListCard, ListLoading, Pager, Pill, actionBtn, primaryBtn } from '../components/ui';
import { useDebounced, usePageKeys, useSaveKey } from '../hooks/usePageKeys';
import { FLORIST_KEYS, FREQUENCY, MONEY_KEYS, SUB_STATUS, dayKey, daysFromToday, errorText, longDate, numIn, phoneOk, shortDate } from '../lib/meta';

type Tab = 'due' | 'ACTIVE' | 'PAUSED' | 'all';
const LIMIT = 25;
const STATUS_OPTIONS = [{ value: '', label: 'Sab halat' }, ...Object.entries(SUB_STATUS).map(([value, s]) => ({ value, label: s.label }))];

export default function FloristSubscriptionsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canWork = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('due');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FloristSubscription | 'new' | null>(null);
  const [ask, setAsk] = useState<{ s: FloristSubscription; kind: 'deliver' | 'cancel' } | null>(null);

  const params = {
    search: q || undefined, page, limit: LIMIT,
    due: tab === 'due' ? true : undefined,
    status: tab === 'ACTIVE' || tab === 'PAUSED' ? tab : status || undefined,
  };
  const listQ = useQuery({ queryKey: [FLORIST_KEYS.subscriptions, 'paged', params], queryFn: () => floristSubscriptionsApi.paged(params), placeholderData: (p) => p });
  const headQ = useQuery({ queryKey: [FLORIST_KEYS.subscriptions, 'head'], queryFn: () => floristSubscriptionsApi.paged({ limit: 1 }) });
  const rows = listQ.data?.items ?? [];
  const counts = headQ.data?.counts ?? {};
  usePageKeys(searchRef, { n: () => canWork && setForm('new'), t: () => setTab('due') });

  const refresh = () => [FLORIST_KEYS.subscriptions, 'florist-dashboard-overview', ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const deliver = useMutation({
    mutationFn: (s: FloristSubscription) => floristSubscriptionsApi.markDelivered(s.id),
    onSuccess: (r) => { refresh(); setAsk(null); toast.success(r.sale ? `Delivery likhi — bill ${r.sale.saleNumber} khate me` : 'Delivery likh di'); },
    onError: (e) => toast.error(errorText(e, 'Delivery nahi likhi')),
  });
  const act = useMutation({
    mutationFn: ({ s, kind }: { s: FloristSubscription; kind: 'pause' | 'resume' | 'cancel' }) => floristSubscriptionsApi[kind](s.id),
    onSuccess: (s) => { refresh(); setAsk(null); toast.success(`${s.subscriptionNumber}: ${SUB_STATUS[s.status]?.label}`); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });

  const exportCsv = () => {
    if (!rows.length) { toast.error('Is filter me kuch nahi'); return; }
    downloadCsv('florist-subscriptions.csv', [
      ['Number', 'Customer', 'Phone', 'Pata', 'Plan', 'Bouquet', 'Kitni dafa', 'Rate', 'Agli delivery', 'Deliveries', 'Halat'],
      ...rows.map((s) => [s.subscriptionNumber, s.customerName, s.customerPhone, s.deliveryAddress, s.planName, s.bouquetType, FREQUENCY[s.frequency],
        s.pricePerDelivery, s.nextDeliveryDate?.slice(0, 10) ?? '', s.completedDeliveries, SUB_STATUS[s.status]?.label]),
    ]);
  };
  const printList = (): PrintDoc => ({
    title: tab === 'due' ? 'Aaj ki subscription delivery' : 'Subscriptions', subtitle: longDate(dayKey()),
    meta: [['Kitni', String(rows.length)]],
    sections: [{
      kind: 'table', title: 'Delivery',
      columns: [{ label: 'Customer' }, { label: 'Pata' }, { label: 'Bouquet' }, { label: 'Rate', align: 'right' }],
      rows: rows.map((s) => [`${s.customerName} ${s.customerPhone}`, s.deliveryAddress, s.bouquetType, money(s.pricePerDelivery)]),
    }],
  });
  const clear = () => { setSearch(''); setStatus(''); setPage(1); };
  const filtered = !!(search.trim() || status);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Phool subscriptions" onClose={guide.close}
          steps={[
            { icon: Repeat, color: '#db2777', title: 'Plan', text: '"Nayi subscription" me customer, pata, bouquet, rate aur kitni dafa (roz, hafta, mahina) likhein.' },
            { icon: Truck, color: '#0284c7', title: 'Aaj', text: '"Aaj" tab me aaj ki (aur reh jane wali) deliveries. List print kar ke rider ko dein.' },
            { icon: Wallet, color: '#16a34a', title: 'Paisa', text: '"Delivery ho gayi" dabane par us delivery ka bill customer ke khate me udhaar banta hai. Paisa Khata se wasool karein.' },
            { icon: Pause, color: '#d97706', title: 'Rokna', text: 'Customer bahar ho to "Rokein". Dobara chalane par agli delivery aaj se ginti hai — ruke din ka paisa nahi banta.' },
          ]}
          shortcuts={[['N', 'nayi'], ['T', 'aaj'], ['/', 'search'], ['G', 'guide']]} />
      )}

      <PageHero title="Phool subscriptions" busy={listQ.isFetching && !listQ.isLoading} loading={headQ.isLoading} meta="Roz / hafta / mahina — har delivery ka bill khate me"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canWork && <button type="button" onClick={() => setForm('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />Nayi subscription</button>}
        </>}
        stats={[
          { label: 'Aaj deni hain', value: String(headQ.data?.due ?? 0) },
          { label: 'Chalu', value: String(counts.ACTIVE ?? 0) },
          { label: 'Ek round ki value', value: money(headQ.data?.perRound ?? 0) },
        ]} />

      <KpiRow cols={4}>
        {headQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (<>
          <KpiCard icon={Truck} color="#e11d48" label="Aaj deni hain" value={headQ.data?.due ?? 0} active={tab === 'due'} onClick={() => { setTab('due'); setPage(1); }} />
          <KpiCard icon={Play} color="#16a34a" label="Chalu" value={counts.ACTIVE ?? 0} active={tab === 'ACTIVE'} onClick={() => { setTab('ACTIVE'); setPage(1); }} />
          <KpiCard icon={Pause} color="#d97706" label="Ruki hui" value={counts.PAUSED ?? 0} active={tab === 'PAUSED'} onClick={() => { setTab('PAUSED'); setPage(1); }} />
          <KpiCard icon={Wallet} color="#0284c7" label="Ek round ki value" value={money(headQ.data?.perRound ?? 0)} hint="Sab chalu subscriptions" />
        </>)}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Naam, phone, number, plan ya pata…" />}
        chips={filtered ? <>
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          {status && <FilterChip onRemove={() => setStatus('')}>{SUB_STATUS[status]?.label}</FilterChip>}
        </> : undefined}
        onClear={clear}>
        {tab === 'all' && <FilterMenu icon={ListChecks} label={status ? SUB_STATUS[status]?.label : 'Halat'} value={status} active={!!status} options={STATUS_OPTIONS} onChange={(v) => { setStatus(v); setPage(1); }} />}
      </FilterBar>

      <ViewTabs value={tab} onChange={(t) => { setTab(t); setPage(1); }}
        tabs={[
          { id: 'due', label: 'Aaj', icon: Truck, count: headQ.data?.due ?? null },
          { id: 'ACTIVE', label: 'Chalu', icon: Play, count: counts.ACTIVE ?? null },
          { id: 'PAUSED', label: 'Ruki hui', icon: Pause, count: counts.PAUSED ?? null },
          { id: 'all', label: 'Sab', icon: ListChecks },
        ]} />

      <ListCard footer={listQ.data && <Pager page={page} total={listQ.data.total} limit={LIMIT} onPage={setPage} />}>
        {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
          <Empty icon={Repeat} title={tab === 'due' ? 'Aaj koi delivery baqi nahi' : 'Is filter me kuch nahi'}
            text="Ghar ya office me har hafte phool — subscription banayein, har delivery ka bill khud khate me jayega."
            action={canWork ? <button type="button" onClick={() => setForm('new')} className={primaryBtn}><Plus className="h-4 w-4" />Nayi subscription</button> : undefined} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((s) => {
              const left = daysFromToday(s.nextDeliveryDate);
              const dueNow = s.status === 'ACTIVE' && left !== null && left <= 0;
              return (
                <li key={s.id} className="grid gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.6fr)_10rem_9rem_auto] lg:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{s.customerName} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{s.subscriptionNumber}</span></p>
                    <p className="truncate text-[0.75rem] text-slate-500">{[s.planName, s.bouquetType, FREQUENCY[s.frequency]].filter(Boolean).join(' · ')}</p>
                    <p className="truncate text-[0.75rem] text-slate-500">{s.deliveryAddress} · {s.customerPhone}</p>
                  </div>
                  <p className="text-[0.8125rem] text-slate-700">{s.status === 'ACTIVE' ? shortDate(s.nextDeliveryDate) : '—'}
                    <span className={cn('block text-[0.75rem]', dueNow ? 'font-semibold text-rose-700' : 'text-slate-500')}>
                      {s.status !== 'ACTIVE' ? `${s.completedDeliveries} deliveries` : left === null ? '' : left < 0 ? `${-left} din se reh gayi` : left === 0 ? 'Aaj' : `${left} din baad`}
                    </span></p>
                  <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(s.pricePerDelivery)}<span className="block text-[0.75rem] font-normal text-slate-500">har delivery</span></p>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Pill tone={SUB_STATUS[s.status]?.tone ?? ''}>{SUB_STATUS[s.status]?.label ?? s.status}</Pill>
                    {canWork && s.status !== 'CANCELLED' && <button type="button" onClick={() => setForm(s)} className={actionBtn} aria-label="Badlein"><Pencil className="h-4 w-4" /></button>}
                    {canWork && s.status === 'ACTIVE' && <button type="button" disabled={act.isPending} onClick={() => act.mutate({ s, kind: 'pause' })} className={actionBtn}><Pause className="h-4 w-4" />Rokein</button>}
                    {canWork && s.status === 'PAUSED' && <button type="button" disabled={act.isPending} onClick={() => act.mutate({ s, kind: 'resume' })} className={actionBtn}><Play className="h-4 w-4" />Chalayein</button>}
                    {canWork && s.status !== 'CANCELLED' && <button type="button" onClick={() => setAsk({ s, kind: 'cancel' })} className={actionBtn} aria-label="Band karein"><XCircle className="h-4 w-4" /></button>}
                    {canWork && dueNow && <button type="button" onClick={() => setAsk({ s, kind: 'deliver' })} className={primaryBtn}><CheckCircle2 className="h-4 w-4" />Delivery ho gayi</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ListCard>

      {ask?.kind === 'deliver' && <ConfirmModal title="Delivery ho gayi?" cta="Haan, likhein" busy={deliver.isPending} onConfirm={() => deliver.mutate(ask.s)} onClose={() => setAsk(null)}
        text={<>{ask.s.customerName} ki {ask.s.completedDeliveries + 1}vi delivery. {ask.s.pricePerDelivery > 0 ? <>{money(ask.s.pricePerDelivery)} ka bill unke khate me udhaar banega — paisa <Link to="/customers" className="font-semibold text-brand-700 underline">Khata</Link> se lein.</> : 'Is ka koi paisa nahi.'}</>} />}
      {ask?.kind === 'cancel' && <ConfirmModal title="Subscription band?" cta="Haan, band" danger busy={act.isPending} onConfirm={() => act.mutate({ s: ask.s, kind: 'cancel' })} onClose={() => setAsk(null)}
        text="Aage koi delivery nahi banegi. Pichli deliveries ke bill aur khata waise hi rahenge." />}
      {form && <SubscriptionForm sub={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => { refresh(); setForm(null); }} />}
    </PageShell>
  );
}

function SubscriptionForm({ sub, onClose, onSaved }: { sub: FloristSubscription | null; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState({
    customerName: sub?.customerName ?? '', customerPhone: sub?.customerPhone ?? '', deliveryAddress: sub?.deliveryAddress ?? '',
    planName: sub?.planName ?? '', bouquetType: sub?.bouquetType ?? '', frequency: (sub?.frequency ?? 'WEEKLY') as SubscriptionFrequency,
    pricePerDelivery: sub ? String(sub.pricePerDelivery) : '', startDate: sub?.startDate ? dayKey(new Date(sub.startDate)) : dayKey(),
    endDate: sub?.endDate ? dayKey(new Date(sub.endDate)) : '', notes: sub?.notes ?? '',
  });
  const [touched, setTouched] = useState(false);
  const set = (k: keyof typeof d, v: string) => setD((x) => ({ ...x, [k]: v }));
  const price = numIn(d.pricePerDelivery);
  const errors: Partial<Record<keyof typeof d, string>> = {};
  if (!d.customerName.trim()) errors.customerName = 'Customer ka naam likhein';
  if (!phoneOk(d.customerPhone)) errors.customerPhone = 'Phone 10 se 15 hindse';
  if (!d.deliveryAddress.trim()) errors.deliveryAddress = 'Pata likhein';
  if (!d.planName.trim()) errors.planName = 'Plan ka naam likhein';
  if (!d.bouquetType.trim()) errors.bouquetType = 'Kaun sa bouquet — likhein';
  if (price === null || price < 0) errors.pricePerDelivery = 'Rate likhein';
  if (!d.startDate) errors.startDate = 'Shuru ki date chunein';
  if (d.endDate && d.startDate && d.endDate < d.startDate) errors.endDate = 'Khatam ki date shuru se pehle nahi';
  const problems = Object.values(errors);

  const save = useMutation({
    mutationFn: () => {
      const body: SubscriptionInput = {
        customerName: d.customerName.trim(), customerPhone: d.customerPhone.trim(), deliveryAddress: d.deliveryAddress.trim(), planName: d.planName.trim(),
        bouquetType: d.bouquetType.trim(), frequency: d.frequency, pricePerDelivery: price ?? 0, startDate: d.startDate,
        endDate: d.endDate || undefined, notes: d.notes.trim() || undefined,
      };
      if (sub) { const { startDate: _s, ...rest } = body; return floristSubscriptionsApi.update(sub.id, rest); }
      return floristSubscriptionsApi.create(body);
    },
    onSuccess: (s) => { toast.success(sub ? 'Save ho gaya' : `Subscription ${s.subscriptionNumber} ban gayi`); onSaved(); },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const submit = () => { setTouched(true); if (problems.length) { toast.error(problems[0]); return; } if (!save.isPending) save.mutate(); };
  useSaveKey(submit);
  const err = (k: keyof typeof d) => (touched ? errors[k] : undefined);

  return (
    <Modal open onClose={onClose} size="lg" title={sub ? `${sub.subscriptionNumber} badlein` : 'Nayi subscription'} description="Ctrl+S se save"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={submit}>{sub ? 'Save karein' : 'Banayein'}</Button></>}>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Customer" required value={d.customerName} onChange={(e) => set('customerName', e.target.value)} error={err('customerName')} hint="Pehli delivery par isi naam / phone ka khata khulta ya milta hai" />
        <Input label="Phone" required inputMode="tel" value={d.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} error={err('customerPhone')} placeholder="0300 1234567" />
        <div className="sm:col-span-2"><Textarea label="Pata" required rows={2} value={d.deliveryAddress} onChange={(e) => set('deliveryAddress', e.target.value)} error={err('deliveryAddress')} /></div>
        <Input label="Plan" required value={d.planName} onChange={(e) => set('planName', e.target.value)} error={err('planName')} placeholder="Office reception, ghar ka guldasta" />
        <Input label="Bouquet" required value={d.bouquetType} onChange={(e) => set('bouquetType', e.target.value)} error={err('bouquetType')} placeholder="12 gulab mix" />
        <Select label="Kitni dafa" value={d.frequency} onChange={(e) => set('frequency', e.target.value)} options={Object.entries(FREQUENCY).map(([value, label]) => ({ value, label }))} />
        <Input label="Rate har delivery (Rs)" required inputMode="decimal" value={d.pricePerDelivery} onChange={(e) => set('pricePerDelivery', e.target.value)} error={err('pricePerDelivery')} hint="Har delivery par itne ka bill khate me" />
        <Input label="Shuru" required type="date" disabled={!!sub} value={d.startDate} onChange={(e) => set('startDate', e.target.value)} error={err('startDate')} hint={sub ? 'Shuru ki date badli nahi jati' : 'Pehli delivery isi din'} />
        <Input label="Khatam (marzi)" type="date" value={d.endDate} onChange={(e) => set('endDate', e.target.value)} error={err('endDate')} />
        <div className="sm:col-span-2"><Textarea label="Note (marzi)" rows={2} value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Rang, phool, gate ke guard ko dein…" /></div>
        <p className="flex items-center gap-1.5 text-[0.75rem] text-slate-500 sm:col-span-2"><CalendarClock className="h-3.5 w-3.5" />Ruki hui subscription ka paisa nahi banta.</p>
      </form>
    </Modal>
  );
}
