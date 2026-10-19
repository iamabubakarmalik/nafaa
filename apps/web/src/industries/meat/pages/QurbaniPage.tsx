/**
 * Qurbani and aqeeqa bookings: shares of a cow or camel (up to seven) or a
 * whole goat. Advances go on the customer's khata the day they are paid;
 * when the meat is handed over the booking becomes one bill (share price,
 * cost from the linked animal) and the advance cancels it on the khata.
 * Cancelled bookings can get the advance back in cash.
 *
 * Keys: N new booking · / search · 1 bookings · 2 analytics · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, BarChart3, Ban, Beef, CheckCircle2, FileSpreadsheet, GraduationCap, Pencil, Plus, Receipt, Undo2, Users, Wallet } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, FilterBar, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Switch, ViewTabs,
  heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { liveAnimalsApi } from '../api/live-animals.api';
import { qurbaniApi, type QurbaniBooking } from '../api/qurbani.api';
import { CancelModal, MethodPicker, PayModal, RefundModal } from '../components/money';
import { FormRow, ListFrame, Pill, inputBox, usePageKeys, useSaveKey, type Tone } from '../components/ui';
import { KEYS, MONEY_KEYS, animalOf, apiError, dateOnly, decimal, type PayMethod } from '../lib/meta';

type View = 'list' | 'analytics';
const SHARED = ['BEEF', 'CAMEL', 'BUFFALO'];
const KINDS = [{ value: 'BEEF', label: 'Gaye (hissa)' }, { value: 'CAMEL', label: 'Oont (hissa)' }, { value: 'MUTTON', label: 'Bakra' }, { value: 'LAMB', label: 'Dumba' }, { value: 'GOAT', label: 'Bakri' }];
const OCCASIONS = [{ value: 'QURBANI', label: 'Qurbani' }, { value: 'AQEEQA', label: 'Aqeeqa' }, { value: 'SADQA', label: 'Sadqa' }, { value: 'NAZAR', label: 'Nazar / niaz' }];
const STATUS: Record<string, { label: string; tone: Tone }> = {
  BOOKED: { label: 'Booked', tone: 'sky' }, CONFIRMED: { label: 'Pakki', tone: 'violet' }, SLAUGHTERED: { label: 'Zibah ho gaya', tone: 'amber' },
  COMPLETED: { label: 'De diya', tone: 'emerald' }, CANCELLED: { label: 'Cancel', tone: 'rose' },
};
const occasionLabel = (v: string) => OCCASIONS.find((o) => o.value === v)?.label ?? v;
const isOpen = (b: QurbaniBooking) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED';

function BookingForm({ b, onClose, onDone }: { b: QurbaniBooking | null; onClose: () => void; onDone: () => void }) {
  const animals = useQuery({ queryKey: [KEYS.animals, { isSlaughtered: 'false' }], queryFn: () => liveAnimalsApi.list({ isSlaughtered: 'false' }) });
  const [name, setName] = useState(b?.customerName ?? '');
  const [phone, setPhone] = useState(b?.customerPhone ?? '');
  const [occasion, setOccasion] = useState(b?.occasion ?? 'QURBANI');
  const [type, setType] = useState(b?.animalType ?? 'BEEF');
  const [shares, setShares] = useState(String(b?.shareCount ?? 1));
  const [price, setPrice] = useState(b?.finalPrice ? String(b.finalPrice) : '');
  const [animalId, setAnimalId] = useState(b?.liveAnimalId ?? '');
  const [day, setDay] = useState(String(b?.slaughterDay ?? 1));
  const [delivery, setDelivery] = useState(b?.deliveryPreference === 'HOME_DELIVERY');
  const [address, setAddress] = useState(b?.deliveryAddress ?? '');
  const [skin, setSkin] = useState(b?.wantsSkin ?? false);
  const [notes, setNotes] = useState(b?.specialInstructions ?? '');
  const [advance, setAdvance] = useState('');
  const [method, setMethod] = useState<PayMethod>('CASH');
  const [tried, setTried] = useState(false);
  const shared = SHARED.includes(type);
  const errors: Record<string, string> = {};
  if (name.trim().length < 2) errors.name = 'Naam likhein';
  if (!/^[0-9+\-\s]{10,15}$/.test(phone.trim())) errors.phone = 'Phone theek likhein (03xx-xxxxxxx)';
  if (shared && !(Number(shares) >= 1 && Number(shares) <= 7)) errors.shares = 'Hisse 1 se 7 tak';
  if (price !== '' && !(Number(price) > 0)) errors.price = 'Qeemat theek likhein';
  if (b && price !== '' && Number(price) + 0.005 < b.paidAmount) errors.price = `${formatPKR(b.paidAmount)} mil chuka — qeemat is se kam nahi`;
  if (!b && Number(advance) > 0 && price !== '' && Number(advance) > Number(price)) errors.advance = 'Advance qeemat se zyada nahi';
  if (delivery && !address.trim()) errors.address = 'Pata likhein';
  const err = (k: string) => (tried ? errors[k] : undefined);
  const save = useMutation({
    mutationFn: () => {
      const body = {
        customerName: name.trim(), customerPhone: phone.trim(), occasion, animalType: type, shareCount: shared ? Number(shares) : 1,
        finalPrice: price === '' ? null : Number(price), liveAnimalId: animalId || null, slaughterDay: Number(day),
        deliveryPreference: delivery ? 'HOME_DELIVERY' : 'SELF_PICKUP', wantsMeatDelivery: delivery, deliveryAddress: delivery ? address.trim() : null,
        wantsSkin: skin, specialInstructions: notes.trim() || null,
      };
      return b ? qurbaniApi.update(b.id, body) : qurbaniApi.create({ ...body, advanceAmount: Number(advance) || 0, paymentMethod: method });
    },
    onSuccess: (r) => { toast.success(b ? 'Booking badal di' : `Booking ${r.bookingNumber} ban gayi`); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Booking save nahi hui')),
  });
  const submit = () => { setTried(true); const f = Object.values(errors)[0]; if (f) { toast.error(f); return; } if (!save.isPending) save.mutate(); };
  useSaveKey(submit);
  const fit = (animals.data ?? []).filter((a) => a.animalType === type);
  return (
    <Modal open onClose={onClose} size="lg" title={b ? `${b.bookingNumber} badlein` : 'Nayi booking'} description="Ctrl+S se save"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={submit}>Save</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormRow label="Naam" error={err('name')}><input data-autofocus value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputBox} aria-invalid={!!err('name')} /></FormRow>
          <FormRow label="Phone" error={err('phone')}><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputBox} placeholder="03xx-xxxxxxx" aria-invalid={!!err('phone')} /></FormRow>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormRow label="Kis liye"><select value={occasion} onChange={(e) => setOccasion(e.target.value)} className={inputBox}>{OCCASIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FormRow>
          <FormRow label="Janwar"><select value={type} onChange={(e) => setType(e.target.value)} className={inputBox}>{KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></FormRow>
          <FormRow label="Hisse" error={err('shares')} hint={shared ? '1 se 7' : 'Poora janwar ek hissa'}><input inputMode="numeric" disabled={!shared} value={shared ? shares : '1'} onChange={(e) => setShares(e.target.value.replace(/\D/g, ''))} className={inputBox} /></FormRow>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormRow label="Kul qeemat" error={err('price')} hint="Abhi pata na ho to khali — dete waqt zaroori"><input inputMode="decimal" value={price} onChange={(e) => setPrice(decimal(e.target.value))} className={cn(inputBox, 'text-right')} aria-invalid={!!err('price')} /></FormRow>
          <FormRow label="Janwar (baara se)" hint="Is ki purchase qeemat bill ki cost banti hai">
            <select value={animalId} onChange={(e) => setAnimalId(e.target.value)} className={inputBox}><option value="">Abhi nahi</option>{fit.map((a) => <option key={a.id} value={a.id}>{a.tagNumber} · {a.weightKg} kg</option>)}</select>
          </FormRow>
          <FormRow label="Kaunsa din"><select value={day} onChange={(e) => setDay(e.target.value)} className={inputBox}>{[1, 2, 3].map((d) => <option key={d} value={d}>Eid ka {d === 1 ? 'pehla' : d === 2 ? 'doosra' : 'teesra'} din</option>)}</select></FormRow>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Switch checked={delivery} onChange={(e) => setDelivery(e.target.checked)} label="Gosht ghar bhejna hai" />
          <Switch checked={skin} onChange={(e) => setSkin(e.target.checked)} label="Khaal customer ko chahiye" />
        </div>
        {delivery && <FormRow label="Pata" error={err('address')}><input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={1000} className={inputBox} aria-invalid={!!err('address')} /></FormRow>}
        <Input label="Hidayat (marzi)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Teen hisse: ghar, rishtedar, gareeb…" />
        {!b && (
          <div className="space-y-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <FormRow label="Advance (abhi mila)" error={err('advance')} hint="Aaj ke galle aur customer ke khate me jata hai"><input inputMode="decimal" value={advance} onChange={(e) => setAdvance(decimal(e.target.value))} className={cn(inputBox, 'bg-white text-right font-semibold')} placeholder="0" /></FormRow>
            {Number(advance) > 0 && <MethodPicker value={method} onChange={setMethod} />}
          </div>
        )}
      </form>
    </Modal>
  );
}

function CompleteModal({ b, onClose, onDone }: { b: QurbaniBooking; onClose: () => void; onDone: () => void }) {
  const one = useQuery({ queryKey: [KEYS.qurbani, 'one', b.id], queryFn: () => qurbaniApi.getOne(b.id), staleTime: 0 });
  const held = (one.data?.khataPaid ?? 0) + (one.data?.legacyPaid ?? 0);
  const due = Math.max((b.finalPrice ?? 0) - held, 0);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PayMethod>('CASH');
  useEffect(() => { if (one.data) setAmount(String(due)); }, [one.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = Number(amount) || 0;
  const save = useMutation({
    mutationFn: () => qurbaniApi.complete(b.id, n, method),
    onSuccess: (r) => { toast.success(`${b.bookingNumber} de diya — bill ${r.sale.saleNumber}`); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Bill nahi bana')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Gosht de dein aur bill banayein" description={`${b.bookingNumber} · ${b.customerName} · ${formatPKR(b.finalPrice ?? 0)}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant="success" disabled={!one.data || n > due + 0.005} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Receipt className="h-4 w-4" />}>Bill banayein</Button></>}>
      {!one.data ? <Skeleton className="h-24 rounded-xl" /> : (
        <div className="space-y-3">
          <p className="text-[0.875rem] text-slate-700">Advance mila {formatPKR(held)} · ab lena <strong>{formatPKR(due)}</strong></p>
          <Input data-autofocus inputMode="decimal" value={amount} onChange={(e) => setAmount(decimal(e.target.value))} size="lg" className="text-center text-2xl font-bold tabular-nums" error={n > due + 0.005 ? `Baqi sirf ${formatPKR(due)}` : undefined} />
          <MethodPicker value={method} onChange={setMethod} />
          {due - n > 0.005 && <p className="text-[0.8125rem] text-amber-800">{formatPKR(due - n)} customer ke khate me udhaar jayega.</p>}
        </div>
      )}
    </Modal>
  );
}

function RefundDialog({ b, onClose }: { b: QurbaniBooking; onClose: () => void }) {
  const one = useQuery({ queryKey: [KEYS.qurbani, 'one', b.id], queryFn: () => qurbaniApi.getOne(b.id), staleTime: 0 });
  if (!one.data) return null;
  return <RefundModal title={`${b.bookingNumber} · ${b.customerName}`} held={one.data.khataPaid ?? 0} legacy={one.data.legacyPaid ?? 0} onClose={onClose} onRefund={(pin) => qurbaniApi.refund(b.id, pin)} />;
}

type Dialog = { kind: 'new' } | { kind: 'edit' | 'pay' | 'done' | 'cancel' | 'refund'; b: QurbaniBooking } | null;

export default function QurbaniPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales } = useMasked();
  const canPos = usePermission(PERMISSIONS.POS_USE);
  const canRefund = usePermission(PERMISSIONS.RETURNS_CREATE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('list');
  const [status, setStatus] = useState('open');
  const [occasion, setOccasion] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const listQ = useQuery({ queryKey: [KEYS.qurbani, occasion, query], queryFn: () => qurbaniApi.list({ occasion: occasion || undefined, search: query || undefined }), placeholderData: (p) => p });
  const all = listQ.data ?? [];
  const rows = all.filter((b) => (status === 'open' ? isOpen(b) : status ? b.status === status : true));
  const open = all.filter(isOpen);
  const stats = useMemo(() => ({
    shares: open.reduce((s, b) => s + b.shareCount, 0),
    value: open.reduce((s, b) => s + (b.finalPrice ?? 0), 0),
    paid: open.reduce((s, b) => s + b.paidAmount, 0),
    noPrice: open.filter((b) => !b.finalPrice).length,
  }), [open]);
  const refresh = () => [KEYS.qurbani, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const step = useMutation({
    mutationFn: ({ b, status: s }: { b: QurbaniBooking; status: string }) => qurbaniApi.updateStatus(b.id, s),
    onSuccess: () => { toast.success('Halat badal di'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Halat nahi badli')),
  });
  usePageKeys({ n: canPos ? () => setDialog({ kind: 'new' }) : undefined, '1': () => setView('list'), '2': () => setView('analytics'), g: guide.open }, searchRef);

  const printDoc = (): PrintDoc => ({
    title: 'Qurbani / aqeeqa bookings', subtitle: STATUS[status]?.label ?? (status === 'open' ? 'Chal rahi' : 'Sab'),
    sections: [{ kind: 'table', columns: [{ label: '#' }, { label: 'Naam' }, { label: 'Phone' }, { label: 'Janwar' }, { label: 'Hisse', align: 'right' }, { label: 'Din', align: 'right' }, { label: 'Qeemat', align: 'right' }, { label: 'Mila', align: 'right' }],
      rows: rows.map((b) => [b.bookingNumber, b.customerName, b.customerPhone, animalOf(b.animalType).label, String(b.shareCount), String(b.slaughterDay ?? ''), formatPKR(b.finalPrice ?? 0), formatPKR(b.paidAmount)]) }],
  });

  return (
    <PageShell>
      <PageHero
        title="Qurbani aur aqeeqa"
        chip={<><Beef /> Hisse aur bookings</>}
        meta="Hissa book karein, advance lein, zibah ke baad gosht de kar bill banayein"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!rows.length} /></span>
          <button type="button" title="CSV" className={heroIconButton} disabled={!rows.length}
            onClick={() => downloadCsv('qurbani.csv', [['#', 'Naam', 'Phone', 'Kis liye', 'Janwar', 'Hisse', 'Din', 'Qeemat', 'Mila', 'Halat'], ...rows.map((b) => [b.bookingNumber, b.customerName, b.customerPhone, occasionLabel(b.occasion), animalOf(b.animalType).label, b.shareCount, b.slaughterDay, b.finalPrice, b.paidAmount, STATUS[b.status]?.label])])}>
            <FileSpreadsheet className="h-4 w-4" />
          </button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canPos && <button type="button" onClick={() => setDialog({ kind: 'new' })} title="Nayi booking (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Nayi booking</button>}
        </>}
        stats={[{ label: 'Chal rahi', value: open.length }, { label: 'Hisse', value: stats.shares }, { label: 'Advance mila', value: sales(stats.paid) }]}
      />

      <KpiRow cols={4}>
        {listQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Users} color="#7c3aed" label="Chal rahi" value={open.length} hint={`${stats.shares} hisse`} onClick={() => setStatus('open')} active={status === 'open'} />
          <KpiCard icon={Beef} color="#d97706" label="Zibah ho gaya" value={all.filter((b) => b.status === 'SLAUGHTERED').length} hint="Gosht dena baqi" onClick={() => setStatus('SLAUGHTERED')} active={status === 'SLAUGHTERED'} />
          <KpiCard icon={Wallet} color="#0891b2" label="Lena baqi" value={sales(Math.max(stats.value - stats.paid, 0))} hint={stats.noPrice ? `${stats.noPrice} ki qeemat nahi likhi` : 'Chalti bookings par'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label="De diya" value={all.filter((b) => b.status === 'COMPLETED').length} onClick={() => setStatus('COMPLETED')} active={status === 'COMPLETED'} />
        </>}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Booking #, naam, phone…" label="Search" />}>
        <FilterMenu icon={Users} label={status === 'open' ? 'Chal rahi' : STATUS[status]?.label ?? 'Sab'} value={status} active={status !== 'open'} onChange={setStatus}
          options={[{ value: 'open', label: 'Chal rahi' }, ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label })), { value: '', label: 'Sab' }]} />
        <FilterMenu icon={Beef} label={occasion ? occasionLabel(occasion) : 'Sab mauqe'} value={occasion} active={!!occasion} onChange={setOccasion}
          options={[{ value: '', label: 'Sab mauqe' }, ...OCCASIONS]} />
      </FilterBar>

      <ViewTabs value={view} onChange={setView} hint={<>{canPos ? 'N nayi · ' : ''}/ search · 1-2 tabs</>}
        tabs={[{ id: 'list', label: 'Bookings', icon: Users, count: rows.length }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]} />

      {view === 'analytics' ? (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <h3 className="font-semibold text-slate-900">Eid ke din aur janwar ke hisaab se (chalti bookings)</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {Object.entries(open.reduce<Record<string, { n: number; shares: number }>>((acc, b) => {
              const k = `Din ${b.slaughterDay ?? '—'} · ${animalOf(b.animalType).label}`;
              const r = acc[k] ?? { n: 0, shares: 0 }; r.n += 1; r.shares += b.shareCount; acc[k] = r; return acc;
            }, {})).sort().map(([k, r]) => (
              <li key={k} className="flex justify-between py-2 text-[0.875rem]"><span>{k}</span><span className="font-semibold tabular-nums">{r.n} booking · {r.shares} hisse{SHARED.some((s) => k.includes(animalOf(s).label)) ? ` · ${Math.ceil(r.shares / 7)} janwar` : ''}</span></li>
            ))}
            {!open.length && <li className="py-6 text-center text-sm text-slate-500">Koi chalti booking nahi</li>}
          </ul>
        </div>
      ) : (
        <ListFrame loading={listQ.isLoading} error={listQ.isError && !listQ.data} onRetry={() => listQ.refetch()}
          empty={!rows.length ? { icon: Beef, title: 'Koi booking nahi', text: 'Eid se pehle hisse book karein — naam, phone, kitne hisse aur advance.', actions: canPos ? <Button onClick={() => setDialog({ kind: 'new' })} leftIcon={<Plus className="h-4 w-4" />}>Nayi booking</Button> : undefined } : null}>
          {rows.map((b) => {
            const due = Math.max((b.finalPrice ?? 0) - b.paidAmount, 0);
            const next = b.status === 'BOOKED' ? { s: 'CONFIRMED', l: 'Pakki karein' } : b.status === 'CONFIRMED' ? { s: 'SLAUGHTERED', l: 'Zibah ho gaya' } : null;
            return (
              <li key={b.id} className="px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-900">{b.customerName}</span>
                      <span className="text-[0.75rem] text-slate-500">{b.bookingNumber}</span>
                      <Pill tone={STATUS[b.status]?.tone}>{STATUS[b.status]?.label ?? b.status}</Pill>
                      <Pill>{occasionLabel(b.occasion)}</Pill>
                    </div>
                    <p className="mt-0.5 text-[0.8125rem] text-slate-600">{animalOf(b.animalType).emoji} {animalOf(b.animalType).label} · {b.shareCount} hissa{b.slaughterDay ? ` · Eid din ${b.slaughterDay}` : ''}{b.deliveryPreference === 'HOME_DELIVERY' ? ' · ghar bhejna' : ''}</p>
                    <p className="text-[0.75rem] text-slate-500">{b.customerPhone} · {dateOnly(b.bookedAt)}{b.cancellationReason ? ` · Wajah: ${b.cancellationReason}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums">{b.finalPrice ? sales(b.finalPrice) : <span className="text-amber-700">Qeemat nahi</span>}</p>
                    <p className="text-[0.75rem] text-slate-500">Mila {sales(b.paidAmount)}</p>
                    {isOpen(b) && due > 0 && <p className="text-[0.75rem] font-semibold text-amber-700">Baqi {sales(due)}</p>}
                  </div>
                </div>
                {canPos && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {isOpen(b) && <>
                      {next && <Button size="sm" variant="secondary" rightIcon={<ArrowRight className="h-3.5 w-3.5" />} loading={step.isPending && step.variables?.b.id === b.id} onClick={() => step.mutate({ b, status: next.s })}>{next.l}</Button>}
                      {(!b.finalPrice || due > 0) && <Button size="sm" variant="secondary" leftIcon={<Wallet className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'pay', b })}>Paisa mila</Button>}
                      <Button size="sm" variant="success" leftIcon={<Receipt className="h-3.5 w-3.5" />} disabled={!b.finalPrice} title={!b.finalPrice ? 'Pehle qeemat likhein' : undefined} onClick={() => setDialog({ kind: 'done', b })}>Gosht de kar bill</Button>
                      <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'edit', b })}>Badlein</Button>
                      <Button size="sm" variant="ghost" leftIcon={<Ban className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'cancel', b })}>Cancel</Button>
                    </>}
                    {b.status === 'CANCELLED' && b.paidAmount > 0 && canRefund && <Button size="sm" variant="secondary" leftIcon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'refund', b })}>Advance wapas</Button>}
                  </div>
                )}
              </li>
            );
          })}
        </ListFrame>
      )}

      {(dialog?.kind === 'new' || dialog?.kind === 'edit') && <BookingForm b={dialog.kind === 'edit' ? dialog.b : null} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog?.kind === 'pay' && <PayModal title={`${dialog.b.bookingNumber} · ${dialog.b.customerName}`} due={dialog.b.finalPrice ? Math.max(dialog.b.finalPrice - dialog.b.paidAmount, 0) : 1_000_000} onClose={() => { setDialog(null); refresh(); }} onPay={(a, m) => qurbaniApi.payment(dialog.b.id, a, m)} />}
      {dialog?.kind === 'done' && <CompleteModal b={dialog.b} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog?.kind === 'cancel' && <CancelModal title={`${dialog.b.bookingNumber} · ${dialog.b.customerName}`} paid={dialog.b.paidAmount} onClose={() => { setDialog(null); refresh(); }} onConfirm={(r) => qurbaniApi.updateStatus(dialog.b.id, 'CANCELLED', r)} />}
      {dialog?.kind === 'refund' && <RefundDialog b={dialog.b} onClose={() => { setDialog(null); refresh(); }} />}

      {guide.isOpen && (
        <PageGuide title="Qurbani aur aqeeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#7c3aed', title: 'Booking', text: 'Naam, phone, janwar aur hisse (gaye / oont me 7 tak). Advance usi waqt lein — aaj ke galle me aata hai.' },
            { icon: Beef, color: '#d97706', title: 'Janwar jorein', text: 'Baara ka janwar booking se jorein — us ki qeemat bill ki cost banti hai aur profit sahi aata hai.' },
            { icon: Receipt, color: '#16a34a', title: 'Gosht de kar bill', text: 'Zibah ke baad "Gosht de kar bill" — ek bill banta hai, advance khate se kat jata hai, baqi ab lein ya udhaar.' },
            { icon: Undo2, color: '#e11d48', title: 'Cancel', text: 'Cancel ke baad advance khate me rehta hai; "Advance wapas" se cash lautayein.' },
          ]}
          tips={['Qeemat likhe baghair bill nahi banta.', 'Bill void karne se booking wapas "Zibah ho gaya" par aa jati hai.']}
          shortcuts={[['N', 'nayi booking'], ['/', 'dhoondein'], ['1', 'bookings'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
