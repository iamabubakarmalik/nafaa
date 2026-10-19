/**
 * Dialogs of a stay: advance / payment, check-in with the guest's ID,
 * extend, room change, folio charge, booking edit, cancel / no-show,
 * advance refund and check-out with the folio bill. Each one calls the
 * hotel API and leaves the money to it (khata, drawer, sale).
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Ban, BedDouble, Building2, CalendarPlus, CheckCircle2, LogIn, LogOut, Package, Plus, Search, Undo2, UserX } from 'lucide-react';
import { Button, Input, Modal, Select, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { withManagerPin } from '@core/security/ManagerPin';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { CustomerPicker } from '@modules/customers/directory/components/KhataTools';
import { PosSplitTender, splitParts, splitSummary, type SplitRow } from '@modules/pos/components/PosSplitTender';
import {
  bookingsApi, type BookingDetail, type BookingSource, type CheckOutResult, type MealPlan, type PayMethod, type TenderInput,
} from '../api/bookings.api';
import { folioApi, type FolioChargeType } from '../api/folio.api';
import { MethodPicker } from './MethodPicker';
import {
  FOLIO_TYPES, ID_TYPES, MEAL_PLANS, SOURCES, addDaysKey, apiError, cnicOk, formatCnic, isInHouse, moneyInput, nightsBetween, num, roomsOf, stayDay,
} from './meta';

interface Base { b: BookingDetail; onClose: () => void; onDone: () => void }

const note = 'text-[0.75rem] text-slate-500';
const warn = 'flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200';

// ─── Payment ─────────────────────────────────────────────────────────

export function PayModal({ b, onClose, onDone }: Base) {
  const due = b.money.due;
  const [amount, setAmount] = useState(String(due));
  const [method, setMethod] = useState<PayMethod>('CASH');
  const n = num(amount);
  const after = b.status === 'CHECKED_OUT';
  const pay = useMutation({
    mutationFn: () => bookingsApi.addPayment(b.id, n, method),
    onSuccess: () => { toast.success(`${formatPKR(n)} darj ho gaya`); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Payment darj nahi hui')),
  });
  const bad = !(n > 0) || n > due + 0.005;
  return (
    <Modal open onClose={onClose} size="sm" title={after ? 'Baqi paisa mila' : 'Advance mila'} description={`${b.guestName} · ${formatPKR(due)} baqi`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="success" disabled={bad} loading={pay.isPending} onClick={() => pay.mutate()} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Darj karein</Button>
      </>}>
      <div className="space-y-3">
        <Input data-autofocus inputMode="decimal" value={amount} onChange={(e) => setAmount(moneyInput(e.target.value))} size="lg"
          onKeyDown={(e) => { if (e.key === 'Enter' && !bad && !pay.isPending) pay.mutate(); }}
          className="text-center text-2xl font-bold tabular-nums" error={n > due + 0.005 ? `Baqi sirf ${formatPKR(due)} hai` : undefined} />
        <div className="flex flex-wrap gap-1.5">
          {[{ l: 'Poora', v: due }, { l: 'Aadha', v: Math.round(due / 2) }, { l: 'Ek raat', v: Math.min(b.bookedRooms.reduce((s, r) => s + r.ratePerNight, 0), due) }]
            .filter((c, i, a) => c.v > 0 && a.findIndex((x) => x.v === c.v) === i)
            .map((c) => <Button key={c.l} size="sm" variant="secondary" onClick={() => setAmount(String(c.v))}>{c.l} <span className="tabular-nums text-slate-500">{formatPKR(c.v)}</span></Button>)}
        </div>
        <MethodPicker value={method} onChange={setMethod} />
        <p className={note}>{after
          ? 'Ye paisa guest / company ke khate me jama hota hai aur aaj ke drawer ya bank me dikhta hai.'
          : 'Advance guest ke khate me jama rehta hai aur aaj ke drawer ya bank me dikhta hai. Check-out ke bill me khud kat jata hai.'}</p>
      </div>
    </Modal>
  );
}

// ─── Check-in ────────────────────────────────────────────────────────

export function CheckInModal({ b, onClose, onDone }: Base) {
  const [idType, setIdType] = useState(b.guest?.idType || 'CNIC');
  const [idNumber, setIdNumber] = useState(b.guest?.idNumber || '');
  const [adults, setAdults] = useState(String(b.totalAdults || 1));
  const [children, setChildren] = useState(String(b.totalChildren || 0));
  const [city, setCity] = useState(b.guest?.city || '');
  const [address, setAddress] = useState(b.guest?.address || '');
  const [nationality, setNationality] = useState(b.guest?.nationality || 'Pakistani');
  const [purpose, setPurpose] = useState(b.purposeOfVisit || '');
  const [tried, setTried] = useState(false);
  const idError = !idNumber.trim() ? 'CNIC ya passport number likhein (police record ke liye)'
    : idType === 'CNIC' && !cnicOk(idNumber) ? 'CNIC 13 hindson ka hota hai (12345-1234567-1)'
      : idType !== 'CNIC' && idNumber.trim().length < 5 ? 'ID number poora likhein' : null;
  const go = useMutation({
    mutationFn: () => bookingsApi.checkIn(b.id, {
      idType, idNumber: idNumber.trim(), adults: Number(adults) || 1, children: Number(children) || 0,
      city: city.trim() || undefined, address: address.trim() || undefined, nationality: nationality.trim() || undefined, purposeOfVisit: purpose.trim() || undefined,
    }),
    onSuccess: () => { toast.success(`${b.guestName} check-in · Room ${roomsOf(b)}`); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Check-in nahi hua')),
  });
  const submit = () => { setTried(true); if (!idError) go.mutate(); };
  return (
    <Modal open onClose={onClose} size="md" title="Check-in" description={`${b.guestName} · Room ${roomsOf(b)} · ${b.nights} raat`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={go.isPending} onClick={submit} leftIcon={<LogIn className="h-4 w-4" />}>Check-in karein</Button>
      </>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <Select label="ID" value={idType} onChange={(e) => setIdType(e.target.value)} options={ID_TYPES.map((t) => ({ value: t.id, label: t.label }))} />
          <Input data-autofocus label="ID number" required value={idNumber} placeholder={idType === 'CNIC' ? '35202-1234567-1' : 'AB1234567'}
            onChange={(e) => setIdNumber(idType === 'CNIC' ? formatCnic(e.target.value) : e.target.value.toUpperCase())}
            error={tried ? idError ?? undefined : undefined} hint="Police record (Form C) ke liye har guest ka ID zaroori hai" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Bade" inputMode="numeric" value={adults} onChange={(e) => setAdults(e.target.value.replace(/\D/g, ''))} />
          <Input label="Bachay" inputMode="numeric" value={children} onChange={(e) => setChildren(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Shehar" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lahore" />
          <Input label="Qaumiyat" value={nationality} onChange={(e) => setNationality(e.target.value)} />
        </div>
        <Input label="Pata" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ghar ka pata (ID ke mutabiq)" />
        <Input label="Aane ki wajah" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Kaam, shadi, ilaaj, ghoomna…" />
        {b.guest?.isBlacklisted && <p className={warn}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Ye guest blacklist me hai: {b.guest.blacklistReason}</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

// ─── Extend ──────────────────────────────────────────────────────────

export function ExtendModal({ b, onClose, onDone }: Base) {
  const from = b.checkOutDate.slice(0, 10);
  const [date, setDate] = useState(b.overdueNights > 0 ? b.today : addDaysKey(from, 1));
  const extra = Math.max(nightsBetween(from, date), 0);
  const perNight = b.bookedRooms.reduce((s, r) => s + (r.isComplimentary ? 0 : r.totalAmount / Math.max(r.totalNights, 1)), 0);
  const go = useMutation({
    mutationFn: () => bookingsApi.extend(b.id, date),
    onSuccess: () => { toast.success(`Stay ${stayDay(date)} tak barh gaya`); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Stay nahi barha')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Stay barhayein" description={`Abhi check-out ${stayDay(from, { day: true })} hai`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button disabled={extra < 1} loading={go.isPending} onClick={() => go.mutate()} leftIcon={<CalendarPlus className="h-4 w-4" />}>{extra} raat barhayein</Button>
      </>}>
      <div className="space-y-3">
        <Input data-autofocus type="date" label="Nayi check-out date" value={date} min={addDaysKey(from, 1)} onChange={(e) => setDate(e.target.value)} />
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 7].map((d) => <Button key={d} size="sm" variant="secondary" onClick={() => setDate(addDaysKey(from, d))}>+{d} raat</Button>)}
        </div>
        {extra > 0 && <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-[0.8125rem] text-slate-700">Taqreeban {formatPKR(Math.round(perNight * extra))} bill me jurenge (wohi rate jo tay hua tha). Agar room aagay kisi aur ke liye book hai to system bata dega.</p>}
        {b.overdueNights > 0 && <p className={warn}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Guest {b.overdueNights} raat zyada ruk chuka hai — check-out se pehle stay aaj tak barhayein.</p>}
      </div>
    </Modal>
  );
}

// ─── Room change ─────────────────────────────────────────────────────

export function ChangeRoomModal({ b, onClose, onDone }: Base) {
  const [lineId, setLineId] = useState(b.bookedRooms[0]?.id ?? '');
  const line = b.bookedRooms.find((r) => r.id === lineId);
  const from = isInHouse(b.status) && b.today > b.checkInDate.slice(0, 10) ? b.today : b.checkInDate.slice(0, 10);
  const q = useQuery({
    queryKey: ['hotel-quote', 'change', b.id, from],
    queryFn: () => bookingsApi.quote({ checkInDate: from, checkOutDate: b.checkOutDate.slice(0, 10), exceptBookingId: b.id, source: b.source }),
  });
  const [roomId, setRoomId] = useState('');
  const [rate, setRate] = useState('');
  const [reason, setReason] = useState('');
  const options = (q.data?.types ?? []).flatMap((t) => t.free.filter((r) => r.id !== line?.roomId && (!isInHouse(b.status) || !['OCCUPIED', 'CLEANING'].includes(r.status))).map((r) => ({ ...r, type: t })));
  const picked = options.find((o) => o.id === roomId);
  useEffect(() => { if (picked) setRate(String(line?.ratePerNight ?? Math.round(picked.total / Math.max(q.data?.nights ?? 1, 1)))); }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = useMutation({
    mutationFn: () => bookingsApi.changeRoom(b.id, { bookedRoomId: lineId, roomId, ratePerNight: rate === '' ? undefined : num(rate), reason: reason.trim() || undefined }),
    onSuccess: () => { toast.success(`Room ${picked?.roomNumber} me badal diya`); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Room nahi badla')),
  });
  return (
    <Modal open onClose={onClose} size="md" title="Room badlein" description={`${stayDay(from)} se ${stayDay(b.checkOutDate)} tak`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button disabled={!roomId || !lineId} loading={go.isPending} onClick={() => go.mutate()} leftIcon={<BedDouble className="h-4 w-4" />}>Badlein</Button>
      </>}>
      <div className="space-y-3">
        {b.bookedRooms.length > 1 && (
          <Select label="Kaunsa room" value={lineId} onChange={(e) => setLineId(e.target.value)} options={b.bookedRooms.map((r) => ({ value: r.id, label: `Room ${r.roomNumber ?? '—'} · ${r.roomTypeName ?? ''}` }))} />
        )}
        <div>
          <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Khaali room</p>
          {q.isLoading ? <p className={note}>Dhoond rahe hain…</p> : !options.length ? <p className={note}>In dates me koi aur room khaali nahi.</p> : (
            <div className="grid max-h-56 grid-cols-3 gap-1.5 overflow-y-auto sm:grid-cols-4">
              {options.map((o) => (
                <button key={o.id} type="button" onClick={() => setRoomId(o.id)}
                  className={cn('rounded-xl px-2 py-2 text-left ring-1 transition', roomId === o.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                  <span className="block text-[0.9375rem] font-bold text-slate-900">{o.roomNumber}</span>
                  <span className="block truncate text-[0.6875rem] text-slate-500">{o.type.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Input label="Rate fi raat" inputMode="decimal" value={rate} onChange={(e) => setRate(moneyInput(e.target.value))} hint="Purana rate rakhna ho to wohi rehne dein; upgrade free ho to bhi purana rate" />
        <Input label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="AC kharab, guest ne bara room manga…" />
      </div>
    </Modal>
  );
}

// ─── Folio charge ────────────────────────────────────────────────────

export function ChargeModal({ b, onClose, onDone }: Base) {
  const [type, setType] = useState<FolioChargeType>('FOOD');
  const [description, setDescription] = useState('');
  const [qty, setQty] = useState('1');
  const [rate, setRate] = useState('');
  const [productId, setProductId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  const products = useQuery({
    queryKey: ['hotel-folio-products', debounced],
    queryFn: () => productsApi.list({ search: debounced, isActive: true, limit: 8 }),
    enabled: debounced.length >= 2,
  });
  const total = num(qty) * num(rate);
  const go = useMutation({
    mutationFn: () => folioApi.addCharge({ bookingId: b.id, chargeType: type, description: description.trim(), quantity: num(qty) || 1, unitPrice: num(rate), ...(productId && { productId }) }),
    onSuccess: () => { toast.success(`${formatPKR(total)} room ke bill me likh diya`); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Charge nahi likha gaya')),
  });
  const bad = !description.trim() || !(num(rate) > 0) || !(num(qty) > 0);
  return (
    <Modal open onClose={onClose} size="md" title="Room ke bill me likhein" description={`${b.guestName} · Room ${roomsOf(b)}`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button disabled={bad} loading={go.isPending} onClick={() => go.mutate()} leftIcon={<Plus className="h-4 w-4" />}>{total > 0 ? `${formatPKR(total)} likhein` : 'Likhein'}</Button>
      </>}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {FOLIO_TYPES.map((t) => (
            <button key={t.id} type="button" onClick={() => setType(t.id)}
              className={cn('h-8 rounded-full px-3 text-[0.75rem] font-semibold ring-1', type === t.id ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{t.label}</button>
          ))}
        </div>
        <Input label="Maal se chunein (stock kat jayega)" leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pani, cold drink, chips…" hint="Ya neeche khud naam aur rate likhein (laundry, khana)" />
        {debounced.length >= 2 && (
          <ul className="max-h-40 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
            {(products.data?.items ?? []).map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => { setProductId(p.id); setDescription(p.name); setRate(String(p.price)); setSearch(''); if (type === 'FOOD') setType('MINIBAR'); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] hover:bg-slate-50">
                  <Package className="h-4 w-4 text-slate-400" /><span className="flex-1 truncate">{p.name}</span>
                  <span className="text-slate-500">{p.stock} {p.unit}</span><span className="font-semibold tabular-nums">{formatPKR(p.price)}</span>
                </button>
              </li>
            ))}
            {products.data && !products.data.items.length && <li className="px-3 py-3 text-center text-[0.8125rem] text-slate-500">Koi item nahi mila</li>}
          </ul>
        )}
        <Input data-autofocus label="Kya diya" required value={description} onChange={(e) => { setDescription(e.target.value); setProductId(null); }} placeholder="Dinner — 2 plate biryani" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Tadaad" inputMode="decimal" value={qty} onChange={(e) => setQty(moneyInput(e.target.value))} />
          <Input label="Rate" inputMode="decimal" required value={rate} onChange={(e) => setRate(moneyInput(e.target.value))} />
        </div>
        {productId && <p className={note}>Ye item stock se {num(qty) || 1} kam hoga. Charge hatane par wapas aa jayega.</p>}
      </div>
    </Modal>
  );
}

// ─── Edit ────────────────────────────────────────────────────────────

export function EditBookingModal({ b, onClose, onDone }: Base) {
  const open = ['INQUIRY', 'QUOTED', 'TENTATIVE', 'CONFIRMED'].includes(b.status);
  const [f, setF] = useState({
    guestName: b.guestName, guestPhone: b.guestPhone, checkInDate: b.checkInDate.slice(0, 10), checkOutDate: b.checkOutDate.slice(0, 10),
    source: b.source, bookedBy: b.bookedBy ?? '', sourceRef: b.sourceRef ?? '', mealPlan: b.mealPlan, status: b.status === 'TENTATIVE' ? 'TENTATIVE' : 'CONFIRMED',
    discount: String(b.discount || ''), taxAmount: String(b.taxAmount || ''), serviceCharge: String(b.serviceCharge || ''),
    arrivalTime: b.arrivalTime ?? '', specialRequests: b.specialRequests ?? '', notes: b.notes ?? '',
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const go = useMutation({
    mutationFn: () => bookingsApi.update(b.id, {
      guestName: f.guestName.trim(), guestPhone: f.guestPhone.trim(), source: f.source as BookingSource, bookedBy: f.bookedBy, sourceRef: f.sourceRef,
      mealPlan: f.mealPlan as MealPlan, discount: num(f.discount), taxAmount: num(f.taxAmount), serviceCharge: num(f.serviceCharge),
      arrivalTime: f.arrivalTime, specialRequests: f.specialRequests, notes: f.notes,
      ...(open && { checkInDate: f.checkInDate, checkOutDate: f.checkOutDate, status: f.status as 'TENTATIVE' | 'CONFIRMED' }),
    }),
    onSuccess: () => { toast.success('Booking badal gayi'); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Booking nahi badli')),
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); go.mutate(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);
  return (
    <Modal open onClose={onClose} size="lg" title="Booking badlein" description={`${b.bookingNumber} · Ctrl+S se save`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={go.isPending} onClick={() => go.mutate()}>Save karein</Button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Guest ka naam" value={f.guestName} onChange={(e) => set('guestName', e.target.value)} />
        <Input label="Phone" value={f.guestPhone} onChange={(e) => set('guestPhone', e.target.value)} />
        {open && <>
          <Input type="date" label="Check-in" value={f.checkInDate} onChange={(e) => set('checkInDate', e.target.value)} />
          <Input type="date" label="Check-out" value={f.checkOutDate} onChange={(e) => set('checkOutDate', e.target.value)} hint="Dates badlne par wohi rate fi raat rehta hai" />
          <Select label="Booking" value={f.status} onChange={(e) => set('status', e.target.value)} options={[{ value: 'CONFIRMED', label: 'Pakki' }, { value: 'TENTATIVE', label: 'Kachi (abhi tay nahi)' }]} />
        </>}
        <Select label="Kahan se aayi" value={f.source} onChange={(e) => set('source', e.target.value)} options={SOURCES.map((s) => ({ value: s.id, label: s.label }))} />
        <Input label="Company / agent" value={f.bookedBy} onChange={(e) => set('bookedBy', e.target.value)} placeholder="Bill par chhapta hai" />
        <Input label="Online booking ID" value={f.sourceRef} onChange={(e) => set('sourceRef', e.target.value)} placeholder="Booking.com / Agoda number" />
        <Select label="Khana" value={f.mealPlan} onChange={(e) => set('mealPlan', e.target.value)} options={MEAL_PLANS.map((m) => ({ value: m.id, label: m.label }))} />
        <Input label="Aane ka waqt" value={f.arrivalTime} onChange={(e) => set('arrivalTime', e.target.value)} placeholder="Shaam 6 baje" />
        <Input label="Discount (Rs)" inputMode="decimal" value={f.discount} onChange={(e) => set('discount', moneyInput(e.target.value))} />
        <Input label="Tax (Rs)" inputMode="decimal" value={f.taxAmount} onChange={(e) => set('taxAmount', moneyInput(e.target.value))} hint="Bed tax / sales tax" />
        <Input label="Service charge (Rs)" inputMode="decimal" value={f.serviceCharge} onChange={(e) => set('serviceCharge', moneyInput(e.target.value))} />
        <Textarea wrapperClassName="sm:col-span-2" label="Guest ki farmaish" rows={2} value={f.specialRequests} onChange={(e) => set('specialRequests', e.target.value)} />
        <Textarea wrapperClassName="sm:col-span-2" label="Andar ka note" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
    </Modal>
  );
}

// ─── Cancel / no-show ────────────────────────────────────────────────

export function CancelModal({ b, noShow, onClose, onDone }: Base & { noShow?: boolean }) {
  const firstNight = b.bookedRooms.reduce((s, r) => s + (r.isComplimentary ? 0 : r.ratePerNight), 0);
  const advance = b.money.khataPaid + b.money.legacyPaid;
  const [reason, setReason] = useState(noShow ? 'Guest nahi aaya' : '');
  const [charge, setCharge] = useState(String(noShow ? Math.min(firstNight, advance || firstNight) : 0));
  const c = num(charge);
  const go = useMutation({
    mutationFn: () => bookingsApi.cancel(b.id, { reason: reason.trim(), charge: c, noShow }),
    onSuccess: (r) => { toast.success(noShow ? 'No-show lag gaya' : 'Booking cancel ho gayi', { description: r.advanceLeft > 0 ? `${formatPKR(r.advanceLeft)} advance khate me jama hai — "Advance wapas" se de sakte hain` : undefined }); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Cancel nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={noShow ? 'No-show lagayein?' : 'Booking cancel karein?'} description={`${b.bookingNumber} · ${b.guestName}`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="danger" disabled={!reason.trim() || c > b.grandTotal} loading={go.isPending} onClick={() => go.mutate()} leftIcon={noShow ? <UserX className="h-4 w-4" /> : <Ban className="h-4 w-4" />}>{noShow ? 'No-show' : 'Haan, cancel'}</Button>
      </>}>
      <div className="space-y-3">
        <Textarea data-autofocus label="Wajah" required rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Plan badal gaya, flight cancel…" />
        <Input label={noShow ? 'No-show charge' : 'Cancel charge'} inputMode="decimal" value={charge} onChange={(e) => setCharge(moneyInput(e.target.value))}
          hint={`Ek raat ${formatPKR(firstNight)}${advance > 0 ? ` · advance ${formatPKR(advance)}` : ''}. 0 likhein to koi charge nahi.`} error={c > b.grandTotal ? 'Booking ke bill se zyada nahi' : undefined} />
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setCharge('0')}>Koi charge nahi</Button>
          {firstNight > 0 && <Button size="sm" variant="secondary" onClick={() => setCharge(String(firstNight))}>Ek raat</Button>}
          {advance > 0 && <Button size="sm" variant="secondary" onClick={() => setCharge(String(Math.min(advance, b.grandTotal)))}>Poora advance</Button>}
        </div>
        <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-[0.8125rem] text-slate-700">
          Charge ka bill banta hai aur advance se kat jata hai{advance > 0 && c < advance ? `; baqi ${formatPKR(advance - c)} guest ke khate me jama rehta hai — baad me "Advance wapas" se cash de sakte hain` : ''}.
          {c > advance ? ` Advance se zyada charge (${formatPKR(c - advance)}) guest ke khate me udhaar likha jayega.` : ''}
        </p>
      </div>
    </Modal>
  );
}

// ─── Refund ──────────────────────────────────────────────────────────

export function RefundModal({ b, onClose, onDone }: Base) {
  const most = b.money.advanceLeft;
  const [amount, setAmount] = useState(String(most));
  const n = num(amount);
  const go = useMutation({
    mutationFn: () => withManagerPin('Advance wapsi', (pin) => bookingsApi.refund(b.id, { amount: n, managerPin: pin }), 'refund'),
    onSuccess: (r) => { toast.success(`${formatPKR(r.refunded)} cash wapas — drawer se nikla`); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Advance wapas nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Advance wapas karein" description={`${b.bookingNumber} · khate me ${formatPKR(most)} jama`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="danger" disabled={!(n > 0) || n > most + 0.005} loading={go.isPending} onClick={() => go.mutate()} leftIcon={<Undo2 className="h-4 w-4" />}>{formatPKR(n)} cash wapas</Button>
      </>}>
      <div className="space-y-3">
        <Input data-autofocus inputMode="decimal" label="Kitna wapas" value={amount} onChange={(e) => setAmount(moneyInput(e.target.value))} error={n > most + 0.005 ? `Zyada se zyada ${formatPKR(most)}` : undefined} />
        <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-[0.8125rem] text-slate-700">Guest ke khate se advance hat jayega aur utna cash is branch ke khule drawer se nikalega. Day book me "Advance wapas" likha jayega.</p>
      </div>
    </Modal>
  );
}

// ─── Check-out ───────────────────────────────────────────────────────

/**
 * The folio bill: room nights, charges, tax and discount; advances on the
 * khata come off first. What is left is taken now (split allowed) or put
 * on the guest's or a company's khata.
 */
