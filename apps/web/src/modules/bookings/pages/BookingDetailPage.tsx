import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, User, Phone, Calendar, Clock, Package,
  DollarSign, Wallet, X, CheckCircle2,
  XCircle, RefreshCw, Plus, AlertTriangle,
  Hourglass, Zap, MessageSquare, EyeOff,
  ArrowRight, CreditCard, Building2, Smartphone, Banknote,
  Trash2, Receipt, ShoppingCart, Layers, Scissors,
  GraduationCap, Printer, Copy, Share2, Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import { bookingsApi, type BookingStatus } from '@modules/bookings/api/bookings.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA BOOKING DETAIL — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 Universal — jeweler, tailor, mobile, carpet, electronics
   🌙 Dark mode complete
   🎓 Teacher modal — status flow & actions guide
   ⌨️  P = Pay • C = Convert • X = Cancel • Esc = close
   🖨️ Print receipt • 📋 Copy booking # • 📱 WhatsApp share
   ⚠️ Overdue banner • Countdown to pickup
   ═════════════════════════════════════════════════════════════ */

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const formatShort = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(new Date(v));

const statusConfig: Record<BookingStatus, { label: string; color: string; bg: string; icon: any; hint: string }> = {
  PENDING:           { label: 'Pending',      color: '#64748b', bg: 'from-slate-500 to-slate-700',    icon: Hourglass,     hint: 'Abhi tak koi payment nahi' },
  ADVANCE_PAID:      { label: 'Advance Paid', color: '#f59e0b', bg: 'from-amber-500 to-orange-600',   icon: Wallet,        hint: 'Token mila, kaam chal raha' },
  READY_FOR_PICKUP:  { label: 'Ready',        color: '#3b82f6', bg: 'from-blue-500 to-blue-700',      icon: Zap,           hint: 'Item tayyar, pickup ka intezaar' },
  CONVERTED:         { label: 'Converted',    color: '#10b981', bg: 'from-emerald-500 to-green-700',  icon: CheckCircle2,  hint: 'Sale ban gayi ✅' },
  CANCELLED:         { label: 'Cancelled',    color: '#ef4444', bg: 'from-rose-500 to-red-700',       icon: XCircle,       hint: 'Booking cancel ho gayi' },
  EXPIRED:           { label: 'Expired',      color: '#dc2626', bg: 'from-red-600 to-red-800',        icon: AlertTriangle, hint: 'Pickup date nikal gayi' },
};

