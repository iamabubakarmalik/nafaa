import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bed, Users, Calendar, Search, X, Plus, Trash2, User, UserPlus,
  ArrowLeft, ArrowRight, Sparkles, CheckCircle2, Home,
  DollarSign, ChevronDown, Wifi, Wind, Tv, Coffee, Bath,
  Crown, Star, MapPin, Phone, Utensils,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { roomTypesApi } from '../api/room-types.api';
import { roomsApi } from '../api/rooms.api';
import { bookingsApi, type BookingSource, type MealPlan } from '../api/bookings.api';
import { guestsApi } from '../api/guests.api';
import { differenceInDays } from 'date-fns';

type Screen = 'rooms' | 'guest' | 'summary';

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

const SOURCES: { value: BookingSource; label: string; emoji: string }[] = [
  { value: 'WALK_IN', label: 'Walk-in', emoji: '🚶' },
  { value: 'DIRECT', label: 'Direct', emoji: '🎯' },
  { value: 'PHONE', label: 'Phone', emoji: '📞' },
  { value: 'BOOKING_COM', label: 'Booking.com', emoji: '🔵' },
  { value: 'AGODA', label: 'Agoda', emoji: '🟣' },
  { value: 'AIRBNB', label: 'Airbnb', emoji: '🔴' },
];

const MEAL_PLANS: { value: MealPlan; label: string }[] = [
  { value: 'ROOM_ONLY', label: 'Room Only' },
  { value: 'BED_BREAKFAST', label: 'Bed & Breakfast' },
  { value: 'HALF_BOARD', label: 'Half Board' },
  { value: 'FULL_BOARD', label: 'Full Board' },
  { value: 'ALL_INCLUSIVE', label: 'All-Inclusive' },
];

