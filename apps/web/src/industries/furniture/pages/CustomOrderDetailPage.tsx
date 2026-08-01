import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList, User, Phone, MapPin, Calendar, DollarSign, Hammer, CheckCircle2, XCircle, Clock, Edit3, Trash2, Save, Image as ImageIcon, TrendingUp, Truck, Sparkles, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import { customOrdersApi, type FurnitureOrderStatus } from '../api/custom-orders.api';
import { carpentersApi } from '../api/carpenters.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';

const STATUS_META: Record<FurnitureOrderStatus, { label: string; color: string; bg: string }> = {
  QUOTATION: { label: 'Quotation', color: 'text-slate-700', bg: 'bg-slate-100' },
  DEPOSIT_PAID: { label: 'Deposit Paid', color: 'text-blue-700', bg: 'bg-blue-100' },
  IN_PRODUCTION: { label: 'In Production', color: 'text-amber-700', bg: 'bg-amber-100' },
  READY_FOR_DELIVERY: { label: 'Ready', color: 'text-violet-700', bg: 'bg-violet-100' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'text-cyan-700', bg: 'bg-cyan-100' },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  ASSEMBLED: { label: 'Assembled', color: 'text-teal-700', bg: 'bg-teal-100' },
  COMPLETED: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100' },
  CANCELLED: { label: 'Cancelled', color: 'text-slate-700', bg: 'bg-slate-100' },
  REFUNDED: { label: 'Refunded', color: 'text-rose-700', bg: 'bg-rose-100' },
};

