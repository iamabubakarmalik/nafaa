import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, LogIn, LogOut, X, Sparkles, User, Phone, Mail, Calendar,
  Bed, DollarSign, CheckCircle2, Ban, Printer, Plus, Users,
} from 'lucide-react';
import { bookingsApi, type BookingStatus } from '../api/bookings.api';
import { folioApi, type FolioChargeType } from '../api/folio.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_COLORS: Record<BookingStatus, string> = {
  INQUIRY: 'bg-slate-500', QUOTED: 'bg-cyan-500', TENTATIVE: 'bg-amber-500',
  CONFIRMED: 'bg-blue-500', CHECKED_IN: 'bg-emerald-600', CHECKED_OUT: 'bg-slate-600',
  NO_SHOW: 'bg-orange-600', CANCELLED: 'bg-rose-500', EXTENDED: 'bg-violet-500',
};

const CHARGE_TYPES: FolioChargeType[] = ['ROOM', 'FOOD', 'BEVERAGE', 'LAUNDRY', 'SPA', 'MINIBAR', 'TELEPHONE', 'INTERNET', 'PARKING', 'MISCELLANEOUS'];

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [showFolio, setShowFolio] = useState(false);
  const [showExtend, setShowExtend] = useState(false);

  const { data: booking, isLoading, refetch } = useQuery({
    queryKey: ['hotel-booking', id],
    queryFn: () => bookingsApi.getOne(id!),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  const checkInMutation = useMutation({
    mutationFn: () => bookingsApi.checkIn(id!),
    onSuccess: () => { toast.success('Checked in'); refetch(); queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const checkOutMutation = useMutation({
    mutationFn: () => bookingsApi.checkOut(id!),
    onSuccess: () => { toast.success('Checked out'); refetch(); queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => bookingsApi.updateStatus(id!, 'CANCELLED', reason),
    onSuccess: () => { toast.success('Cancelled'); refetch(); },
  });

  if (isLoading || !booking) {
    return <div className="h-64 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-800 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/hotel/bookings')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                {booking.bookingNumber}
              </div>
              <h1 className="mt-1 text-3xl font-extrabold">{booking.guestName}</h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-sm">
                <span className={'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase text-white ' + STATUS_COLORS[booking.status]}>
                  {booking.status.replace('_', ' ')}
                </span>
                <span className="text-white/80 font-semibold inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(booking.checkInDate), 'dd MMM')} → {format(new Date(booking.checkOutDate), 'dd MMM')} • {booking.nights} nights
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <Printer className="h-4 w-4" />
              Print
            </button>
            {booking.status === 'CONFIRMED' && (
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => checkInMutation.mutate()} loading={checkInMutation.isPending}>
                <LogIn className="h-4 w-4" />
                Check In
              </Button>
            )}
            {booking.status === 'CHECKED_IN' && (
              <>
                <Button variant="secondary" onClick={() => setShowExtend(true)} className="bg-white/15 hover:bg-white/25 text-white border-white/20">
                  <Calendar className="h-4 w-4" />
                  Extend
                </Button>
                <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => checkOutMutation.mutate()} loading={checkOutMutation.isPending} disabled={booking.balanceAmount > 0}>
                  <LogOut className="h-4 w-4" />
                  Check Out
                </Button>
              </>
            )}
            {['CONFIRMED', 'TENTATIVE'].includes(booking.status) && (
              <Button variant="secondary" onClick={() => {
                const reason = prompt('Cancellation reason?');
                if (reason) cancelMutation.mutate(reason);
              }} className="bg-white/15 hover:bg-white/25 text-white border-white/20">
                <Ban className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <section className="space-y-4">
          {/* Guest info */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              Guest Information
            </h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-slate-500">Name</div>
                <div className="font-extrabold">{booking.guestName}</div>
              </div>
              {booking.guestPhone && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-500">Phone</div>
                  <a href={'tel:' + booking.guestPhone} className="font-extrabold text-blue-700 hover:underline">{booking.guestPhone}</a>
                </div>
              )}
              {booking.guestEmail && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-500">Email</div>
                  <a href={'mailto:' + booking.guestEmail} className="font-extrabold text-blue-700 hover:underline">{booking.guestEmail}</a>
                </div>
              )}
              <div>
                <div className="text-[10px] uppercase font-extrabold text-slate-500">Guests</div>
                <div className="font-extrabold">{booking.totalAdults} Adults, {booking.totalChildren} Children</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-extrabold text-slate-500">Meal Plan</div>
                <div className="font-extrabold">{booking.mealPlan.replace('_', ' ')}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-extrabold text-slate-500">Source</div>
                <div className="font-extrabold">{booking.source.replace('_', ' ')}</div>
              </div>
            </div>
          </div>

          {/* Rooms */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Bed className="h-5 w-5 text-indigo-600" />
                Rooms
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-extrabold">{booking.bookedRooms.length}</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              {booking.bookedRooms.map((br: any) => (
                <div key={br.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {br.roomType?.name} {br.room?.roomNumber && '• Room ' + br.room.roomNumber}
                      </div>
                      <div className="text-xs text-slate-600 font-bold">
                        {br.adults} adults, {br.children} children{br.extraBeds > 0 && ', ' + br.extraBeds + ' extra bed'}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold">
                        {formatPKR(br.ratePerNight)}/night × {br.totalNights} nights
                      </div>
                    </div>
                    <div className="text-right">
                      {br.discount > 0 && (
                        <div className="text-[10px] font-bold text-rose-700">-{formatPKR(br.discount)}</div>
                      )}
                      <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(br.totalAmount - br.discount)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Folio */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  Folio Charges
                </h3>
                <p className="text-xs text-slate-500 font-semibold">Room service, F&B, extras</p>
              </div>
              {booking.status === 'CHECKED_IN' && (
                <Button size="sm" onClick={() => setShowFolio(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Charge
                </Button>
              )}
            </div>
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              {(!booking.folioCharges || booking.folioCharges.length === 0) ? (
                <div className="py-8 text-center text-sm text-slate-500 font-semibold">No extra charges</div>
              ) : (
                booking.folioCharges.map((c: any) => (
                  <div key={c.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold">{c.description}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 text-[9px] font-extrabold uppercase">{c.chargeType}</span>
                      </div>
                      <div className="text-[10px] font-mono font-bold text-slate-500">{c.chargeNumber} • {format(new Date(c.chargeDate), 'dd MMM HH:mm')}</div>
                    </div>
                    <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(c.totalAmount)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {booking.specialRequests && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 p-4">
              <div className="text-sm font-extrabold text-amber-900 mb-1">Special Requests</div>
              <p className="text-sm italic text-amber-800">{booking.specialRequests}</p>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-blue-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">💰 Bill Summary</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Room Total</span><span className="font-bold tabular-nums">{formatPKR(booking.roomTotal)}</span></div>
                {booking.extraCharges > 0 && <div className="flex justify-between"><span className="text-white/70">Extras</span><span className="font-bold tabular-nums">{formatPKR(booking.extraCharges)}</span></div>}
                {booking.taxAmount > 0 && <div className="flex justify-between"><span className="text-white/70">Tax</span><span className="font-bold tabular-nums">{formatPKR(booking.taxAmount)}</span></div>}
                {booking.serviceCharge > 0 && <div className="flex justify-between"><span className="text-white/70">Service</span><span className="font-bold tabular-nums">{formatPKR(booking.serviceCharge)}</span></div>}
                {booking.discount > 0 && <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(booking.discount)}</span></div>}
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(booking.grandTotal)}</span>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-white/70">Paid</span><span className="font-extrabold text-emerald-300 tabular-nums">{formatPKR(booking.paidAmount)}</span></div>
                {booking.balanceAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-amber-300 font-extrabold">Balance</span>
                    <span className="font-extrabold text-amber-300 tabular-nums">{formatPKR(booking.balanceAmount)}</span>
                  </div>
                )}
              </div>
              {booking.balanceAmount > 0 && booking.status !== 'CANCELLED' && (
                <Button size="lg" className="w-full mt-4 bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowPayment(true)}>
                  <DollarSign className="h-4 w-4" />
                  Collect Payment
                </Button>
              )}
              {booking.balanceAmount <= 0.01 && (
                <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/30 text-emerald-200 text-xs font-extrabold">
                  <CheckCircle2 className="h-3 w-3" />
                  PAID IN FULL
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {showPayment && (
        <PaymentModal bookingId={id!} balance={booking.balanceAmount} onClose={() => setShowPayment(false)} onDone={() => { setShowPayment(false); refetch(); }} />
      )}
      {showFolio && (
        <FolioModal bookingId={id!} onClose={() => setShowFolio(false)} onDone={() => { setShowFolio(false); refetch(); }} />
      )}
      {showExtend && (
        <ExtendModal bookingId={id!} currentCheckOut={booking.checkOutDate} onClose={() => setShowExtend(false)} onDone={() => { setShowExtend(false); refetch(); }} />
      )}
    </div>
  );
}

function PaymentModal({ bookingId, balance, onClose, onDone }: any) {
  const [amount, setAmount] = useState(balance);
  const payMutation = useMutation({
    mutationFn: () => bookingsApi.addPayment(bookingId, amount),
    onSuccess: () => { toast.success('Payment recorded'); onDone(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-emerald-50 flex items-center justify-between">
          <h3 className="font-extrabold">Collect Payment</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Amount</label>
            <input type="number" autoFocus value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-emerald-600" onClick={() => payMutation.mutate()} loading={payMutation.isPending} disabled={amount <= 0}>
              <CheckCircle2 className="h-4 w-4" />
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FolioModal({ bookingId, onClose, onDone }: any) {
  const [form, setForm] = useState<any>({
    chargeType: 'FOOD',
    description: '',
    quantity: 1,
    unitPrice: 0,
    taxAmount: 0,
    discount: 0,
  });

  const addMutation = useMutation({
    mutationFn: () => folioApi.addCharge({ bookingId, ...form, quantity: Number(form.quantity) || 1, unitPrice: Number(form.unitPrice) || 0, taxAmount: Number(form.taxAmount) || 0, discount: Number(form.discount) || 0 }),
    onSuccess: () => { toast.success('Charge added'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const total = ((Number(form.quantity) || 1) * (Number(form.unitPrice) || 0)) + (Number(form.taxAmount) || 0) - (Number(form.discount) || 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-blue-50 flex items-center justify-between">
          <h3 className="font-extrabold">Add Folio Charge</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <select value={form.chargeType} onChange={(e) => setForm({ ...form, chargeType: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
            {CHARGE_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input autoFocus value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description *" className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Qty" className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
            <input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} placeholder="Price" className="h-11 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-emerald-500" />
            <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="Disc" className="h-11 rounded-xl border-2 border-rose-200 bg-rose-50 px-3 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-rose-500" />
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <div className="text-xs font-bold text-slate-500">Total</div>
            <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(total)}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-blue-600" onClick={() => addMutation.mutate()} loading={addMutation.isPending} disabled={!form.description || total <= 0}>
              Add Charge
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExtendModal({ bookingId, currentCheckOut, onClose, onDone }: any) {
  const [newDate, setNewDate] = useState('');
  const extendMutation = useMutation({
    mutationFn: () => bookingsApi.extend(bookingId, newDate),
    onSuccess: () => { toast.success('Extended'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-violet-50 flex items-center justify-between">
          <h3 className="font-extrabold">Extend Stay</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="text-xs text-slate-600">Current checkout: <span className="font-extrabold">{format(new Date(currentCheckOut), 'dd MMM yyyy')}</span></div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-violet-700 mb-1 block">New Check-out Date *</label>
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} min={currentCheckOut.slice(0, 10)} className="h-11 w-full rounded-xl border-2 border-violet-300 bg-violet-50 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-violet-600" onClick={() => extendMutation.mutate()} loading={extendMutation.isPending} disabled={!newDate}>
              <Calendar className="h-4 w-4" />
              Extend
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
