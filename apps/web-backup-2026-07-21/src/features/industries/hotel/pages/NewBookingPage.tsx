import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Plus, Trash2, User, Phone, Search, Sparkles,
  Bed, X, Users, Calendar, Star,
} from 'lucide-react';
import { bookingsApi, type BookingSource, type MealPlan } from '../api/bookings.api';
import { roomsApi } from '../api/rooms.api';
import { roomTypesApi } from '../api/room-types.api';
import { guestsApi } from '../api/guests.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';

const SOURCES: { value: BookingSource; label: string; emoji: string }[] = [
  { value: 'DIRECT', label: 'Direct', emoji: '🎯' },
  { value: 'WALK_IN', label: 'Walk-in', emoji: '🚶' },
  { value: 'PHONE', label: 'Phone', emoji: '📞' },
  { value: 'WEBSITE', label: 'Website', emoji: '🌐' },
  { value: 'BOOKING_COM', label: 'Booking.com', emoji: '🔵' },
  { value: 'AGODA', label: 'Agoda', emoji: '🟣' },
  { value: 'EXPEDIA', label: 'Expedia', emoji: '🟡' },
  { value: 'AIRBNB', label: 'Airbnb', emoji: '🔴' },
  { value: 'TRAVEL_AGENT', label: 'Agent', emoji: '✈️' },
  { value: 'CORPORATE', label: 'Corporate', emoji: '🏢' },
  { value: 'GOVT', label: 'Govt', emoji: '🏛️' },
];

const MEAL_PLANS: { value: MealPlan; label: string }[] = [
  { value: 'ROOM_ONLY', label: 'Room Only' },
  { value: 'BED_BREAKFAST', label: 'Bed & Breakfast' },
  { value: 'HALF_BOARD', label: 'Half Board' },
  { value: 'FULL_BOARD', label: 'Full Board' },
  { value: 'ALL_INCLUSIVE', label: 'All-Inclusive' },
];

interface SelectedRoom {
  roomId?: string;
  roomTypeId: string;
  roomNumber?: string;
  roomTypeName: string;
  ratePerNight: number;
  adults: number;
  children: number;
  extraBeds: number;
  discount: number;
}