export default function HotelPosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [screen, setScreen] = useState<Screen>('rooms');
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState(tomorrow);
  const [selectedRooms, setSelectedRooms] = useState<SelectedRoom[]>([]);
  const [search, setSearch] = useState('');

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestId, setGuestId] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');

  const [totalAdults, setTotalAdults] = useState(1);
  const [totalChildren, setTotalChildren] = useState(0);
  const [source, setSource] = useState<BookingSource>('WALK_IN');
  const [mealPlan, setMealPlan] = useState<MealPlan>('ROOM_ONLY');
  const [specialRequests, setSpecialRequests] = useState('');
  const [taxPct, setTaxPct] = useState(0);
  const [serviceChargePct, setServiceChargePct] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);

  const nights = differenceInDays(new Date(checkOutDate), new Date(checkInDate)) || 1;

  const { data: availability } = useQuery({
    queryKey: ['availability', checkInDate, checkOutDate],
    queryFn: () => roomsApi.availability({ checkInDate, checkOutDate }),
    enabled: screen === 'rooms',
  });

  const { data: guests = [] } = useQuery({
    queryKey: ['guests-for-pos', guestSearch],
    queryFn: () => guestsApi.list({ search: guestSearch || undefined }),
    enabled: showGuestPicker,
  });

  const filteredAvailability = useMemo(() => {
    if (!availability?.byRoomType) return [];
    const q = search.toLowerCase().trim();
    if (!q) return availability.byRoomType;
    return availability.byRoomType.filter((group: any) =>
      group.roomType.name.toLowerCase().includes(q) ||
      group.roomType.code.toLowerCase().includes(q)
    );
  }, [availability, search]);

  const roomTotal = selectedRooms.reduce((s, r) => s + (r.ratePerNight * nights) - r.discount, 0);
  const svc = roomTotal * (serviceChargePct / 100);
  const tax = (roomTotal + svc) * (taxPct / 100);
  const grandTotal = Math.max(roomTotal + svc + tax - Number(discount), 0);
  const balance = Math.max(grandTotal - Number(advancePaid), 0);

  const addRoom = (group: any, room?: any) => {
    setSelectedRooms([...selectedRooms, {
      roomId: room?.id,
      roomTypeId: group.roomType.id,
      roomNumber: room?.roomNumber,
      roomTypeName: group.roomType.name,
      ratePerNight: group.roomType.basePrice,
      adults: 2,
      children: 0,
      extraBeds: 0,
      discount: 0,
    }]);
    toast.success(`${group.roomType.name} added`);
  };

  const removeRoom = (i: number) => setSelectedRooms(selectedRooms.filter((_, idx) => idx !== i));
  const updateRoom = (i: number, patch: Partial<SelectedRoom>) =>
    setSelectedRooms(selectedRooms.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const createBookingMutation = useMutation({
    mutationFn: () => bookingsApi.create({
      primaryGuestId: guestId || undefined,
      guestName, guestPhone, guestEmail,
      totalAdults, totalChildren,
      checkInDate, checkOutDate,
      source, mealPlan, specialRequests,
      taxAmount: tax, serviceCharge: svc, discount: Number(discount),
      advancePaid: Number(advancePaid),
      rooms: selectedRooms,
    } as any),
    onSuccess: (booking: any) => {
      toast.success(`Booking ${booking.bookingNumber} created!`);
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-bookings'] });
      navigate(`/hotel/bookings/${booking.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Booking failed'),
  });

  const canProceedFromRooms = selectedRooms.length > 0 && checkInDate && checkOutDate;
  const canProceedFromGuest = guestName.trim() && guestPhone.trim();

  // ─── SCREEN A: Room Selection ─────────────────
  if (screen === 'rooms') {
    return (
      <div className="space-y-4">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-purple-700 text-white p-6 shadow-2xl">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="relative flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <Bed className="h-3.5 w-3.5 text-amber-300" />
                Hotel POS — Room Selection
              </div>
              <h1 className="mt-3 text-3xl font-extrabold">🏨 Naya Booking</h1>
              <p className="mt-2 text-sm text-white/80">Room type select karein, dates set karein</p>
            </div>
          </div>
        </section>

        {/* Dates */}
        <section className="rounded-2xl bg-white border-2 border-slate-200 p-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Check-in *</label>
              <input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} min={today}
                className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Check-out *</label>
              <input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} min={checkInDate}
                className="h-11 w-full rounded-xl border-2 border-rose-300 bg-rose-50 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
            </div>
            <div className="rounded-xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center p-2">
              <div className="text-center">
                <div className="text-[10px] uppercase font-extrabold text-indigo-700">Stay Duration</div>
                <div className="text-2xl font-extrabold text-indigo-900 tabular-nums">{nights} night{nights !== 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search room types..."
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-indigo-500" />
        </div>

        {/* Available Rooms Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAvailability.map((group: any) => (
            <div key={group.roomType.id} className="rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-400 hover:shadow-xl transition overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-indigo-500 to-purple-600 relative">
                {group.roomType.imageUrls?.[0] ? (
                  <img src={group.roomType.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <Bed className="h-16 w-16" />
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/70 backdrop-blur text-white text-[10px] font-extrabold uppercase">
                  {group.roomType.code}
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold">
                  {group.count} available
                </div>
              </div>
              <div className="p-3 space-y-2">
                <h3 className="font-extrabold text-slate-900">{group.roomType.name}</h3>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{group.roomType.maxOccupancy}</span>
                  <span className="inline-flex items-center gap-1"><Bed className="h-3 w-3" />{group.roomType.bedType?.replace('_', ' ')}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.roomType.hasAC && <span className="p-1 rounded bg-blue-100 text-blue-700" title="AC"><Wind className="h-3 w-3" /></span>}
                  {group.roomType.hasWifi && <span className="p-1 rounded bg-cyan-100 text-cyan-700" title="WiFi"><Wifi className="h-3 w-3" /></span>}
                  {group.roomType.hasTV && <span className="p-1 rounded bg-purple-100 text-purple-700" title="TV"><Tv className="h-3 w-3" /></span>}
                  {group.roomType.hasMinibar && <span className="p-1 rounded bg-amber-100 text-amber-700" title="Minibar"><Coffee className="h-3 w-3" /></span>}
                  {group.roomType.hasBathtub && <span className="p-1 rounded bg-sky-100 text-sky-700" title="Bathtub"><Bath className="h-3 w-3" /></span>}
                </div>
                <div className="flex items-end justify-between pt-2 border-t border-slate-100">
                  <div>
                    <div className="text-2xl font-extrabold text-emerald-700 tabular-nums leading-none">
                      {formatPKR(group.roomType.basePrice)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold">per night</div>
                  </div>
                  <button onClick={() => addRoom(group)}
                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 text-white text-xs font-extrabold inline-flex items-center gap-1 hover:shadow-lg">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
                {group.rooms && group.rooms.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[9px] uppercase font-extrabold text-slate-500 mb-1">Available Rooms</div>
                    <div className="flex flex-wrap gap-1">
                      {group.rooms.slice(0, 6).map((r: any) => (
                        <button key={r.id} onClick={() => addRoom(group, r)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 text-[10px] font-extrabold font-mono">
                          {r.roomNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Rooms */}
        {selectedRooms.length > 0 && (
          <section className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 p-4">
            <h3 className="font-extrabold text-indigo-900 mb-3">Selected Rooms ({selectedRooms.length})</h3>
            <div className="space-y-2">
              {selectedRooms.map((room, i) => (
                <div key={i} className="rounded-xl bg-white border-2 border-indigo-200 p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900">{room.roomTypeName}</div>
                    {room.roomNumber && <div className="text-xs font-mono font-bold text-indigo-700">Room {room.roomNumber}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-emerald-700">{formatPKR(room.ratePerNight * nights)}</div>
                    <div className="text-[10px] text-slate-500">{nights} nights × {formatPKR(room.ratePerNight)}</div>
                  </div>
                  <button onClick={() => removeRoom(i)}
                    className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex items-center justify-end pt-4 border-t border-slate-200">
          <Button size="lg" disabled={!canProceedFromRooms} onClick={() => setScreen('guest')}
            className="bg-gradient-to-r from-indigo-600 to-purple-700">
            Next: Guest Info <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── SCREEN B: Guest Info ─────────────────────
  if (screen === 'guest') {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <button onClick={() => setScreen('rooms')} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" /> Back to Rooms
        </button>

        <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-purple-700 text-white p-6">
          <h2 className="text-2xl font-extrabold">Guest Information</h2>
          <p className="text-sm text-white/80 mt-1">Primary guest ke details</p>
        </section>

        <section className="rounded-2xl bg-white border-2 border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900">Primary Guest</h3>
            <button onClick={() => setShowGuestPicker(!showGuestPicker)}
              className="text-xs font-extrabold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
              <Search className="h-3 w-3" /> Search Existing
            </button>
          </div>

          {showGuestPicker && (
            <div className="rounded-xl border-2 border-indigo-300 bg-indigo-50/50 p-3 space-y-2">
              <input autoFocus value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)}
                placeholder="Search by name, phone..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-indigo-500" />
              <div className="max-h-52 overflow-y-auto space-y-1">
                {guests.map((g: any) => (
                  <button key={g.id} onClick={() => {
                    setSelectedGuest(g); setGuestId(g.id);
                    setGuestName(g.fullName); setGuestPhone(g.phone); setGuestEmail(g.email || '');
                    setShowGuestPicker(false);
                  }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-extrabold truncate">{g.fullName}</div>
                      <div className="text-[10px] text-slate-500 font-bold">{g.phone}</div>
                    </div>
                    {g.isVIP && <Star className="h-3 w-3 text-amber-500 fill-current" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Guest Name *</label>
              <input value={guestName} onChange={(e) => setGuestName(e.target.value)}
                placeholder="Full name"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Phone *</label>
              <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="03XX..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Email</label>
              <input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="email@example.com"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Total Adults</label>
              <input type="number" min="1" value={totalAdults} onChange={(e) => setTotalAdults(Number(e.target.value))}
                className="h-11 w-full rounded-xl border-2 border-blue-300 bg-blue-50 px-3 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-cyan-700 mb-1 block">Total Children</label>
              <input type="number" min="0" value={totalChildren} onChange={(e) => setTotalChildren(Number(e.target.value))}
                className="h-11 w-full rounded-xl border-2 border-cyan-300 bg-cyan-50 px-3 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-cyan-500" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white border-2 border-slate-200 p-5 space-y-3">
          <h3 className="font-extrabold text-slate-900">Booking Details</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Source</label>
              <div className="grid grid-cols-3 gap-1">
                {SOURCES.map((s) => (
                  <button key={s.value} onClick={() => setSource(s.value)}
                    className={`p-2 rounded-lg border-2 text-center transition ${
                      source === s.value ? 'border-indigo-500 bg-indigo-50 shadow' : 'border-slate-200 bg-white hover:border-indigo-300'
                    }`}>
                    <div className="text-xl">{s.emoji}</div>
                    <div className="text-[9px] font-extrabold">{s.label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Meal Plan</label>
              <select value={mealPlan} onChange={(e) => setMealPlan(e.target.value as MealPlan)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-indigo-500">
                {MEAL_PLANS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <textarea rows={2} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)}
            placeholder="Special requests..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-indigo-500 resize-none" />
        </section>

        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={() => setScreen('rooms')}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button size="lg" disabled={!canProceedFromGuest} onClick={() => setScreen('summary')}
            className="bg-gradient-to-r from-indigo-600 to-purple-700">
            Next: Summary <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── SCREEN C: Summary + Payment ──────────────
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <button onClick={() => setScreen('guest')} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4" /> Back to Guest Info
      </button>

      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6">
        <h2 className="text-2xl font-extrabold">Booking Summary</h2>
        <p className="text-sm text-white/80 mt-1">Final review aur payment</p>
      </section>

      <section className="rounded-2xl bg-white border-2 border-slate-200 p-5 space-y-2">
        <h3 className="font-extrabold text-slate-900">Guest & Stay</h3>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <div><span className="text-slate-500 font-semibold">Guest:</span> <strong>{guestName}</strong></div>
          <div><span className="text-slate-500 font-semibold">Phone:</span> <strong>{guestPhone}</strong></div>
          <div><span className="text-slate-500 font-semibold">Check-in:</span> <strong>{checkInDate}</strong></div>
          <div><span className="text-slate-500 font-semibold">Check-out:</span> <strong>{checkOutDate}</strong></div>
          <div><span className="text-slate-500 font-semibold">Nights:</span> <strong>{nights}</strong></div>
          <div><span className="text-slate-500 font-semibold">Guests:</span> <strong>{totalAdults} adults + {totalChildren} children</strong></div>
        </div>
      </section>

      <section className="rounded-2xl bg-white border-2 border-slate-200 p-5 space-y-2">
        <h3 className="font-extrabold text-slate-900">Rooms ({selectedRooms.length})</h3>
        {selectedRooms.map((room, i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="font-extrabold text-slate-900 text-sm">{room.roomTypeName}</div>
              {room.roomNumber && <div className="text-[10px] font-mono text-slate-600">Room {room.roomNumber}</div>}
            </div>
            <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(room.ratePerNight * nights)}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl bg-white border-2 border-slate-200 p-5 space-y-3">
        <h3 className="font-extrabold text-slate-900">Charges & Payment</h3>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Tax %</label>
            <input type="number" value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value))}
              className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Service %</label>
            <input type="number" value={serviceChargePct} onChange={(e) => setServiceChargePct(Number(e.target.value))}
              className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Discount</label>
            <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))}
              className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-slate-950 to-emerald-900 text-white p-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-white/70">Room Total ({nights} nights)</span><span className="font-bold tabular-nums">{formatPKR(roomTotal)}</span></div>
          {svc > 0 && <div className="flex justify-between"><span className="text-white/70">Service ({serviceChargePct}%)</span><span className="font-bold tabular-nums">{formatPKR(svc)}</span></div>}
          {tax > 0 && <div className="flex justify-between"><span className="text-white/70">Tax ({taxPct}%)</span><span className="font-bold tabular-nums">{formatPKR(tax)}</span></div>}
          {Number(discount) > 0 && <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(Number(discount))}</span></div>}
          <div className="pt-2 border-t border-white/20 flex justify-between items-center">
            <span className="text-lg font-extrabold text-emerald-300">GRAND TOTAL</span>
            <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(grandTotal)}</span>
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Advance Payment</label>
          <input type="number" value={advancePaid} onChange={(e) => setAdvancePaid(Number(e.target.value))}
            placeholder="0"
            className="h-12 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-lg font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          {balance > 0 && (
            <div className="mt-2 text-xs font-extrabold text-amber-700">
              Balance to collect on check-out: {formatPKR(balance)}
            </div>
          )}
        </div>
      </section>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button variant="secondary" onClick={() => setScreen('guest')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button size="lg" onClick={() => createBookingMutation.mutate()}
          loading={createBookingMutation.isPending}
          className="bg-gradient-to-r from-emerald-600 to-teal-700">
          <CheckCircle2 className="h-4 w-4" />
          Confirm Booking
        </Button>
      </div>
    </div>
  );
}