export function CheckOutModal({ b, onClose, onDone }: Omit<Base, 'onDone'> & { onDone: (r?: CheckOutResult) => void }) {
  const early = b.earlyNights != null && b.earlyNights < b.nights;
  const [keepNights, setKeepNights] = useState(false);
  const stayed = early && !keepNights ? b.earlyNights! : b.nights;
  // Early leave: room nights shrink in proportion (as the API does).
  const roomNow = early && !keepNights ? b.bookedRooms.reduce((s, r) => s + (r.totalAmount - r.discount) * stayed / Math.max(r.totalNights, 1), 0) : b.roomTotal;
  const ratio = b.roomTotal > 0 ? roomNow / b.roomTotal : 1;
  const total = Math.max(Math.round((roomNow + b.extraCharges + (b.taxAmount + b.serviceCharge) * ratio - b.discount) * 100) / 100, 0);
  const advance = b.money.khataPaid + b.money.legacyPaid;
  const due = Math.max(Math.round((total - advance) * 100) / 100, 0);

  const [mode, setMode] = useState<'pay' | 'khata'>(b.bookedBy ? 'khata' : 'pay');
  const [rows, setRows] = useState<SplitRow[]>([{ method: 'CASH', amount: String(due) }]);
  const [active, setActive] = useState(0);
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null);
  const [picking, setPicking] = useState(false);
  useEffect(() => { setRows([{ method: 'CASH', amount: String(due) }]); }, [due]);
  const sum = splitSummary(rows, due);
  const holder = b.money.khataPaid > 0 ? b.khata : null;

  const body = useMemo<TenderInput>(() => {
    const base = { keepBookedNights: early && keepNights ? true : undefined };
    if (due <= 0) return { ...base, paidAmount: 0, ...(company && !holder && { customerId: company.id }) };
    if (mode === 'khata') return { ...base, onCredit: true, ...(company ? { customerId: company.id } : holder ? { customerId: holder.id } : {}) };
    const parts = splitParts(rows).filter((p) => p.method !== 'TRADE_IN') as Array<{ method: PayMethod; amount: number; reference?: string }>;
    return { ...base, payments: parts, ...(company && !holder && { customerId: company.id }) };
  }, [due, mode, rows, company, holder, early, keepNights]);

  const go = useMutation({
    mutationFn: () => bookingsApi.checkOut(b.id, body),
    onSuccess: (r) => {
      toast.success(`Check-out · bill ${r.sale.saleNumber}`, { description: [r.change > 0 && `Change ${formatPKR(r.change)}`, r.onKhata > 0 && `${formatPKR(r.onKhata)} khate me`].filter(Boolean).join(' · ') || undefined });
      onDone(r);
    },
    onError: (e) => toast.error(apiError(e, 'Check-out nahi hua')),
  });
  const short = mode === 'pay' && due > 0 && sum.remaining > 0.005;
  const problem = mode === 'pay' && due > 0 ? sum.problem : null;
  const khataName = company?.name ?? holder?.name ?? b.guestName;

  if (picking) {
    return <CustomerPicker title="Company / khata chunein" money={formatPKR} onClose={() => setPicking(false)} onPick={(c) => { setCompany({ id: c.id, name: c.name }); setMode('khata'); setPicking(false); }} />;
  }
  return (
    <Modal open onClose={onClose} size="lg" title="Check-out aur bill" description={`${b.guestName} · Room ${roomsOf(b)} · ${stayed} raat`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="success" disabled={b.overdueNights > 0 || (mode === 'pay' && (short || !!problem))} loading={go.isPending} onClick={() => go.mutate()} leftIcon={<LogOut className="h-4 w-4" />}>
          {due <= 0 ? 'Check-out karein' : mode === 'khata' ? `${formatPKR(due)} khate me · check-out` : `${formatPKR(due)} le kar check-out`}
        </Button>
      </>}>
      <div className="space-y-4">
        {b.overdueNights > 0 && <p className={warn}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Guest {b.overdueNights} raat zyada ruka — pehle "Stay barhayein" se aaj tak barhayein, phir check-out.</p>}
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <ul className="space-y-1 text-[0.8125rem]">
            {b.bill.lines.map((l, i) => <li key={i} className="flex justify-between gap-3"><span className="truncate text-slate-600">{l.label}</span><span className="tabular-nums text-slate-900">{formatPKR(l.amount)}</span></li>)}
            {b.bill.discount > 0 && <li className="flex justify-between text-success-700"><span>Discount</span><span className="tabular-nums">−{formatPKR(b.bill.discount)}</span></li>}
          </ul>
          <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-[0.875rem]">
            <div className="flex justify-between font-semibold"><span>Kul bill{early && !keepNights ? ` (${stayed} raat)` : ''}</span><span className="tabular-nums">{formatPKR(total)}</span></div>
            {advance > 0 && <div className="flex justify-between text-slate-600"><span>Advance (khate se)</span><span className="tabular-nums">−{formatPKR(Math.min(advance, total))}</span></div>}
            <div className="flex justify-between text-[1.0625rem] font-bold"><span>Ab lena hai</span><span className="tabular-nums">{formatPKR(due)}</span></div>
            {advance > total && <p className="text-[0.75rem] text-success-700">{formatPKR(advance - total)} advance bach jayega — check-out ke baad "Advance wapas" se de sakte hain.</p>}
          </div>
        </div>

        {early && (
          <Switch checked={keepNights} onChange={(e) => setKeepNights(e.target.checked)} label="Booked raaton ka poora paisa lein"
            description={`Guest ${b.nights} ki jagah ${b.earlyNights} raat ruka. Band rakhein to sirf ruki hui raatein bill hongi.`} />
        )}

        {due > 0 && (<>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {([['pay', 'Abhi paisa lein'], ['khata', 'Khate me (udhaar / company)']] as const).map(([id, l]) => (
              <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
                className={cn('h-10 rounded-xl text-[0.8125rem] font-semibold ring-1', mode === id ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{l}</button>
            ))}
          </div>
          {mode === 'pay' ? (<>
            <PosSplitTender total={due} rows={rows} onRows={setRows} active={active} onActive={setActive} />
            {sum.change > 0 && <p className="text-[0.875rem] font-semibold text-success-700">Change wapas: {formatPKR(sum.change)}</p>}
            {short && <p className="text-[0.8125rem] text-amber-700">{formatPKR(sum.remaining)} kam hai — poora lein, ya "Khate me" chunein.</p>}
            {problem && <p className="text-[0.8125rem] text-rose-700">{problem}</p>}
          </>) : (
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <p className="text-[0.875rem] text-slate-800"><Building2 className="mr-1 inline h-4 w-4 text-slate-400" />{formatPKR(due)} <b>{khataName}</b> ke khate me likha jayega.</p>
              {holder ? <p className={note}>Advance isi khate me hai, is liye bill bhi isi me jata hai.</p> : (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setPicking(true)}>{company ? 'Doosri company chunein' : 'Company / doosra khata chunein'}</Button>
                  {company && <Button size="sm" variant="ghost" onClick={() => setCompany(null)}>Guest ka apna khata</Button>}
                </div>
              )}
            </div>
          )}
        </>)}
        <p className={note}>Bill sale record, day book aur khate me jata hai. Room safai ke liye chala jayega.</p>
      </div>
    </Modal>
  );
}