export default function NewBookingPage() {
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [form, setForm] = useState<any>({
    primaryGuestId: '',
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    totalAdults: 1,
    totalChildren: 0,
    checkInDate: today,
    checkOutDate: tomorrow,
    source: 'DIRECT',
    sourceRef: '',
    mealPlan: 'ROOM_ONLY',
    specialRequests: '',
    arrivalTime: '',
    purposeOfVisit: '',
    taxAmount: 0,
    serviceCharge: 0,
    discount: 0,
    advancePaid: 0,
    earlyCheckIn: false,
    lateCheckOut: false,
  });

  const [rooms, setRooms] = useState<SelectedRoom[]>([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);

  const { data: guests = [] } = useQuery({
    queryKey: ['guests-for-booking', guestSearch],
    queryFn: () => guestsApi.list({ search: guestSearch || undefined }),
    enabled: showGuestPicker,
  });

  const nights = differenceInDays(new Date(form.checkOutDate), new Date(form.checkInDate)) || 1;

  const { data: availability } = useQuery({
    queryKey: ['availability', form.checkInDate, form.checkOutDate],
    queryFn: () => roomsApi.availability({
      checkInDate: form.checkInDate,
      checkOutDate: form.checkOutDate,
    }),
    enabled: showRoomPicker,
  });

  const roomTotal = rooms.reduce((s, r) => s + (r.ratePerNight * nights) - r.discount, 0);
  const grandTotal = Math.max(roomTotal + Number(form.taxAmount) + Number(form.serviceCharge) - Number(form.discount), 0);
  const balance = Math.max(grandTotal - Number(form.advancePaid), 0);

  const createMutation = useMutation({
    mutationFn: () => bookingsApi.create({
      ...form,
      totalAdults: Number(form.totalAdults) || 1,
      totalChildren: Number(form.totalChildren) || 0,
      taxAmount: Number(form.taxAmount) || 0,
      serviceCharge: Number(form.serviceCharge) || 0,
      discount: Number(form.discount) || 0,
      advancePaid: Number(form.advancePaid) || 0,
      rooms: rooms.map((r) => ({
        roomId: r.roomId,
        roomTypeId: r.roomTypeId,
        roomNumber: r.roomNumber,
        ratePerNight: r.ratePerNight,
        adults: r.adults,
        children: r.children,
        extraBeds: r.extraBeds,
        discount: r.discount,
      })),
    }),
    onSuccess: (booking) => {
      toast.success('Booking ' + booking.bookingNumber + ' created');
      navigate('/hotel/bookings/' + booking.id);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const addRoom = (roomTypeGroup: any, roomToPick?: any) => {
    setRooms([...rooms, {
      roomId: roomToPick?.id,
      roomTypeId: roomTypeGroup.roomType.id,
      roomNumber: roomToPick?.roomNumber,
      roomTypeName: roomTypeGroup.roomType.name,
      ratePerNight: roomTypeGroup.roomType.basePrice,
      adults: 2,
      children: 0,
      extraBeds: 0,
      discount: 0,
    }]);
    setShowRoomPicker(false);
  };

  const removeRoom = (i: number) => setRooms(rooms.filter((_, idx) => idx !== i));
  const updateRoom = (i: number, patch: Partial<SelectedRoom>) => setRooms(rooms.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const canSubmit = rooms.length > 0 && form.guestName && form.guestPhone && form.checkInDate && form.checkOutDate;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-800 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/hotel/bookings')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                New Booking
              </div>
              <h1 className="mt-1 text-2xl font-extrabold">📅 Create Booking</h1>
            </div>
          </div>
          <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} className="bg-white text-slate-900 hover:bg-slate-100">
            <Save className="h-4 w-4" />
            Create Booking
          </Button>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6">
          {/* Guest */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              Primary Guest
            </h3>
            {selectedGuest ? (
              <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-center gap-3">
                <User className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <div className="font-extrabold">{selectedGuest.fullName}</div>
                  <div className="text-xs text-slate-600 font-bold">{selectedGuest.phone} • {selectedGuest.guestNumber}</div>
                  {selectedGuest.isVIP && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 mt-1"><Star className="h-2 w-2 fill-current" />VIP</span>}
                </div>
                <button onClick={() => { setSelectedGuest(null); setForm({ ...form, primaryGuestId: '', guestName: '', guestPhone: '', guestEmail: '' }); }} className="text-xs font-extrabold text-blue-600 hover:underline">Change</button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowGuestPicker(!showGuestPicker)} className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-extrabold text-slate-600 hover:border-blue-400">
                  <Search className="h-4 w-4 inline mr-1" />
                  Search Existing Guest
                </button>
                {showGuestPicker && (
                  <div className="rounded-xl border-2 border-blue-300 bg-blue-50/50 p-3 space-y-2">
                    <input autoFocus value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} placeholder="Search name, phone, CNIC..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {guests.map((g) => (
                        <button key={g.id} onClick={() => { setSelectedGuest(g); setForm({ ...form, primaryGuestId: g.id, guestName: g.fullName, guestPhone: g.phone, guestEmail: g.email || '' }); setShowGuestPicker(false); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-extrabold truncate">{g.fullName}</div>
                            <div className="text-[10px] text-slate-500 font-bold">{g.phone} • {g.guestNumber}</div>
                          </div>
                          {g.isVIP && <Star className="h-3 w-3 text-amber-500 fill-current" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  <input value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} placeholder="Guest name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                  <input value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} placeholder="Phone *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                </div>
              </>
            )}
            <div className="grid sm:grid-cols-3 gap-3">
              <input value={form.guestEmail} onChange={(e) => setForm({ ...form, guestEmail: e.target.value })} placeholder="Email" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Adults</label>
                <input type="number" value={form.totalAdults} onChange={(e) => setForm({ ...form, totalAdults: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Children</label>
                <input type="number" value={form.totalChildren} onChange={(e) => setForm({ ...form, totalChildren: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </section>

          {/* Dates */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-600" />
              Dates & Stay Details
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Check-in *</label>
                <input type="date" value={form.checkInDate} onChange={(e) => setForm({ ...form, checkInDate: e.target.value })} min={today} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Check-out *</label>
                <input type="date" value={form.checkOutDate} onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })} min={form.checkInDate} className="h-11 w-full rounded-xl border-2 border-rose-300 bg-rose-50 dark:bg-rose-950/30 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-3 text-center">
              <div className="text-xs font-bold text-slate-500">Total Stay</div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{nights} night{nights > 1 ? 's' : ''}</div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <select value={form.mealPlan} onChange={(e) => setForm({ ...form, mealPlan: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
                {MEAL_PLANS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <input type="time" value={form.arrivalTime} onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })} placeholder="Arrival Time" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
              <input value={form.purposeOfVisit} onChange={(e) => setForm({ ...form, purposeOfVisit: e.target.value })} placeholder="Purpose (Business, Leisure...)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            </div>
          </section>

          {/* Rooms */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Bed className="h-4 w-4 text-indigo-600" />
                Rooms ({rooms.length})
              </h3>
              <Button size="sm" onClick={() => setShowRoomPicker(true)} className="bg-gradient-to-r from-indigo-600 to-purple-700">
                <Bed className="h-3.5 w-3.5" />
                Add Room
              </Button>
            </div>
            {rooms.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
                <Bed className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-extrabold text-slate-700">No rooms added</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rooms.map((room, i) => (
                  <div key={i} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-extrabold">{room.roomTypeName}</div>
                        {room.roomNumber && <div className="text-[10px] font-bold text-slate-500">Room {room.roomNumber}</div>}
                      </div>
                      <button onClick={() => removeRoom(i)} className="h-6 w-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-0.5 block">Rate/night</label>
                        <input type="number" value={room.ratePerNight} onChange={(e) => updateRoom(i, { ratePerNight: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-emerald-300 bg-emerald-50 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-0.5 block">Adults</label>
                        <input type="number" value={room.adults} onChange={(e) => updateRoom(i, { adults: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-blue-300 bg-blue-50 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-extrabold text-cyan-700 mb-0.5 block">Children</label>
                        <input type="number" value={room.children} onChange={(e) => updateRoom(i, { children: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-cyan-300 bg-cyan-50 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-cyan-500" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-0.5 block">Discount</label>
                        <input type="number" value={room.discount} onChange={(e) => updateRoom(i, { discount: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-rose-200 bg-rose-50 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-rose-500" />
                      </div>
                    </div>
                    <div className="text-right text-sm font-extrabold text-emerald-700 tabular-nums">
                      = {formatPKR((room.ratePerNight * nights) - room.discount)} for {nights} nights
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Source */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white">Booking Source</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SOURCES.map((s) => (
                <button key={s.value} onClick={() => setForm({ ...form, source: s.value })} className={
                  'p-2 rounded-xl border-2 text-center transition ' +
                  (form.source === s.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 hover:border-blue-300')
                }>
                  <div className="text-xl">{s.emoji}</div>
                  <div className="text-[9px] font-extrabold">{s.label}</div>
                </button>
              ))}
            </div>
            {form.source !== 'DIRECT' && form.source !== 'WALK_IN' && (
              <input value={form.sourceRef} onChange={(e) => setForm({ ...form, sourceRef: e.target.value })} placeholder="Reference # (OTA booking ID, agent name...)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            )}
          </section>

          <textarea rows={3} value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} placeholder="Special requests..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-blue-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">💰 Summary</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Nights</span><span className="font-bold tabular-nums">{nights}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Rooms</span><span className="font-bold tabular-nums">{rooms.length}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Room Total</span><span className="font-bold tabular-nums">{formatPKR(roomTotal)}</span></div>
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Tax</label>
                  <input type="number" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Service Charge</label>
                  <input type="number" value={form.serviceCharge} onChange={(e) => setForm({ ...form, serviceCharge: e.target.value })} className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Discount</label>
                  <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-emerald-300 mb-0.5 block">Advance Paid</label>
                  <input type="number" value={form.advancePaid} onChange={(e) => setForm({ ...form, advancePaid: e.target.value })} className="h-9 w-full rounded-lg bg-emerald-500/20 border border-emerald-400/40 px-2 text-sm font-extrabold tabular-nums text-emerald-100 focus:outline-none focus:border-emerald-400" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-extrabold text-emerald-300">GRAND TOTAL</span>
                  <span className="text-2xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/70">Balance</span>
                  <span className={'font-extrabold tabular-nums ' + (balance > 0 ? 'text-amber-300' : 'text-emerald-300')}>{formatPKR(balance)}</span>
                </div>
              </div>
            </div>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} size="lg" className="w-full bg-gradient-to-r from-blue-600 to-cyan-700">
              <Save className="h-5 w-5" />
              Create Booking
            </Button>
          </div>
        </aside>
      </div>

      {/* Room picker modal */}
      {showRoomPicker && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-3 border-b bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold">Select Room</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Available for {nights} nights ({form.checkInDate} → {form.checkOutDate})
                </p>
              </div>
              <button onClick={() => setShowRoomPicker(false)} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!availability || availability.totalAvailable === 0 ? (
                <p className="text-center text-slate-500 font-semibold py-8">No rooms available for selected dates</p>
              ) : (
                availability.byRoomType.map((group: any) => (
                  <div key={group.roomType.id} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-extrabold">{group.roomType.name}</div>
                        <div className="text-xs text-slate-500 font-bold">{group.count} available • Max {group.roomType.maxOccupancy} guests</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(group.roomType.basePrice)}</div>
                        <div className="text-[10px] font-bold text-slate-500">per night</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                      <button onClick={() => addRoom(group)} className="col-span-2 h-9 rounded-lg bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-700">
                        + Any Room ({group.count})
                      </button>
                      {group.rooms.slice(0, 10).map((r: any) => (
                        <button key={r.id} onClick={() => addRoom(group, r)} className="h-9 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 text-xs font-extrabold">
                          {r.roomNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
