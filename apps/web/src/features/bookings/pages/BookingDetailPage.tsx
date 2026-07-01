import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, User, Phone, Calendar, Clock, Package,
  DollarSign, Wallet, BookmarkPlus, X, CheckCircle2,
  XCircle, RefreshCw, Plus, AlertTriangle, Sparkles,
  Hourglass, Zap, MessageSquare, EyeOff, TrendingUp,
  ArrowRight, CreditCard, Building2, Smartphone, Banknote,
  Trash2, Receipt, ShoppingCart, Layers, Scissors,
} from 'lucide-react';
import { toast } from 'sonner';
import { bookingsApi, type BookingStatus } from '@/api/bookings.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import type { PaymentMethod } from '@/api/sales.api';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const statusConfig: Record<BookingStatus, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:           { label: 'Pending',      color: '#64748b', bg: 'from-slate-500 to-slate-700',    icon: Hourglass },
  ADVANCE_PAID:      { label: 'Advance Paid', color: '#f59e0b', bg: 'from-amber-500 to-orange-600',   icon: Wallet },
  READY_FOR_PICKUP:  { label: 'Ready',        color: '#3b82f6', bg: 'from-blue-500 to-blue-700',      icon: Zap },
  CONVERTED:         { label: 'Converted',    color: '#10b981', bg: 'from-emerald-500 to-green-700',  icon: CheckCircle2 },
  CANCELLED:         { label: 'Cancelled',    color: '#ef4444', bg: 'from-rose-500 to-red-700',       icon: XCircle },
  EXPIRED:           { label: 'Expired',      color: '#dc2626', bg: 'from-red-600 to-red-800',        icon: AlertTriangle },
};