export default function CustomOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showPayment, setShowPayment] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['custom-order', id], queryFn: () => customOrdersApi.getOne(id!), enabled: !!id,
  });

  const { data: carpenters = [] } = useQuery({
    queryKey: ['carpenters-active'], queryFn: () => carpentersApi.list({ active: true }),
  });

  const approve = useMutation({
    mutationFn: (finalPrice?: number) => customOrdersApi.approve(id!, finalPrice),
    onSuccess: () => { toast.success('Order approved'); qc.invalidateQueries({ queryKey: ['custom-order', id] }); },
  });

  const updateStatus = useMutation({
    mutationFn: (data: any) => customOrdersApi.updateStatus(id!, data),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['custom-order', id] }); },
  });

  const remove = useMutation({
    mutationFn: () => customOrdersApi.remove(id!),
    onSuccess: () => { toast.success('Order deleted'); navigate('/furniture/custom-orders'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  if (isLoading || !order) {
    return <div className="flex items-center justify-center py-24"><div className="h-12 w-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" /></div>;
  }

  const meta = STATUS_META[order.status];
  const isOverdue = order.expectedDeliveryDate && new Date(order.expectedDeliveryDate) < new Date() && !['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status);

  return (
    <div className="space-y-5">
      {showPayment && <PaymentModal orderId={id!} order={order} onClose={() => setShowPayment(false)}
        onSuccess={() => { setShowPayment(false); qc.invalidateQueries({ queryKey: ['custom-order', id] }); }} />}
      {showProgress && <ProgressModal orderId={id!} order={order} onClose={() => setShowProgress(false)}
        onSuccess={() => { setShowProgress(false); qc.invalidateQueries({ queryKey: ['custom-order', id] }); }} />}
      {showAssign && <AssignCarpenterModal orderId={id!} carpenters={carpenters as any[]} onClose={() => setShowAssign(false)}
        onSuccess={() => { setShowAssign(false); qc.invalidateQueries({ queryKey: ['custom-order', id] }); }} />}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/furniture/custom-orders')} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-700 font-bold">
          <ArrowLeft className="h-4 w-4" /> All Orders
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => { if (confirm('Delete this order?')) remove.mutate(); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border-2 border-rose-200 hover:bg-rose-100 text-rose-700 text-sm font-extrabold">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-800 text-white shadow-2xl p-6">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <ClipboardList className="h-3.5 w-3.5 text-amber-300" /> Custom Order
            <span className="text-white/40">•</span>
            <span className="font-mono">{order.orderNumber}</span>
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{order.productType}</h1>
          <p className="mt-2 text-sm text-white/85 line-clamp-2">{order.description}</p>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase inline-flex items-center gap-1 ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
            {isOverdue && (
              <span className="px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-extrabold">
                OVERDUE
              </span>
            )}
            {order.progressPct > 0 && order.progressPct < 100 && (
              <span className="px-3 py-1 rounded-full bg-amber-500/30 backdrop-blur border border-amber-300/40 text-xs font-extrabold">
                {order.progressPct}% complete
              </span>
            )}
          </div>

          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            <HeroStat icon={DollarSign} label="Total Price" value={formatPKR(order.finalPrice ?? order.quotedPrice)} sub="Quoted" tone="emerald" />
            <HeroStat icon={TrendingUp} label="Balance Due" value={formatPKR(order.balanceAmount)} sub={`Paid ${formatPKR(order.totalPaid)}`} tone={order.balanceAmount > 0 ? 'amber' : 'emerald'} />
            <HeroStat icon={Calendar} label="Est. Days" value={String(order.estimatedDays)} sub={order.expectedDeliveryDate ? `Due ${new Date(order.expectedDeliveryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}` : 'Not set'} tone="blue" />
          </div>
        </div>
      </section>

      {/* Progress bar */}
      {order.progressPct > 0 && (
        <section className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-extrabold text-slate-900">Production Progress</div>
            <div className="text-lg font-extrabold text-violet-700 tabular-nums">{order.progressPct}%</div>
          </div>
          <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 via-purple-600 to-purple-700 transition-all"
              style={{ width: `${order.progressPct}%` }} />
          </div>
        </section>
      )}

      {/* Actions */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {order.status === 'QUOTATION' && (
          <ActionCard onClick={() => approve.mutate(undefined)} icon={CheckCircle2} label="Approve" desc="Convert to order" tone="emerald" />
        )}
        {(order.balanceAmount > 0 || !order.depositPaid) && (
          <ActionCard onClick={() => setShowPayment(true)} icon={DollarSign} label="Record Payment" desc={order.depositPaid ? 'Add payment' : 'Take deposit'} tone="amber" />
        )}
        {!order.carpenterId && ['DEPOSIT_PAID', 'IN_PRODUCTION'].includes(order.status) && (
          <ActionCard onClick={() => setShowAssign(true)} icon={Hammer} label="Assign Carpenter" desc="Send to workshop" tone="violet" />
        )}
        {['IN_PRODUCTION', 'DEPOSIT_PAID'].includes(order.status) && (
          <ActionCard onClick={() => setShowProgress(true)} icon={Camera} label="Update Progress" desc="Add photos & %" tone="blue" />
        )}
        {order.status === 'READY_FOR_DELIVERY' && (
          <ActionCard onClick={() => updateStatus.mutate({ status: 'OUT_FOR_DELIVERY' })} icon={Truck} label="Dispatch" desc="Send for delivery" tone="cyan" />
        )}
        {order.status === 'DELIVERED' && (
          <ActionCard onClick={() => updateStatus.mutate({ status: 'COMPLETED' })} icon={CheckCircle2} label="Mark Completed" desc="Close order" tone="emerald" />
        )}
        {!['CANCELLED', 'COMPLETED', 'REFUNDED'].includes(order.status) && (
          <ActionCard onClick={() => {
            const reason = prompt('Cancellation reason:');
            if (reason) updateStatus.mutate({ status: 'CANCELLED', cancellationReason: reason });
          }} icon={XCircle} label="Cancel" desc="Cancel order" tone="rose" />
        )}
      </section>

      {/* Info Cards */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Customer */}
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <User className="h-5 w-5" />
            </div>
            <h3 className="font-extrabold text-slate-900">Customer Details</h3>
          </div>
          <div className="p-5 space-y-3">
            <Row icon={User} label="Name" value={order.customerName} />
            <Row icon={Phone} label="Phone" value={order.customerPhone} />
            {order.customerCnic && <Row icon={ClipboardList} label="CNIC" value={order.customerCnic} mono />}
            {order.customerAddress && <Row icon={MapPin} label="Address" value={order.customerAddress} />}
          </div>
        </section>

        {/* Product Specs */}
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-800 text-white flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-extrabold text-slate-900">Product Specifications</h3>
          </div>
          <div className="p-5 space-y-2">
            {order.material && <Row label="Material" value={order.material.replace(/_/g, ' ')} />}
            {order.woodType && <Row label="Wood Type" value={order.woodType} />}
            {order.colorRequested && <Row label="Color" value={order.colorRequested} />}
            {order.polishRequested && <Row label="Polish" value={order.polishRequested} />}
            {order.upholsteryFabric && <Row label="Fabric" value={order.upholsteryFabric} />}
            {(order.lengthCm || order.widthCm || order.heightCm) && (
              <Row label="Dimensions" value={`${order.lengthCm || '—'} × ${order.widthCm || '—'} × ${order.heightCm || '—'} cm`} />
            )}
            {order.customDimensions && <Row label="Custom Dims" value={order.customDimensions} />}
          </div>
        </section>
      </div>

      {/* Payment Info */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
            <DollarSign className="h-5 w-5" />
          </div>
          <h3 className="font-extrabold text-slate-900">Payment Details</h3>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <PayBox label="Quoted" value={formatPKR(order.quotedPrice)} tone="slate" />
          <PayBox label="Final Price" value={order.finalPrice ? formatPKR(order.finalPrice) : '—'} tone="blue" />
          <PayBox label="Total Paid" value={formatPKR(order.totalPaid)} tone="emerald" />
          <PayBox label="Balance Due" value={formatPKR(order.balanceAmount)} tone={order.balanceAmount > 0 ? 'rose' : 'emerald'} />
        </div>
      </section>

      {/* Sketches & Progress Photos */}
      {(order.sketchUrls?.length > 0 || order.referenceImages?.length > 0 || order.progressPhotos?.length > 0) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-rose-50 to-red-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-md">
              <ImageIcon className="h-5 w-5" />
            </div>
            <h3 className="font-extrabold text-slate-900">Images</h3>
          </div>
          <div className="p-5 space-y-4">
            {order.sketchUrls?.length > 0 && (
              <div>
                <div className="text-xs font-extrabold text-slate-600 mb-2">Sketches</div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {order.sketchUrls.map((url, i) => (
                    <a key={url + i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-rose-400">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {order.referenceImages?.length > 0 && (
              <div>
                <div className="text-xs font-extrabold text-slate-600 mb-2">Reference Images</div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {order.referenceImages.map((url, i) => (
                    <a key={url + i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-rose-400">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {order.progressPhotos?.length > 0 && (
              <div>
                <div className="text-xs font-extrabold text-slate-600 mb-2">Progress Photos ({order.progressPhotos.length})</div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {order.progressPhotos.map((url, i) => (
                    <a key={url + i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border-2 border-emerald-200 hover:border-emerald-400">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Carpenter */}
      {order.carpenterId && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-orange-50 to-red-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-700 text-white flex items-center justify-center shadow-md">
              <Hammer className="h-5 w-5" />
            </div>
            <h3 className="font-extrabold text-slate-900">Carpenter Assignment</h3>
          </div>
          <div className="p-5 space-y-2">
            <Row icon={Hammer} label="Carpenter" value={order.carpenterName || '—'} />
            {order.workshopLocation && <Row icon={MapPin} label="Workshop" value={order.workshopLocation} />}
            {order.productionStartDate && <Row icon={Calendar} label="Started" value={new Date(order.productionStartDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })} />}
          </div>
        </section>
      )}
    </div>
  );
}

function PaymentModal({ orderId, order, onClose, onSuccess }: any) {
  const [amount, setAmount] = useState(order.balanceAmount || 0);
  const [isDeposit, setIsDeposit] = useState(!order.depositPaid);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [reference, setReference] = useState('');

  const record = useMutation({
    mutationFn: () => customOrdersApi.recordPayment(orderId, { amount, paymentMethod, isDeposit, reference: reference || undefined }),
    onSuccess: () => { toast.success('Payment recorded'); onSuccess(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">💰 Record Payment</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 text-sm">
            <div className="flex justify-between font-bold"><span>Total</span><span>{formatPKR(order.finalPrice ?? order.quotedPrice)}</span></div>
            <div className="flex justify-between font-bold text-emerald-700"><span>Paid</span><span>{formatPKR(order.totalPaid)}</span></div>
            <div className="pt-1 border-t border-slate-200 flex justify-between font-extrabold text-rose-700">
              <span>Balance</span><span>{formatPKR(order.balanceAmount)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Amount</label>
            <input type="number" autoFocus value={amount} onChange={(e) => setAmount(Number(e.target.value))}
              className="h-16 w-full rounded-2xl border-4 border-emerald-400 bg-emerald-50 px-4 text-3xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600" />
          </div>

          <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 cursor-pointer">
            <input type="checkbox" checked={isDeposit} onChange={(e) => setIsDeposit(e.target.checked)} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold">This is the initial deposit</span>
          </label>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Payment Method</label>
            <div className="grid grid-cols-4 gap-1.5">
              {['CASH', 'CARD', 'BANK', 'MOBILE'].map((m) => (
                <button key={m} onClick={() => setPaymentMethod(m)}
                  className={`h-11 rounded-xl text-xs font-extrabold ${paymentMethod === m ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <input value={reference} onChange={(e) => setReference(e.target.value)}
            placeholder="Reference / receipt # (optional)"
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700"
            onClick={() => record.mutate()} loading={record.isPending} disabled={amount <= 0}>
            <DollarSign className="h-4 w-4" /> Record
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProgressModal({ orderId, order, onClose, onSuccess }: any) {
  const [progressPct, setProgressPct] = useState(order.progressPct || 0);
  const [updateNote, setUpdateNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const update = useMutation({
    mutationFn: () => customOrdersApi.updateProgress(orderId, { progressPct, updateNote: updateNote || undefined, progressPhotos: photos.length > 0 ? photos : undefined }),
    onSuccess: () => { toast.success('Progress updated'); onSuccess(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">📸 Update Progress</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">Completion Percentage</label>
            <input type="range" min="0" max="100" value={progressPct} onChange={(e) => setProgressPct(Number(e.target.value))} className="w-full" />
            <div className="mt-2 text-center text-4xl font-extrabold text-blue-700 tabular-nums">{progressPct}%</div>
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Update Note</label>
            <textarea rows={2} value={updateNote} onChange={(e) => setUpdateNote(e.target.value)}
              placeholder="What was done today..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Progress Photos</label>
            <UploadDropzone purpose="progress-photo" maxFiles={5}
              onUploaded={(recs: any[]) => setPhotos([...photos, ...recs.map((r) => r.url)])} />
            {photos.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {photos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setPhotos(photos.filter((_, x) => x !== i))}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700"
            onClick={() => update.mutate()} loading={update.isPending}>
            <Save className="h-4 w-4" /> Update
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssignCarpenterModal({ orderId, carpenters, onClose, onSuccess }: any) {
  const [carpenterId, setCarpenterId] = useState('');
  const [workshopLocation, setWorkshopLocation] = useState('');

  const assign = useMutation({
    mutationFn: () => customOrdersApi.assignCarpenter(orderId, carpenterId, workshopLocation || undefined),
    onSuccess: () => { toast.success('Carpenter assigned'); onSuccess(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-orange-600 to-red-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">🔨 Assign Carpenter</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Carpenter *</label>
            <select value={carpenterId} onChange={(e) => setCarpenterId(e.target.value)}
              className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-orange-500">
              <option value="">Select carpenter</option>
              {carpenters.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name} — {c.activeProjects} active projects</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Workshop Location</label>
            <input value={workshopLocation} onChange={(e) => setWorkshopLocation(e.target.value)}
              placeholder="Main workshop"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          </div>
        </div>
        <div className="px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-orange-600 to-red-700"
            onClick={() => assign.mutate()} loading={assign.isPending} disabled={!carpenterId}>
            <Hammer className="h-4 w-4" /> Assign
          </Button>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-4`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-2xl font-extrabold text-white tabular-nums leading-none">{value}</div>
      {sub && <div className="text-[10px] font-bold text-white/70 mt-1">{sub}</div>}
    </div>
  );
}

function ActionCard({ onClick, icon: Icon, label, desc, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-700', amber: 'from-amber-500 to-orange-700',
    violet: 'from-violet-500 to-purple-700', blue: 'from-blue-500 to-cyan-700',
    cyan: 'from-cyan-500 to-blue-700', rose: 'from-rose-500 to-red-700',
  };
  return (
    <button onClick={onClick} className="rounded-2xl bg-white border-2 border-slate-200 hover:border-violet-400 hover:shadow-lg hover:-translate-y-0.5 transition-all p-4 text-left">
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md mb-2`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-extrabold text-slate-900 text-sm">{label}</div>
      <div className="text-[10px] text-slate-500 font-semibold">{desc}</div>
    </button>
  );
}

function Row({ icon: Icon, label, value, mono }: any) {
  return (
    <div className="flex items-start gap-3 text-sm">
      {Icon && <Icon className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
        <div className={`font-extrabold text-slate-900 ${mono ? 'font-mono' : ''} break-words`}>{value}</div>
      </div>
    </div>
  );
}

function PayBox({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 border-slate-200 text-slate-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    rose: 'bg-rose-50 border-rose-200 text-rose-800',
  };
  return (
    <div className={`rounded-xl border-2 p-3 ${tones[tone]}`}>
      <div className="text-[10px] uppercase font-extrabold opacity-75">{label}</div>
      <div className="text-lg font-extrabold tabular-nums mt-1">{value}</div>
    </div>
  );
}