const paymentIcons: Record<string, any> = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone, EASYPAISA: Zap, BANK_TRANSFER: Building2,
};

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundAdvance, setRefundAdvance] = useState(true);
  const [showConvert, setShowConvert] = useState(false);
  const [additionalPayment, setAdditionalPayment] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.getOne(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['booking', id] });
    queryClient.invalidateQueries({ queryKey: ['bookings-list'] });
    queryClient.invalidateQueries({ queryKey: ['bookings-summary'] });
  };

  const addPaymentMutation = useMutation({
    mutationFn: (payload: any) => bookingsApi.addPayment(id!, payload),
    onSuccess: () => {
      toast.success('Payment added');
      setShowAddPayment(false);
      setPaymentAmount('');
      setPaymentNotes('');
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: (payload: any) => bookingsApi.cancel(id!, payload),
    onSuccess: () => {
      toast.success('Booking cancelled');
      setShowCancel(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const convertMutation = useMutation({
    mutationFn: (payload: any) => bookingsApi.convert(id!, payload),
    onSuccess: (data) => {
      toast.success(`Sale ${data.sale.saleNumber} created`);
      setShowConvert(false);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigate(`/sales/${data.sale.id}/receipt`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const removeMutation = useMutation({
    mutationFn: () => bookingsApi.remove(id!),
    onSuccess: () => {
      toast.success('Booking deleted');
      navigate('/bookings');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  // Countdown / overdue calculation
  const pickupInfo = useMemo(() => {
    if (!booking?.expectedPickupAt) return null;
    const pickup = new Date(booking.expectedPickupAt).getTime();
    const now = Date.now();
    const diffMs = pickup - now;
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return {
      days,
      isOverdue: diffMs < 0 && !['CONVERTED', 'CANCELLED', 'EXPIRED'].includes(booking.status),
      isSoon: diffMs >= 0 && diffMs <= 3 * 24 * 60 * 60 * 1000 && !['CONVERTED', 'CANCELLED', 'EXPIRED'].includes(booking.status),
    };
  }, [booking]);

  const canPay = booking && ['PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP'].includes(booking.status) && booking.balanceDue > 0;
  const canConvert = booking && ['PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP'].includes(booking.status);
  const canCancel = booking && !['CONVERTED', 'CANCELLED', 'EXPIRED'].includes(booking.status);
  const canDelete = booking && ['CANCELLED', 'EXPIRED'].includes(booking.status);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddPayment) return setShowAddPayment(false);
        if (showCancel) return setShowCancel(false);
        if (showConvert) return setShowConvert(false);
        if (showTeacher) return setShowTeacher(false);
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (showAddPayment || showCancel || showConvert || showTeacher) return;

      const k = e.key.toLowerCase();
      if (k === 'p' && canPay) { e.preventDefault(); setShowAddPayment(true); }
      if (k === 'c' && canConvert) { e.preventDefault(); setShowConvert(true); }
      if (k === 'x' && canCancel) { e.preventDefault(); setShowCancel(true); }
      if (k === 'g') { e.preventDefault(); setShowTeacher(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAddPayment, showCancel, showConvert, showTeacher, canPay, canConvert, canCancel]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = (showAddPayment || showCancel || showConvert || showTeacher) ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showAddPayment, showCancel, showConvert, showTeacher]);

  const copyBookingNumber = () => {
    if (!booking) return;
    navigator.clipboard.writeText(booking.bookingNumber);
    toast.success(`Copied: ${booking.bookingNumber}`);
  };

  const shareWhatsApp = () => {
    if (!booking) return;
    const phone = booking.customer?.phone?.replace(/\D/g, '');
    if (!phone) return toast.error('Customer ka phone nahi hai');
    const msg = encodeURIComponent(
      `Assalam-o-Alaikum ${booking.customer?.name}!\n\n` +
      `Booking *${booking.bookingNumber}*:\n` +
      `• Total: ${formatPKR(booking.total)}\n` +
      `• Advance paid: ${formatPKR(booking.totalPaid)}\n` +
      `• Balance due: ${formatPKR(booking.balanceDue)}\n` +
      (booking.expectedPickupAt ? `• Pickup: ${formatShort(booking.expectedPickupAt)}\n` : '') +
      `\n${tenantName || ''}${shopName ? ` — ${shopName}` : ''}`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-blue-200 dark:border-blue-500/30 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-12 text-center">
        <div className="mx-auto h-16 w-16 rounded-3xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
        </div>
        <h3 className="mt-4 font-extrabold text-slate-900 dark:text-white">Booking not found</h3>
        <Link to="/bookings" className="mt-4 inline-block text-blue-600 dark:text-blue-400 font-bold hover:underline">
          ← Back to bookings
        </Link>
      </div>
    );
  }

  const cfg = statusConfig[booking.status];
  const StatusIcon = cfg.icon;

  return (
    <>
      {/* ═══ ADD PAYMENT MODAL ═══ */}
      {showAddPayment && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddPayment(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 text-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-lg inline-flex items-center gap-2">
                  <Wallet className="h-5 w-5" /> Add Payment
                </h3>
                <button onClick={() => setShowAddPayment(false)} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs mt-1 text-white/90 font-bold">Balance due: {formatPKR(booking.balanceDue)}</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs uppercase font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">Amount (PKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={booking.balanceDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  autoFocus
                  placeholder="0"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-lg font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                <div className="mt-1.5 flex gap-1 flex-wrap">
                  <button
                    onClick={() => setPaymentAmount(String(booking.balanceDue))}
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/30"
                  >
                    Full ({formatPKR(booking.balanceDue)})
                  </button>
                  <button
                    onClick={() => setPaymentAmount(String(Math.floor(booking.balanceDue / 2)))}
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    ½ Half
                  </button>
                  {[0.25, 0.75].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPaymentAmount(String(Math.round(booking.balanceDue * p)))}
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 inline-flex items-center gap-0.5"
                    >
                      <Percent className="h-2 w-2" />{(p * 100).toFixed(0)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="CASH">💵 Cash</option>
                  <option value="CARD">💳 Card</option>
                  <option value="JAZZCASH">📱 JazzCash</option>
                  <option value="EASYPAISA">📱 EasyPaisa</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">Note (optional)</label>
                <input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. transaction ID, bank name..."
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 font-extrabold h-12"
                onClick={() => {
                  const amt = Number(paymentAmount);
                  if (!(amt > 0)) return toast.error('Amount required');
                  if (amt > booking.balanceDue) return toast.error('Amount exceeds balance');
                  addPaymentMutation.mutate({ amount: amt, paymentMethod, notes: paymentNotes.trim() || undefined });
                }}
                loading={addPaymentMutation.isPending}
              >
                <CheckCircle2 className="h-4 w-4" /> Record Payment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CANCEL MODAL ═══ */}
      {showCancel && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCancel(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-rose-600 to-red-700 text-white p-5 flex items-center justify-between">
              <h3 className="font-extrabold text-lg inline-flex items-center gap-2">
                <XCircle className="h-5 w-5" /> Cancel Booking
              </h3>
              <button onClick={() => setShowCancel(false)} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900 dark:text-amber-200 font-bold">
                  Reserved items (rolls, IMEIs, cut pieces) wapis inventory me release ho jaenge.
                </div>
              </div>
              <div>
                <label className="text-xs uppercase font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">Reason</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder='"Customer mind change, refund"'
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              {booking.totalPaid > 0 && (
                <label className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-300 dark:border-emerald-500/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refundAdvance}
                    onChange={(e) => setRefundAdvance(e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-600"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                      Refund advance ({formatPKR(booking.totalPaid)})
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                      Customer ka paisa wapis
                    </div>
                  </div>
                </label>
              )}
              <Button
                className="w-full bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 font-extrabold h-12"
                onClick={() => cancelMutation.mutate({
                  reason: cancelReason.trim() || undefined,
                  refundAdvance,
                  refundMethod: booking.paymentMethod,
                })}
                loading={cancelMutation.isPending}
              >
                <XCircle className="h-4 w-4" /> Confirm Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CONVERT MODAL ═══ */}
      {showConvert && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowConvert(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 text-white p-5 flex items-center justify-between">
              <h3 className="font-extrabold text-lg inline-flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" /> Convert to Sale
              </h3>
              <button onClick={() => setShowConvert(false)} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-300 dark:border-emerald-500/40 p-3">
                <div className="text-xs text-emerald-900 dark:text-emerald-200 font-bold">
                  Sale banate hi items customer ke naam ho jaenge. Stock adjust ho ga.
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                <div>
                  <div className="text-[9px] uppercase font-extrabold text-slate-500 dark:text-slate-400">Total</div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(booking.total)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-extrabold text-emerald-700 dark:text-emerald-400">Paid</div>
                  <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(booking.totalPaid)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-extrabold text-amber-700 dark:text-amber-400">Balance</div>
                  <div className="text-sm font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">{formatPKR(booking.balanceDue)}</div>
                </div>
              </div>
              {booking.balanceDue > 0 && (
                <div>
                  <label className="text-xs uppercase font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">
                    Additional Payment (optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={booking.balanceDue}
                    value={additionalPayment}
                    onChange={(e) => setAdditionalPayment(e.target.value)}
                    placeholder="0"
                    className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-lg font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <div className="mt-1.5 flex gap-1 flex-wrap">
                    <button
                      onClick={() => setAdditionalPayment(String(booking.balanceDue))}
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/30"
                    >
                      Pay Full
                    </button>
                    <button
                      onClick={() => setAdditionalPayment('')}
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                      Skip (add to khata)
                    </button>
                  </div>
                </div>
              )}
              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 font-extrabold h-12"
                onClick={() => convertMutation.mutate({
                  additionalPayment: Number(additionalPayment) || 0,
                  paymentMethod: booking.paymentMethod,
                })}
                loading={convertMutation.isPending}
              >
                <ShoppingCart className="h-4 w-4" /> Complete Sale
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TEACHER ═══ */}
      {showTeacher && <BookingDetailTeacher onClose={() => setShowTeacher(false)} status={booking.status} />}

      <div className="space-y-5 pb-10 print:space-y-3">
        {/* PRINT HEADER */}
        <div className="hidden print:block">
          <div className="flex items-center justify-between border-b-4 border-blue-600 pb-3 mb-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">
                📚 {tenantName || 'My Store'} — Booking Receipt
              </h1>
              <p className="text-xs text-slate-600 font-semibold mt-1">
                {shopName ? `${shopName}  •  ` : ''}Booking: {booking.bookingNumber}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-500">Printed</div>
              <div className="text-xs font-bold text-slate-900">{new Date().toLocaleString('en-PK')}</div>
            </div>
          </div>
        </div>

        {/* Header nav */}
        <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
          <Link
            to="/bookings"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Bookings
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              onClick={copyBookingNumber}
              className="h-9 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
              title="Copy booking number"
            >
              <Copy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Copy #</span>
            </button>
            {booking.customer?.phone && (
              <button
                onClick={shareWhatsApp}
                className="h-9 px-3 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
                title="Share via WhatsApp"
              >
                <Share2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="h-9 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
            >
              <Printer className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={() => setShowTeacher(true)}
              className="h-9 px-3 rounded-lg bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
            >
              <GraduationCap className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Guide</span>
            </button>
          </div>
        </div>

        {/* Overdue / soon banner */}
        {pickupInfo?.isOverdue && (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-3 flex items-center gap-2 print:hidden">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <div className="flex-1 text-xs font-extrabold text-rose-800 dark:text-rose-200">
              ⚠️ Pickup date {Math.abs(pickupInfo.days)} din pehle thi — customer se raabta karo!
            </div>
            {booking.customer?.phone && (
              <button
                onClick={shareWhatsApp}
                className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold inline-flex items-center gap-1 transition"
              >
                <Phone className="h-3 w-3" /> Call
              </button>
            )}
          </div>
        )}
        {pickupInfo?.isSoon && !pickupInfo.isOverdue && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-3 flex items-center gap-2 print:hidden">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1 text-xs font-extrabold text-amber-800 dark:text-amber-200">
              ⏰ Pickup {pickupInfo.days === 0 ? 'aaj' : `${pickupInfo.days} din me`} — customer ko yaad karao
            </div>
          </div>
        )}

        {/* Hero */}
        <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${cfg.bg} text-white p-6 shadow-2xl`}>
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
          <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/25">
                <StatusIcon className="h-3 w-3" />
                {cfg.label}
                <span className="opacity-60 mx-0.5">•</span>
                <span className="opacity-90">{cfg.hint}</span>
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold font-mono">{booking.bookingNumber}</h1>
              <div className="mt-2 flex items-center gap-3 text-sm text-white/90 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <strong>{booking.customer?.name}</strong>
                </span>
                {booking.customer?.phone && (
                  <>
                    <span className="opacity-50">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {booking.customer.phone}
                    </span>
                  </>
                )}
                <span className="opacity-50">•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(booking.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap print:hidden">
              {canPay && (
                <Button
                  onClick={() => setShowAddPayment(true)}
                  className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold shadow-lg"
                >
                  <Plus className="h-4 w-4" /> Add Payment <Kbd>P</Kbd>
                </Button>
              )}
              {canConvert && (
                <Button
                  onClick={() => setShowConvert(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg font-extrabold"
                >
                  <ShoppingCart className="h-4 w-4" /> Convert to Sale <Kbd>C</Kbd>
                </Button>
              )}
              {canCancel && (
                <button
                  onClick={() => setShowCancel(true)}
                  className="h-10 px-4 rounded-xl bg-white/15 hover:bg-rose-500/40 backdrop-blur text-white text-sm font-extrabold transition inline-flex items-center gap-2 border border-white/20"
                >
                  <XCircle className="h-4 w-4" /> Cancel <Kbd>X</Kbd>
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => {
                    if (confirm('Permanently delete this booking? Yeh action wapis nahi ho sakti.')) removeMutation.mutate();
                  }}
                  className="h-10 px-4 rounded-xl bg-white/15 hover:bg-rose-500/40 backdrop-blur text-white text-sm font-extrabold transition inline-flex items-center gap-2 border border-white/20"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
            </div>
          </div>

          {/* Shortcuts hint */}
          <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center print:hidden">
            {canPay && (<><Kbd>P</Kbd><span className="text-white/60">Pay</span><span className="text-white/30 mx-1">•</span></>)}
            {canConvert && (<><Kbd>C</Kbd><span className="text-white/60">Convert</span><span className="text-white/30 mx-1">•</span></>)}
            {canCancel && (<><Kbd>X</Kbd><span className="text-white/60">Cancel</span><span className="text-white/30 mx-1">•</span></>)}
            <Kbd>G</Kbd><span className="text-white/60">Guide</span>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniKpi label="Total" value={formatPKR(booking.total)} color="slate" icon={DollarSign} />
          <MiniKpi label="Paid" value={formatPKR(booking.totalPaid)} color="emerald" icon={CheckCircle2} />
          <MiniKpi label="Balance Due" value={formatPKR(booking.balanceDue)} color="amber" icon={Wallet} />
          {booking.totalRefunded > 0 ? (
            <MiniKpi label="Refunded" value={formatPKR(booking.totalRefunded)} color="rose" icon={RefreshCw} />
          ) : (
            <MiniKpi label="Items" value={String(booking.items?.length ?? 0)} color="blue" icon={Package} />
          )}
        </section>

        {/* Progress bar */}
        {booking.total > 0 && (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-700 p-4 print:hidden">
            <div className="flex items-center justify-between text-xs font-extrabold mb-2">
              <span className="text-slate-700 dark:text-slate-300">Payment Progress</span>
              <span className="text-emerald-700 dark:text-emerald-400 tabular-nums">
                {((booking.totalPaid / booking.total) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-500"
                style={{ width: `${Math.min((booking.totalPaid / booking.total) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Converted → sale link */}
        {booking.status === 'CONVERTED' && booking.sale && (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-2 border-emerald-300 dark:border-emerald-500/40 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <div className="font-extrabold text-emerald-900 dark:text-emerald-200">Converted to Sale</div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold font-mono">{booking.sale.saleNumber}</div>
              </div>
            </div>
            <Link
              to={`/sales/${booking.sale.id}/receipt`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold shadow transition"
            >
              <Receipt className="h-4 w-4" /> View Receipt <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        <div className="grid xl:grid-cols-[1fr_400px] gap-5">
          {/* LEFT */}
          <div className="space-y-5">
            {/* Items */}
            <div className="rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Reserved Items ({booking.items?.length ?? 0})
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {booking.items?.map((item, idx) => (
                  <div key={item.id} className="p-4 flex items-start gap-3">
                    <div className="text-xs font-mono font-extrabold text-slate-500 dark:text-slate-400 w-6">#{idx + 1}</div>
                    <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                      {item.variant?.imageUrl ? (
                        <img src={item.variant.imageUrl} alt={item.product?.name} className="h-full w-full object-cover" />
                      ) : item.variant?.colorHex ? (
                        <div className="h-full w-full" style={{ backgroundColor: item.variant.colorHex }} />
                      ) : (
                        <Package className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">{item.product?.name}</div>
                      {item.variant?.name && (
                        <div className="text-[10px] font-extrabold text-violet-700 dark:text-violet-300">{item.variant.name}</div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.imei && (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 text-[9px] font-mono font-extrabold">
                            <Smartphone className="h-2 w-2" /> {item.imei.imei1}
                          </div>
                        )}
                        {item.roll && (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[9px] font-extrabold">
                            <Layers className="h-2 w-2" /> {item.roll.rollNumber}
                          </div>
                        )}
                        {item.cutPiece && (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300 text-[9px] font-extrabold">
                            <Scissors className="h-2 w-2" /> {item.cutPiece.pieceCode}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                        {formatPKR(item.price)} × {item.quantity} {item.product?.unit}
                        {item.lineDiscount > 0 && <span className="text-rose-700 dark:text-rose-400 ml-2">-{formatPKR(item.lineDiscount)}</span>}
                      </div>
                      {item.note && (
                        <div className="mt-1.5 inline-flex items-start gap-1 rounded bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-200">
                          <MessageSquare className="h-2.5 w-2.5 mt-0.5" /> {item.note}
                        </div>
                      )}
                      {item.internalNote && (
                        <div className="mt-1 inline-flex items-start gap-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 italic print:hidden">
                          <EyeOff className="h-2.5 w-2.5 mt-0.5" /> {item.internalNote}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(item.total)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payments log */}
            <div className="rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800">
                <h3 className="font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Payment History ({booking.payments?.length ?? 0})
                </h3>
              </div>
              {booking.payments && booking.payments.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {booking.payments.map((pay) => {
                    const PayIcon = paymentIcons[pay.paymentMethod] || CreditCard;
                    const isRefund = pay.type === 'REFUND';
                    return (
                      <div key={pay.id} className={`p-3 flex items-center gap-3 ${isRefund ? 'bg-rose-50/50 dark:bg-rose-500/5' : ''}`}>
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isRefund ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          <PayIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                              pay.type === 'ADVANCE' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                              pay.type === 'ADDITIONAL' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                              'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                            }`}>
                              {pay.type}
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{pay.paymentMethod}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(pay.paidAt)}</div>
                          {pay.notes && <div className="text-[10px] text-slate-600 dark:text-slate-400 italic mt-0.5">{pay.notes}</div>}
                        </div>
                        <div className={`text-right font-extrabold tabular-nums ${isRefund ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                          {isRefund ? '-' : '+'}{formatPKR(pay.amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Wallet className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">Koi payment nahi</p>
                  {canPay && (
                    <button
                      onClick={() => setShowAddPayment(true)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold transition"
                    >
                      <Plus className="h-3 w-3" /> Add first payment
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <aside className="space-y-4">
            {/* Timeline */}
            <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <h3 className="font-extrabold text-slate-900 dark:text-white mb-3 inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Timeline
              </h3>
              <div className="space-y-3 text-sm">
                <TimelineRow label="Created" value={formatDate(booking.createdAt)} icon={Calendar} color="slate" />
                {booking.expectedPickupAt && (
                  <TimelineRow
                    label="Pickup"
                    value={formatDate(booking.expectedPickupAt)}
                    icon={Clock}
                    color={pickupInfo?.isOverdue ? 'rose' : pickupInfo?.isSoon ? 'amber' : 'blue'}
                    badge={pickupInfo && !['CONVERTED', 'CANCELLED', 'EXPIRED'].includes(booking.status)
                      ? pickupInfo.isOverdue ? `${Math.abs(pickupInfo.days)}d late` : pickupInfo.days === 0 ? 'Aaj' : `${pickupInfo.days}d baaki`
                      : undefined}
                  />
                )}
                {booking.expiresAt && (
                  <TimelineRow label="Expires" value={formatDate(booking.expiresAt)} icon={AlertTriangle} color="amber" />
                )}
                {booking.convertedAt && (
                  <TimelineRow label="Converted" value={formatDate(booking.convertedAt)} icon={CheckCircle2} color="emerald" />
                )}
                {booking.cancelledAt && (
                  <TimelineRow label="Cancelled" value={formatDate(booking.cancelledAt)} icon={XCircle} color="rose" />
                )}
              </div>
              {booking.cancelReason && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[9px] uppercase font-extrabold text-rose-700 dark:text-rose-400 mb-1">Cancel Reason</div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 italic">"{booking.cancelReason}"</div>
                </div>
              )}
            </div>

            {/* Financial summary */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-blue-900 dark:from-slate-950 dark:to-blue-950 text-white p-5 shadow-xl space-y-2 border border-white/10">
              <div className="text-xs uppercase tracking-wider font-extrabold text-white/70 mb-2">Summary</div>
              <RowLine label="Subtotal" value={formatPKR(booking.subtotal)} />
              {booking.discount > 0 && (
                <RowLine label="Discount" value={`-${formatPKR(booking.discount)}`} highlight="amber" />
              )}
              {booking.serviceCharges > 0 && (
                <RowLine label="Service Charges" value={`+${formatPKR(booking.serviceCharges)}`} highlight="orange" />
              )}
              <div className="pt-2 border-t border-white/15">
                <RowLine label="TOTAL" value={formatPKR(booking.total)} bold big />
              </div>
              <div className="pt-2 border-t border-white/15">
                <RowLine label="Paid" value={formatPKR(booking.totalPaid)} highlight="emerald" />
                {booking.totalRefunded > 0 && (
                  <RowLine label="Refunded" value={`-${formatPKR(booking.totalRefunded)}`} highlight="rose" />
                )}
                {booking.balanceDue > 0 && (
                  <RowLine label="Balance Due" value={formatPKR(booking.balanceDue)} highlight="amber" bold />
                )}
              </div>
            </div>

            {/* Notes */}
            {(booking.notes || booking.internalNotes) && (
              <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
                <h3 className="font-extrabold text-slate-900 dark:text-white">Notes</h3>
                {booking.notes && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-3">
                    <div className="text-[9px] uppercase font-extrabold text-amber-800 dark:text-amber-300 mb-1 inline-flex items-center gap-1">
                      <MessageSquare className="h-2.5 w-2.5" /> Customer Note
                    </div>
                    <div className="text-xs font-bold text-amber-900 dark:text-amber-200">{booking.notes}</div>
                  </div>
                )}
                {booking.internalNotes && (
                  <div className="rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 p-3 print:hidden">
                    <div className="text-[9px] uppercase font-extrabold text-slate-700 dark:text-slate-300 mb-1 inline-flex items-center gap-1">
                      <EyeOff className="h-2.5 w-2.5" /> Internal Note
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 italic">{booking.internalNotes}</div>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast] { display: none !important; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>
    </>
  );
}

/* ═════════════════════════════════════════════════════════════
   Helpers
   ═════════════════════════════════════════════════════════════ */
function MiniKpi({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    slate: 'from-slate-600 to-slate-800 shadow-slate-500/30',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3 shadow-sm">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400">{label}</div>
        <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
      </div>
    </div>
  );
}

function TimelineRow({ label, value, icon: Icon, color, badge }: any) {
  const colors: Record<string, string> = {
    slate: 'text-slate-600 dark:text-slate-400',
    blue: 'text-blue-600 dark:text-blue-400',
    amber: 'text-amber-600 dark:text-amber-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    rose: 'text-rose-600 dark:text-rose-400',
  };
  const badgeColors: Record<string, string> = {
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    blue: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
  };
  return (
    <div className="flex items-start gap-2">
      <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${colors[color]}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400">{label}</div>
          {badge && (
            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${badgeColors[color]}`}>
              {badge}
            </span>
          )}
        </div>
        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{value}</div>
      </div>
    </div>
  );
}

function RowLine({ label, value, highlight, bold, big }: any) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
    orange: 'text-orange-300',
    rose: 'text-rose-300',
  };
  const color = highlight ? colors[highlight] : 'text-white';
  return (
    <div className={`flex justify-between ${big ? 'text-lg' : 'text-sm'}`}>
      <span className={bold ? 'font-extrabold text-white/90' : 'text-white/70'}>{label}</span>
      <span className={`${bold ? 'font-extrabold' : 'font-bold'} tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm text-[9px]">
      {children}
    </kbd>
  );
}

function BookingDetailTeacher({ onClose, status }: { onClose: () => void; status: BookingStatus }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/15 dark:to-indigo-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Booking Detail — Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-700 dark:text-blue-300 mb-2">
              🎯 Current Status: {statusConfig[status].label}
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {statusConfig[status].hint}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300 mb-2">
              🎬 3 Main Actions
            </div>
            <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <ActionRow icon="💰" label="Add Payment">
                Customer aur paisa de raha hai? Add karo — balance kam ho jayega
              </ActionRow>
              <ActionRow icon="🛒" label="Convert to Sale">
                Customer aa gaya, item de diya — sale bana do. Stock adjust ho jayega, receipt milegi
              </ActionRow>
              <ActionRow icon="❌" label="Cancel">
                Customer ne mana kar diya — refund option ke sath cancel karo. Items wapis inventory me
              </ActionRow>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 mb-2">
              ⌨️ Shortcuts
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">P</kbd> — Pay</div>
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">C</kbd> — Convert</div>
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">X</kbd> — Cancel</div>
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">G</kbd> — Guide</div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💡 <strong>Pro tip:</strong> WhatsApp button se seedha customer ko booking ki details aur balance
            reminder bhej sakte ho — auto-formatted message!
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 font-extrabold shadow-lg shadow-blue-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActionRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-base shrink-0">{icon}</span>
      <div>
        <strong className="text-slate-900 dark:text-white">{label}:</strong> {children}
      </div>
    </div>
  );
}