const paymentIcons: Record<string, any> = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone, EASYPAISA: Zap, BANK_TRANSFER: Building2,
};

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundAdvance, setRefundAdvance] = useState(true);
  const [showConvert, setShowConvert] = useState(false);
  const [additionalPayment, setAdditionalPayment] = useState('');

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

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-12 text-center">
        <div className="mx-auto h-16 w-16 rounded-3xl bg-rose-100 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-rose-600" />
        </div>
        <h3 className="mt-4 font-extrabold text-slate-900">Booking not found</h3>
        <Link to="/bookings" className="mt-4 inline-block text-blue-600 font-bold hover:underline">
          ← Back to bookings
        </Link>
      </div>
    );
  }

  const cfg = statusConfig[booking.status];
  const StatusIcon = cfg.icon;
  const canPay = ['PENDING', 'ADVANCE_PAID'].includes(booking.status);
  const canConvert = ['PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP'].includes(booking.status);
  const canCancel = !['CONVERTED', 'CANCELLED', 'EXPIRED'].includes(booking.status);
  const canDelete = ['CANCELLED', 'EXPIRED'].includes(booking.status);

  return (
    <>
      {/* ADD PAYMENT MODAL */}
      {showAddPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 text-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-lg inline-flex items-center gap-2">
                  <Wallet className="h-5 w-5" /> Add Payment
                </h3>
                <button onClick={() => setShowAddPayment(false)} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs mt-1 text-white/80">Balance due: {formatPKR(booking.balanceDue)}</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs uppercase font-extrabold text-slate-600 mb-1 block">Amount (PKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={booking.balanceDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  autoFocus
                  placeholder="0"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-lg font-extrabold focus:outline-none focus:border-emerald-500"
                />
                <div className="mt-1 flex gap-1">
                  <button onClick={() => setPaymentAmount(String(booking.balanceDue))} className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                    Full ({formatPKR(booking.balanceDue)})
                  </button>
                  <button onClick={() => setPaymentAmount(String(Math.floor(booking.balanceDue / 2)))} className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200">
                    Half
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase font-extrabold text-slate-600 mb-1 block">Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="JAZZCASH">JazzCash</option>
                  <option value="EASYPAISA">EasyPaisa</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase font-extrabold text-slate-600 mb-1 block">Note (optional)</label>
                <input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. transaction ID, bank name..."
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-green-700"
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

      {/* CANCEL MODAL */}
      {showCancel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-rose-600 to-red-700 text-white p-5 flex items-center justify-between">
              <h3 className="font-extrabold text-lg inline-flex items-center gap-2">
                <XCircle className="h-5 w-5" /> Cancel Booking
              </h3>
              <button onClick={() => setShowCancel(false)} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900 font-bold">
                  Reserved items (rolls, IMEIs, cut pieces) will be released back to inventory.
                </div>
              </div>
              <div>
                <label className="text-xs uppercase font-extrabold text-slate-600 mb-1 block">Reason</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder='"Customer mind change, refund"'
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold focus:outline-none focus:border-rose-500"
                />
              </div>
              {booking.totalPaid > 0 && (
                <label className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border-2 border-emerald-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refundAdvance}
                    onChange={(e) => setRefundAdvance(e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-600"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-extrabold text-emerald-900">
                      Refund advance ({formatPKR(booking.totalPaid)})
                    </div>
                    <div className="text-[10px] text-emerald-700 font-bold">
                      Customer ka paisa wapis
                    </div>
                  </div>
                </label>
              )}
              <Button
                className="w-full bg-gradient-to-r from-rose-600 to-red-700"
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

      {/* CONVERT MODAL */}
      {showConvert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 text-white p-5 flex items-center justify-between">
              <h3 className="font-extrabold text-lg inline-flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" /> Convert to Sale
              </h3>
              <button onClick={() => setShowConvert(false)} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-xl bg-emerald-50 border-2 border-emerald-300 p-3">
                <div className="text-xs text-emerald-900 font-bold">
                  Sale banate hi items customer ke naam ho jaenge. Stock adjust ho ga.
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center rounded-xl border-2 border-slate-200 p-3">
                <div>
                  <div className="text-[9px] uppercase font-extrabold text-slate-500">Total</div>
                  <div className="text-sm font-extrabold text-slate-900 tabular-nums">{formatPKR(booking.total)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-extrabold text-emerald-700">Paid</div>
                  <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(booking.totalPaid)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-extrabold text-amber-700">Balance</div>
                  <div className="text-sm font-extrabold text-amber-700 tabular-nums">{formatPKR(booking.balanceDue)}</div>
                </div>
              </div>
              {booking.balanceDue > 0 && (
                <div>
                  <label className="text-xs uppercase font-extrabold text-slate-600 mb-1 block">
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
                    className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-lg font-extrabold focus:outline-none focus:border-emerald-500"
                  />
                  <div className="mt-1 flex gap-1">
                    <button onClick={() => setAdditionalPayment(String(booking.balanceDue))} className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                      Pay Full
                    </button>
                    <button onClick={() => setAdditionalPayment('')} className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200">
                      Skip (add to khata)
                    </button>
                  </div>
                </div>
              )}
              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-green-700"
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

      <div className="space-y-6">
        {/* Header */}
        <Link to="/bookings" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 font-bold">
          <ArrowLeft className="h-4 w-4" /> Back to Bookings
        </Link>

        {/* Hero */}
        <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${cfg.bg} text-white p-6 shadow-2xl`}>
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold">
                <StatusIcon className="h-3 w-3" />
                {cfg.label}
              </div>
              <h1 className="mt-3 text-3xl font-extrabold font-mono">{booking.bookingNumber}</h1>
              <div className="mt-2 flex items-center gap-3 text-sm text-white/80 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <strong>{booking.customer?.name}</strong>
                </span>
                {booking.customer?.phone && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {booking.customer.phone}
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(booking.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {canPay && booking.balanceDue > 0 && (
                <Button
                  onClick={() => setShowAddPayment(true)}
                  className="bg-white text-slate-900 hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" /> Add Payment
                </Button>
              )}
              {canConvert && (
                <Button
                  onClick={() => setShowConvert(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
                >
                  <ShoppingCart className="h-4 w-4" /> Convert to Sale
                </Button>
              )}
              {canCancel && (
                <button
                  onClick={() => setShowCancel(true)}
                  className="h-10 px-4 rounded-xl bg-white/15 hover:bg-rose-500/40 backdrop-blur text-white text-sm font-bold transition inline-flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" /> Cancel
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => {
                    if (confirm('Permanently delete this booking?')) removeMutation.mutate();
                  }}
                  className="h-10 px-4 rounded-xl bg-white/15 hover:bg-rose-500/40 backdrop-blur text-white text-sm font-bold transition inline-flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
            </div>
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

        {/* If converted, show sale link */}
        {booking.status === 'CONVERTED' && booking.sale && (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <div className="font-extrabold text-emerald-900">Converted to Sale</div>
                <div className="text-xs text-emerald-700 font-bold font-mono">{booking.sale.saleNumber}</div>
              </div>
            </div>
            <Link
              to={`/sales/${booking.sale.id}/receipt`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow"
            >
              <Receipt className="h-4 w-4" /> View Receipt <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        <div className="grid xl:grid-cols-[1fr_400px] gap-5">
          {/* LEFT: Items + Timeline */}
          <div className="space-y-5">
            {/* Items */}
            <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 inline-flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-600" />
                  Reserved Items ({booking.items?.length ?? 0})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {booking.items?.map((item, idx) => (
                  <div key={item.id} className="p-4 flex items-start gap-3">
                    <div className="text-xs font-mono font-extrabold text-slate-500 w-6">#{idx + 1}</div>
                    <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                      {item.variant?.imageUrl ? (
                        <img src={item.variant.imageUrl} alt={item.product?.name} className="h-full w-full object-cover" />
                      ) : item.variant?.colorHex ? (
                        <div className="h-full w-full" style={{ backgroundColor: item.variant.colorHex }} />
                      ) : (
                        <Package className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 text-sm">{item.product?.name}</div>
                      {item.variant?.name && (
                        <div className="text-[10px] font-extrabold text-violet-700">{item.variant.name}</div>
                      )}
                      {item.imei && (
                        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-mono font-extrabold">
                          <Smartphone className="h-2 w-2" /> {item.imei.imei1}
                        </div>
                      )}
                      {item.roll && (
                        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-extrabold">
                          <Layers className="h-2 w-2" /> {item.roll.rollNumber}
                        </div>
                      )}
                      {item.cutPiece && (
                        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 text-[9px] font-extrabold">
                          <Scissors className="h-2 w-2" /> {item.cutPiece.pieceCode}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-1 font-semibold">
                        {formatPKR(item.price)} × {item.quantity} {item.product?.unit}
                        {item.lineDiscount > 0 && <span className="text-rose-700 ml-2">-{formatPKR(item.lineDiscount)}</span>}
                      </div>
                      {item.note && (
                        <div className="mt-1.5 inline-flex items-start gap-1 rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                          <MessageSquare className="h-2.5 w-2.5 mt-0.5" /> {item.note}
                        </div>
                      )}
                      {item.internalNote && (
                        <div className="mt-1 inline-flex items-start gap-1 rounded bg-slate-100 border border-slate-300 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 italic">
                          <EyeOff className="h-2.5 w-2.5 mt-0.5" /> {item.internalNote}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(item.total)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payments log */}
            <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b-2 border-slate-100">
                <h3 className="font-extrabold text-slate-900 inline-flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  Payment History ({booking.payments?.length ?? 0})
                </h3>
              </div>
              {booking.payments && booking.payments.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {booking.payments.map((pay) => {
                    const PayIcon = paymentIcons[pay.paymentMethod] || CreditCard;
                    const isRefund = pay.type === 'REFUND';
                    return (
                      <div key={pay.id} className={`p-3 flex items-center gap-3 ${isRefund ? 'bg-rose-50/50' : ''}`}>
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isRefund ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          <PayIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                              pay.type === 'ADVANCE' ? 'bg-blue-100 text-blue-700' :
                              pay.type === 'ADDITIONAL' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {pay.type}
                            </span>
                            <span className="text-xs font-bold text-slate-700">{pay.paymentMethod}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{formatDate(pay.paidAt)}</div>
                          {pay.notes && <div className="text-[10px] text-slate-600 italic mt-0.5">{pay.notes}</div>}
                        </div>
                        <div className={`text-right font-extrabold tabular-nums ${isRefund ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {isRefund ? '-' : '+'}{formatPKR(pay.amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Wallet className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 font-bold">Koi payment nahi</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Summary + timeline */}
          <aside className="space-y-4">
            {/* Timeline */}
            <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
              <h3 className="font-extrabold text-slate-900 mb-3 inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Timeline
              </h3>
              <div className="space-y-3 text-sm">
                <TimelineRow label="Created" value={formatDate(booking.createdAt)} icon={Calendar} color="slate" />
                {booking.expectedPickupAt && (
                  <TimelineRow label="Pickup" value={formatDate(booking.expectedPickupAt)} icon={Clock} color="blue" />
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
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="text-[9px] uppercase font-extrabold text-rose-700 mb-1">Cancel Reason</div>
                  <div className="text-xs text-slate-700 italic">"{booking.cancelReason}"</div>
                </div>
              )}
            </div>

            {/* Financial summary */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-blue-900 text-white p-5 shadow-xl space-y-2">
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
              <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
                <h3 className="font-extrabold text-slate-900">Notes</h3>
                {booking.notes && (
                  <div className="rounded-lg bg-amber-50 border-2 border-amber-300 p-3">
                    <div className="text-[9px] uppercase font-extrabold text-amber-800 mb-1 inline-flex items-center gap-1">
                      <MessageSquare className="h-2.5 w-2.5" /> Customer Note
                    </div>
                    <div className="text-xs font-bold text-amber-900">{booking.notes}</div>
                  </div>
                )}
                {booking.internalNotes && (
                  <div className="rounded-lg bg-slate-100 border-2 border-slate-300 p-3">
                    <div className="text-[9px] uppercase font-extrabold text-slate-700 mb-1 inline-flex items-center gap-1">
                      <EyeOff className="h-2.5 w-2.5" /> Internal Note
                    </div>
                    <div className="text-xs font-bold text-slate-800 italic">{booking.internalNotes}</div>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

function MiniKpi({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    slate: 'from-slate-600 to-slate-800',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-red-600',
    blue: 'from-blue-500 to-blue-700',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 flex items-center gap-3 shadow-sm">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
        <div className="text-lg font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
      </div>
    </div>
  );
}

function TimelineRow({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    slate: 'text-slate-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
  };
  return (
    <div className="flex items-start gap-2">
      <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${colors[color]}`} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
        <div className="text-xs font-bold text-slate-800">{value}</div>
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
