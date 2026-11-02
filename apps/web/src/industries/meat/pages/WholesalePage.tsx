/**
 * Restaurant and hotel accounts: a customer with a khata, credit limit,
 * agreed discount and delivery days. Bills come from the counter (POS
 * switches to the restaurant rate for them) or from weight orders; the
 * udhaar shown is the customer's real khata. A payment here is a khata
 * payment (drawer for cash).
 *
 * Keys: N new account · / search · 1 accounts · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, BarChart3, BookOpen, Building2, FileSpreadsheet, GraduationCap, Pencil, Plus, Power, Truck, Wallet } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, FilterBar, FilterMenu, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Switch, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { wholesaleApi, type WholesaleAccount } from '../api/wholesale.api';
import { CustomerPick, type PickedCustomer } from '../components/pickers';
import { MethodPicker } from '../components/money';
import { FormRow, ListFrame, Pill, inputBox, useConfirm, usePageKeys, useSaveKey } from '../components/ui';
import { KEYS, MONEY_KEYS, apiError, decimal, type PayMethod } from '../lib/meta';
import { t as tr } from '@core/i18n';

type View = 'list' | 'analytics';
const TYPES = [{ value: 'RESTAURANT', label: tr('Restaurant') }, { value: 'HOTEL', label: tr('Hotel') }, { value: 'CATERER', label: tr('Caterer / degh') }, { value: 'SHOP', label: tr('Dukaan') }, { value: 'HOSTEL', label: tr('Hostel / mess') }, { value: 'OTHER', label: tr('Doosra') }];
const DAYS = [tr('Itwar'), tr('Peer'), tr('Mangal'), tr('Budh'), tr('Jumeraat'), tr('Juma'), tr('Hafta')];
const typeLabel = (v: string) => TYPES.find((t) => t.value === v)?.label ?? v;
const over = (a: WholesaleAccount) => a.creditLimit > 0 && a.totalOutstanding > a.creditLimit;

function AccountForm({ a, onClose, onDone }: { a: WholesaleAccount | null; onClose: () => void; onDone: () => void }) {
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [name, setName] = useState(a?.businessName ?? '');
  const [type, setType] = useState(a?.businessType ?? 'RESTAURANT');
  const [person, setPerson] = useState(a?.contactPerson ?? '');
  const [phone, setPhone] = useState(a?.contactPhone ?? '');
  const [address, setAddress] = useState(a?.deliveryAddress ?? '');
  const [limit, setLimit] = useState(a?.creditLimit ? String(a.creditLimit) : '');
  const [days, setDays] = useState(a?.creditDays ? String(a.creditDays) : '');
  const [discount, setDiscount] = useState(a?.discountPct ? String(a.discountPct) : '');
  const [delivery, setDelivery] = useState(a?.requiresDelivery ?? true);
  const [deliveryDays, setDeliveryDays] = useState<number[]>(a?.deliveryDays ?? []);
  const [slot, setSlot] = useState(a?.deliveryTimeSlot ?? '');
  const [ntn, setNtn] = useState(a?.ntnNumber ?? '');
  const [tried, setTried] = useState(false);
  const errors: Record<string, string> = {};
  if (!a && !customer) errors.customer = tr('Customer chunein ya naya banayein');
  if (name.trim().length < 2) errors.name = tr('Business ka naam likhein');
  if (phone.trim() && !/^[0-9+\-\s]{10,15}$/.test(phone.trim())) errors.phone = tr('Phone theek likhein');
  if (discount !== '' && !(Number(discount) >= 0 && Number(discount) <= 50)) errors.discount = tr('Discount 0 se 50% tak');
  if (delivery && !address.trim()) errors.address = tr('Delivery ka pata likhein');
  const err = (k: string) => (tried ? errors[k] : undefined);
  useEffect(() => { if (customer && !name) setName(customer.name); if (customer?.phone && !phone) setPhone(customer.phone); }, [customer]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useMutation({
    mutationFn: () => {
      const body: Partial<WholesaleAccount> = {
        businessName: name.trim(), businessType: type, contactPerson: person.trim() || undefined, contactPhone: phone.trim() || undefined,
        deliveryAddress: address.trim() || undefined, creditLimit: Number(limit) || 0, creditDays: Number(days) || 0, discountPct: Number(discount) || 0,
        requiresDelivery: delivery, deliveryDays, deliveryTimeSlot: slot.trim() || undefined, ntnNumber: ntn.trim() || undefined,
      };
      return a ? wholesaleApi.update(a.id, body) : wholesaleApi.create({ ...body, customerId: customer!.id });
    },
    onSuccess: (r) => { toast.success(a ? tr('Account badal diya') : tr('Account {{accountNumber}} ban gaya', { accountNumber: r.accountNumber })); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Account save nahi hua'))),
  });
  const submit = () => { setTried(true); const f = Object.values(errors)[0]; if (f) { toast.error(f); return; } if (!save.isPending) save.mutate(); };
  useSaveKey(submit);
  return (
    <Modal open onClose={onClose} size="lg" title={a ? tr('{{accountNumber}} badlein', { accountNumber: a.accountNumber }) : tr('Naya restaurant / hotel account')} description={tr('Ctrl+S se save')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} onClick={submit}>{tr('Save')}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {!a && <FormRow label={tr('Customer (khata isi ka)')} error={err('customer')}><CustomerPick value={customer} onChange={setCustomer} /></FormRow>}
        <div className="grid gap-3 sm:grid-cols-2">
          <FormRow label={tr('Business ka naam')} error={err('name')}><input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputBox} aria-invalid={!!err('name')} /></FormRow>
          <FormRow label={tr('Type')}><select value={type} onChange={(e) => setType(e.target.value)} className={inputBox}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></FormRow>
          <FormRow label={tr('Rabta (marzi)')}><input value={person} onChange={(e) => setPerson(e.target.value)} maxLength={120} className={inputBox} placeholder={tr('Manager / chef')} /></FormRow>
          <FormRow label={tr('Phone')} error={err('phone')}><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputBox} /></FormRow>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormRow label={tr('Udhaar ki had')} hint={tr('Is se zyada par manager PIN')}><input inputMode="decimal" value={limit} onChange={(e) => setLimit(decimal(e.target.value))} className={cn(inputBox, 'text-end')} placeholder={tr('0 = koi had nahi')} /></FormRow>
          <FormRow label={tr('Kitne din me paisa')}><input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} className={cn(inputBox, 'text-end')} placeholder="7" /></FormRow>
          <FormRow label={tr('Discount % (orders par)')} error={err('discount')}><input inputMode="decimal" value={discount} onChange={(e) => setDiscount(decimal(e.target.value))} className={cn(inputBox, 'text-end')} placeholder="0" /></FormRow>
        </div>
        <Switch checked={delivery} onChange={(e) => setDelivery(e.target.checked)} label={tr('Maal hum pohanchate hain')} />
        {delivery && <>
          <FormRow label={tr('Delivery ka pata')} error={err('address')}><input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={1000} className={inputBox} aria-invalid={!!err('address')} /></FormRow>
          <div className="flex flex-wrap items-center gap-1.5">
            {DAYS.map((d, i) => <button key={d} type="button" onClick={() => setDeliveryDays((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))} className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium ring-1', deliveryDays.includes(i) ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{d}</button>)}
            <input value={slot} onChange={(e) => setSlot(e.target.value)} maxLength={60} placeholder={tr('Waqt: subah 8')} aria-label={tr('Waqt')} className="h-8 rounded-full bg-slate-100 px-3 text-[0.8125rem] outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </>}
        <FormRow label={tr('NTN (marzi)')}><input value={ntn} onChange={(e) => setNtn(e.target.value)} maxLength={30} className={inputBox} /></FormRow>
      </form>
    </Modal>
  );
}

function PaymentModal({ a, onClose, onDone }: { a: WholesaleAccount; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(a.totalOutstanding > 0 ? String(a.totalOutstanding) : '');
  const [method, setMethod] = useState<PayMethod>('CASH');
  const [note, setNote] = useState('');
  const n = Number(amount) || 0;
  const save = useMutation({
    mutationFn: () => wholesaleApi.payment(a.id, n, method, note.trim() || undefined),
    onSuccess: () => { toast.success(tr('{{formatPKR}} khate me jama', { formatPKR: formatPKR(n) })); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Paisa darj nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={tr('Paisa mila')} description={tr('{{businessName}} · udhaar {{totalOutstanding}}', { businessName: a.businessName, totalOutstanding: formatPKR(a.totalOutstanding) })}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button variant="success" disabled={!(n > 0)} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>{tr('Darj karein')}</Button></>}>
      <div className="space-y-3">
        <input data-autofocus inputMode="decimal" aria-label={tr('Amount')} value={amount} onChange={(e) => setAmount(decimal(e.target.value))} className={cn(inputBox, 'text-center text-2xl font-bold tabular-nums')} />
        <MethodPicker value={method} onChange={setMethod} />
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={tr('Note (marzi): cheque #, hafte ka hisaab…')} aria-label={tr('Note')} className={inputBox} />
        {n > a.totalOutstanding && a.totalOutstanding >= 0 && <p className="text-[0.75rem] text-slate-500">{tr('Udhaar se zyada — baqi advance ban kar khate me rahega.')}</p>}
      </div>
    </Modal>
  );
}

export default function WholesalePage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales } = useMasked();
  const canEdit = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  const canKhata = usePermission(PERMISSIONS.KHATA_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('list');
  const [active, setActive] = useState('true');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<{ kind: 'new' } | { kind: 'edit' | 'pay'; a: WholesaleAccount } | null>(null);
  const [ask, confirmDialog] = useConfirm();
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const listQ = useQuery({ queryKey: [KEYS.wholesale, active, query], queryFn: () => wholesaleApi.list({ active: active || undefined, search: query || undefined }), placeholderData: (p) => p });
  const rows = listQ.data ?? [];
  const owed = rows.reduce((t, a) => t + a.totalOutstanding, 0);
  const refresh = () => [KEYS.wholesale, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const toggle = useMutation({
    mutationFn: (a: WholesaleAccount) => (a.isActive ? wholesaleApi.remove(a.id) : wholesaleApi.update(a.id, { isActive: true })),
    onSuccess: () => { toast.success(tr('Account ki halat badal di')); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
  });

  usePageKeys({ n: canEdit ? () => setDialog({ kind: 'new' }) : undefined, '1': () => setView('list'), '2': () => setView('analytics'), g: guide.open }, searchRef);

  const printDoc = (): PrintDoc => ({
    title: 'Restaurant / hotel accounts', meta: [['Accounts', String(rows.length)], ['Kul udhaar', formatPKR(owed)]],
    sections: [{ kind: 'table', columns: [{ label: '#' }, { label: 'Business' }, { label: 'Phone' }, { label: 'Had', align: 'right' }, { label: 'Udhaar', align: 'right' }, { label: 'Kul khareed', align: 'right' }],
      rows: rows.map((a) => [a.accountNumber, a.businessName, a.contactPhone ?? '', a.creditLimit ? formatPKR(a.creditLimit) : '—', formatPKR(a.totalOutstanding), formatPKR(a.totalPurchases)]) }],
  });

  return (
    <PageShell>
      <PageHero
        title={tr('Restaurant aur hotel')}
        chip={<><Building2 /> {' '}{tr('Wholesale khata')}</>}
        meta={tr('Roz ka maal udhaar par, hafte me hisaab — udhaar asal khate se')}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!rows.length} /></span>
          <button type="button" title={tr('CSV')} className={heroIconButton} disabled={!rows.length}
            onClick={() => downloadCsv('restaurant-accounts.csv', [['#', tr('Business'), tr('Type'), tr('Phone'), tr('Had'), tr('Udhaar'), tr('Kul khareed'), tr('Bills'), tr('Discount %')], ...rows.map((a) => [a.accountNumber, a.businessName, typeLabel(a.businessType), a.contactPhone, a.creditLimit, a.totalOutstanding, a.totalPurchases, a.totalOrders, a.discountPct])])}>
            <FileSpreadsheet className="h-4 w-4" />
          </button>
          <Link to="/khata" className={heroButton}><BookOpen className="h-4 w-4" /><span className="hidden sm:inline">{tr('Khata')}</span></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setDialog({ kind: 'new' })} title={tr('Naya account (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Naya account')}</button>}
        </>}
        stats={[{ label: tr('Accounts'), value: rows.length }, { label: tr('Kul udhaar'), value: sales(owed) }, { label: tr('Had se upar'), value: rows.filter(over).length }]}
      />

      <KpiRow cols={4}>
        {listQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Building2} color="#a16207" label={tr('Accounts')} value={rows.length} />
          <KpiCard icon={Wallet} color="#d97706" label={tr('Kul udhaar')} value={sales(owed)} hint={tr('Asal khate se')} />
          <KpiCard icon={AlertTriangle} color={rows.some(over) ? '#e11d48' : '#64748b'} label={tr('Had se upar')} value={rows.filter(over).length} />
          <KpiCard icon={Truck} color="#0891b2" label={tr('Delivery wale')} value={rows.filter((a) => a.requiresDelivery).length} />
        </>}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Account #, business ka naam…')} label={tr('Search')} />}>
        <FilterMenu icon={Power} label={active === 'true' ? tr('Chalu') : active === 'false' ? tr('Band') : tr('Sab')} value={active} active={active !== 'true'} onChange={setActive}
          options={[{ value: 'true', label: tr('Chalu') }, { value: 'false', label: tr('Band') }, { value: '', label: tr('Sab') }]} />
      </FilterBar>

      <ViewTabs value={view} onChange={setView} hint={<>{tr('{{value}}/ search · 1-2 tabs', { value: canEdit ? tr('N naya · ') : '' })}</>}
        tabs={[{ id: 'list', label: tr('Accounts'), icon: Building2, count: rows.length }, { id: 'analytics', label: tr('Analytics'), icon: BarChart3 }]} />

      {view === 'analytics' ? (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <h3 className="font-semibold text-slate-900">{tr('Sab se zyada udhaar')}</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {[...rows].sort((x, y) => y.totalOutstanding - x.totalOutstanding).slice(0, 10).map((a) => (
              <li key={a.id} className="flex justify-between py-2 text-[0.875rem]"><span>{a.businessName}</span><span className={cn('font-semibold tabular-nums', over(a) && 'text-rose-600')}>{tr('{{totalOutstanding}} · kul {{totalPurchases}}', { totalOutstanding: sales(a.totalOutstanding), totalPurchases: sales(a.totalPurchases) })}</span></li>
            ))}
            {!rows.length && <li className="py-6 text-center text-sm text-slate-500">{tr('Koi account nahi')}</li>}
          </ul>
        </div>
      ) : (
        <ListFrame loading={listQ.isLoading} error={listQ.isError && !listQ.data} onRetry={() => listQ.refetch()}
          empty={!rows.length ? { icon: Building2, title: tr('Koi account nahi'), text: tr('Jo restaurant ya hotel roz udhaar par leta hai us ka account banayein — POS par us ke liye restaurant rate khud lagta hai.'), actions: canEdit ? <Button onClick={() => setDialog({ kind: 'new' })} leftIcon={<Plus className="h-4 w-4" />}>{tr('Naya account')}</Button> : undefined } : null}>
          {rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-900">{a.businessName}</span>
                  <span className="text-[0.75rem] text-slate-500">{a.accountNumber}</span>
                  <Pill>{typeLabel(a.businessType)}</Pill>
                  {!a.isActive && <Pill tone="rose">{tr('Band')}</Pill>}
                  {over(a) && <Pill tone="rose"><AlertTriangle className="h-3 w-3" />{tr('Had se upar')}</Pill>}
                  {a.discountPct > 0 && <Pill tone="amber">{a.discountPct}%</Pill>}
                </div>
                <p className="mt-0.5 text-[0.75rem] text-slate-500">{[a.contactPerson, a.contactPhone, a.requiresDelivery ? tr('Delivery: {{value}}{{value2}}', { value: a.deliveryDays.map((d) => DAYS[d]).join(', ') || 'roz', value2: a.deliveryTimeSlot ? ` ${a.deliveryTimeSlot}` : '' }) : tr('Khud le jata hai')].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="text-end text-[0.8125rem]">
                <p className={cn('font-bold tabular-nums', a.totalOutstanding > 0 ? 'text-amber-700' : 'text-emerald-700')}>{a.totalOutstanding > 0 ? tr('Udhaar {{totalOutstanding}}', { totalOutstanding: sales(a.totalOutstanding) }) : tr('Khata saaf')}</p>
                <p className="text-slate-500">{tr('{{value}}{{totalOrders}} bill · {{totalPurchases}}', { value: a.creditLimit ? tr('Had {{creditLimit}} · ', { creditLimit: sales(a.creditLimit) }) : '', totalOrders: a.totalOrders, totalPurchases: sales(a.totalPurchases) })}</p>
              </div>
              <div className="flex w-full flex-wrap gap-1.5 sm:w-auto">
                {canKhata && a.isActive && <Button size="sm" variant="success" leftIcon={<Wallet className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'pay', a })}>{tr('Paisa mila')}</Button>}
                <Link to={`/customers/${a.customerId}`} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-2.5 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><BookOpen className="h-3.5 w-3.5" />{tr('Khata')}</Link>
                {canEdit && <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'edit', a })}>{tr('Badlein')}</Button>}
                {canEdit && <Button size="sm" variant="ghost" leftIcon={<Power className="h-3.5 w-3.5" />} onClick={async () => {
                  if (a.isActive && !(await ask({ title: tr('{{businessName}} band karein?', { businessName: a.businessName }), text: tr('Customer aur khata waisa hi rahega; sirf restaurant rate aur list se hat jayega.'), yes: tr('Band karein'), danger: true }))) return;
                  toggle.mutate(a);
                }}>{a.isActive ? tr('Band') : tr('Chalu')}</Button>}
              </div>
            </li>
          ))}
        </ListFrame>
      )}

      {(dialog?.kind === 'new' || dialog?.kind === 'edit') && <AccountForm a={dialog.kind === 'edit' ? dialog.a : null} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog?.kind === 'pay' && <PaymentModal a={dialog.a} onClose={() => setDialog(null)} onDone={refresh} />}
      {confirmDialog}

      {guide.isOpen && (
        <PageGuide title={tr('Restaurant aur hotel accounts')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#a16207', title: tr('Account'), text: tr('Customer chunein, business ka naam, udhaar ki had, discount aur delivery ke din.') },
            { icon: Building2, color: '#d97706', title: tr('Restaurant rate'), text: tr('POS par is customer ko chunte hi "Restaurant rate" lagta hai (item ki wholesale qeemat). Wazan wale order me discount khud aata hai.') },
            { icon: Wallet, color: '#16a34a', title: tr('Hisaab'), text: tr('"Paisa mila" khate ki payment hai — cash galle me, baqi bank / wallet me. Udhaar hamesha asal khate se dikhta hai.') },
          ]}
          tips={[tr('Had se zyada udhaar par counter manager PIN maangta hai.'), tr('Paisa lene ke liye "Khata sambhalna" ki ijazat chahiye.')]}
          shortcuts={[['N', tr('naya account')], ['/', 'dhoondein'], ['1', 'accounts'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
