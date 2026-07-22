import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, CheckCircle2, X, Ban, Package, Scissors, Award,
  Sparkles, User, Phone, Calendar, Camera, Printer, DollarSign,
  CreditCard, MessageSquare, Timer, Ruler,
} from 'lucide-react';
import { tailoringApi, type TailoringStatus } from '../api/tailoring.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_FLOW: TailoringStatus[] = ['DRAFT', 'QUOTED', 'CONFIRMED', 'FABRIC_PENDING', 'CUTTING', 'STITCHING', 'EMBROIDERY', 'QUALITY_CHECK', 'READY', 'DELIVERED'];

const STATUS_CONFIG: Record<TailoringStatus, { label: string; color: string; textColor: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500', textColor: 'text-slate-700' },
  QUOTED: { label: 'Quoted', color: 'bg-blue-500', textColor: 'text-blue-700' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-cyan-500', textColor: 'text-cyan-700' },
  FABRIC_PENDING: { label: 'Fabric Pending', color: 'bg-orange-500', textColor: 'text-orange-700' },
  CUTTING: { label: 'Cutting', color: 'bg-amber-500', textColor: 'text-amber-700' },
  STITCHING: { label: 'Stitching', color: 'bg-purple-500', textColor: 'text-purple-700' },
  EMBROIDERY: { label: 'Embroidery', color: 'bg-fuchsia-500', textColor: 'text-fuchsia-700' },
  QUALITY_CHECK: { label: 'Quality Check', color: 'bg-violet-500', textColor: 'text-violet-700' },
  READY: { label: 'Ready', color: 'bg-emerald-500', textColor: 'text-emerald-700' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-600', textColor: 'text-green-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500', textColor: 'text-rose-700' },
  ON_HOLD: { label: 'On Hold', color: 'bg-slate-500', textColor: 'text-slate-700' },
};

export default function TailoringDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['tailoring-order', id],
    queryFn: () => tailoringApi.getOne(id!),
    enabled: !!id,
    refetchInterval: 60_000,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => tailoringApi.updateStatus(id!, status),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['tailoring-order', id] });
      queryClient.invalidateQueries({ queryKey: ['tailoring-orders'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => tailoringApi.updateStatus(id!, 'CANCELLED', { cancellationReason: reason }),
    onSuccess: () => { toast.success('Order cancelled'); refetch(); },
  });

  if (isLoading || !order) {
    return <div className="h-64 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />;
  }

  const statusCfg = STATUS_CONFIG[order.orderStatus];
  const currentIdx = STATUS_FLOW.indexOf(order.orderStatus);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
  const remaining = order.total - order.paidAmount;
  const isFullyPaid = remaining <= 0.01;
  const measurement = order.measurementProfile;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-purple-900 to-violet-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/garments/tailoring')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                {order.priority} priority
              </div>
              <h1 className="mt-1 text-3xl font-extrabold">{order.orderNumber}</h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-sm">
                <span className={'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase text-white ' + statusCfg.color}>
                  {statusCfg.label}
                </span>
                <span className="text-white/80 font-semibold">
                  {format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm')}
                </span>
                {order.promisedDate && (
                  <span className="text-white/80 font-semibold inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due: {format(new Date(order.promisedDate), 'dd MMM yyyy')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <Printer className="h-4 w-4" />
              Print
            </button>
            {!isFullyPaid && !['CANCELLED'].includes(order.orderStatus) && (
              <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowPayment(true)}>
                <DollarSign className="h-4 w-4" />
                Add Payment
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Status flow */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Order Workflow</h3>
          {nextStatus && order.orderStatus !== 'CANCELLED' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => statusMutation.mutate(nextStatus)}
                loading={statusMutation.isPending}
                className={STATUS_CONFIG[nextStatus].color + ' text-white'}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark {STATUS_CONFIG[nextStatus].label}
              </Button>
              {order.orderStatus !== 'DELIVERED' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const reason = prompt('Cancellation reason?');
                    if (reason) cancelMutation.mutate(reason);
                  }}
                  className="bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STATUS_FLOW.map((s, i) => {
            const isActive = i <= currentIdx;
            const isCurrent = i === currentIdx;
            const cfg = STATUS_CONFIG[s];
            return (
              <div key={s} className="flex items-center shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div className={
                    'h-8 w-8 rounded-full flex items-center justify-center text-xs font-extrabold transition ' +
                    (isCurrent ? cfg.color + ' text-white ring-4 ring-purple-200 dark:ring-purple-900 shadow' :
                     isActive ? cfg.color + ' text-white' : 'bg-slate-200 dark:bg-neutral-700 text-slate-500')
                  }>
                    {isActive && !isCurrent ? '✓' : i + 1}
                  </div>
                  <span className={
                    'text-[9px] font-extrabold uppercase ' +
                    (isActive ? cfg.textColor : 'text-slate-400')
                  }>
                    {cfg.label}
                  </span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={'h-0.5 w-6 mx-1 ' + (i < currentIdx ? 'bg-purple-500' : 'bg-slate-200 dark:bg-neutral-700')} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <section className="space-y-4">
          {/* Customer info */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-purple-600" />
              Customer
            </h3>
            <div className="space-y-1 text-sm">
              <div className="font-extrabold text-slate-900 dark:text-white">{order.customerName || '—'}</div>
              {order.customerPhone && (
                <a href={'tel:' + order.customerPhone} className="flex items-center gap-1 text-blue-700 font-bold hover:underline">
                  <Phone className="h-3 w-3" />
                  {order.customerPhone}
                </a>
              )}
              {order.customerNotes && (
                <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-2 text-xs italic text-amber-800">
                  📝 {order.customerNotes}
                </div>
              )}
            </div>
          </div>

          {/* Measurement */}
          {measurement && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Ruler className="h-4 w-4 text-rose-600" />
                Measurements ({measurement.unit})
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
                {['chest', 'waist', 'hip', 'shoulder', 'sleeveLength', 'shirtLength', 'trouserLength', 'inseam', 'kurtaLength', 'shalwarLength'].map((f) => {
                  const val = (measurement as any)[f];
                  if (val === null || val === undefined) return null;
                  return (
                    <div key={f} className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-2 text-center">
                      <div className="text-[8px] uppercase font-extrabold text-slate-500 truncate">{f}</div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{val}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Design instructions */}
          {(order.designInstructions || order.designReferenceUrls?.length > 0) && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-fuchsia-600" />
                Design References
              </h3>
              {order.designReferenceUrls?.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {order.designReferenceUrls.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-purple-500 transition">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
              {order.designInstructions && (
                <div className="rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/30 border border-fuchsia-200 p-3 text-sm text-slate-800 dark:text-slate-200">
                  {order.designInstructions}
                </div>
              )}
            </div>
          )}

          {/* Items */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scissors className="h-5 w-5 text-purple-600" />
                Garments
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-xs font-extrabold text-slate-700">
                {order.items.length} items
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              {order.items.map((item: any) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-extrabold text-purple-700 tabular-nums">{item.quantity}×</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">{item.garmentName}</span>
                        {item.categoryType && (
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-extrabold uppercase">
                            {item.categoryType.replace('_', ' ')}
                          </span>
                        )}
                        {item.size && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 text-[9px] font-extrabold uppercase">
                            Size: {item.size}
                          </span>
                        )}
                        {item.colorName && (
                          <span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 text-[9px] font-extrabold uppercase">
                            {item.colorName}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {item.fabricCost > 0 && (
                          <div><span className="text-slate-500 font-semibold">Fabric:</span> <span className="font-extrabold text-cyan-700">{formatPKR(item.fabricCost)}</span></div>
                        )}
                        {item.stitchingCost > 0 && (
                          <div><span className="text-slate-500 font-semibold">Stitching:</span> <span className="font-extrabold text-purple-700">{formatPKR(item.stitchingCost)}</span></div>
                        )}
                        {item.embroideryCost > 0 && (
                          <div><span className="text-slate-500 font-semibold">Embroidery:</span> <span className="font-extrabold text-fuchsia-700">{formatPKR(item.embroideryCost)}</span></div>
                        )}
                        {item.accessoryCost > 0 && (
                          <div><span className="text-slate-500 font-semibold">Accessories:</span> <span className="font-extrabold text-amber-700">{formatPKR(item.accessoryCost)}</span></div>
                        )}
                      </div>

                      {item.designNotes && (
                        <div className="mt-2 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/30 border border-fuchsia-200 p-2 text-xs italic text-fuchsia-800">
                          🎨 {item.designNotes}
                        </div>
                      )}

                      {item.referenceImageUrls?.length > 0 && (
                        <div className="mt-2 flex gap-1">
                          {item.referenceImageUrls.slice(0, 5).map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(item.total)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sidebar summary */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-purple-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">💰 Bill Summary</div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Fabric</span><span className="font-bold tabular-nums">{formatPKR(order.fabricCharges)}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Stitching</span><span className="font-bold tabular-nums">{formatPKR(order.stitchingCharges)}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Embroidery</span><span className="font-bold tabular-nums">{formatPKR(order.embroideryCharges)}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Accessories</span><span className="font-bold tabular-nums">{formatPKR(order.accessoryCharges)}</span></div>
                {order.taxAmount > 0 && (
                  <div className="flex justify-between"><span className="text-white/70">Tax</span><span className="font-bold tabular-nums">{formatPKR(order.taxAmount)}</span></div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(order.discount)}</span></div>
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

              {!isFullyPaid && order.orderStatus !== 'CANCELLED' && (
                <Button size="lg" className="w-full mt-4 bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowPayment(true)}>
                  <CreditCard className="h-4 w-4" />
                  Add Payment
                </Button>
              )}
            </div>

            {/* Payment history */}
            {(order.payments?.length ?? 0) > 0 && (

              <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-neutral-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payment History</h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {(order.payments ?? []).map((p: any) => (

                    <div key={p.id} className="p-3 text-xs">
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-700 dark:text-slate-300">{p.paymentMethod}</span>
                        <span className="text-emerald-700 tabular-nums">{formatPKR(p.amount)}</span>
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {format(new Date(p.paidAt), 'dd MMM, HH:mm')}
                        {p.reference && ' • ' + p.reference}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {showPayment && (
        <PaymentModal
          orderId={id!}
          remaining={remaining}
          onClose={() => setShowPayment(false)}
          onDone={() => { setShowPayment(false); refetch(); }}
        />
      )}
    </div>
  );
}

function PaymentModal({ orderId, remaining, onClose, onDone }: any) {
  const [amount, setAmount] = useState(remaining);
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');

  const payMutation = useMutation({
    mutationFn: () => tailoringApi.addPayment(orderId, { amount, paymentMethod: method, reference }),
    onSuccess: () => { toast.success('Payment added'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-purple-50 dark:bg-purple-950/30 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 dark:text-white">Add Payment</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-purple-700 mb-1 block">Amount *</label>
            <input
              type="number" step="0.01" autoFocus
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-14 w-full rounded-xl border-2 border-purple-300 bg-purple-50 dark:bg-purple-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-purple-500"
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
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Method</label>
            <div className="grid grid-cols-3 gap-2">
              {['CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK', 'OTHER'].map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={
                  'p-2 rounded-lg border-2 text-xs font-extrabold ' +
                  (method === m ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-800' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800')
                }>{m}</button>
              ))}
            </div>
          </div>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference (optional)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700" onClick={() => payMutation.mutate()} loading={payMutation.isPending} disabled={amount <= 0}>
              <CheckCircle2 className="h-4 w-4" />
              Confirm Payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
