/**
 * New booking or walk-in: stay dates, rooms picked from what is free on
 * every night (with the nightly rate, weekend and season plans included),
 * the guest (an old guest found by name, phone or CNIC), a company that
 * books or pays, and the advance taken now. A walk-in is checked in at
 * once with the guest's ID.
 *
 * Opened from the room board as ?roomId=…&checkIn=YYYY-MM-DD.
 * Keys: Ctrl+S save · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, BedDouble, Building2, CalendarDays, GraduationCap, IdCard, LogIn, Search, Star, Trash2, UserRound, Wallet, X } from 'lucide-react';
import { Button, Card, Input, Kbd, PageShell, Select, Skeleton, Switch, Textarea } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { CustomerPicker } from '@modules/customers/directory/components/KhataTools';
import { bookingsApi, type BookingSource, type MealPlan, type PayMethod, type QuoteType } from '../api/bookings.api';
import { guestsApi, type HotelGuest } from '../api/guests.api';
import { MethodPicker } from '../components/MethodPicker';
import {
  ALL_HOTEL_KEYS, HK_STATUS, ID_TYPES, MEAL_PLANS, SOURCES, addDaysKey, apiError, cnicOk, formatCnic, moneyInput, nightsBetween, num, phoneOk, stayDay, todayKey,
} from '../components/meta';

interface Line { roomId: string; roomNumber: string; roomTypeId: string; typeName: string; quoted: number; rate: string; custom: boolean; adults: string; children: string; extraBeds: string }

export default function NewBookingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [params] = useSearchParams();
  const today = todayKey();

  const [checkIn, setCheckIn] = useState(params.get('checkIn') || today);
  const [checkOut, setCheckOut] = useState(addDaysKey(params.get('checkIn') || today, 1));
  const [source, setSource] = useState<BookingSource>(params.get('walkin') === '1' ? 'WALK_IN' : 'PHONE');
  const [lines, setLines] = useState<Line[]>([]);
  const [guest, setGuest] = useState<HotelGuest | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [find, setFind] = useState('');
  const [findQ, setFindQ] = useState('');
  const [checkInNow, setCheckInNow] = useState(params.get('walkin') === '1');
  const [idType, setIdType] = useState('CNIC');
  const [idNumber, setIdNumber] = useState('');
  const [city, setCity] = useState('');
  const [bookedBy, setBookedBy] = useState('');
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlan>('ROOM_ONLY');
  const [status, setStatus] = useState<'CONFIRMED' | 'TENTATIVE'>('CONFIRMED');
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [advance, setAdvance] = useState('');
  const [method, setMethod] = useState<PayMethod>('CASH');
  const [arrivalTime, setArrivalTime] = useState('');
  const [requests, setRequests] = useState('');
  const [sourceRef, setSourceRef] = useState('');
  const [tried, setTried] = useState(false);

  const nights = nightsBetween(checkIn, checkOut);
  const datesOk = nights >= 1 && checkIn >= addDaysKey(today, -1);
  useEffect(() => { if (checkIn !== today) setCheckInNow(false); }, [checkIn, today]);
  useEffect(() => { const t = setTimeout(() => setFindQ(find.trim()), 250); return () => clearTimeout(t); }, [find]);

  const quote = useQuery({
    queryKey: ['hotel-quote', checkIn, checkOut, source],
    queryFn: () => bookingsApi.quote({ checkInDate: checkIn, checkOutDate: checkOut, source }),
    enabled: datesOk,
    placeholderData: (p) => p,
  });
  const guests = useQuery({ queryKey: ['hotel-guest-find', findQ], queryFn: () => guestsApi.list({ search: findQ }), enabled: findQ.length >= 3 && !guest });

  // Dates changed: drop rooms no longer free, refresh the quoted price of the rest.
  useEffect(() => {
    if (!quote.data) return;
    setLines((ls) => ls.flatMap((l) => {
      const free = quote.data.types.find((t) => t.roomTypeId === l.roomTypeId)?.free.find((r) => r.id === l.roomId);
      return free ? [{ ...l, quoted: free.total, rate: l.custom ? l.rate : String(Math.round(free.total / quote.data.nights)) }] : [];
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.data]);

  // Room board link: pick the room once the quote arrives.
  const wanted = params.get('roomId');
  useEffect(() => {
    if (!wanted || !quote.data || lines.length) return;
    for (const t of quote.data.types) { const r = t.free.find((x) => x.id === wanted); if (r) { toggle(t, r); break; } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.data, wanted]);

  const toggle = (t: QuoteType, r: QuoteType['free'][number]) => {
    setLines((ls) => ls.some((l) => l.roomId === r.id) ? ls.filter((l) => l.roomId !== r.id) : [...ls, {
      roomId: r.id, roomNumber: r.roomNumber, roomTypeId: t.roomTypeId, typeName: t.name, quoted: r.total,
      rate: String(Math.round(r.total / Math.max(nights, 1))), custom: false, adults: String(Math.min(t.maxAdults, 2)), children: '0', extraBeds: '0',
    }]);
  };
  const setLine = (id: string, k: 'rate' | 'adults' | 'children' | 'extraBeds', v: string) => setLines((ls) => ls.map((l) => (l.roomId === id ? { ...l, [k]: v, ...(k === 'rate' && { custom: true }) } : l)));
  const typeOf = (id: string) => quote.data?.types.find((t) => t.roomTypeId === id);

  const roomTotal = lines.reduce((s, l) => {
    const t = typeOf(l.roomTypeId);
    return s + (l.custom ? num(l.rate) * nights : l.quoted) + num(l.extraBeds) * (t?.extraBedPrice ?? 0) * nights;
  }, 0);
  const total = Math.max(roomTotal + num(tax) - num(discount), 0);
  const adv = num(advance);
  const people = lines.reduce((s, l) => s + (num(l.adults) || 1) + num(l.children), 0);

  const name = guest?.fullName ?? guestName.trim();
  const phone = guest?.phone ?? guestPhone.trim();
  const errors = {
    dates: !datesOk ? (nights < 1 ? 'Check-out, check-in ke baad ki date honi chahiye' : 'Guzri hui date par booking nahi banti') : null,
    rooms: !lines.length ? 'Kam az kam ek room chunein' : null,
    name: !name ? 'Guest ka naam likhein' : null,
    phone: !phoneOk(phone) ? 'Phone number sahi likhein (kam az kam 10 hindse)' : null,
    id: checkInNow && !guest?.idNumber ? (!idNumber.trim() ? 'Check-in ke liye CNIC ya passport number likhein' : idType === 'CNIC' && !cnicOk(idNumber) ? 'CNIC 13 hindson ka hota hai' : null) : null,
    advance: adv > total + 0.005 ? `Advance kul bill (${formatPKR(total)}) se zyada hai` : null,
    occupancy: lines.find((l) => { const t = typeOf(l.roomTypeId); return t && (num(l.adults) || 1) + num(l.children) > t.maxOccupancy + num(l.extraBeds); }) ? 'Kisi room me zyada log likhe hain — extra bed lagayein ya doosra room' : null,
  };
  const firstError = Object.values(errors).find(Boolean) ?? null;

  const save = useMutation({
    mutationFn: () => bookingsApi.create({
      primaryGuestId: guest?.id, guestName: name, guestPhone: phone, checkInDate: checkIn, checkOutDate: checkOut,
      rooms: lines.map((l) => ({
        roomId: l.roomId, roomTypeId: l.roomTypeId, adults: num(l.adults) || 1, children: num(l.children), extraBeds: num(l.extraBeds),
        ...(l.custom && { ratePerNight: num(l.rate) }),
      })),
      source, sourceRef: sourceRef.trim() || undefined, bookedBy: (company?.name ?? bookedBy.trim()) || undefined, mealPlan, status,
      taxAmount: num(tax) || undefined, discount: num(discount) || undefined, specialRequests: requests.trim() || undefined, arrivalTime: arrivalTime.trim() || undefined,
      advancePaid: adv || undefined, paymentMethod: adv ? method : undefined, customerId: company?.id,
      ...(checkInNow && { checkInNow: true, idType, idNumber: idNumber.trim() || undefined, city: city.trim() || undefined, adults: people || undefined }),
    }),
    onSuccess: (b) => {
      ALL_HOTEL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(checkInNow ? `${b.guestName} check-in ho gaya` : `Booking ${b.bookingNumber} ban gayi`);
      navigate(`/hotel/bookings/${b.id}`);
    },
    onError: (e) => toast.error(apiError(e, 'Booking nahi bani')),
  });
  const submit = () => { setTried(true); if (firstError) { toast.error(firstError); return; } save.mutate(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const types = useMemo(() => quote.data?.types ?? [], [quote.data]);
  const err = (k: keyof typeof errors) => (tried ? errors[k] ?? undefined : undefined);

  return (
    <PageShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/hotel/bookings" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Wapas"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{checkInNow ? 'Walk-in check-in' : 'Nayi booking'}</h1>
            <p className="text-[0.8125rem] text-slate-500">Dates → room → guest → advance. <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> se save, <Kbd>G</Kbd> guide.</p>
          </div>
        </div>
        <Button variant="ghost" leftIcon={<GraduationCap className="h-4 w-4" />} onClick={guide.open}>Guide</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><CalendarDays className="h-4 w-4 text-slate-400" />Kab se kab tak</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input type="date" label="Check-in" value={checkIn} min={addDaysKey(today, -1)} onChange={(e) => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut(addDaysKey(e.target.value, 1)); }} />
              <Input type="date" label="Check-out" value={checkOut} min={addDaysKey(checkIn, 1)} onChange={(e) => setCheckOut(e.target.value)} error={err('dates')} hint={nights >= 1 ? `${nights} raat · ${stayDay(checkIn, { day: true })} se` : undefined} />
              <Select label="Booking kahan se" value={source} onChange={(e) => setSource(e.target.value as BookingSource)} options={SOURCES.map((s) => ({ value: s.id, label: s.label }))} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 7].map((n) => <Button key={n} size="sm" variant={nights === n ? 'primary' : 'secondary'} onClick={() => setCheckOut(addDaysKey(checkIn, n))}>{n} raat</Button>)}
            </div>
            {checkIn === today && (
              <Switch checked={checkInNow} onChange={(e) => { setCheckInNow(e.target.checked); if (e.target.checked) setSource('WALK_IN'); }} label="Guest saamne hai — abhi check-in karein" description="Walk-in: booking ke saath check-in bhi; CNIC abhi likhna hoga" />
            )}
          </Card>

          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><BedDouble className="h-4 w-4 text-slate-400" />Room chunein</h2>
              <p className="text-[0.75rem] text-slate-500">Sirf wo room jo har raat khaali hain · weekend aur season rate shamil</p>
            </div>
            {err('rooms') && <p className="text-[0.8125rem] text-rose-600">{err('rooms')}</p>}
            {!datesOk ? <p className="text-[0.8125rem] text-slate-500">Pehle sahi dates chunein.</p> : quote.isLoading ? <Skeleton className="h-40 rounded-2xl" /> : !types.length ? (
              <p className="text-[0.8125rem] text-slate-500">Koi room type nahi. <Link to="/hotel-room-types/new" className="text-brand-700 hover:underline">Room type banayein</Link></p>
            ) : types.map((t) => (
              <div key={t.roomTypeId} className="rounded-2xl p-3 ring-1 ring-slate-200">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[0.875rem] font-semibold text-slate-900">{t.name} <span className="font-normal text-slate-500">· {t.maxOccupancy} log</span></p>
                  <p className="text-[0.8125rem] text-slate-600"><b className="tabular-nums text-slate-900">{formatPKR(t.avgRate)}</b> fi raat · {nights} raat {formatPKR(t.total)}
                    {t.nightly.some((n) => n.label !== 'Normal') && <span className="ml-1 text-[0.75rem] text-amber-700">({[...new Set(t.nightly.filter((n) => n.label !== 'Normal').map((n) => n.label))].join(', ')})</span>}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {t.free.length ? t.free.map((r) => {
                    const on = lines.some((l) => l.roomId === r.id);
                    return (
                      <button key={r.id} type="button" onClick={() => toggle(t, r)} title={`${HK_STATUS[r.housekeepingStatus as keyof typeof HK_STATUS]?.label ?? ''}${r.total !== t.total ? ` · is room ka rate ${formatPKR(r.total)}` : ''}`}
                        className={cn('min-w-[3.5rem] rounded-xl px-3 py-1.5 text-[0.875rem] font-bold ring-1 transition', on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-800 ring-slate-200 hover:bg-slate-50', r.housekeepingStatus === 'DIRTY' && !on && 'ring-amber-300')}>
                        {r.roomNumber}
                      </button>
                    );
                  }) : <span className="text-[0.8125rem] text-slate-500">In dates me is type ka koi room khaali nahi ({t.roomsTotal} me se)</span>}
                </div>
              </div>
            ))}

            {lines.length > 0 && (
              <ul className="divide-y divide-slate-100 rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                {lines.map((l) => {
                  const t = typeOf(l.roomTypeId);
                  return (
                    <li key={l.roomId} className="grid grid-cols-2 items-end gap-2 p-3 sm:grid-cols-[5rem_1fr_5rem_5rem_5rem_auto]">
                      <div className="col-span-2 sm:col-span-1"><p className="text-[1rem] font-bold text-slate-900">{l.roomNumber}</p><p className="truncate text-[0.6875rem] text-slate-500">{l.typeName}</p></div>
                      <Input size="sm" label="Rate fi raat" inputMode="decimal" value={l.rate} onChange={(e) => setLine(l.roomId, 'rate', moneyInput(e.target.value))} hint={l.custom ? `System rate ${formatPKR(Math.round(l.quoted / Math.max(nights, 1)))}` : undefined} />
                      <Input size="sm" label="Bade" inputMode="numeric" value={l.adults} onChange={(e) => setLine(l.roomId, 'adults', e.target.value.replace(/\D/g, ''))} />
                      <Input size="sm" label="Bachay" inputMode="numeric" value={l.children} onChange={(e) => setLine(l.roomId, 'children', e.target.value.replace(/\D/g, ''))} />
                      {t?.extraBedAllowed ? <Input size="sm" label="Extra bed" inputMode="numeric" value={l.extraBeds} onChange={(e) => setLine(l.roomId, 'extraBeds', e.target.value.replace(/\D/g, ''))} hint={formatPKR(t.extraBedPrice)} /> : <span />}
                      <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.roomId !== l.roomId))} className="mb-1 justify-self-end rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Hatayein"><Trash2 className="h-4 w-4" /></button>
                    </li>
                  );
                })}
              </ul>
            )}
            {err('occupancy') && <p className="text-[0.8125rem] text-rose-600">{err('occupancy')}</p>}
          </Card>

          <Card className="space-y-3 p-4">
            <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><UserRound className="h-4 w-4 text-slate-400" />Guest</h2>
            {guest ? (
              <div className="flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-100">
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.875rem] font-semibold text-slate-900">{guest.fullName} {guest.isVIP && <Star className="inline h-3.5 w-3.5 fill-amber-400 text-amber-500" />}</span>
                  <span className="block text-[0.75rem] text-slate-600">{guest.phone} · {guest.idNumber ?? 'ID nahi'} · {guest.totalStays} stays</span>
                  {guest.isBlacklisted && <span className="block text-[0.75rem] font-semibold text-rose-700">Blacklist: {guest.blacklistReason}</span>}
                </span>
                <button type="button" onClick={() => setGuest(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white" aria-label="Hatayein"><X className="h-4 w-4" /></button>
              </div>
            ) : (<>
              <Input leftIcon={<Search className="h-4 w-4" />} label="Purana guest dhoondein" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Naam, phone ya CNIC" hint="Pehle aa chuka ho to us ka ID aur khata khud jur jata hai" />
              {findQ.length >= 3 && (guests.data ?? []).length > 0 && (
                <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
                  {(guests.data ?? []).slice(0, 8).map((g) => (
                    <li key={g.id}><button type="button" onClick={() => { setGuest(g); setFind(''); if (g.companyName) setBookedBy(g.companyName); }} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[0.8125rem] hover:bg-slate-50">
                      <span>{g.fullName} <span className="text-slate-500">· {g.phone}</span></span><span className="text-slate-500">{g.totalStays} stays</span>
                    </button></li>
                  ))}
                </ul>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Naam" required value={guestName} onChange={(e) => setGuestName(e.target.value)} error={err('name')} placeholder="Ali Raza" />
                <Input label="Phone" required inputMode="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} error={err('phone')} placeholder="0300 1234567" />
              </div>
            </>)}
            {checkInNow && !guest?.idNumber && (
              <div className="grid gap-3 sm:grid-cols-[9rem_1fr_1fr]">
                <Select label="ID" value={idType} onChange={(e) => setIdType(e.target.value)} options={ID_TYPES.map((t) => ({ value: t.id, label: t.label }))} />
                <Input label="ID number" required leftIcon={<IdCard className="h-4 w-4" />} value={idNumber} error={err('id')} placeholder="35202-1234567-1"
                  onChange={(e) => setIdNumber(idType === 'CNIC' ? formatCnic(e.target.value) : e.target.value.toUpperCase())} hint="Police record ke liye zaroori" />
                <Input label="Shehar" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lahore" />
              </div>
            )}
          </Card>

          <Card className="space-y-3 p-4">
            <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><Building2 className="h-4 w-4 text-slate-400" />Company aur baqi tafseel</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Input label="Company / agent (bill par)" value={company?.name ?? bookedBy} disabled={!!company} onChange={(e) => setBookedBy(e.target.value)} placeholder="Engro, Travel agent…" />
                <div className="mt-1.5 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setPicking(true)}>{company ? 'Khata badlein' : 'Company ka khata jorein'}</Button>
                  {company && <Button size="sm" variant="ghost" onClick={() => setCompany(null)}>Hatayein</Button>}
                </div>
                <p className="mt-1 text-[0.75rem] text-slate-500">Company advance de ya baad me bill bhare to us ka khata jorein.</p>
              </div>
              <Input label="Online booking ID" value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} placeholder="Booking.com / Agoda number" />
              <Select label="Khana" value={mealPlan} onChange={(e) => setMealPlan(e.target.value as MealPlan)} options={MEAL_PLANS.map((m) => ({ value: m.id, label: m.label }))} />
              {!checkInNow && <Select label="Booking" value={status} onChange={(e) => setStatus(e.target.value as 'CONFIRMED' | 'TENTATIVE')} options={[{ value: 'CONFIRMED', label: 'Pakki' }, { value: 'TENTATIVE', label: 'Kachi (abhi tay nahi)' }]} />}
              {!checkInNow && <Input label="Aane ka waqt" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} placeholder="Shaam 6 baje" />}
              <Textarea wrapperClassName="sm:col-span-2" label="Guest ki farmaish" rows={2} value={requests} onChange={(e) => setRequests(e.target.value)} placeholder="Neeche wali manzil, extra takiya…" />
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="space-y-3 p-4">
            <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><Wallet className="h-4 w-4 text-slate-400" />Paisa</h2>
            <div className="space-y-1 text-[0.8125rem]">
              <div className="flex justify-between"><span className="text-slate-500">{lines.length} room · {Math.max(nights, 0)} raat</span><span className="tabular-nums">{formatPKR(roomTotal)}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input size="sm" label="Discount" inputMode="decimal" value={discount} onChange={(e) => setDiscount(moneyInput(e.target.value))} />
              <Input size="sm" label="Tax" inputMode="decimal" value={tax} onChange={(e) => setTax(moneyInput(e.target.value))} hint="Bed tax" />
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-[1rem] font-bold"><span>Kul</span><span className="tabular-nums">{formatPKR(total)}</span></div>
            <Input label="Advance abhi liya" inputMode="decimal" value={advance} onChange={(e) => setAdvance(moneyInput(e.target.value))} error={err('advance')} hint="Khate me jama hota hai; check-out ke bill me kat jata hai" />
            {adv > 0 && <MethodPicker value={method} onChange={setMethod} />}
            <div className="flex justify-between text-[0.875rem] font-semibold"><span>Check-out par baqi</span><span className="tabular-nums">{formatPKR(Math.max(total - adv, 0))}</span></div>
            <Button fullWidth size="lg" loading={save.isPending} onClick={submit} leftIcon={checkInNow ? <LogIn className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}>
              {checkInNow ? 'Booking + check-in' : 'Booking save karein'}
            </Button>
            {tried && firstError && <p className="text-center text-[0.8125rem] text-rose-600">{firstError}</p>}
          </Card>
        </div>
      </div>

      {picking && <CustomerPicker title="Company ka khata" money={formatPKR} onClose={() => setPicking(false)} onPick={(c) => { setCompany({ id: c.id, name: c.name }); setPicking(false); if (source === 'PHONE') setSource('CORPORATE'); }} />}

      {guide.isOpen && (
        <PageGuide title="Nayi booking — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: CalendarDays, color: '#4f46e5', title: 'Dates', text: 'Check-in aur check-out ki date. Raat ka hisaab khud lagta hai; Juma aur Hafta ki raat weekend rate.' },
            { icon: BedDouble, color: '#0891b2', title: 'Room', text: 'Sirf wo room dikhte hain jo har raat khaali hain. Ek se zyada room bhi chun sakte hain. Rate badalna ho to line me likhein.' },
            { icon: UserRound, color: '#16a34a', title: 'Guest', text: 'Purana guest dhoondein to ID aur khata jur jata hai. Naya ho to naam aur phone.' },
            { icon: Wallet, color: '#ea580c', title: 'Advance', text: 'Advance usi din drawer / bank aur guest (ya company) ke khate me jata hai. Check-out par bill se kat jata hai.' },
            { icon: LogIn, color: '#7c3aed', title: 'Walk-in', text: '"Abhi check-in" chunein to CNIC likh kar guest seedha room me.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
