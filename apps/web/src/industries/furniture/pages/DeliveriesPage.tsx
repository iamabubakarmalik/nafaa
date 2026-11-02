/**
 * Deliveries of showroom bills and custom orders: date and time, vehicle
 * and driver, out → reached → delivered / fitted. Delivery charges
 * (transport, loading, floors, fitting) get their own bill when collected:
 * cash to the drawer, the rest on the customer's khata. A custom order is
 * billed when its delivery is marked delivered. Deliveries are cancelled,
 * never deleted.
 *
 * Opening with ?saleId=… (from the counter) starts a delivery for that bill.
 * Keys: N new delivery · / search · T today · A analytics · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, CalendarClock, CheckCircle2, ClipboardList, Download, GraduationCap, ListChecks, MapPin, PackageCheck, Phone, Plus, Receipt, RotateCcw, Star, Truck, UserRound, Wallet, XCircle,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Switch, Textarea, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { deliveriesApi, type DeliveryInput, type FurnitureDelivery, type FurnitureDeliveryStatus } from '../api/deliveries.api';
import { customOrdersApi } from '../api/custom-orders.api';
import { BarList, ConfirmModal, Empty, Info, ListCard, ListLoading, Pager, Pill } from '../components/ui';
import { useDebounced, usePageKeys, useSaveKey } from '../hooks/usePageKeys';
import { DELIVERY_STATUS, FURNITURE_KEYS, MONEY_KEYS, OPEN_DELIVERY, PAY_METHODS, dayKey, errorText, longDate, moneyText, numIn, phoneOk, shortDate } from '../lib/meta';
import { t as tr } from '@core/i18n';

type Tab = 'open' | 'today' | 'done' | 'cancelled' | 'all' | 'analytics';
const LIMIT = 25;
const SLOTS = ['Subah 9-12', 'Dopahar 12-3', 'Sham 3-6', 'Raat 6-9'];
const VEHICLES = ['Shehzore', 'Mazda', 'Suzuki pickup', 'Loader rickshaw', 'Truck'];
const charges = (d: Pick<FurnitureDelivery, 'deliveryCharge' | 'loadingCharge' | 'unloadingCharge' | 'floorCharge' | 'assemblyCharge'>) =>
  d.deliveryCharge + d.loadingCharge + d.unloadingCharge + d.floorCharge + d.assemblyCharge;

export default function DeliveriesPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canManage = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const [params, setParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('open');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState<{ saleId?: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const saleId = params.get('saleId');
    if (saleId && canManage) { setCreating({ saleId }); setParams({}, { replace: true }); }
  }, [params, setParams, canManage]);

  const today = dayKey();
  const filter = {
    status: tab === 'open' ? OPEN_DELIVERY.join(',') : tab === 'done' ? 'DELIVERED,ASSEMBLED' : tab === 'cancelled' ? 'FAILED,RETURNED' : undefined,
    from: tab === 'today' ? today : undefined, to: tab === 'today' ? today : undefined,
    search: q || undefined, page, limit: LIMIT,
  };
  const listQ = useQuery({ queryKey: [FURNITURE_KEYS.deliveries, 'page', filter], queryFn: () => deliveriesApi.page(filter), enabled: tab !== 'analytics', placeholderData: (p) => p });
  const sumQ = useQuery({ queryKey: [FURNITURE_KEYS.deliveries, 'summary'], queryFn: () => deliveriesApi.summary() });
  const allQ = useQuery({ queryKey: [FURNITURE_KEYS.deliveries, 'analytics'], queryFn: () => deliveriesApi.page({ page: 1, limit: 200 }), enabled: tab === 'analytics' });
  const s = sumQ.data;
  const changeTab = (t: Tab) => { setTab(t); setPage(1); };
  usePageKeys(searchRef, { n: () => { if (canManage) setCreating({}); }, t: () => changeTab('today'), a: () => changeTab('analytics') });
  const refresh = () => [FURNITURE_KEYS.deliveries, FURNITURE_KEYS.orders, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const rows = listQ.data?.items ?? [];
  const exportCsv = () => {
    if (!rows.length) { toast.error(tr('Is filter me koi delivery nahi')); return; }
    downloadCsv('furniture-deliveries.csv', [
      [tr('Delivery'), tr('Customer'), tr('Phone'), tr('Pata'), tr('Ilaqa'), tr('Date'), tr('Waqt'), tr('Gaari'), tr('Driver'), tr('Saman'), tr('Charges'), tr('Bill'), tr('Halat')],
      ...rows.map((d) => [d.deliveryNumber, d.customerName, d.customerPhone, d.deliveryAddress, d.area ?? '', d.scheduledDate?.slice(0, 10) ?? '', d.scheduledSlot ?? '',
        [d.vehicleType, d.vehicleNumber].filter(Boolean).join(' '), d.driverName ?? '', d.productNames.join(', '), charges(d), d.chargesBill?.saleNumber ?? '', DELIVERY_STATUS[d.status]?.label ?? d.status]),
    ]);
  };
  const printList = (): PrintDoc => ({
    title: tab === 'today' ? `Aaj ki deliveries — ${longDate(new Date().toISOString())}` : 'Deliveries',
    sections: [{
      kind: 'table', title: 'Deliveries',
      columns: [{ label: 'Delivery' }, { label: 'Customer' }, { label: 'Pata', wideOnly: true }, { label: 'Waqt' }, { label: 'Gaari' }],
      rows: rows.map((d) => [d.deliveryNumber, `${d.customerName} ${d.customerPhone}`, [d.deliveryAddress, d.area].filter(Boolean).join(', '), `${shortDate(d.scheduledDate)} ${d.scheduledSlot ?? ''}`, [d.vehicleNumber, d.driverName].filter(Boolean).join(' · ') || '—']),
    }],
  });

  const analytics = useMemo(() => {
    const items = (allQ.data?.items ?? []).filter((d) => d.status !== 'FAILED');
    const group = (key: (d: FurnitureDelivery) => string) => {
      const m = new Map<string, { count: number; value: number }>();
      for (const d of items) { const k = key(d); const x = m.get(k) ?? { count: 0, value: 0 }; x.count += 1; x.value += charges(d); m.set(k, x); }
      return [...m.entries()].map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.count - a.count).slice(0, 10);
    };
    return { byArea: group((d) => d.area || d.city || tr('Likha nahi')), byDriver: group((d) => d.driverName || tr('Driver nahi')) };
  }, [allQ.data]);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={tr('Deliveries — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#16a34a', title: tr('Delivery banayein'), text: tr('Counter par bill ke baad "Delivery" dabayein, ya custom order par "Delivery bhejein". Pata, date, waqt aur charges likhein.') },
            { icon: Truck, color: '#0891b2', title: tr('Gaari aur driver'), text: tr('Gaari ka number, driver aur helper likhein — slip print kar ke driver ko dein.') },
            { icon: Wallet, color: '#7c3aed', title: tr('Charges ka bill'), text: tr('Delivery/fitting ke charges "Charges ka bill" se — cash drawer me, baqi khate me. Ek delivery ka ek hi bill.') },
            { icon: CheckCircle2, color: '#a16207', title: tr('De di'), text: tr('Pohanchne par "De di" ya "Fitting ho gayi". Custom order ka bill isi waqt banta hai: advance kat kar baqi khate me.') },
          ]}
          shortcuts={[['N', tr('nayi delivery')], ['T', 'aaj'], ['A', 'analytics'], ['/', 'search'], ['G', 'guide']]} />
      )}

      <PageHero title={tr('Deliveries')} chip={<><Truck /> {' '}{tr('Gaari')}</>} loading={sumQ.isLoading} busy={listQ.isFetching && !listQ.isLoading}
        meta={tr('Furniture ghar tak — waqt, gaari, fitting aur charges')}
        actions={<>
          <Link to="/furniture/custom-orders" className={heroButton}><ClipboardList className="h-4 w-4" /><span className="hidden sm:inline">{tr('Orders')}</span></Link>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />{tr('CSV')}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} label={tr('Print')} /></span>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setCreating({})} title={tr('Nayi delivery (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" />{tr('Delivery')}</button>}
        </>}
        stats={[
          { label: tr('Aaj'), value: String(s?.todayScheduled ?? 0) },
          { label: tr('Raste me'), value: String(s?.inTransit ?? 0) },
          { label: tr('Date nahi'), value: String(s?.pending ?? 0) },
        ]} />

      <KpiRow cols={4}>
        <KpiCard icon={CalendarClock} color="#0891b2" label={tr('Aaj ki')} value={s?.todayScheduled ?? 0} active={tab === 'today'} onClick={() => changeTab('today')} />
        <KpiCard icon={ClipboardList} color="#d97706" label={tr('Baqi (tay + bina date)')} value={(s?.scheduled ?? 0) + (s?.pending ?? 0) + (s?.rescheduled ?? 0)} active={tab === 'open'} onClick={() => changeTab('open')} />
        <KpiCard icon={Truck} color="#7c3aed" label={tr('Raste me')} value={s?.inTransit ?? 0} />
        <KpiCard icon={PackageCheck} color="#16a34a" label={tr('De di')} value={(s?.delivered ?? 0) + (s?.assembled ?? 0)} active={tab === 'done'} onClick={() => changeTab('done')} />
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={tr('Delivery, customer, phone, gaari, driver ya ilaqa…')} />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined}
        onClear={() => { setSearch(''); setPage(1); }} />

      <ViewTabs value={tab} onChange={changeTab} hint={tr('Delivery kholein — gaari, halat, charges aur slip')}
        tabs={[
          { id: 'open', label: tr('Baqi'), icon: ClipboardList },
          { id: 'today', label: tr('Aaj'), icon: CalendarClock, count: s?.todayScheduled ?? null },
          { id: 'done', label: tr('De di'), icon: PackageCheck },
          { id: 'cancelled', label: tr('Cancel / wapas'), icon: XCircle },
          { id: 'all', label: tr('Sab'), icon: ListChecks },
          { id: 'analytics', label: tr('Analytics'), icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        allQ.isLoading ? <ListLoading /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            <BarList title={tr('Ilaqa (deliveries · charges)')} money={money} rows={analytics.byArea} />
            <BarList title={tr('Driver')} money={money} rows={analytics.byDriver} />
          </div>
        )
      ) : (
        <ListCard footer={listQ.data && <Pager page={page} total={listQ.data.total} limit={LIMIT} onPage={setPage} />}>
          {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
            <Empty icon={Truck} title={tab === 'today' ? tr('Aaj koi delivery nahi') : tr('Is filter me koi delivery nahi')} text={tr('Counter ke bill ya custom order se delivery banayein.')}
              action={canManage ? <Button onClick={() => setCreating({})}><Plus className="h-4 w-4" />{tr('Delivery banayein')}</Button> : undefined} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((d) => {
                const st = DELIVERY_STATUS[d.status];
                const total = charges(d);
                return (
                  <li key={d.id}>
                    <button type="button" onClick={() => setOpenId(d.id)} className="grid w-full gap-2 px-4 py-3 text-start hover:bg-slate-50 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_10rem_9rem_auto] lg:items-center">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{d.customerName} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{d.deliveryNumber}</span></p>
                        <p className="truncate text-[0.75rem] text-slate-500">{[d.productNames.slice(0, 3).join(', '), [d.area, d.city].filter(Boolean).join(', '), d.floorNumber ? tr('{{floorNumber}} manzil{{value}}', { floorNumber: d.floorNumber, value: d.hasLift ? tr(' (lift)') : '' }) : null].filter(Boolean).join(' · ')}</p>
                      </div>
                      <p className="text-[0.8125rem] text-slate-700">{d.scheduledDate ? shortDate(d.scheduledDate) : tr('Date nahi')}<span className="block text-[0.75rem] text-slate-500">{d.scheduledSlot ?? (d.vehicleNumber ? d.vehicleNumber : '')}</span></p>
                      <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{total ? money(total) : tr('Free')}
                        <span className="block text-[0.75rem] font-medium text-slate-500">{d.chargesBill ? tr('Bill {{saleNumber}}', { saleNumber: d.chargesBill.saleNumber }) : total ? tr('Bill nahi bana') : ''}</span>
                      </p>
                      <div className="flex justify-end"><Pill tone={st?.tone ?? ''}>{st?.label ?? d.status}</Pill></div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ListCard>
      )}

      {creating && <CreateModal saleId={creating.saleId} money={money} onClose={() => setCreating(null)} onDone={(d) => { setCreating(null); refresh(); setOpenId(d.id); }} />}
      {openId && <DetailModal id={openId} money={money} onClose={() => setOpenId(null)} onChanged={refresh} />}
    </PageShell>
  );
}

function CreateModal({ saleId, money, onClose, onDone }: { saleId?: string; money: (n: number) => string; onClose: () => void; onDone: (d: FurnitureDelivery) => void }) {
  const ordersQ = useQuery({ queryKey: [FURNITURE_KEYS.orders, 'for-delivery'], queryFn: () => customOrdersApi.page({ status: 'READY_FOR_DELIVERY,IN_PRODUCTION', page: 1, limit: 100 }), enabled: !saleId });
  const [v, setV] = useState({
    customOrderId: '', customerName: '', customerPhone: '', deliveryAddress: '', city: '', area: '', landmark: '', floor: '', hasLift: false,
    date: dayKey(), slot: '', items: '', delivery: '', loading: '', unloading: '', floorCharge: '', assembly: '', requiresAssembly: true, notes: '',
  });
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const pickOrder = (id: string) => {
    const o = ordersQ.data?.items.find((x) => x.id === id);
    if (!o) { set({ customOrderId: '' }); return; }
    set({
      customOrderId: id, customerName: o.customerName, customerPhone: o.customerPhone, deliveryAddress: o.deliveryAddress || o.customerAddress || '',
      city: o.deliveryCity ?? '', area: o.deliveryArea ?? '', items: o.productType, requiresAssembly: o.requiresInstallation,
    });
  };
  const floor = Math.round(Number(v.floor) || 0);
  const autoFloor = !v.hasLift && floor > 0 && v.floorCharge === '' ? floor * 500 : null;
  const total = (numIn(v.delivery) ?? 0) + (numIn(v.loading) ?? 0) + (numIn(v.unloading) ?? 0) + (autoFloor ?? numIn(v.floorCharge) ?? 0) + (numIn(v.assembly) ?? 0);
  const errors = {
    customerName: !v.customerName.trim() ? tr('Naam likhein') : undefined,
    customerPhone: !v.customerPhone.trim() ? tr('Phone likhein') : !phoneOk(v.customerPhone) ? tr('10 se 15 hindse') : undefined,
    deliveryAddress: !v.deliveryAddress.trim() ? tr('Pata likhein') : undefined,
  };
  const [tried, setTried] = useState(false);
  const bad = Object.values(errors).some(Boolean);
  const save = useMutation({
    mutationFn: () => {
      const payload: DeliveryInput = {
        saleId, customOrderId: v.customOrderId || undefined, customerName: v.customerName.trim(), customerPhone: v.customerPhone.trim(), deliveryAddress: v.deliveryAddress.trim(),
        city: v.city.trim() || undefined, area: v.area.trim() || undefined, landmark: v.landmark.trim() || undefined, floorNumber: floor || undefined, hasLift: v.hasLift,
        scheduledDate: v.date || undefined, scheduledSlot: v.slot || undefined,
        deliveryCharge: numIn(v.delivery) ?? 0, loadingCharge: numIn(v.loading) ?? 0, unloadingCharge: numIn(v.unloading) ?? 0,
        floorCharge: v.floorCharge === '' ? undefined : numIn(v.floorCharge) ?? 0, assemblyCharge: numIn(v.assembly) ?? 0, requiresAssembly: v.requiresAssembly,
        productNames: v.items.split(',').map((x) => x.trim()).filter(Boolean), notes: v.notes.trim() || undefined,
      };
      return deliveriesApi.create(payload);
    },
    onSuccess: (d) => { toast.success(tr('{{deliveryNumber}} ban gayi', { deliveryNumber: d.deliveryNumber })); onDone(d); },
    onError: (e) => toast.error(errorText(e, tr('Delivery nahi bani'))),
  });
  const submit = () => { setTried(true); if (!bad && !save.isPending) save.mutate(); };
  useSaveKey(submit);
  const e = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  return (
    <Modal open onClose={onClose} size="lg" title={tr('Nayi delivery')} description={saleId ? tr('Counter ke bill ki delivery — saman bill se khud aayega') : tr('Custom order ya kisi bhi saman ki')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} onClick={submit}><CheckCircle2 className="h-4 w-4" />{tr('Delivery banayein (Ctrl+S)')}</Button></>}>
      <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
        {!saleId && (
          <Select label={tr('Custom order')} value={v.customOrderId} onChange={(x) => pickOrder(x.target.value)} placeholder={tr('Order nahi — sirf saman')}
            options={(ordersQ.data?.items ?? []).map((o) => ({ value: o.id, label: `${o.orderNumber} · ${o.productType} · ${o.customerName}` }))} hint={tr('Order ki delivery par us ka bill banta hai')} />
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Customer')} required value={v.customerName} onChange={(x) => set({ customerName: x.target.value })} error={e('customerName')} />
          <Input label={tr('Phone')} required inputMode="tel" value={v.customerPhone} onChange={(x) => set({ customerPhone: x.target.value })} error={e('customerPhone')} hint={tr('Driver isi par call karega')} />
        </div>
        <Input label={tr('Pata')} required value={v.deliveryAddress} onChange={(x) => set({ deliveryAddress: x.target.value })} error={e('deliveryAddress')} placeholder={tr('House 12, Street 4')} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={tr('Ilaqa')} value={v.area} onChange={(x) => set({ area: x.target.value })} placeholder={tr('Johar Town')} />
          <Input label={tr('Shehar')} value={v.city} onChange={(x) => set({ city: x.target.value })} placeholder={tr('Lahore')} />
          <Input label={tr('Nishani')} value={v.landmark} onChange={(x) => set({ landmark: x.target.value })} placeholder={tr('Masjid ke saath')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={tr('Date')} type="date" value={v.date} onChange={(x) => set({ date: x.target.value })} hint={tr('Khali = baad me tay')} />
          <Select label={tr('Waqt')} value={v.slot} onChange={(x) => set({ slot: x.target.value })} placeholder={tr('Koi bhi')} options={SLOTS.map((x) => ({ value: x, label: x }))} />
          <Input label={tr('Kaunsi manzil')} inputMode="numeric" value={v.floor} onChange={(x) => set({ floor: x.target.value.replace(/\D/g, '') })} placeholder={tr('0 = ground')} />
        </div>
        {floor > 0 && <Switch checked={v.hasLift} onChange={(x) => set({ hasLift: x.target.checked })} label={tr('Lift hai')} description={tr('Lift na ho to seerhi ka charge lagta hai')} />}
        {!saleId && !v.customOrderId && <Input label={tr('Saman')} value={v.items} onChange={(x) => set({ items: x.target.value })} placeholder={tr('Sofa set, center table')} hint={tr('Comma laga kar')} />}
        <div className="grid gap-3 sm:grid-cols-5">
          <Input label={tr('Kiraya gaari')} inputMode="decimal" value={v.delivery} onChange={(x) => set({ delivery: moneyText(x.target.value) })} placeholder="0" />
          <Input label={tr('Loading')} inputMode="decimal" value={v.loading} onChange={(x) => set({ loading: moneyText(x.target.value) })} placeholder="0" />
          <Input label={tr('Unloading')} inputMode="decimal" value={v.unloading} onChange={(x) => set({ unloading: moneyText(x.target.value) })} placeholder="0" />
          <Input label={tr('Seerhi')} inputMode="decimal" value={v.floorCharge} onChange={(x) => set({ floorCharge: moneyText(x.target.value) })} placeholder={autoFloor ? String(autoFloor) : '0'} hint={autoFloor ? tr('500 har manzil') : undefined} />
          <Input label={tr('Fitting')} inputMode="decimal" value={v.assembly} onChange={(x) => set({ assembly: moneyText(x.target.value) })} placeholder="0" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-[0.875rem]">
          <Switch checked={v.requiresAssembly} onChange={(x) => set({ requiresAssembly: x.target.checked })} label={tr('Ghar par fitting')} />
          <span>{tr('Charges:')}{' '} <b className="tabular-nums">{total ? money(total) : tr('Free')}</b></span>
        </div>
        <Textarea label={tr('Note (driver ke liye)')} rows={2} value={v.notes} onChange={(x) => set({ notes: x.target.value })} />
      </form>
    </Modal>
  );
}

function slip(d: FurnitureDelivery, money: (n: number) => string): PrintDoc {
  return {
    title: `Delivery ${d.deliveryNumber}`, subtitle: `${d.scheduledDate ? longDate(d.scheduledDate) : 'Date tay nahi'}${d.scheduledSlot ? ` · ${d.scheduledSlot}` : ''}`,
    meta: [['Saman', String(d.itemsCount)], ['Charges', money(charges(d))]],
    sections: [
      { kind: 'rows', title: 'Customer', rows: [
        { label: 'Naam', value: d.customerName }, { label: 'Phone', value: d.customerPhone },
        { label: 'Pata', value: [d.deliveryAddress, d.landmark, d.area, d.city].filter(Boolean).join(', ') },
        ...(d.floorNumber ? [{ label: 'Manzil', value: `${d.floorNumber}${d.hasLift ? ' (lift)' : ' (seerhi)'}` }] : []),
      ] },
      { kind: 'rows', title: 'Gaari', rows: [
        { label: 'Gaari', value: [d.vehicleType, d.vehicleNumber].filter(Boolean).join(' ') || '—' }, { label: 'Driver', value: [d.driverName, d.driverPhone].filter(Boolean).join(' · ') || '—' },
        { label: 'Helper', value: String(d.helpersCount) }, { label: 'Fitting', value: d.requiresAssembly ? 'Haan' : 'Nahi' },
      ] },
      { kind: 'table', title: 'Saman', columns: [{ label: 'Cheez' }], rows: d.productNames.map((n) => [n]) },
      { kind: 'text', title: 'Wusooli', text: 'Saman theek halat me mila. Naam aur dastakhat: ______________________' },
    ],
  };
}

function DetailModal({ id, money, onClose, onChanged }: { id: string; money: (n: number) => string; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const canManage = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const canBill = usePermission(PERMISSIONS.POS_USE);
  const q = useQuery({ queryKey: [FURNITURE_KEYS.deliveries, 'one', id], queryFn: () => deliveriesApi.getOne(id) });
  const [panel, setPanel] = useState<'vehicle' | 'confirm' | 'bill' | 'reason' | null>(null);
  const [reasonFor, setReasonFor] = useState<FurnitureDeliveryStatus>('FAILED');
  const changed = (msg: string) => { toast.success(msg); setPanel(null); onChanged(); qc.invalidateQueries({ queryKey: [FURNITURE_KEYS.deliveries, 'one', id] }); };
  const status = useMutation({
    mutationFn: (v: { status: FurnitureDeliveryStatus; notes?: string }) => deliveriesApi.updateStatus(id, v),
    onSuccess: (r) => changed(tr('Delivery: {{label}}', { label: DELIVERY_STATUS[r.status]?.label })),
    onError: (e) => toast.error(errorText(e, tr('Nahi hua'))),
  });
  const d = q.data;
  if (!d) return <Modal open onClose={onClose} size="lg" title={tr('Delivery')}><ListLoading rows={4} /></Modal>;
  const st = DELIVERY_STATUS[d.status];
  const open = OPEN_DELIVERY.includes(d.status);
  const total = charges(d);
  const out = ['DISPATCHED', 'IN_TRANSIT', 'ARRIVED'].includes(d.status);
  return (
    <Modal open onClose={onClose} size="lg" title={`${d.deliveryNumber} · ${st?.label ?? d.status}`} description={d.productNames.join(', ') || undefined}
      footer={<div className="flex w-full flex-wrap items-center gap-2">
        <PrintButton doc={() => slip(d, money)} label={tr('Slip')} size="sm" />
        <span className="flex-1" />
        {canManage && open && <Button size="sm" variant="ghost" onClick={() => { setReasonFor('FAILED'); setPanel('reason'); }}><XCircle className="h-3.5 w-3.5" />{tr('Cancel')}</Button>}
        {canManage && open && !out && <Button size="sm" variant="secondary" onClick={() => { setReasonFor('RESCHEDULED'); setPanel('reason'); }}><CalendarClock className="h-3.5 w-3.5" />{tr('Date badli')}</Button>}
        {canManage && out && <Button size="sm" variant="secondary" onClick={() => { setReasonFor('RETURNED'); setPanel('reason'); }}><RotateCcw className="h-3.5 w-3.5" />{tr('Wapas aayi')}</Button>}
        {canManage && open && <Button size="sm" variant="secondary" onClick={() => setPanel('vehicle')}><Truck className="h-3.5 w-3.5" />{tr('Gaari / date')}</Button>}
        {canBill && total > 0 && !d.chargesBill && d.status !== 'FAILED' && <Button size="sm" variant="secondary" onClick={() => setPanel('bill')}><Receipt className="h-3.5 w-3.5" />{tr('Charges ka bill')}</Button>}
        {canManage && open && !out && <Button size="sm" loading={status.isPending} onClick={() => status.mutate({ status: 'DISPATCHED' })}><Truck className="h-3.5 w-3.5" />{tr('Nikal gayi')}</Button>}
        {canManage && d.status === 'DISPATCHED' && <Button size="sm" variant="secondary" loading={status.isPending} onClick={() => status.mutate({ status: 'ARRIVED' })}><MapPin className="h-3.5 w-3.5" />{tr('Pohanch gayi')}</Button>}
        {canManage && (out || d.status === 'DELIVERED') && <Button size="sm" onClick={() => setPanel('confirm')}><CheckCircle2 className="h-3.5 w-3.5" />{d.status === 'DELIVERED' ? tr('Fitting ho gayi') : tr('De di')}</Button>}
      </div>}>
      <div className="space-y-3 text-[0.875rem]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info icon={UserRound} title={tr('Customer')}>
            <p className="font-semibold text-slate-900">{d.customerName}</p>
            <a href={`tel:${d.customerPhone}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline"><Phone className="h-3.5 w-3.5" />{d.customerPhone}</a>
            <p className="text-slate-600">{[d.deliveryAddress, d.landmark, d.area, d.city].filter(Boolean).join(', ')}</p>
            {d.floorNumber ? <p className="text-slate-600">{tr('{{floorNumber}} manzil {{value}}', { floorNumber: d.floorNumber, value: d.hasLift ? tr('· lift hai') : tr('· seerhi') })}</p> : null}
          </Info>
          <Info icon={Truck} title={tr('Gaari')}>
            <p className="font-semibold text-slate-900">{d.scheduledDate ? `${longDate(d.scheduledDate)}${d.scheduledSlot ? ` · ${d.scheduledSlot}` : ''}` : tr('Date tay nahi')}</p>
            <p className="text-slate-600">{[d.vehicleType, d.vehicleNumber].filter(Boolean).join(' ') || tr('Gaari nahi di')}{d.driverName ? ` · ${d.driverName}` : ''}{d.driverPhone ? ` (${d.driverPhone})` : ''}</p>
            <p className="text-slate-600">{tr('{{helpersCount}} helper · {{value}}', { helpersCount: d.helpersCount, value: d.requiresAssembly ? tr('fitting karni hai') : tr('sirf delivery') })}</p>
          </Info>
        </div>
        <dl className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-6">
          {[[tr('Gaari'), d.deliveryCharge], [tr('Loading'), d.loadingCharge], [tr('Unloading'), d.unloadingCharge], [tr('Seerhi'), d.floorCharge], [tr('Fitting'), d.assemblyCharge], [tr('Kul'), total]].map(([k, n]) => (
            <div key={k as string}><dt className="text-[0.75rem] text-slate-500">{k}</dt><dd className={`font-semibold tabular-nums ${k === 'Kul' ? 'text-slate-900' : 'text-slate-700'}`}>{money(n as number)}</dd></div>
          ))}
        </dl>
        {d.chargesBill && (
          <Link to={`/sales/${d.chargesBill.id}/receipt`} className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">
            <Receipt className="h-4 w-4" />{tr('Bill {{saleNumber}}{{value}}', { saleNumber: d.chargesBill.saleNumber, value: d.chargesBill.status === 'VOIDED' ? tr(' (cancel)') : d.chargesBill.creditAmount > 0 ? tr(' · {{creditAmount}} khate me', { creditAmount: money(d.chargesBill.creditAmount) }) : tr(' · paid') })}
          </Link>
        )}
        {d.customOrderId && <p className="text-slate-600">{tr('Custom order ki delivery — "De di" par order ka bill banta hai.')}</p>}
        {(d.receivedByName || d.customerRating) && (
          <p className="text-slate-700">{tr('Liya: {{value}}{{value2}}{{value3}}', { value: d.receivedByName ?? '—', value2: d.customerRating ? ` · ${'★'.repeat(d.customerRating)}` : '', value3: d.customerFeedback ? ` — ${d.customerFeedback}` : '' })}</p>
        )}
        {d.notes && <p className="whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2 text-slate-600">{d.notes}</p>}
      </div>
      {panel === 'vehicle' && <VehicleModal d={d} onClose={() => setPanel(null)} onDone={() => changed(tr('Gaari save'))} />}
      {panel === 'confirm' && <ConfirmDelivery d={d} onClose={() => setPanel(null)} onDone={(r) => changed(r.status === 'ASSEMBLED' ? tr('Fitting ho gayi') : tr('Delivery ho gayi'))} />}
      {panel === 'bill' && <BillModal d={d} total={total} money={money} onClose={() => setPanel(null)} onDone={(no) => changed(tr('Bill {{no}} ban gaya', { no }))} />}
      {panel === 'reason' && <ReasonModal status={reasonFor} busy={status.isPending} onClose={() => setPanel(null)} onConfirm={(notes) => status.mutate({ status: reasonFor, notes })} />}
    </Modal>
  );
}

function VehicleModal({ d, onClose, onDone }: { d: FurnitureDelivery; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({
    vehicleType: d.vehicleType ?? '', vehicleNumber: d.vehicleNumber ?? '', driverName: d.driverName ?? '', driverPhone: d.driverPhone ?? '',
    helpers: String(d.helpersCount ?? 2), date: d.scheduledDate ? dayKey(new Date(d.scheduledDate)) : dayKey(), slot: d.scheduledSlot ?? '',
  });
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const save = useMutation({
    mutationFn: () => deliveriesApi.assignVehicle(d.id, {
      vehicleType: v.vehicleType || undefined, vehicleNumber: v.vehicleNumber || undefined, driverName: v.driverName || undefined, driverPhone: v.driverPhone || undefined,
      helpersCount: Math.round(Number(v.helpers) || 0), scheduledDate: v.date || undefined, scheduledSlot: v.slot || undefined,
    }),
    onSuccess: onDone, onError: (e) => toast.error(errorText(e, tr('Save nahi hua'))),
  });
  useSaveKey(() => { if (!save.isPending) save.mutate(); });
  return (
    <Modal open onClose={onClose} size="md" title={tr('Gaari aur date')} description={d.deliveryNumber}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Wapas')}</Button><Button loading={save.isPending} onClick={() => save.mutate()}>{tr('Save (Ctrl+S)')}</Button></>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Date')} type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} />
          <Select label={tr('Waqt')} value={v.slot} onChange={(e) => set({ slot: e.target.value })} placeholder={tr('Koi bhi')} options={SLOTS.map((x) => ({ value: x, label: x }))} />
          <Input label={tr('Gaari')} value={v.vehicleType} onChange={(e) => set({ vehicleType: e.target.value })} placeholder={tr('Shehzore')} />
          <Input label={tr('Gaari number')} value={v.vehicleNumber} onChange={(e) => set({ vehicleNumber: e.target.value.toUpperCase() })} placeholder={tr('LES-1234')} />
          <Input label={tr('Driver')} value={v.driverName} onChange={(e) => set({ driverName: e.target.value })} />
          <Input label={tr('Driver phone')} inputMode="tel" value={v.driverPhone} onChange={(e) => set({ driverPhone: e.target.value })} />
          <Input label={tr('Helper')} inputMode="numeric" value={v.helpers} onChange={(e) => set({ helpers: e.target.value.replace(/\D/g, '') })} />
        </div>
        <div className="flex flex-wrap gap-1.5">{VEHICLES.map((x) => <button key={x} type="button" onClick={() => set({ vehicleType: x })} className={`h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold ring-1 ${v.vehicleType === x ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'ring-slate-200 hover:bg-slate-50'}`}>{x}</button>)}</div>
      </div>
    </Modal>
  );
}

function ConfirmDelivery({ d, onClose, onDone }: { d: FurnitureDelivery; onClose: () => void; onDone: (r: FurnitureDelivery) => void }) {
  const [v, setV] = useState({ name: d.customerName, cnic: '', rating: 5, feedback: '', assembled: d.requiresAssembly, minutes: '', notes: '' });
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const save = useMutation({
    mutationFn: () => deliveriesApi.confirm(d.id, {
      receivedByName: v.name.trim() || undefined, receivedByCnic: v.cnic.trim() || undefined, customerRating: v.rating, customerFeedback: v.feedback.trim() || undefined,
      assembled: d.requiresAssembly ? v.assembled : false, assemblyTimeSpent: v.minutes ? Math.round(Number(v.minutes)) : undefined, assemblyNotes: v.notes.trim() || undefined,
    }),
    onSuccess: onDone, onError: (e) => toast.error(errorText(e, tr('Save nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} size="md" title={tr('Delivery ho gayi')} description={d.customOrderId ? tr('Custom order ka bill abhi banega — advance kat kar baqi khate me') : d.deliveryNumber}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Wapas')}</Button><Button loading={save.isPending} onClick={() => save.mutate()}><CheckCircle2 className="h-4 w-4" />{tr('Save')}</Button></>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Kis ne liya')} value={v.name} onChange={(e) => set({ name: e.target.value })} />
          <Input label={tr('CNIC')} value={v.cnic} onChange={(e) => set({ cnic: e.target.value })} hint={tr('Marzi hai')} />
        </div>
        {d.requiresAssembly && <Switch checked={v.assembled} onChange={(e) => set({ assembled: e.target.checked })} label={tr('Fitting bhi ho gayi')} />}
        {d.requiresAssembly && v.assembled && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={tr('Fitting me kitne minute')} inputMode="numeric" value={v.minutes} onChange={(e) => set({ minutes: e.target.value.replace(/\D/g, '') })} />
            <Input label={tr('Fitting note')} value={v.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        )}
        <div>
          <p className="mb-1 text-[0.8125rem] font-medium text-slate-700">{tr('Customer khush?')}</p>
          <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${n}`} onClick={() => set({ rating: n })}><Star className={`h-6 w-6 ${n <= v.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} /></button>)}</div>
        </div>
        <Textarea label={tr('Customer ne kya kaha')} rows={2} value={v.feedback} onChange={(e) => set({ feedback: e.target.value })} />
      </div>
    </Modal>
  );
}

function BillModal({ d, total, money, onClose, onDone }: { d: FurnitureDelivery; total: number; money: (n: number) => string; onClose: () => void; onDone: (saleNumber: string) => void }) {
  const [paid, setPaid] = useState(String(total));
  const [method, setMethod] = useState('CASH');
  const n = Math.min(numIn(paid) ?? 0, total);
  const save = useMutation({ mutationFn: () => deliveriesApi.bill(d.id, { paidAmount: n, paymentMethod: method }), onSuccess: (r) => onDone(r.saleNumber), onError: (e) => toast.error(errorText(e, tr('Bill nahi bana'))) });
  return (
    <Modal open onClose={onClose} size="sm" title={tr('Delivery charges ka bill')} description={`${d.deliveryNumber} · ${d.customerName}`}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Wapas')}</Button><Button loading={save.isPending} onClick={() => save.mutate()}><Receipt className="h-4 w-4" />{tr('Bill banayein')}</Button></>}>
      <div className="space-y-3">
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.875rem]">{tr('Charges:')}{' '} <b className="tabular-nums">{money(total)}</b></p>
        <Input label={tr('Abhi mila (Rs)')} inputMode="decimal" value={paid} onChange={(e) => setPaid(moneyText(e.target.value))} hint={n < total ? tr('{{value}} {{customerName}} ke khate me', { value: money(total - n), customerName: d.customerName }) : tr('Poora mila')} />
        <Select label={tr('Kaise mila')} value={method} onChange={(e) => setMethod(e.target.value)} options={PAY_METHODS} hint={method === 'CASH' ? tr('Cash drawer me jata hai') : undefined} />
      </div>
    </Modal>
  );
}

function ReasonModal({ status, busy, onClose, onConfirm }: { status: FurnitureDeliveryStatus; busy: boolean; onClose: () => void; onConfirm: (notes: string) => void }) {
  const [reason, setReason] = useState('');
  const title = status === 'FAILED' ? tr('Delivery cancel karein?') : status === 'RETURNED' ? tr('Saman wapas aaya?') : tr('Date badal gayi?');
  return (
    <ConfirmModal title={title} cta={tr('Haan')} danger={status !== 'RESCHEDULED'} busy={busy} onClose={onClose}
      onConfirm={() => { if (!reason.trim()) { toast.error(tr('Wajah likhein')); return; } onConfirm(reason.trim()); }}
      text={<div className="space-y-3">
        {status === 'RESCHEDULED' && <p>{tr('Phir "Gaari / date" se nayi date likhein.')}</p>}
        <Input label={tr('Wajah')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={status === 'FAILED' ? tr('Customer ne mana kar diya') : status === 'RETURNED' ? tr('Ghar band tha') : tr('Customer ne kal bulaya')} />
      </div>} />
  );
}
