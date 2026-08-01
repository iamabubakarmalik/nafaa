import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, Search, X, RefreshCw, Package, Truck, Clock,
  CheckCircle2, XCircle, Eye, Phone, MapPin, Calendar,
  AlertTriangle, Download, Filter, ArrowRight, User, MessageCircle,
  Sunrise, Sun, Sunset, Zap, Store, Heart, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { floristOrdersApi, type FloristOrderStatus } from '../api/orders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<FloristOrderStatus, { l: string; cls: string; icon: any }> = {
  DRAFT: { l: 'Draft', cls: 'bg-slate-100 text-slate-700', icon: Clock },
  CONFIRMED: { l: 'Confirmed', cls: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  IN_PREPARATION: { l: 'Preparing', cls: 'bg-amber-100 text-amber-700', icon: Package },
  READY_FOR_DELIVERY: { l: 'Ready', cls: 'bg-violet-100 text-violet-700', icon: Package },
  OUT_FOR_DELIVERY: { l: 'Out for Delivery', cls: 'bg-pink-100 text-pink-700', icon: Truck },
  DELIVERED: { l: 'Delivered', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  CANCELLED: { l: 'Cancelled', cls: 'bg-rose-100 text-rose-700', icon: XCircle },
  REFUNDED: { l: 'Refunded', cls: 'bg-orange-100 text-orange-700', icon: XCircle },
};

const SLOT_META: Record<string, { l: string; e: string; cls: string; icon: any }> = {
  MORNING: { l: 'Morning', e: '🌅', cls: 'bg-amber-100 text-amber-700', icon: Sunrise },
  AFTERNOON: { l: 'Afternoon', e: '☀️', cls: 'bg-blue-100 text-blue-700', icon: Sun },
  EVENING: { l: 'Evening', e: '🌆', cls: 'bg-violet-100 text-violet-700', icon: Sunset },
  EXPRESS: { l: 'Express', e: '⚡', cls: 'bg-rose-100 text-rose-700', icon: Zap },
  SCHEDULED: { l: 'Scheduled', e: '📅', cls: 'bg-slate-100 text-slate-700', icon: Calendar },
};

const ORDER_TYPE_META: Record<string, { l: string; e: string }> = {
  WALK_IN: { l: 'Walk-in', e: '🏪' },
  PHONE_ORDER: { l: 'Phone', e: '📞' },
  DELIVERY: { l: 'Delivery', e: '🚚' },
  EVENT_ORDER: { l: 'Event', e: '💒' },
  CORPORATE: { l: 'Corporate', e: '🏢' },
  SUBSCRIPTION: { l: 'Subscription', e: '🔄' },
  ONLINE: { l: 'Online', e: '🌐' },
};

export default function FloristOrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['florist-orders-list', statusFilter, orderTypeFilter, dateFilter],
    queryFn: () => floristOrdersApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      orderType: orderTypeFilter === 'all' ? undefined : orderTypeFilter,
      scheduledDate: dateFilter || undefined,
    }),
    refetchInterval: 45_000,
  });

  const { data: summary } = useQuery({
    queryKey: ['florist-orders-summary-page'],
    queryFn: () => floristOrdersApi.summary(),
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter((o) =>
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.customerPhone || '').includes(q) ||
      (o.recipientName || '').toLowerCase().includes(q) ||
      (o.recipientPhone || '').includes(q)
    );
  }, [orders, search]);

  const stats = summary?.counts ?? { draft: 0, confirmed: 0, inPrep: 0, ready: 0, outForDelivery: 0, delivered: 0 };

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => floristOrdersApi.updateStatus(id, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['florist-orders-list'] });
      qc.invalidateQueries({ queryKey: ['florist-orders-summary-page'] });
      qc.invalidateQueries({ queryKey: ['florist-dashboard-overview'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => floristOrdersApi.remove(id),
    onSuccess: () => {
      toast.success('Order deleted');
      qc.invalidateQueries({ queryKey: ['florist-orders-list'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const exportCSV = () => {
    if (!filtered.length) return toast.error('Nothing to export');
    const head = ['Order #', 'Type', 'Customer', 'Phone', 'Recipient', 'City', 'Date', 'Slot', 'Status', 'Total', 'Paid'];
    const rows = filtered.map((o) => [
      o.orderNumber, o.orderType, o.customerName, o.customerPhone,
      o.recipientName || '', o.city || '',
      o.scheduledDeliveryDate ? new Date(o.scheduledDeliveryDate).toLocaleDateString('en-PK') : '',
      o.deliveryTimeSlot || '', o.status,
      Number(o.totalAmount || 0).toFixed(2), Number(o.advancePaid || 0).toFixed(2),
    ]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `florist-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-5">
      {selected && (
        <OrderDetailModal order={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => {
            qc.invalidateQueries({ queryKey: ['florist-orders-list'] });
            setSelected(null);
          }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ShoppingBag className="h-3.5 w-3.5 text-amber-300" /> Florist Orders
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📦 Orders</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.confirmed + stats.inPrep + stats.ready + stats.outForDelivery} active • {stats.delivered} delivered
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard label="Confirmed" value={stats.confirmed} icon={CheckCircle2} tone="blue" onClick={() => setStatusFilter('CONFIRMED')} />
        <StatCard label="Preparing" value={stats.inPrep} icon={Package} tone="amber" onClick={() => setStatusFilter('IN_PREPARATION')} />
        <StatCard label="Ready" value={stats.ready} icon={Package} tone="violet" onClick={() => setStatusFilter('READY_FOR_DELIVERY')} />
        <StatCard label="Out for Delivery" value={stats.outForDelivery} icon={Truck} tone="pink" onClick={() => setStatusFilter('OUT_FOR_DELIVERY')} />
        <StatCard label="Delivered" value={stats.delivered} icon={CheckCircle2} tone="emerald" onClick={() => setStatusFilter('DELIVERED')} />
        <StatCard label="Draft" value={stats.draft} icon={Clock} tone="slate" onClick={() => setStatusFilter('DRAFT')} />
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Order #, customer, phone, recipient..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
            className="h-12 rounded-2xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
          {dateFilter && (
            <button onClick={() => setDateFilter('')}
              className="h-12 px-3 rounded-2xl border-2 border-slate-200 hover:border-rose-300 text-sm font-bold text-slate-700">
              Clear date
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {['all', ...Object.keys(STATUS_META)].map((v) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                statusFilter === v ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-600'}`}>
              {v === 'all' ? 'All' : STATUS_META[v as FloristOrderStatus]?.l || v}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          <span className="shrink-0 self-center px-2 text-[10px] uppercase font-extrabold text-slate-500">Type:</span>
          {['all', ...Object.keys(ORDER_TYPE_META)].map((v) => (
            <button key={v} onClick={() => setOrderTypeFilter(v)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                orderTypeFilter === v ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600'}`}>
              {v === 'all' ? 'All' : `${ORDER_TYPE_META[v].e} ${ORDER_TYPE_META[v].l}`}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <ShoppingBag className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">
            {statusFilter === 'all' ? 'No orders yet' : 'No orders match filter'}
          </h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Create orders from the POS
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o}
              onView={() => setSelected(o)}
              onQuickStatus={(status: any) => updateStatus.mutate({ id: o.id, status })}
              onDelete={() => { if (confirm(`Delete order ${o.orderNumber}?`)) remove.mutate(o.id); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onView, onQuickStatus, onDelete }: any) {
  const meta = STATUS_META[order.status as FloristOrderStatus];
  const StatusIcon = meta.icon;
  const slot = order.deliveryTimeSlot ? SLOT_META[order.deliveryTimeSlot] : null;
  const orderType = ORDER_TYPE_META[order.orderType] || ORDER_TYPE_META.WALK_IN;

  const nextStatus: Record<string, string> = {
    DRAFT: 'CONFIRMED',
    CONFIRMED: 'IN_PREPARATION',
    IN_PREPARATION: 'READY_FOR_DELIVERY',
    READY_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    OUT_FOR_DELIVERY: 'DELIVERED',
  };
  const nextLabel: Record<string, string> = {
    DRAFT: 'Confirm',
    CONFIRMED: 'Start Prep',
    IN_PREPARATION: 'Mark Ready',
    READY_FOR_DELIVERY: 'Dispatch',
    OUT_FOR_DELIVERY: 'Delivered',
  };

  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 hover:shadow-md transition">
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className={`h-14 w-14 rounded-2xl ${meta.cls} flex items-center justify-center shrink-0`}>
          <StatusIcon className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-extrabold text-slate-900 text-sm">{order.orderNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${meta.cls}`}>
              <StatusIcon className="h-2.5 w-2.5" /> {meta.l}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-extrabold">
              {orderType.e} {orderType.l}
            </span>
            {slot && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${slot.cls}`}>
                {slot.e} {slot.l}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs text-slate-600 font-bold">
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {order.customerName}</span>
            <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {order.customerPhone}</span>
          </div>

          {order.recipientName && (
            <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-pink-700 font-bold">
              <span className="inline-flex items-center gap-1">
                <Truck className="h-3 w-3" /> To: <strong>{order.recipientName}</strong>
              </span>
              {order.city && (<span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {order.city}{order.area ? `, ${order.area}` : ''}</span>)}
            </div>
          )}

          {order.messageCard && (
            <div className="mt-1 text-[11px] text-violet-700 font-semibold italic line-clamp-1 flex items-center gap-1">
              <MessageCircle className="h-2.5 w-2.5" /> "{order.messageCard}"
            </div>
          )}

          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500 font-bold">
            {order.scheduledDeliveryDate && (
              <span className="inline-flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5" />
                {new Date(order.scheduledDeliveryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                {order.scheduledDeliveryTime && ` @ ${order.scheduledDeliveryTime}`}
              </span>
            )}
            <span>{Array.isArray(order.items) ? order.items.length : 0} items</span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">Total</div>
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(order.totalAmount)}</div>
          {order.advancePaid > 0 && (
            <div className="text-[10px] font-bold text-slate-500">Paid {formatPKR(order.advancePaid)}</div>
          )}
          {order.totalAmount > order.advancePaid && (
            <div className="text-[10px] font-bold text-amber-700 mt-0.5">
              Balance {formatPKR(order.totalAmount - order.advancePaid)}
            </div>
          )}
          <div className="mt-2 flex gap-1 justify-end">
            {nextStatus[order.status] && (
              <button onClick={() => onQuickStatus(nextStatus[order.status])}
                className="h-9 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold inline-flex items-center gap-1">
                <ArrowRight className="h-3.5 w-3.5" /> {nextLabel[order.status]}
              </button>
            )}
            <button onClick={onView}
              className="h-9 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> View
            </button>
            {order.status !== 'DELIVERED' && (
              <button onClick={onDelete}
                className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderDetailModal({ order, onClose, onUpdate }: any) {
  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState('');

  const update = useMutation({
    mutationFn: () => floristOrdersApi.updateStatus(order.id, { status: status as FloristOrderStatus, notes: notes || undefined }),
    onSuccess: () => { toast.success('Updated'); onUpdate(); },
  });

  const confirmDelivery = useMutation({
    mutationFn: () => floristOrdersApi.confirmDelivery(order.id, {}),
    onSuccess: () => { toast.success('Delivery confirmed'); onUpdate(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Order Details</div>
            <h3 className="text-xl font-extrabold font-mono">{order.orderNumber}</h3>
          </div>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoBox label="Customer" value={order.customerName} />
            <InfoBox label="Phone" value={order.customerPhone} />
            {order.recipientName && <InfoBox label="Recipient" value={order.recipientName} />}
            {order.recipientPhone && <InfoBox label="Recipient Phone" value={order.recipientPhone} />}
            {order.city && <InfoBox label="City" value={order.city} />}
            {order.area && <InfoBox label="Area" value={order.area} />}
          </div>

          {order.deliveryAddress && (
            <div>
              <Lbl>Delivery Address</Lbl>
              <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 text-sm font-semibold text-slate-700">
                {order.deliveryAddress}
                {order.landmark && <div className="mt-1 text-xs text-slate-500">Landmark: {order.landmark}</div>}
              </div>
            </div>
          )}

          {order.messageCard && (
            <div>
              <Lbl>Message Card</Lbl>
              <div className="rounded-xl bg-violet-50 border-2 border-violet-200 p-3 text-sm font-semibold text-violet-800 italic">
                "{order.messageCard}"
                {order.senderName && <div className="mt-1 text-xs text-violet-600 not-italic">— From: {order.senderName}</div>}
                {order.isAnonymous && <div className="mt-1 text-xs text-violet-600 not-italic">— Anonymous sender</div>}
              </div>
            </div>
          )}

          {order.eventName && (
            <div className="grid sm:grid-cols-2 gap-3">
              <InfoBox label="Event" value={order.eventName} />
              {order.eventVenue && <InfoBox label="Venue" value={order.eventVenue} />}
            </div>
          )}

          {order.specialInstructions && (
            <div>
              <Lbl>Special Instructions</Lbl>
              <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 text-sm font-semibold text-amber-900">
                {order.specialInstructions}
              </div>
            </div>
          )}

          <div>
            <Lbl>Items ({Array.isArray(order.items) ? order.items.length : 0})</Lbl>
            <div className="rounded-xl border-2 border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase text-slate-600">Product</th>
                    <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase text-slate-600">Qty</th>
                    <th className="px-3 py-2 text-right text-[10px] font-extrabold uppercase text-slate-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(order.items ?? []).map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-900">{it.productName}</div>
                        {it.customization && <div className="text-[10px] font-semibold text-violet-700">✨ {it.customization}</div>}
                      </td>
                      <td className="px-3 py-2 text-right font-bold">{it.quantity}</td>
                      <td className="px-3 py-2 text-right font-extrabold text-emerald-700">{formatPKR(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-4 space-y-1.5">
            <BillRow label="Subtotal" value={formatPKR(order.subtotal)} />
            {order.discountAmount > 0 && <BillRow label="Discount" value={`-${formatPKR(order.discountAmount)}`} tone="amber" />}
            {order.deliveryCharge > 0 && <BillRow label="Delivery" value={formatPKR(order.deliveryCharge)} />}
            {order.wrappingCharge > 0 && <BillRow label="Wrapping" value={formatPKR(order.wrappingCharge)} />}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm font-extrabold uppercase text-slate-700">Total</span>
              <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(order.totalAmount)}</span>
            </div>
            {order.advancePaid > 0 && <BillRow label="Paid" value={formatPKR(order.advancePaid)} tone="emerald" />}
            {order.totalAmount > order.advancePaid && (
              <BillRow label="Balance Due" value={formatPKR(order.totalAmount - order.advancePaid)} tone="rose" />
            )}
          </div>

          <div>
            <Lbl>Update Status</Lbl>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500">
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
          </div>

          <div>
            <Lbl>Notes <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-500" />
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
          {order.status === 'OUT_FOR_DELIVERY' && (
            <Button className="flex-1 bg-emerald-600"
              onClick={() => confirmDelivery.mutate()} loading={confirmDelivery.isPending}>
              <CheckCircle2 className="h-4 w-4" /> Confirm Delivery
            </Button>
          )}
          <Button className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600"
            onClick={() => update.mutate()} loading={update.isPending}>
            Update Status
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-blue-700', amber: 'from-amber-500 to-orange-600',
    violet: 'from-violet-500 to-purple-700', pink: 'from-pink-500 to-rose-600',
    emerald: 'from-emerald-500 to-emerald-700', slate: 'from-slate-500 to-slate-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick}
      className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-pink-300 hover:shadow-md transition' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </C>
  );
}

function InfoBox({ label, value }: any) {
  return (
    <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="text-sm font-extrabold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}
function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
function BillRow({ label, value, tone }: any) {
  const tones: Record<string, string> = { emerald: 'text-emerald-700', rose: 'text-rose-700', amber: 'text-amber-700' };
  return (
    <div className="flex items-center justify-between text-sm font-bold">
      <span className="text-slate-600">{label}</span>
      <span className={`tabular-nums font-extrabold ${tone ? tones[tone] : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}
