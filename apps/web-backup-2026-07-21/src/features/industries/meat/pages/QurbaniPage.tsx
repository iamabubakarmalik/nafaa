import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Heart, Plus, Search, X, Save, RefreshCw, Sparkles, User, Phone,
  Calendar, DollarSign, CheckCircle2, Ban, Home,
} from 'lucide-react';
import { qurbaniApi, type QurbaniBooking } from '../api/qurbani.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const OCCASIONS = [
  { value: 'QURBANI', label: '🌙 Qurbani (Eid ul Adha)' },
  { value: 'AQEEQA', label: '👶 Aqeeqa' },
  { value: 'SADQA', label: '🤲 Sadqa' },
  { value: 'MANNAT', label: '🕌 Mannat' },
];

const ANIMAL_TYPES = [
  { value: 'BEEF', label: 'Cow', emoji: '🐄', shares: 7 },
  { value: 'BUFFALO', label: 'Buffalo', emoji: '🐃', shares: 7 },
  { value: 'GOAT', label: 'Goat', emoji: '🐐', shares: 1 },
  { value: 'MUTTON', label: 'Sheep', emoji: '🐑', shares: 1 },
  { value: 'LAMB', label: 'Lamb', emoji: '🐏', shares: 1 },
  { value: 'CAMEL', label: 'Camel', emoji: '🐫', shares: 7 },
];

export default function QurbaniPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [showForm, setShowForm] = useState(false);

  const { data: bookings = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['qurbani-bookings', statusFilter, search],
    queryFn: () => qurbaniApi.list({
      status: statusFilter === 'active' || statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
  });

  const filtered = statusFilter === 'active'
    ? bookings.filter((b) => !['CANCELLED', 'DELIVERED'].includes(b.status))
    : bookings;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-fuchsia-900 to-purple-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Religious Bookings
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🌙 Qurbani & Aqeeqa</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Eid ul Adha, Aqeeqa, Sadqa bookings</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search booking #, customer name, phone..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-fuchsia-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['active', 'all', 'BOOKED', 'CONFIRMED', 'SLAUGHTERED', 'DELIVERED', 'CANCELLED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s === 'active' ? '🔥 Active' : s === 'all' ? 'All' : s}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <QurbaniForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['qurbani-bookings'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-48 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Heart className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No bookings yet</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 gap-3">
          {filtered.map((b) => <BookingCard key={b.id} booking={b} />)}
        </section>
      )}
    </div>
  );
}

function BookingCard({ booking }: { booking: QurbaniBooking }) {
  const animal = ANIMAL_TYPES.find((a) => a.value === booking.animalType);
  const remaining = (booking.finalPrice || 0) - booking.paidAmount;

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white flex items-center justify-center shadow shrink-0 text-3xl">
            {animal?.emoji || '🐐'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{booking.bookingNumber}</span>
              <span className="px-2 py-0.5 rounded-full bg-fuchsia-500 text-white text-[9px] font-extrabold uppercase">{booking.status}</span>
              <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/40 text-purple-700 text-[9px] font-extrabold uppercase">{booking.occasion}</span>
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">{booking.customerName}</div>
            <div className="text-xs text-slate-600 font-semibold inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {booking.customerPhone}
            </div>
            {booking.shareCount > 1 && (
              <div className="mt-1 text-xs font-extrabold text-fuchsia-700">
                Share {booking.shareNumber || 1} of {booking.shareCount}
              </div>
            )}
          </div>
        </div>
      </div>

      {booking.slaughterDate && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-2 text-xs">
          <div className="text-[10px] uppercase font-extrabold text-amber-700">Slaughter Date</div>
          <div className="font-extrabold text-amber-900">
            {format(new Date(booking.slaughterDate), 'dd MMM yyyy')}
            {booking.slaughterDay && ' (Day ' + booking.slaughterDay + ')'}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <div className="text-xs">
          <span className="text-slate-500 font-semibold">Deliver:</span>{' '}
          <span className="font-extrabold">
            {booking.wantsMeatDelivery ? (booking.deliveryPreference === 'SELF_PICKUP' ? '🚶 Pickup' : '🚚 Deliver') : '❌ No'}
          </span>
        </div>
        <div className="text-xs">
          <span className="text-slate-500 font-semibold">Skin:</span>{' '}
          <span className="font-extrabold">{booking.wantsSkin ? '✅' : '❌'}</span>
          <span className="ml-2 text-slate-500 font-semibold">Offal:</span>{' '}
          <span className="font-extrabold">{booking.wantsOffal ? '✅' : '❌'}</span>
        </div>
      </div>

      {booking.needsCharityShare && booking.charityShareKg && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 p-2 text-xs">
          <div className="font-extrabold text-emerald-800">🎁 Charity: {booking.charityShareKg}kg to {booking.charityRecipient || 'unknown'}</div>
        </div>
      )}

      <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-end justify-between">
        <div>
          <div className="text-[10px] font-extrabold text-emerald-700">Paid: {formatPKR(booking.paidAmount)}</div>
          {remaining > 0 && (
            <div className="text-[10px] font-extrabold text-amber-700">Due: {formatPKR(remaining)}</div>
          )}
        </div>
        <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(booking.finalPrice || booking.advanceAmount)}</div>
      </div>
    </div>
  );
}

function QurbaniForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    customerName: '',
    customerPhone: '',
    customerCnic: '',
    customerAddress: '',
    occasion: 'QURBANI',
    animalType: 'GOAT',
    animalPreference: '',
    shareCount: 1,
    shareNumber: 1,
    advanceAmount: 0,
    finalPrice: '',
    slaughterDate: '',
    slaughterDay: '',
    wantsMeatDelivery: true,
    deliveryPreference: 'SELF_PICKUP',
    deliveryAddress: '',
    needsCharityShare: false,
    charityShareKg: '',
    charityRecipient: '',
    cuttingStyle: '',
    packagingCount: '',
    wantsSkin: false,
    wantsOffal: true,
    specialInstructions: '',
  });

  const saveMutation = useMutation({
    mutationFn: () => qurbaniApi.create({
      ...form,
      advanceAmount: Number(form.advanceAmount) || 0,
      finalPrice: form.finalPrice ? Number(form.finalPrice) : undefined,
      shareCount: Number(form.shareCount) || 1,
      shareNumber: form.shareCount > 1 ? Number(form.shareNumber) || 1 : undefined,
      slaughterDay: form.slaughterDay ? Number(form.slaughterDay) : undefined,
      charityShareKg: form.charityShareKg ? Number(form.charityShareKg) : undefined,
      packagingCount: form.packagingCount ? Number(form.packagingCount) : undefined,
    }),
    onSuccess: () => { toast.success('Booking created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const selectedAnimal = ANIMAL_TYPES.find((a) => a.value === form.animalType);
  const maxShares = selectedAnimal?.shares ?? 1;

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-fuchsia-300 dark:border-fuchsia-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-fuchsia-50 dark:bg-fuchsia-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">🌙 New Qurbani/Aqeeqa Booking</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Customer */}
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
          <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
          <input value={form.customerCnic} onChange={(e) => setForm({ ...form, customerCnic: e.target.value })} placeholder="CNIC" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-fuchsia-500" />
          <textarea rows={1} value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} placeholder="Address" className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-fuchsia-500 resize-none" />
        </div>

        {/* Occasion + Animal */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Occasion *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {OCCASIONS.map((o) => (
              <button key={o.value} onClick={() => setForm({ ...form, occasion: o.value })} className={
                'p-3 rounded-xl border-2 text-xs font-extrabold transition ' +
                (form.occasion === o.value ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-fuchsia-300')
              }>{o.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Animal *</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ANIMAL_TYPES.map((a) => (
              <button key={a.value} onClick={() => setForm({ ...form, animalType: a.value, shareCount: a.shares > 1 ? form.shareCount : 1 })} className={
                'p-3 rounded-xl border-2 text-center transition ' +
                (form.animalType === a.value ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-fuchsia-300')
              }>
                <div className="text-3xl mb-1">{a.emoji}</div>
                <div className="text-[10px] font-extrabold">{a.label}</div>
                <div className="text-[9px] font-bold text-slate-500">Up to {a.shares} shares</div>
              </button>
            ))}
          </div>
        </div>

        <input value={form.animalPreference} onChange={(e) => setForm({ ...form, animalPreference: e.target.value })} placeholder="Animal preference (e.g. white color, healthy, 2-year old)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />

        {/* Shares */}
        {maxShares > 1 && (
          <div className="rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 p-4">
            <div className="text-sm font-extrabold text-purple-900 mb-2">Share Details</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-extrabold text-purple-700 mb-1 block">Total Shares (max {maxShares})</label>
                <input type="number" min="1" max={maxShares} value={form.shareCount} onChange={(e) => setForm({ ...form, shareCount: e.target.value })} className="h-11 w-full rounded-xl border-2 border-purple-300 bg-white dark:bg-purple-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-purple-700 mb-1 block">This customer takes</label>
                <input type="number" min="1" value={form.shareNumber} onChange={(e) => setForm({ ...form, shareNumber: e.target.value })} className="h-11 w-full rounded-xl border-2 border-purple-300 bg-white dark:bg-purple-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Pricing + Date */}
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Advance (Rs)</label>
            <input type="number" value={form.advanceAmount} onChange={(e) => setForm({ ...form, advanceAmount: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Final Price</label>
            <input type="number" value={form.finalPrice} onChange={(e) => setForm({ ...form, finalPrice: e.target.value })} placeholder="TBD" className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Slaughter Date</label>
            <input type="date" value={form.slaughterDate} onChange={(e) => setForm({ ...form, slaughterDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
          </div>
        </div>

        {/* Delivery */}
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.wantsMeatDelivery} onChange={(e) => setForm({ ...form, wantsMeatDelivery: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold text-blue-900">Wants meat delivered</span>
          </label>
          {form.wantsMeatDelivery && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: 'SELF_PICKUP', label: '🚶 Self Pickup' },
                  { v: 'HOME_DELIVERY', label: '🚚 Home Delivery' },
                ].map((d) => (
                  <button key={d.v} onClick={() => setForm({ ...form, deliveryPreference: d.v })} className={
                    'p-2 rounded-lg border-2 text-sm font-extrabold ' +
                    (form.deliveryPreference === d.v ? 'border-blue-500 bg-white dark:bg-blue-950/40' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800')
                  }>{d.label}</button>
                ))}
              </div>
              {form.deliveryPreference === 'HOME_DELIVERY' && (
                <textarea rows={2} value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} placeholder="Delivery address" className="w-full rounded-lg border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />
              )}
            </>
          )}
        </div>

        {/* Charity */}
        <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.needsCharityShare} onChange={(e) => setForm({ ...form, needsCharityShare: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold text-emerald-900">🎁 Include charity share</span>
          </label>
          {form.needsCharityShare && (
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={form.charityShareKg} onChange={(e) => setForm({ ...form, charityShareKg: e.target.value })} placeholder="Kg for charity" className="h-10 rounded-lg border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
              <input value={form.charityRecipient} onChange={(e) => setForm({ ...form, charityRecipient: e.target.value })} placeholder="Recipient (poor, madrasa...)" className="h-10 rounded-lg border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            </div>
          )}
        </div>

        {/* Preferences */}
        <div className="grid grid-cols-2 gap-2">
          <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.wantsSkin ? 'border-amber-500 bg-amber-50' : 'border-slate-200 dark:border-neutral-700')}>
            <input type="checkbox" checked={form.wantsSkin} onChange={(e) => setForm({ ...form, wantsSkin: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold">Wants skin (khaal)</span>
          </label>
          <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.wantsOffal ? 'border-amber-500 bg-amber-50' : 'border-slate-200 dark:border-neutral-700')}>
            <input type="checkbox" checked={form.wantsOffal} onChange={(e) => setForm({ ...form, wantsOffal: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold">Wants offal (kaleji, paye)</span>
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.cuttingStyle} onChange={(e) => setForm({ ...form, cuttingStyle: e.target.value })} placeholder="Cutting style" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
          <input type="number" value={form.packagingCount} onChange={(e) => setForm({ ...form, packagingCount: e.target.value })} placeholder="Number of packets" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-fuchsia-500" />
        </div>

        <textarea rows={2} value={form.specialInstructions} onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })} placeholder="Special instructions..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-fuchsia-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-fuchsia-600 to-purple-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.customerName || !form.customerPhone}>
            <Save className="h-4 w-4" />
            Book Qurbani
          </Button>
        </div>
      </div>
    </section>
  );
}
