/**
 * Rentals: consoles and games given out by the day. Renting takes the rent
 * (its own bill; unpaid rent goes on the customer's khata) and keeps a
 * security deposit aside. On return, late and damage fees come out of the
 * deposit first; anything above it is paid then or goes on the khata; the
 * rest of the deposit is handed back. A rental is cancelled by voiding its
 * bill from Sales. Each rental prints an agreement slip.
 *
 * Keys: N new rental · / search · L late · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BarChart3, CalendarClock, CheckCircle2, Download, GraduationCap, IdCard, ListChecks, PackageOpen, Phone, Plus, Receipt, RotateCcw, ShieldCheck, Wallet,
} from 'lucide-react';
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
import { gamingRentalsApi, type GamingRental, type RentalInput } from '../api/rentals.api';
import { gamingProductsApi } from '../api/products.api';
import { BarList, Empty, Info, ListCard, ListLoading, Pager, Pill } from '../components/ui';
import { useDebounced, usePageKeys, useSaveKey } from '../hooks/usePageKeys';
import { GAMING_KEYS, MONEY_KEYS, PAY_METHODS, RENTAL_STATUS, addDays, dayKey, errorText, longDate, moneyText, numIn, phoneOk, shortDate } from '../lib/meta';

type Tab = 'out' | 'late' | 'all' | 'analytics';
const LIMIT = 25;
const DAY = 86_400_000;

const lateDays = (r: GamingRental) => Math.max(Math.ceil((Date.now() - new Date(r.rentalEndDate).getTime()) / DAY), 0);

export default function GamingRentalsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canWork = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('out');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<GamingRental | null>(null);
  const [returning, setReturning] = useState<GamingRental | null>(null);

  const status = tab === 'out' ? 'ACTIVE' : tab === 'late' ? 'OVERDUE' : undefined;
  const params = { status, search: q || undefined, page, limit: LIMIT };
  const listQ = useQuery({ queryKey: [GAMING_KEYS.rentals, 'page', params], queryFn: () => gamingRentalsApi.page(params), enabled: tab !== 'analytics', placeholderData: (p) => p });
  const sumQ = useQuery({ queryKey: [GAMING_KEYS.rentals, 'summary'], queryFn: () => gamingRentalsApi.summary() });
  const allQ = useQuery({ queryKey: [GAMING_KEYS.rentals, 'analytics'], queryFn: () => gamingRentalsApi.page({ page: 1, limit: 200 }), enabled: tab === 'analytics' });
  const s = sumQ.data;
  usePageKeys(searchRef, { n: () => { if (canWork) setCreating(true); }, l: () => setTab('late'), a: () => setTab('analytics') });

  const refresh = () => [GAMING_KEYS.rentals, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const mark = useMutation({
    mutationFn: ({ r, to, notes }: { r: GamingRental; to: 'DAMAGED' | 'LOST'; notes: string }) => gamingRentalsApi.updateStatus(r.id, { status: to, notes }),
    onSuccess: (r) => { toast.success(`${r.rentalNumber}: ${RENTAL_STATUS[r.status].label}`); setOpen(null); refresh(); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });

  const rows = listQ.data?.items ?? [];
  const exportCsv = () => {
    if (!rows.length) { toast.error('Is filter me koi rental nahi'); return; }
    downloadCsv('gaming-rentals.csv', [
      ['Rental', 'Customer', 'Phone', 'CNIC', 'Saman', 'Serial', 'Shuru', 'Wapsi', 'Din', 'Kiraya', 'Mila', 'Baqi', 'Deposit', 'Halat'],
      ...rows.map((r) => [r.rentalNumber, r.customerName, r.customerPhone, r.customerCnic, r.productName, r.serialNumber, r.rentalStartDate.slice(0, 10), r.rentalEndDate.slice(0, 10),
        r.daysRented, r.totalPrice, r.paidAmount, r.remainingAmount, r.depositAmount, RENTAL_STATUS[r.status]?.label]),
    ]);
  };
  const printList = (): PrintDoc => ({
    title: tab === 'late' ? 'Late rentals' : 'Rentals',
    meta: [['Bahar', String(s?.active ?? 0)], ['Late', String(s?.overdue ?? 0)], ['Deposit paas', money(s?.depositsHeld ?? 0)]],
    sections: [{
      kind: 'table', title: 'Rentals',
      columns: [{ label: 'Rental' }, { label: 'Customer' }, { label: 'Saman', wideOnly: true }, { label: 'Wapsi' }, { label: 'Deposit', align: 'right' }],
      rows: rows.map((r) => [r.rentalNumber, `${r.customerName} ${r.customerPhone ?? ''}`.trim(), r.productName, shortDate(r.rentalEndDate), money(r.depositAmount)]),
    }],
  });

  const byItem = useMemo(() => {
    const m = new Map<string, { count: number; value: number }>();
    for (const r of allQ.data?.items ?? []) {
      if (r.status === 'CANCELLED') continue;
      const x = m.get(r.productName) ?? { count: 0, value: 0 };
      x.count += 1; x.value += r.totalPrice;
      m.set(r.productName, x);
    }
    return [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.value - a.value).slice(0, 12);
  }, [allQ.data]);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Rentals — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#16a34a', title: 'Kiraye par dein', text: 'Customer ka naam, phone aur CNIC, kitne din, rozana kiraya aur deposit. Kiraya usi waqt bill ban jata hai; baqi kiraya khate me.' },
            { icon: ShieldCheck, color: '#0891b2', title: 'Deposit', text: 'Deposit customer ka paisa hai — alag rakhein. Ye sale me nahi aata. Wapsi par late/nuqsan ki fees is se kat-ti hain, baqi lauta dein.' },
            { icon: RotateCcw, color: '#7c3aed', title: 'Wapsi', text: '"Wapas aaya" — late din khud ginti hote hain (din × kiraya). Nuqsan ho to likhein. Deposit se zyada fees ho to abhi lein ya khate me.' },
            { icon: AlertTriangle, color: '#e11d48', title: 'Cancel', text: 'Ghalat rental ho to Sales me us ka bill cancel karein — rental khud cancel ho jata hai.' },
          ]}
          shortcuts={[['N', 'naya rental'], ['L', 'late'], ['A', 'analytics'], ['/', 'search'], ['G', 'guide']]} />
      )}

      <PageHero title="Rentals" chip={<><PackageOpen /> Kiraya</>} loading={sumQ.isLoading} busy={listQ.isFetching && !listQ.isLoading}
        meta="Console aur game kiraye par — deposit, wapsi aur late fee"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canWork && <button type="button" onClick={() => setCreating(true)} title="Naya rental (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" />Rental</button>}
        </>}
        stats={[
          { label: 'Bahar hai', value: String((s?.active ?? 0) + (s?.overdue ?? 0)) },
          { label: 'Late', value: String(s?.overdue ?? 0) },
          { label: 'Deposit paas', value: money(s?.depositsHeld ?? 0) },
        ]} />

      <KpiRow cols={4}>
        <KpiCard icon={PackageOpen} color="#16a34a" label="Bahar (waqt par)" value={s?.active ?? 0} active={tab === 'out'} onClick={() => { setTab('out'); setPage(1); }} />
        <KpiCard icon={AlertTriangle} color="#e11d48" label="Late" value={s?.overdue ?? 0} active={tab === 'late'} onClick={() => { setTab('late'); setPage(1); }} />
        <KpiCard icon={Wallet} color="#7c3aed" label="Kul kiraya" value={money(s?.totalRevenue ?? 0)} hint={`${money(s?.collected ?? 0)} mila`} />
        <KpiCard icon={Receipt} color="#d97706" label="Baqi (khate me)" value={money(s?.due ?? 0)} />
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Rental, customer, phone, saman ya serial…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined}
        onClear={() => { setSearch(''); setPage(1); }} />

      <ViewTabs value={tab} onChange={(t) => { setTab(t); setPage(1); }} hint="Rental par click kar ke slip, wapsi aur halat"
        tabs={[
          { id: 'out', label: 'Bahar', icon: PackageOpen, count: s?.active ?? null },
          { id: 'late', label: 'Late', icon: AlertTriangle, count: s?.overdue ?? null },
          { id: 'all', label: 'Sab', icon: ListChecks },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        allQ.isLoading ? <ListLoading /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            <BarList title="Kaun sa saman zyada kiraye par gaya" money={money} rows={byItem} />
            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
              <h3 className="text-[0.9375rem] font-semibold text-slate-900">Khulasa</h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-[0.875rem]">
                <div><dt className="text-slate-500">Wapas aa chuke</dt><dd className="font-semibold">{s?.returned ?? 0}</dd></div>
                <div><dt className="text-slate-500">Kul kiraya</dt><dd className="font-semibold">{money(s?.totalRevenue ?? 0)}</dd></div>
                <div><dt className="text-slate-500">Mila</dt><dd className="font-semibold">{money(s?.collected ?? 0)}</dd></div>
                <div><dt className="text-slate-500">Deposit paas</dt><dd className="font-semibold">{money(s?.depositsHeld ?? 0)}</dd></div>
              </dl>
            </section>
          </div>
        )
      ) : (
        <ListCard footer={listQ.data && <Pager page={page} total={listQ.data.total} limit={LIMIT} onPage={setPage} />}>
          {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
            <Empty icon={PackageOpen} title={tab === 'late' ? 'Koi rental late nahi' : 'Is filter me koi rental nahi'} text="Console ya game kiraye par dene ke liye 'Rental' dabayein."
              action={canWork ? <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Rental banayein</Button> : undefined} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => {
                const late = r.status === 'OVERDUE' ? lateDays(r) : 0;
                return (
                  <li key={r.id} className="grid gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_10rem_9rem_auto] lg:items-center">
                    <button type="button" onClick={() => setOpen(r)} className="min-w-0 text-left">
                      <p className="truncate font-semibold text-slate-900 hover:underline">{r.productName} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{r.rentalNumber}</span></p>
                      <p className="truncate text-[0.75rem] text-slate-500">{[r.customerName, r.customerPhone, r.serialNumber].filter(Boolean).join(' · ')}</p>
                    </button>
                    <p className="text-[0.8125rem] text-slate-700">{shortDate(r.rentalStartDate)} → {shortDate(r.rentalEndDate)}<span className={late ? 'block text-[0.75rem] font-semibold text-rose-700' : 'block text-[0.75rem] text-slate-500'}>{late ? `${late} din late` : `${r.daysRented} din`}</span></p>
                    <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(r.totalPrice)}<span className="block text-[0.75rem] font-medium text-slate-500">Deposit {money(r.depositAmount)}</span></p>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Pill tone={RENTAL_STATUS[r.status]?.tone ?? ''}>{RENTAL_STATUS[r.status]?.label ?? r.status}</Pill>
                      {canWork && (r.status === 'ACTIVE' || r.status === 'OVERDUE') && <Button size="sm" onClick={() => setReturning(r)}><RotateCcw className="h-3.5 w-3.5" />Wapas aaya</Button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ListCard>
      )}

      {creating && <CreateModal money={money} onClose={() => setCreating(false)} onDone={() => { setCreating(false); refresh(); }} />}
      {returning && <ReturnModal rental={returning} money={money} onClose={() => setReturning(null)} onDone={() => { setReturning(null); setOpen(null); refresh(); }} />}
      {open && <RentalModal rental={open} money={money} canWork={canWork} busy={mark.isPending} onReturn={() => setReturning(open)}
        onMark={(to, notes) => mark.mutate({ r: open, to, notes })} onClose={() => setOpen(null)} />}
    </PageShell>
  );
}

function slip(r: GamingRental, money: (n: number) => string): PrintDoc {
  return {
    title: `Rental ${r.rentalNumber}`, subtitle: `${longDate(r.rentalStartDate)} → ${longDate(r.rentalEndDate)}`,
    meta: [['Kiraya', money(r.totalPrice)], ['Deposit', money(r.depositAmount)]],
    sections: [
      { kind: 'rows', title: 'Customer', rows: [
        { label: 'Naam', value: r.customerName }, { label: 'Phone', value: r.customerPhone ?? '—' }, { label: 'CNIC', value: r.customerCnic ?? '—' },
        ...(r.guarantorName ? [{ label: 'Zamin', value: `${r.guarantorName} ${r.guarantorPhone ?? ''}`.trim() }] : []),
      ] },
      { kind: 'rows', title: 'Saman', rows: [
        { label: 'Cheez', value: r.productName }, { label: 'Serial', value: r.serialNumber ?? '—' },
        { label: 'Rozana', value: money(r.pricePerDay) }, { label: 'Din', value: String(r.daysRented) },
        { label: 'Dete waqt halat', value: r.conditionAtCheckout ?? '—' },
      ] },
      { kind: 'text', title: 'Shart', text: 'Waqt par wapas na karne par har din ka kiraya late fee me lagega. Nuqsan ya gum hone par qeemat deposit se kategi, zyada ho to customer dega. Deposit wapsi par lautaya jayega.' },
    ],
  };
}

function RentalModal({ rental: r, money, canWork, busy, onReturn, onMark, onClose }: {
  rental: GamingRental; money: (n: number) => string; canWork: boolean; busy: boolean;
  onReturn: () => void; onMark: (to: 'DAMAGED' | 'LOST', notes: string) => void; onClose: () => void;
}) {
  const [notes, setNotes] = useState('');
  const out = r.status === 'ACTIVE' || r.status === 'OVERDUE';
  return (
    <Modal open onClose={onClose} size="lg" title={`${r.rentalNumber} · ${RENTAL_STATUS[r.status]?.label ?? r.status}`} description={r.productName}
      footer={<div className="flex w-full flex-wrap items-center gap-2">
        <PrintButton doc={() => slip(r, money)} label="Agreement slip" size="sm" />
        <span className="flex-1" />
        {canWork && out && <>
          <Button size="sm" variant="secondary" loading={busy} disabled={!notes.trim()} onClick={() => onMark('DAMAGED', notes.trim())}>Kharab likhein</Button>
          <Button size="sm" variant="secondary" loading={busy} disabled={!notes.trim()} onClick={() => onMark('LOST', notes.trim())}>Gum likhein</Button>
          <Button onClick={onReturn}><RotateCcw className="h-4 w-4" />Wapas aaya</Button>
        </>}
      </div>}>
      <div className="space-y-3 text-[0.875rem]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info icon={IdCard} title="Customer">
            <p className="font-semibold text-slate-900">{r.customerName}</p>
            {r.customerPhone && <a href={`tel:${r.customerPhone}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline"><Phone className="h-3.5 w-3.5" />{r.customerPhone}</a>}
            <p className="text-slate-600">{r.customerCnic ? `CNIC ${r.customerCnic}` : 'CNIC nahi likha'}{r.guarantorName ? ` · Zamin ${r.guarantorName}` : ''}</p>
          </Info>
          <Info icon={CalendarClock} title="Kab tak">
            <p className="font-semibold text-slate-900">{longDate(r.rentalStartDate)} → {longDate(r.rentalEndDate)}</p>
            <p className="text-slate-600">{r.daysRented} din × {money(r.pricePerDay)}{r.actualReturnDate ? ` · wapas ${shortDate(r.actualReturnDate)}` : ''}</p>
          </Info>
        </div>
        <dl className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-4">
          <div><dt className="text-[0.75rem] text-slate-500">Kiraya</dt><dd className="font-semibold">{money(r.totalPrice)}</dd></div>
          <div><dt className="text-[0.75rem] text-slate-500">Mila</dt><dd className="font-semibold">{money(r.paidAmount)}</dd></div>
          <div><dt className="text-[0.75rem] text-slate-500">Khate me</dt><dd className="font-semibold">{money(r.remainingAmount)}</dd></div>
          <div><dt className="text-[0.75rem] text-slate-500">Deposit</dt><dd className="font-semibold">{money(r.depositAmount)}{r.status === 'RETURNED' ? ` · lautaya ${money(r.depositRefunded)}` : ''}</dd></div>
        </dl>
        {(r.lateFee > 0 || r.damageFee > 0) && <p className="text-slate-700">Late fee {money(r.lateFee)} · Nuqsan {money(r.damageFee)}</p>}
        {r.conditionAtCheckout && <p className="text-slate-600"><span className="font-semibold">Dete waqt:</span> {r.conditionAtCheckout}</p>}
        {r.conditionAtReturn && <p className="text-slate-600"><span className="font-semibold">Wapsi par:</span> {r.conditionAtReturn}</p>}
        {r.notes && <p className="whitespace-pre-line text-slate-600">{r.notes}</p>}
        {canWork && out && <Textarea label="Kharab ya gum — kya hua" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} hint="Likhne ke baad 'Kharab' ya 'Gum' dabayein; paisa wapsi par deposit se katein" />}
      </div>
    </Modal>
  );
}

function CreateModal({ money, onClose, onDone }: { money: (n: number) => string; onClose: () => void; onDone: () => void }) {
  const itemsQ = useQuery({ queryKey: [GAMING_KEYS.profiles], queryFn: () => gamingProductsApi.list(), staleTime: 60_000 });
  const rentable = (itemsQ.data ?? []).filter((p) => p.isRentable && p.product);
  const today = dayKey();
  const [v, setV] = useState({
    productId: '', productName: '', serialNumber: '', customerName: '', customerPhone: '', customerCnic: '', guarantorName: '', guarantorPhone: '',
    start: today, days: '1', pricePerDay: '', deposit: '', paid: '', method: 'CASH', condition: '', notes: '',
  });
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const pick = (id: string) => {
    const p = rentable.find((x) => x.productId === id);
    set({ productId: id, productName: p?.product?.name ?? '', pricePerDay: p?.rentalPricePerDay ? String(p.rentalPricePerDay) : v.pricePerDay, deposit: p?.rentalDeposit ? String(p.rentalDeposit) : v.deposit });
  };
  const days = Math.max(Number(v.days) || 0, 0);
  const rate = numIn(v.pricePerDay);
  const total = Math.round(days * (rate ?? 0) * 100) / 100;
  const paid = v.paid === '' ? total : numIn(v.paid) ?? 0;
  const errors = {
    productName: !v.productName.trim() ? 'Kya de rahe hain' : undefined,
    customerName: !v.customerName.trim() ? 'Naam likhein' : undefined,
    customerPhone: !v.customerPhone.trim() ? 'Phone likhein' : !phoneOk(v.customerPhone) ? '10 se 15 hindse' : undefined,
    days: days < 1 ? 'Kam se kam 1 din' : undefined,
    pricePerDay: rate === null ? 'Rozana kiraya likhein' : undefined,
    paid: paid > total + 0.01 ? `Kiraya sirf ${money(total)} hai` : undefined,
  };
  const [tried, setTried] = useState(false);
  const bad = Object.values(errors).some(Boolean);
  const save = useMutation({
    mutationFn: () => {
      const payload: RentalInput = {
        productId: v.productId || undefined, productName: v.productName.trim(), serialNumber: v.serialNumber.trim() || undefined,
        customerName: v.customerName.trim(), customerPhone: v.customerPhone.trim(), customerCnic: v.customerCnic.trim() || undefined,
        guarantorName: v.guarantorName.trim() || undefined, guarantorPhone: v.guarantorPhone.trim() || undefined,
        rentalStartDate: v.start, rentalEndDate: addDays(v.start, days), daysRented: days, pricePerDay: rate ?? 0,
        depositAmount: numIn(v.deposit) ?? 0, paidAmount: paid, paymentMethod: v.method, conditionAtCheckout: v.condition.trim() || undefined, notes: v.notes.trim() || undefined,
      };
      return gamingRentalsApi.create(payload);
    },
    onSuccess: (r) => { toast.success(`${r.rentalNumber} — ${r.productName} de diya. Slip rental kholkar print karein`); onDone(); },
    onError: (e) => toast.error(errorText(e, 'Rental nahi bana')),
  });
  const submit = () => { setTried(true); if (!bad && !save.isPending) save.mutate(); };
  useSaveKey(submit);
  const e = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  return (
    <Modal open onClose={onClose} size="lg" title="Kiraye par dein" description="Kiraya abhi bill banta hai; deposit alag rakhein"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={submit}><CheckCircle2 className="h-4 w-4" />Rental banayein (Ctrl+S)</Button></>}>
      <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Kiraye wala saman" value={v.productId} onChange={(x) => pick(x.target.value)} placeholder={itemsQ.isLoading ? 'Load ho raha…' : 'Chunein ya neeche likhein'}
            options={rentable.map((p) => ({ value: p.productId, label: `${p.product?.name}${p.rentalPricePerDay ? ` — ${money(p.rentalPricePerDay)}/din` : ''}` }))}
            hint={!itemsQ.isLoading && !rentable.length ? 'Product Edit → Rental me "Kiraye par" lagayein' : undefined} />
          <Input label="Saman ka naam" required value={v.productName} onChange={(x) => set({ productName: x.target.value })} placeholder="PS5 + 2 controller" error={e('productName')} />
          <Input label="Serial number" value={v.serialNumber} onChange={(x) => set({ serialNumber: x.target.value })} hint="Wapsi par milayein" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Customer" required value={v.customerName} onChange={(x) => set({ customerName: x.target.value })} placeholder="Hamza" error={e('customerName')} />
          <Input label="Phone" required inputMode="tel" value={v.customerPhone} onChange={(x) => set({ customerPhone: x.target.value })} placeholder="03001234567" error={e('customerPhone')} hint="Khata isi se banta hai" />
          <Input label="CNIC" inputMode="numeric" value={v.customerCnic} onChange={(x) => set({ customerCnic: x.target.value })} placeholder="35202-1234567-1" hint="Mehnga saman ho to zaroor likhein" />
          <Input label="Zamin ka naam" value={v.guarantorName} onChange={(x) => set({ guarantorName: x.target.value })} hint="Marzi hai" />
          <Input label="Zamin ka phone" inputMode="tel" value={v.guarantorPhone} onChange={(x) => set({ guarantorPhone: x.target.value })} hint="Marzi hai" />
          <Input label="Shuru" type="date" value={v.start} onChange={(x) => set({ start: x.target.value })} hint={days ? `Wapsi ${shortDate(addDays(v.start, days))}` : undefined} />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Kitne din" required inputMode="numeric" value={v.days} onChange={(x) => set({ days: x.target.value.replace(/\D/g, '') })} error={e('days')} />
          <Input label="Rozana kiraya (Rs)" required inputMode="decimal" value={v.pricePerDay} onChange={(x) => set({ pricePerDay: moneyText(x.target.value) })} error={e('pricePerDay')} hint={total ? `Kul ${money(total)}` : undefined} />
          <Input label="Deposit (Rs)" inputMode="decimal" value={v.deposit} onChange={(x) => set({ deposit: moneyText(x.target.value) })} hint="Alag rakhein — wapsi par lautayein" />
          <Input label="Kiraya abhi mila" inputMode="decimal" value={v.paid === '' ? String(total) : v.paid} onChange={(x) => set({ paid: moneyText(x.target.value) })} error={e('paid')} hint={paid < total ? `${money(total - paid)} khate me` : 'Poora'} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Kaise mila" value={v.method} onChange={(x) => set({ method: x.target.value })} options={PAY_METHODS} />
          <Input label="Dete waqt halat" value={v.condition} onChange={(x) => set({ condition: x.target.value })} placeholder="Sab theek, 2 controller, box ke saath" />
        </div>
        <Textarea label="Note" rows={2} value={v.notes} onChange={(x) => set({ notes: x.target.value })} />
      </form>
    </Modal>
  );
}

function ReturnModal({ rental: r, money, onClose, onDone }: { rental: GamingRental; money: (n: number) => string; onClose: () => void; onDone: () => void }) {
  const late = lateDays(r);
  const [lateFee, setLateFee] = useState(String(late * r.pricePerDay));
  const [damage, setDamage] = useState('');
  const [condition, setCondition] = useState('');
  const [method, setMethod] = useState('CASH');
  const fees = (numIn(lateFee) ?? 0) + (numIn(damage) ?? 0);
  const fromDeposit = Math.min(fees, r.depositAmount);
  const extra = Math.max(fees - fromDeposit, 0);
  const [paid, setPaid] = useState<string | null>(null);
  const paidN = paid === null ? extra : Math.min(numIn(paid) ?? 0, extra);
  const back = Math.max(r.depositAmount - fromDeposit, 0);
  const save = useMutation({
    mutationFn: () => gamingRentalsApi.returnRental(r.id, { lateFee: numIn(lateFee) ?? 0, damageFee: numIn(damage) ?? 0, conditionAtReturn: condition.trim() || undefined, paidAmount: paidN, paymentMethod: method }),
    onSuccess: (x) => { toast.success(`${x.rentalNumber} wapas — deposit lautayein ${money(x.depositRefunded)}`); onDone(); },
    onError: (e) => toast.error(errorText(e, 'Wapsi save nahi hui')),
  });
  const submit = () => { if (!save.isPending) save.mutate(); };
  useSaveKey(submit);
  return (
    <Modal open onClose={onClose} size="md" title={`${r.productName} — wapsi`} description={`${r.rentalNumber} · ${r.customerName}${late ? ` · ${late} din late` : ' · waqt par'}`}
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={submit}><RotateCcw className="h-4 w-4" />Wapsi save karein</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Late fee (Rs)" inputMode="decimal" value={lateFee} onChange={(e) => setLateFee(moneyText(e.target.value))} hint={late ? `${late} din × ${money(r.pricePerDay)}` : 'Waqt par aaya'} />
          <Input label="Nuqsan (Rs)" inputMode="decimal" value={damage} onChange={(e) => setDamage(moneyText(e.target.value))} placeholder="0" hint="Toota ya kharab ho to" />
        </div>
        <Input label="Wapsi par halat" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Sab theek / controller ka button kharab" />
        <dl className="space-y-1 rounded-2xl bg-slate-50 px-4 py-3 text-[0.875rem]">
          <div className="flex justify-between"><dt>Deposit</dt><dd className="tabular-nums">{money(r.depositAmount)}</dd></div>
          <div className="flex justify-between"><dt>Fees deposit se</dt><dd className="tabular-nums">−{money(fromDeposit)}</dd></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-bold"><dt>Customer ko lautayein</dt><dd className="tabular-nums">{money(back)}</dd></div>
        </dl>
        {extra > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Deposit se zyada — abhi mila" inputMode="decimal" value={paid ?? String(extra)} onChange={(e) => setPaid(moneyText(e.target.value))}
              hint={paidN < extra ? `${money(extra - paidN)} ${r.customerName} ke khate me` : `Poora ${money(extra)}`} />
            <Select label="Kaise mila" value={method} onChange={(e) => setMethod(e.target.value)} options={PAY_METHODS} />
          </div>
        )}
      </form>
    </Modal>
  );
}
