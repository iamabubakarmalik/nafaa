import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ChefHat, Printer, CheckCircle2, X, DollarSign,
  Utensils, Bike, ShoppingBag, Car, Home, Package, Clock,
  User, Phone, MapPin, Users, Sparkles, Timer, Award,
  CreditCard, Split, ArrowRight, Trash2, Plus, Save,
  MessageSquare, AlertCircle, Ban,
} from 'lucide-react';
import { ordersApi, type OrderStatus } from '../api/orders.api';
import { kotApi } from '../api/kot.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const MODE_ICON: Record<string, any> = {
  DINE_IN: Utensils, TAKEAWAY: ShoppingBag, DELIVERY: Bike,
  DRIVE_THRU: Car, ROOM_SERVICE: Home, PICKUP: Package,
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; next: OrderStatus[] }> = {
  DRAFT: { label: 'Draft', color: 'text-slate-700', bg: 'bg-slate-500', next: ['PLACED', 'CANCELLED'] },
  PLACED: { label: 'Placed', color: 'text-blue-700', bg: 'bg-blue-500', next: ['CONFIRMED', 'CANCELLED'] },
  CONFIRMED: { label: 'Confirmed', color: 'text-cyan-700', bg: 'bg-cyan-500', next: ['COOKING', 'CANCELLED'] },
  COOKING: { label: 'Cooking', color: 'text-amber-700', bg: 'bg-amber-500', next: ['READY'] },
  READY: { label: 'Ready', color: 'text-emerald-700', bg: 'bg-emerald-500', next: ['SERVED', 'OUT_FOR_DELIVERY'] },
  SERVED: { label: 'Served', color: 'text-teal-700', bg: 'bg-teal-600', next: ['COMPLETED'] },
  OUT_FOR_DELIVERY: { label: 'On the way', color: 'text-violet-700', bg: 'bg-violet-500', next: ['DELIVERED'] },
  DELIVERED: { label: 'Delivered', color: 'text-green-700', bg: 'bg-green-600', next: ['COMPLETED'] },
  COMPLETED: { label: 'Completed', color: 'text-emerald-800', bg: 'bg-emerald-700', next: [] },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-700', bg: 'bg-rose-500', next: [] },
  ON_HOLD: { label: 'On Hold', color: 'text-orange-700', bg: 'bg-orange-500', next: ['PLACED'] },
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [showSplit, setShowSplit] = useState(false);

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: () => ordersApi.getOne(id!),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => ordersApi.updateStatus(id!, status),
    onSuccess: (o) => {
      toast.success('Status: ' + STATUS_CONFIG[o.status].label);
      queryClient.invalidateQueries({ queryKey: ['order-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const printKotMutation = useMutation({
    mutationFn: () => kotApi.create({
      orderId: id!,
      itemIds: order?.items?.map((it: any) => it.id) || [],
    }),
    onSuccess: () => {
      toast.success('KOT printed & sent to kitchen');
      queryClient.invalidateQueries({ queryKey: ['order-detail', id] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => ordersApi.updateStatus(id!, 'CANCELLED', { cancellationReason: reason }),
    onSuccess: () => {
      toast.success('Order cancelled');
      queryClient.invalidateQueries({ queryKey: ['order-detail', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
        <div className="h-64 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
      </div>
    );
  }

  if (!order) return <div>Order not found</div>;

  const statusCfg = STATUS_CONFIG[order.status];
  const ModeIcon = MODE_ICON[order.mode] || ShoppingBag;
  const remaining = order.total - order.paidAmount;
  const isFullyPaid = remaining <= 0.01;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start gap-4">
          <button onClick={() => navigate('/restaurant/orders')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20 mb-2">
              <ModeIcon className="h-3 w-3" />
              {order.mode.replace('_', ' ')}
            </div>
            <h1 className="text-3xl font-extrabold">{order.orderNumber}</h1>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-sm">
              <span className={'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase text-white ' + statusCfg.bg}>
                {statusCfg.label}
              </span>
              <span className="text-white/80 font-semibold">
                {new Date(order.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              {order.table && (
                <span className="inline-flex items-center gap-1 text-white/80 font-semibold">
                  <Utensils className="h-3 w-3" />
                  Table {order.table.tableNumber}
                </span>
              )}
              {order.numberOfGuests && (
                <span className="inline-flex items-center gap-1 text-white/80 font-semibold">
                  <Users className="h-3 w-3" />
                  {order.numberOfGuests} guests
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => printKotMutation.mutate()}
              disabled={printKotMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20"
            >
              <Printer className="h-4 w-4" />
              Print KOT
            </button>
            {!isFullyPaid && !['CANCELLED', 'COMPLETED'].includes(order.status) && (
              <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowPayment(true)}>
                <DollarSign className="h-4 w-4" />
                Pay
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* STATUS FLOW */}
      {statusCfg.next.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-wider font-extrabold text-slate-600">Next Action:</span>
          {statusCfg.next.map((next) => {
            const nextCfg = STATUS_CONFIG[next];
            return (
              <button
                key={next}
                onClick={() => {
                  if (next === 'CANCELLED') {
                    const reason = prompt('Cancellation reason?');
                    if (reason !== null) cancelMutation.mutate(reason);
                  } else {
                    statusMutation.mutate(next);
                  }
                }}
                disabled={statusMutation.isPending}
                className={
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold text-white shadow ' + nextCfg.bg
                }
              >
                {next === 'CANCELLED' ? <Ban className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                Mark {nextCfg.label}
              </button>
            );
          })}
        </section>
      )}

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* LEFT — Items */}
        <section className="space-y-4">
          {/* Customer Info */}
          {(order.customerName || order.customerPhone || order.deliveryAddress) && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-violet-600" />
                Customer
              </h3>
              <div className="space-y-2 text-sm">
                {order.customerName && (
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-bold text-slate-900 dark:text-white">{order.customerName}</span>
                  </div>
                )}
                {order.customerPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <a href={'tel:' + order.customerPhone} className="font-bold text-blue-700 hover:underline">
                      {order.customerPhone}
                    </a>
                  </div>
                )}
                {order.deliveryAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{order.deliveryAddress}</div>
                      {order.deliveryNotes && <div className="text-xs text-slate-500 italic mt-0.5">{order.deliveryNotes}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Special Requests */}
          {order.specialRequests && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 p-4">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs uppercase font-extrabold text-amber-700 dark:text-amber-400">Special Request</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{order.specialRequests}</div>
                </div>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Order Items</h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                {order.items.length} items
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              {order.items.map((item: any) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-extrabold text-amber-700 tabular-nums">{item.quantity}×</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">{item.product?.name}</span>
                        {item.status && item.status !== 'PLACED' && (
                          <span className={
                            'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' +
                            (STATUS_CONFIG[item.status as OrderStatus]?.bg || 'bg-slate-500')
                          }>
                            {STATUS_CONFIG[item.status as OrderStatus]?.label || item.status}
                          </span>
                        )}
                        {item.spiceLevel && item.spiceLevel !== 'NONE' && (
                          <span className="text-xs">🌶️ {item.spiceLevel}</span>
                        )}
                      </div>
                      {item.modifiers?.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {item.modifiers.map((m: any, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-pink-100 dark:bg-pink-950/40 text-pink-700 text-[10px] font-extrabold">
                              {m.modifierOption?.name}
                              {m.priceAdjustment !== 0 && ' (' + (m.priceAdjustment > 0 ? '+' : '') + formatPKR(m.priceAdjustment) + ')'}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.specialInstructions && (
                        <div className="mt-1 text-xs italic text-amber-700">📝 {item.specialInstructions}</div>
                      )}
                      {item.cookingNote && (
                        <div className="mt-1 text-xs italic text-blue-700">🍳 {item.cookingNote}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm text-slate-500 font-bold">{formatPKR(item.basePrice)} each</div>
                      {item.modifierTotal > 0 && (
                        <div className="text-xs text-pink-700 font-bold">+{formatPKR(item.modifierTotal)} mods</div>
                      )}
                      <div className="text-lg font-extrabold text-emerald-700 tabular-nums mt-1">{formatPKR(item.total)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KOTs */}
          {order.kots && order.kots.length > 0 && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ChefHat className="h-5 w-5 text-amber-600" />
                  Kitchen Order Tickets
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                {order.kots.map((kot: any) => (
                  <div key={kot.id} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">{kot.kotNumber}</div>
                      <div className="text-xs text-slate-500 font-semibold">
                        {kot.station && kot.station + ' • '}
                        {new Date(kot.createdAt).toLocaleString('en-PK', { timeStyle: 'short' })}
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 text-xs font-extrabold uppercase">
                      {kot.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT — Bill Summary */}
        <aside className="space-y-4">
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-emerald-900 text-white p-5 shadow-xl sticky top-4">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">💰 Bill Summary</div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-white/70">Subtotal</span>
                <span className="font-bold tabular-nums">{formatPKR(order.subtotal)}</span>
              </div>
              {order.serviceCharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/70">Service ({order.serviceChargePct}%)</span>
                  <span className="font-bold tabular-nums">{formatPKR(order.serviceCharge)}</span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/70">Tax ({order.taxPct}%)</span>
                  <span className="font-bold tabular-nums">{formatPKR(order.taxAmount)}</span>
                </div>
              )}
              {order.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/70">Delivery</span>
                  <span className="font-bold tabular-nums">{formatPKR(order.deliveryFee)}</span>
                </div>
              )}
              {order.packagingFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/70">Packaging</span>
                  <span className="font-bold tabular-nums">{formatPKR(order.packagingFee)}</span>
                </div>
              )}
              {order.tip > 0 && (
                <div className="flex justify-between text-amber-300">
                  <span>Tip</span>
                  <span className="font-bold tabular-nums">{formatPKR(order.tip)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-rose-300">
                  <span>Discount</span>
                  <span className="font-bold tabular-nums">-{formatPKR(order.discount)}</span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
              <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
              <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(order.total)}</span>
            </div>

            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-white/70">Paid</span>
                <span className="font-extrabold text-emerald-300 tabular-nums">{formatPKR(order.paidAmount)}</span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between">
                  <span className="text-amber-300 font-extrabold">Remaining</span>
                  <span className="font-extrabold text-amber-300 tabular-nums">{formatPKR(remaining)}</span>
                </div>
              )}
              {isFullyPaid && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/30 text-emerald-200 text-xs font-extrabold">
                  <CheckCircle2 className="h-3 w-3" />
                  PAID IN FULL
                </div>
              )}
            </div>

            {!isFullyPaid && !['CANCELLED', 'COMPLETED'].includes(order.status) && (
              <div className="mt-4 space-y-2">
                <Button size="lg" className="w-full bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowPayment(true)}>
                  <CreditCard className="h-4 w-4" />
                  Add Payment
                </Button>
                <Button size="lg" variant="secondary" className="w-full bg-white/15 hover:bg-white/25 text-white border-white/20" onClick={() => setShowSplit(true)}>
                  <Split className="h-4 w-4" />
                  Split Bill
                </Button>
              </div>
            )}
          </div>

          {/* Payments */}
          {order.payments && order.payments.length > 0 && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-neutral-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payment History</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                {order.payments.map((p: any) => (
                  <div key={p.id} className="p-3 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-700 dark:text-slate-300">{p.paymentMethod}</span>
                      <span className="text-emerald-700 tabular-nums">{formatPKR(p.amount)}</span>
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      {p.paidBy && p.paidBy + ' • '}
                      {new Date(p.paidAt).toLocaleString('en-PK', { timeStyle: 'short', dateStyle: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {showPayment && <PaymentModal orderId={id!} remaining={remaining} onClose={() => setShowPayment(false)} onDone={() => { setShowPayment(false); refetch(); }} />}
      {showSplit && <SplitBillModal orderId={id!} total={remaining} onClose={() => setShowSplit(false)} onDone={() => { setShowSplit(false); refetch(); }} />}
    </div>
  );
}

function PaymentModal({ orderId, remaining, onClose, onDone }: any) {
  const [amount, setAmount] = useState(remaining);
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const payMutation = useMutation({
    mutationFn: () => ordersApi.addPayment(orderId, { amount, paymentMethod: method, reference, notes }),
    onSuccess: () => {
      toast.success('Payment added');
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 dark:text-white">Add Payment</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Amount *</label>
            <input
              type="number" step="0.01" autoFocus
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500"
            />
            <div className="mt-1 flex gap-1">
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <button
                  key={f}
                  onClick={() => setAmount(Number((remaining * f).toFixed(2)))}
                  className="flex-1 h-8 rounded-lg bg-slate-100 dark:bg-neutral-800 text-xs font-extrabold hover:bg-slate-200"
                >
                  {(f * 100).toFixed(0)}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {['CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK', 'OTHER'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={
                    'p-2 rounded-lg border-2 text-xs font-extrabold ' +
                    (method === m ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 hover:border-emerald-300')
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Reference</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="TXN ID, cheque #..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => payMutation.mutate()} loading={payMutation.isPending} disabled={amount <= 0}>
              <CheckCircle2 className="h-4 w-4" />
              Confirm Payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SplitBillModal({ orderId, total, onClose, onDone }: any) {
  const [splits, setSplits] = useState([{ paidBy: '', amount: total / 2, paymentMethod: 'CASH' }, { paidBy: '', amount: total / 2, paymentMethod: 'CASH' }]);

  const sumSplits = splits.reduce((s, sp) => s + sp.amount, 0);
  const diff = total - sumSplits;

  const addSplit = () => setSplits([...splits, { paidBy: '', amount: 0, paymentMethod: 'CASH' }]);
  const updateSplit = (idx: number, patch: any) => setSplits(splits.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  const removeSplit = (idx: number) => setSplits(splits.filter((_, i) => i !== idx));

  const splitEqually = () => {
    const per = Number((total / splits.length).toFixed(2));
    setSplits(splits.map((s) => ({ ...s, amount: per })));
  };

  const splitMutation = useMutation({
    mutationFn: () => ordersApi.splitBill(orderId, splits.filter((s) => s.amount > 0)),
    onSuccess: () => {
      toast.success('Bill split successfully');
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">Split Bill</h3>
            <p className="text-xs text-slate-500 font-semibold">Total: {formatPKR(total)}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="flex-1" onClick={splitEqually}>Split Equally</Button>
            <Button size="sm" onClick={addSplit} className="bg-gradient-to-r from-violet-600 to-purple-700">
              <Plus className="h-3.5 w-3.5" />
              Add Person
            </Button>
          </div>

          {splits.map((sp, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Person #{i + 1}</div>
                {splits.length > 2 && (
                  <button onClick={() => removeSplit(i)} className="h-6 w-6 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={sp.paidBy}
                  onChange={(e) => updateSplit(i, { paidBy: e.target.value })}
                  placeholder="Name (optional)"
                  className="h-9 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-violet-500"
                />
                <input
                  type="number" step="0.01"
                  value={sp.amount}
                  onChange={(e) => updateSplit(i, { amount: Number(e.target.value) })}
                  className="h-9 rounded-lg border-2 border-violet-200 bg-violet-50 dark:bg-violet-950/30 px-2 text-xs font-extrabold tabular-nums focus:outline-none focus:border-violet-500"
                />
                <select
                  value={sp.paymentMethod}
                  onChange={(e) => updateSplit(i, { paymentMethod: e.target.value })}
                  className="h-9 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-violet-500"
                >
                  <option>CASH</option><option>CARD</option><option>JAZZCASH</option><option>EASYPAISA</option><option>BANK</option>
                </select>
              </div>
            </div>
          ))}

          <div className={
            'rounded-xl p-3 text-center font-extrabold ' +
            (Math.abs(diff) < 0.01 ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800')
          }>
            {Math.abs(diff) < 0.01 ? '✓ Splits balanced!' : 'Diff: ' + formatPKR(diff) + (diff > 0 ? ' short' : ' extra')}
          </div>
        </div>
        <div className="border-t-2 border-slate-200 dark:border-neutral-800 p-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700"
            onClick={() => splitMutation.mutate()}
            loading={splitMutation.isPending}
            disabled={Math.abs(diff) > 0.01}
          >
            <Split className="h-4 w-4" />
            Confirm Split
          </Button>
        </div>
      </div>
    </div>
  );
}
