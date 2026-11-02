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
import { t as tr } from '@core/i18n';

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
    onSuccess: () => { toast.success(tr('{{formatPKR}} darj ho gaya', { formatPKR: formatPKR(n) })); onDone(); },
    onError: (e) => toast.error(apiError(e, tr('Payment darj nahi hui'))),
  });
  const bad = !(n > 0) || n > due + 0.005;
  return (
    <Modal open onClose={onClose} size="sm" title={after ? tr('Baqi paisa mila') : tr('Advance mila')} description={tr('{{guestName}} · {{due}} baqi', { guestName: b.guestName, due: formatPKR(due) })}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button variant="success" disabled={bad} loading={pay.isPending} onClick={() => pay.mutate()} leftIcon={<CheckCircle2 className="h-4 w-4" />}>{tr('Darj karein')}</Button>
      </>}>
      <div className="space-y-3">
        <Input data-autofocus inputMode="decimal" value={amount} onChange={(e) => setAmount(moneyInput(e.target.value))} size="lg"
          onKeyDown={(e) => { if (e.key === 'Enter' && !bad && !pay.isPending) pay.mutate(); }}
          className="text-center text-2xl font-bold tabular-nums" error={n > due + 0.005 ? tr('Baqi sirf {{due}} hai', { due: formatPKR(due) }) : undefined} />
        <div className="flex flex-wrap gap-1.5">
          {[{ l: tr('Poora'), v: due }, { l: tr('Aadha'), v: Math.round(due / 2) }, { l: tr('Ek raat'), v: Math.min(b.bookedRooms.reduce((s, r) => s + r.ratePerNight, 0), due) }]
            .filter((c, i, a) => c.v > 0 && a.findIndex((x) => x.v === c.v) === i)
            .map((c) => <Button key={c.l} size="sm" variant="secondary" onClick={() => setAmount(String(c.v))}>{c.l} <span className="tabular-nums text-slate-500">{formatPKR(c.v)}</span></Button>)}
        </div>
        <MethodPicker value={method} onChange={setMethod} />
        <p className={note}>{after
          ? tr('Ye paisa guest / company ke khate me jama hota hai aur aaj ke drawer ya bank me dikhta hai.')
          : tr('Advance guest ke khate me jama rehta hai aur aaj ke drawer ya bank me dikhta hai. Check-out ke bill me khud kat jata hai.')}</p>
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
  const idError = !idNumber.trim() ? tr('CNIC ya passport number likhein (police record ke liye)')
    : idType === 'CNIC' && !cnicOk(idNumber) ? tr('CNIC 13 hindson ka hota hai (12345-1234567-1)')
      : idType !== 'CNIC' && idNumber.trim().length < 5 ? tr('ID number poora likhein') : null;
  const go = useMutation({
    mutationFn: () => bookingsApi.checkIn(b.id, {
      idType, idNumber: idNumber.trim(), adults: Number(adults) || 1, children: Number(children) || 0,
      city: city.trim() || undefined, address: address.trim() || undefined, nationality: nationality.trim() || undefined, purposeOfVisit: purpose.trim() || undefined,
    }),
    onSuccess: () => { toast.success(tr('{{guestName}} check-in · Room {{roomsOf}}', { guestName: b.guestName, roomsOf: roomsOf(b) })); onDone(); },
    onError: (e) => toast.error(apiError(e, tr('Check-in nahi hua'))),
  });
  const submit = () => { setTried(true); if (!idError) go.mutate(); };
  return (
    <Modal open onClose={onClose} size="md" title={tr('Check-in')} description={tr('{{guestName}} · Room {{roomsOf}} · {{nights}} raat', { guestName: b.guestName, roomsOf: roomsOf(b), nights: b.nights })}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button loading={go.isPending} onClick={submit} leftIcon={<LogIn className="h-4 w-4 rtl-flip" />}>{tr('Check-in karein')}</Button>
      </>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <Select label={tr('ID')} value={idType} onChange={(e) => setIdType(e.target.value)} options={ID_TYPES.map((t) => ({ value: t.id, label: t.label }))} />
          <Input data-autofocus label={tr('ID number')} required value={idNumber} placeholder={idType === 'CNIC' ? '35202-1234567-1' : 'AB1234567'}
            onChange={(e) => setIdNumber(idType === 'CNIC' ? formatCnic(e.target.value) : e.target.value.toUpperCase())}
            error={tried ? idError ?? undefined : undefined} hint={tr('Police record (Form C) ke liye har guest ka ID zaroori hai')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label={tr('Bade')} inputMode="numeric" value={adults} onChange={(e) => setAdults(e.target.value.replace(/\D/g, ''))} />
          <Input label={tr('Bachay')} inputMode="numeric" value={children} onChange={(e) => setChildren(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Shehar')} value={city} onChange={(e) => setCity(e.target.value)} placeholder={tr('Lahore')} />
          <Input label={tr('Qaumiyat')} value={nationality} onChange={(e) => setNationality(e.target.value)} />
        </div>
        <Input label={tr('Pata')} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={tr('Ghar ka pata (ID ke mutabiq)')} />
        <Input label={tr('Aane ki wajah')} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder={tr('Kaam, shadi, ilaaj, ghoomna…')} />
        {b.guest?.isBlacklisted && <p className={warn}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{tr('Ye guest blacklist me hai: {{blacklistReason}}', { blacklistReason: b.guest.blacklistReason })}</p>}
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
    onSuccess: () => { toast.success(tr('Stay {{date}} tak barh gaya', { date: stayDay(date) })); onDone(); },
    onError: (e) => toast.error(apiError(e, tr('Stay nahi barha'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={tr('Stay barhayein')} description={tr('Abhi check-out {{from}} hai', { from: stayDay(from, { day: true }) })}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button disabled={extra < 1} loading={go.isPending} onClick={() => go.mutate()} leftIcon={<CalendarPlus className="h-4 w-4" />}>{tr('{{extra}} raat barhayein', { extra })}</Button>
      </>}>
      <div className="space-y-3">
        <Input data-autofocus type="date" label={tr('Nayi check-out date')} value={date} min={addDaysKey(from, 1)} onChange={(e) => setDate(e.target.value)} />
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 7].map((d) => <Button key={d} size="sm" variant="secondary" onClick={() => setDate(addDaysKey(from, d))}>{tr('+{{d}} raat', { d })}</Button>)}
        </div>
        {extra > 0 && <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-[0.8125rem] text-slate-700">{tr('Taqreeban {{formatPKR}} bill me jurenge (wohi rate jo tay hua tha). Agar room aagay kisi aur ke liye book hai to system bata dega.', { formatPKR: formatPKR(Math.round(perNight * extra)) })}</p>}
        {b.overdueNights > 0 && <p className={warn}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{tr('Guest {{overdueNights}} raat zyada ruk chuka hai — check-out se pehle stay aaj tak barhayein.', { overdueNights: b.overdueNights })}</p>}
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
    onSuccess: () => { toast.success(tr('Room {{roomNumber}} me badal diya', { roomNumber: picked?.roomNumber })); onDone(); },
    onError: (e) => toast.error(apiError(e, tr('Room nahi badla'))),
  });
  return (
    <Modal open onClose={onClose} size="md" title={tr('Room badlein')} description={tr('{{from}} se {{checkOutDate}} tak', { from: stayDay(from), checkOutDate: stayDay(b.checkOutDate) })}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button disabled={!roomId || !lineId} loading={go.isPending} onClick={() => go.mutate()} leftIcon={<BedDouble className="h-4 w-4" />}>{tr('Badlein')}</Button>
      </>}>
      <div className="space-y-3">
        {b.bookedRooms.length > 1 && (
          <Select label={tr('Kaunsa room')} value={lineId} onChange={(e) => setLineId(e.target.value)} options={b.bookedRooms.map((r) => ({ value: r.id, label: tr('Room {{value}} · {{value2}}', { value: r.roomNumber ?? '—', value2: r.roomTypeName ?? '' }) }))} />
        )}
        <div>
          <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{tr('Khaali room')}</p>
          {q.isLoading ? <p className={note}>{tr('Dhoond rahe hain…')}</p> : !options.length ? <p className={note}>{tr('In dates me koi aur room khaali nahi.')}</p> : (
            <div className="grid max-h-56 grid-cols-3 gap-1.5 overflow-y-auto sm:grid-cols-4">
              {options.map((o) => (
                <button key={o.id} type="button" onClick={() => setRoomId(o.id)}
                  className={cn('rounded-xl px-2 py-2 text-start ring-1 transition', roomId === o.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                  <span className="block text-[0.9375rem] font-bold text-slate-900">{o.roomNumber}</span>
                  <span className="block truncate text-[0.6875rem] text-slate-500">{o.type.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Input label={tr('Rate fi raat')} inputMode="decimal" value={rate} onChange={(e) => setRate(moneyInput(e.target.value))} hint={tr('Purana rate rakhna ho to wohi rehne dein; upgrade free ho to bhi purana rate')} />
        <Input label={tr('Wajah')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr('AC kharab, guest ne bara room manga…')} />
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
    onSuccess: () => { toast.success(tr('{{total}} room ke bill me likh diya', { total: formatPKR(total) })); onDone(); },
    onError: (e) => toast.error(apiError(e, tr('Charge nahi likha gaya'))),
  });
  const bad = !description.trim() || !(num(rate) > 0) || !(num(qty) > 0);
  return (
    <Modal open onClose={onClose} size="md" title={tr('Room ke bill me likhein')} description={tr('{{guestName}} · Room {{roomsOf}}', { guestName: b.guestName, roomsOf: roomsOf(b) })}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button disabled={bad} loading={go.isPending} onClick={() => go.mutate()} leftIcon={<Plus className="h-4 w-4" />}>{total > 0 ? tr('{{total}} likhein', { total: formatPKR(total) }) : tr('Likhein')}</Button>
      </>}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {FOLIO_TYPES.map((t) => (
            <button key={t.id} type="button" onClick={() => setType(t.id)}
              className={cn('h-8 rounded-full px-3 text-[0.75rem] font-semibold ring-1', type === t.id ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{t.label}</button>
          ))}
        </div>
        <Input label={tr('Maal se chunein (stock kat jayega)')} leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('Pani, cold drink, chips…')} hint={tr('Ya neeche khud naam aur rate likhein (laundry, khana)')} />
        {debounced.length >= 2 && (
          <ul className="max-h-40 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
            {(products.data?.items ?? []).map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => { setProductId(p.id); setDescription(p.name); setRate(String(p.price)); setSearch(''); if (type === 'FOOD') setType('MINIBAR'); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-start text-[0.8125rem] hover:bg-slate-50">
                  <Package className="h-4 w-4 text-slate-400" /><span className="flex-1 truncate">{p.name}</span>
                  <span className="text-slate-500">{p.stock} {p.unit}</span><span className="font-semibold tabular-nums">{formatPKR(p.price)}</span>
                </button>
              </li>
            ))}
            {products.data && !products.data.items.length && <li className="px-3 py-3 text-center text-[0.8125rem] text-slate-500">{tr('Koi item nahi mila')}</li>}
          </ul>
        )}
        <Input data-autofocus label={tr('Kya diya')} required value={description} onChange={(e) => { setDescription(e.target.value); setProductId(null); }} placeholder={tr('Dinner — 2 plate biryani')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={tr('Tadaad')} inputMode="decimal" value={qty} onChange={(e) => setQty(moneyInput(e.target.value))} />
          <Input label={tr('Rate')} inputMode="decimal" required value={rate} onChange={(e) => setRate(moneyInput(e.target.value))} />
        </div>
        {productId && <p className={note}>{tr('Ye item stock se {{value}} kam hoga. Charge hatane par wapas aa jayega.', { value: num(qty) || 1 })}</p>}
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
  const [billTo, setBillTo] = useState<{ id: string; name: string } | null>(b.billTo ? { id: b.billTo.id, name: b.billTo.name } : null);
  const [picking, setPicking] = useState(false);
  const billToChanged = (billTo?.id ?? null) !== (b.billTo?.id ?? null);
  const go = useMutation({
    mutationFn: () => bookingsApi.update(b.id, {
      guestName: f.guestName.trim(), guestPhone: f.guestPhone.trim(), source: f.source as BookingSource, bookedBy: f.bookedBy, sourceRef: f.sourceRef,
      mealPlan: f.mealPlan as MealPlan, discount: num(f.discount), taxAmount: num(f.taxAmount), serviceCharge: num(f.serviceCharge),
      arrivalTime: f.arrivalTime, specialRequests: f.specialRequests, notes: f.notes,
      ...(open && { checkInDate: f.checkInDate, checkOutDate: f.checkOutDate, status: f.status as 'TENTATIVE' | 'CONFIRMED' }),
      ...(billToChanged && { customerId: billTo?.id ?? null }),
    }),
    onSuccess: () => { toast.success(tr('Booking badal gayi')); onDone(); },
    onError: (e) => toast.error(apiError(e, tr('Booking nahi badli'))),
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); go.mutate(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);
  return (
    <Modal open onClose={onClose} size="lg" title={tr('Booking badlein')} description={tr('{{bookingNumber}} · Ctrl+S se save', { bookingNumber: b.bookingNumber })}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button loading={go.isPending} onClick={() => go.mutate()}>{tr('Save karein')}</Button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label={tr('Guest ka naam')} value={f.guestName} onChange={(e) => set('guestName', e.target.value)} />
        <Input label={tr('Phone')} value={f.guestPhone} onChange={(e) => set('guestPhone', e.target.value)} />
        {open && <>
          <Input type="date" label={tr('Check-in')} value={f.checkInDate} onChange={(e) => set('checkInDate', e.target.value)} />
          <Input type="date" label={tr('Check-out')} value={f.checkOutDate} onChange={(e) => set('checkOutDate', e.target.value)} hint={tr('Dates badlne par wohi rate fi raat rehta hai')} />
          <Select label={tr('Booking')} value={f.status} onChange={(e) => set('status', e.target.value)} options={[{ value: 'CONFIRMED', label: tr('Pakki') }, { value: 'TENTATIVE', label: tr('Kachi (abhi tay nahi)') }]} />
        </>}
        <Select label={tr('Kahan se aayi')} value={f.source} onChange={(e) => set('source', e.target.value)} options={SOURCES.map((s) => ({ value: s.id, label: s.label }))} />
        <Input label={tr('Company / agent')} value={f.bookedBy} onChange={(e) => set('bookedBy', e.target.value)} placeholder={tr('Bill par chhapta hai')} />
        <div className="sm:col-span-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.8125rem] text-slate-700"><Building2 className="me-1 inline h-4 w-4 text-slate-400" />{tr('Bill kis ke khate me:')}{' '} <b>{billTo?.name ?? tr('Guest khud')}</b></p>
            <span className="flex gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => setPicking(true)}>{billTo ? tr('Khata badlein') : tr('Company ka khata')}</Button>
              {billTo && <Button size="sm" variant="ghost" onClick={() => setBillTo(null)}>{tr('Hatayein')}</Button>}
            </span>
          </div>
          <p className="mt-1 text-[0.75rem] text-slate-500">{tr('Check-out par baqi bill is khate me udhaar jata hai, jab tak paisa na liya jaye.')}</p>
        </div>
        <Input label={tr('Online booking ID')} value={f.sourceRef} onChange={(e) => set('sourceRef', e.target.value)} placeholder={tr('Booking.com / Agoda number')} />
        <Select label={tr('Khana')} value={f.mealPlan} onChange={(e) => set('mealPlan', e.target.value)} options={MEAL_PLANS.map((m) => ({ value: m.id, label: m.label }))} />
        <Input label={tr('Aane ka waqt')} value={f.arrivalTime} onChange={(e) => set('arrivalTime', e.target.value)} placeholder={tr('Shaam 6 baje')} />
        <Input label={tr('Discount (Rs)')} inputMode="decimal" value={f.discount} onChange={(e) => set('discount', moneyInput(e.target.value))} />
        <Input label={tr('Tax (Rs)')} inputMode="decimal" value={f.taxAmount} onChange={(e) => set('taxAmount', moneyInput(e.target.value))} hint={tr('Bed tax / sales tax')} />
        <Input label={tr('Service charge (Rs)')} inputMode="decimal" value={f.serviceCharge} onChange={(e) => set('serviceCharge', moneyInput(e.target.value))} />
        <Textarea wrapperClassName="sm:col-span-2" label={tr('Guest ki farmaish')} rows={2} value={f.specialRequests} onChange={(e) => set('specialRequests', e.target.value)} />
        <Textarea wrapperClassName="sm:col-span-2" label={tr('Andar ka note')} rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
      {picking && <CustomerPicker title={tr('Company ka khata')} money={formatPKR} onClose={() => setPicking(false)} onPick={(c) => { setBillTo({ id: c.id, name: c.name }); setPicking(false); }} />}
    </Modal>
  );
}

// ─── Cancel / no-show ────────────────────────────────────────────────

export function CancelModal({ b, noShow, onClose, onDone }: Base & { noShow?: boolean }) {
  const firstNight = b.bookedRooms.reduce((s, r) => s + (r.isComplimentary ? 0 : r.ratePerNight), 0);
  const advance = b.money.khataPaid + b.money.legacyPaid;
  const [reason, setReason] = useState(noShow ? tr('Guest nahi aaya') : '');
  const [charge, setCharge] = useState(String(noShow ? Math.min(firstNight, advance || firstNight) : 0));
  const c = num(charge);
  const go = useMutation({
    mutationFn: () => bookingsApi.cancel(b.id, { reason: reason.trim(), charge: c, noShow }),
    onSuccess: (r) => { toast.success(noShow ? tr('No-show lag gaya') : tr('Booking cancel ho gayi'), { description: r.advanceLeft > 0 ? tr('{{advanceLeft}} advance khate me jama hai — "Advance wapas" se de sakte hain', { advanceLeft: formatPKR(r.advanceLeft) }) : undefined }); onDone(); },
    onError: (e) => toast.error(apiError(e, tr('Cancel nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={noShow ? tr('No-show lagayein?') : tr('Booking cancel karein?')} description={`${b.bookingNumber} · ${b.guestName}`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button variant="danger" disabled={!reason.trim() || c > b.grandTotal} loading={go.isPending} onClick={() => go.mutate()} leftIcon={noShow ? <UserX className="h-4 w-4" /> : <Ban className="h-4 w-4" />}>{noShow ? tr('No-show') : tr('Haan, cancel')}</Button>
      </>}>
      <div className="space-y-3">
        <Textarea data-autofocus label={tr('Wajah')} required rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr('Plan badal gaya, flight cancel…')} />
        <Input label={noShow ? tr('No-show charge') : tr('Cancel charge')} inputMode="decimal" value={charge} onChange={(e) => setCharge(moneyInput(e.target.value))}
          hint={tr('Ek raat {{firstNight}}{{value}}. 0 likhein to koi charge nahi.', { firstNight: formatPKR(firstNight), value: advance > 0 ? tr(' · advance {{advance}}', { advance: formatPKR(advance) }) : '' })} error={c > b.grandTotal ? tr('Booking ke bill se zyada nahi') : undefined} />
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setCharge('0')}>{tr('Koi charge nahi')}</Button>
          {firstNight > 0 && <Button size="sm" variant="secondary" onClick={() => setCharge(String(firstNight))}>{tr('Ek raat')}</Button>}
          {advance > 0 && <Button size="sm" variant="secondary" onClick={() => setCharge(String(Math.min(advance, b.grandTotal)))}>{tr('Poora advance')}</Button>}
        </div>
        <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-[0.8125rem] text-slate-700">
          {tr('Charge ka bill banta hai aur advance se kat jata hai{{value}}.{{value2}}', { value: advance > 0 && c < advance ? tr('; baqi {{formatPKR}} guest ke khate me jama rehta hai — baad me "Advance wapas" se cash de sakte hain', { formatPKR: formatPKR(advance - c) }) : '', value2: c > advance ? tr(' Advance se zyada charge ({{formatPKR}}) guest ke khate me udhaar likha jayega.', { formatPKR: formatPKR(c - advance) }) : '' })}
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
    mutationFn: () => withManagerPin(tr('Advance wapsi'), (pin) => bookingsApi.refund(b.id, { amount: n, managerPin: pin }), 'refund'),
    onSuccess: (r) => { toast.success(tr('{{refunded}} cash wapas — drawer se nikla', { refunded: formatPKR(r.refunded) })); onDone(); },
    onError: (e) => toast.error(apiError(e, tr('Advance wapas nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={tr('Advance wapas karein')} description={tr('{{bookingNumber}} · khate me {{most}} jama', { bookingNumber: b.bookingNumber, most: formatPKR(most) })}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button variant="danger" disabled={!(n > 0) || n > most + 0.005} loading={go.isPending} onClick={() => go.mutate()} leftIcon={<Undo2 className="h-4 w-4" />}>{tr('{{formatPKR}} cash wapas', { formatPKR: formatPKR(n) })}</Button>
      </>}>
      <div className="space-y-3">
        <Input data-autofocus inputMode="decimal" label={tr('Kitna wapas')} value={amount} onChange={(e) => setAmount(moneyInput(e.target.value))} error={n > most + 0.005 ? tr('Zyada se zyada {{most}}', { most: formatPKR(most) }) : undefined} />
        <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-[0.8125rem] text-slate-700">{tr('Guest ke khate se advance hat jayega aur utna cash is branch ke khule drawer se nikalega. Day book me "Advance wapas" likha jayega.')}</p>
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

  const [mode, setMode] = useState<'pay' | 'khata'>(b.billTo || b.bookedBy ? 'khata' : 'pay');
  const [rows, setRows] = useState<SplitRow[]>([{ method: 'CASH', amount: String(due) }]);
  const [active, setActive] = useState(0);
  // A stay booked for a company starts with its khata.
  const [company, setCompany] = useState<{ id: string; name: string } | null>(b.billTo && (!b.money.khataPaid || b.khata?.id === b.billTo.id) ? { id: b.billTo.id, name: b.billTo.name } : null);
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
      toast.success(tr('Check-out · bill {{saleNumber}}', { saleNumber: r.sale.saleNumber }), { description: [r.change > 0 && `Change ${formatPKR(r.change)}`, r.onKhata > 0 && `${formatPKR(r.onKhata)} khate me`].filter(Boolean).join(' · ') || undefined });
      onDone(r);
    },
    onError: (e) => toast.error(apiError(e, tr('Check-out nahi hua'))),
  });
  const short = mode === 'pay' && due > 0 && sum.remaining > 0.005;
  const problem = mode === 'pay' && due > 0 ? sum.problem : null;
  const khataName = company?.name ?? holder?.name ?? b.guestName;

  if (picking) {
    return <CustomerPicker title={tr('Company / khata chunein')} money={formatPKR} onClose={() => setPicking(false)} onPick={(c) => { setCompany({ id: c.id, name: c.name }); setMode('khata'); setPicking(false); }} />;
  }
  return (
    <Modal open onClose={onClose} size="lg" title={tr('Check-out aur bill')} description={tr('{{guestName}} · Room {{roomsOf}} · {{stayed}} raat', { guestName: b.guestName, roomsOf: roomsOf(b), stayed })}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button variant="success" disabled={b.overdueNights > 0 || (mode === 'pay' && (short || !!problem))} loading={go.isPending} onClick={() => go.mutate()} leftIcon={<LogOut className="h-4 w-4 rtl-flip" />}>
          {due <= 0 ? tr('Check-out karein') : mode === 'khata' ? tr('{{due}} khate me · check-out', { due: formatPKR(due) }) : tr('{{due}} le kar check-out', { due: formatPKR(due) })}
        </Button>
      </>}>
      <div className="space-y-4">
        {b.overdueNights > 0 && <p className={warn}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{tr('Guest {{overdueNights}} raat zyada ruka — pehle "Stay barhayein" se aaj tak barhayein, phir check-out.', { overdueNights: b.overdueNights })}</p>}
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <ul className="space-y-1 text-[0.8125rem]">
            {b.bill.lines.map((l, i) => <li key={i} className="flex justify-between gap-3"><span className="truncate text-slate-600">{l.label}</span><span className="tabular-nums text-slate-900">{formatPKR(l.amount)}</span></li>)}
            {b.bill.discount > 0 && <li className="flex justify-between text-success-700"><span>{tr('Discount')}</span><span className="tabular-nums">−{formatPKR(b.bill.discount)}</span></li>}
          </ul>
          <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-[0.875rem]">
            <div className="flex justify-between font-semibold"><span>{tr('Kul bill{{value}}', { value: early && !keepNights ? tr(' ({{stayed}} raat)', { stayed }) : '' })}</span><span className="tabular-nums">{formatPKR(total)}</span></div>
            {advance > 0 && <div className="flex justify-between text-slate-600"><span>{tr('Advance (khate se)')}</span><span className="tabular-nums">−{formatPKR(Math.min(advance, total))}</span></div>}
            <div className="flex justify-between text-[1.0625rem] font-bold"><span>{tr('Ab lena hai')}</span><span className="tabular-nums">{formatPKR(due)}</span></div>
            {advance > total && <p className="text-[0.75rem] text-success-700">{tr('{{formatPKR}} advance bach jayega — check-out ke baad "Advance wapas" se de sakte hain.', { formatPKR: formatPKR(advance - total) })}</p>}
          </div>
        </div>

        {early && (
          <Switch checked={keepNights} onChange={(e) => setKeepNights(e.target.checked)} label={tr('Booked raaton ka poora paisa lein')}
            description={tr('Guest {{nights}} ki jagah {{earlyNights}} raat ruka. Band rakhein to sirf ruki hui raatein bill hongi.', { nights: b.nights, earlyNights: b.earlyNights })} />
        )}

        {due > 0 && (<>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {([['pay', tr('Abhi paisa lein')], ['khata', tr('Khate me (udhaar / company)')]] as const).map(([id, l]) => (
              <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
                className={cn('h-10 rounded-xl text-[0.8125rem] font-semibold ring-1', mode === id ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{l}</button>
            ))}
          </div>
          {mode === 'pay' ? (<>
            <PosSplitTender total={due} rows={rows} onRows={setRows} active={active} onActive={setActive} />
            {sum.change > 0 && <p className="text-[0.875rem] font-semibold text-success-700">{tr('Change wapas: {{change}}', { change: formatPKR(sum.change) })}</p>}
            {short && <p className="text-[0.8125rem] text-amber-700">{tr('{{remaining}} kam hai — poora lein, ya "Khate me" chunein.', { remaining: formatPKR(sum.remaining) })}</p>}
            {problem && <p className="text-[0.8125rem] text-rose-700">{problem}</p>}
          </>) : (
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <p className="text-[0.875rem] text-slate-800"><Building2 className="me-1 inline h-4 w-4 text-slate-400" />{formatPKR(due)} <b>{khataName}</b> {' '}{tr('ke khate me likha jayega.')}</p>
              {holder ? <p className={note}>{tr('Advance isi khate me hai, is liye bill bhi isi me jata hai.')}</p> : (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setPicking(true)}>{company ? tr('Doosri company chunein') : tr('Company / doosra khata chunein')}</Button>
                  {company && <Button size="sm" variant="ghost" onClick={() => setCompany(null)}>{tr('Guest ka apna khata')}</Button>}
                </div>
              )}
            </div>
          )}
        </>)}
        <p className={note}>{tr('Bill sale record, day book aur khate me jata hai. Room safai ke liye chala jayega.')}</p>
      </div>
    </Modal>
  );
}
