import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, Plus, Search, X, Save, RefreshCw, Sparkles, User,
  Phone, Calendar, DollarSign, Users, MapPin, Building2, Trash2,
} from 'lucide-react';
import { bulkOrdersApi, type BulkOrder } from '../api/bulk-orders.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-500', QUOTED: 'bg-blue-500', CONFIRMED: 'bg-cyan-500',
  DEPOSIT_PAID: 'bg-teal-500', IN_PRODUCTION: 'bg-amber-500', BAKING: 'bg-orange-500',
  DECORATING: 'bg-fuchsia-500', QUALITY_CHECK: 'bg-violet-500', READY: 'bg-emerald-500',
  OUT_FOR_DELIVERY: 'bg-blue-600', DELIVERED: 'bg-green-600',
  CANCELLED: 'bg-rose-500', REFUNDED: 'bg-slate-600',
};

const ORDER_TYPES = [
  { value: 'WEDDING', label: 'Wedding', emoji: '💒' },
  { value: 'CORPORATE', label: 'Corporate', emoji: '💼' },
  { value: 'BIRTHDAY_PARTY', label: 'Birthday Party', emoji: '🎉' },
  { value: 'ANNIVERSARY', label: 'Anniversary', emoji: '💝' },
  { value: 'RELIGIOUS', label: 'Religious Event', emoji: '🕌' },
  { value: 'EDUCATION', label: 'School/College', emoji: '🎓' },
  { value: 'OTHER', label: 'Other', emoji: '⭐' },
];

export default function BulkOrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [showForm, setShowForm] = useState(false);

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bulk-orders', statusFilter, search],
    queryFn: () => bulkOrdersApi.list({
      status: statusFilter === 'active' || statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
  });

  const filtered = statusFilter === 'active'
    ? orders.filter((o) => !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status))
    : orders;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ShoppingBag className="h-3.5 w-3.5 text-amber-300" />
              Bulk & Corporate
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎊 Bulk Orders</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Weddings, corporate events, large gatherings</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Bulk Order
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order #, organization, contact..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-violet-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['active', 'all', 'QUOTED', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'CANCELLED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s === 'active' ? '🔥 Active' : s === 'all' ? 'All' : s.replace('_', ' ')}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <BulkOrderForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['bulk-orders'] }); }} />
      )}

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <ShoppingBag className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No bulk orders</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {filtered.map((order) => <BulkOrderCard key={order.id} order={order} />)}
        </section>
      )}
    </div>
  );
}

function BulkOrderCard({ order }: { order: BulkOrder }) {
  const orderType = ORDER_TYPES.find((t) => t.value === order.orderType);
  const remaining = (order.finalPrice ?? order.quotedPrice) - order.paidAmount;

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow shrink-0 text-3xl">
            {orderType?.emoji || '🎊'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{order.orderNumber}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + STATUS_COLORS[order.status]}>{order.status.replace('_', ' ')}</span>
              <span className="px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950/40 text-violet-700 text-[9px] font-extrabold uppercase">{order.orderType?.replace('_', ' ')}</span>
              {order.paymentStatus === 'PAID' && (
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase">PAID</span>
              )}
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {order.organizationName}
            </div>
            {order.contactPerson && (
              <div className="text-xs text-slate-600 font-bold inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {order.contactPerson}
              </div>
            )}
            <div className="text-xs text-slate-600 font-bold inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {order.contactPhone}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Event Date</div>
          <div className="font-extrabold">{format(new Date(order.eventDate), 'dd MMM yyyy')}</div>
        </div>
        {order.totalGuests && (
          <div>
            <div className="text-[9px] uppercase font-extrabold text-slate-500 inline-flex items-center gap-0.5">
              <Users className="h-2.5 w-2.5" />
              Guests
            </div>
            <div className="font-extrabold">{order.totalGuests}</div>
          </div>
        )}
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Items</div>
          <div className="font-extrabold">{order.totalItems}</div>
        </div>
      </div>

      {order.venue && (
        <div className="text-xs text-slate-500 font-semibold inline-flex items-start gap-1">
          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="line-clamp-1">{order.venue}</span>
        </div>
      )}

      <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-end justify-between">
        <div>
          <div className="text-[10px] font-extrabold text-emerald-700">Paid: {formatPKR(order.paidAmount)}</div>
          {remaining > 0 && (
            <div className="text-[10px] font-extrabold text-amber-700">Due: {formatPKR(remaining)}</div>
          )}
        </div>
        <div className="text-xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(order.finalPrice ?? order.quotedPrice)}</div>
      </div>
    </div>
  );
}

function BulkOrderForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    organizationName: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    orderType: 'WEDDING',
    eventDate: '',
    eventTime: '',
    venue: '',
    totalGuests: '',
    items: [{ name: '', quantity: 1, notes: '' }],
    quotedPrice: 0,
    advancePaid: 0,
    requiresDelivery: true,
    deliveryAddress: '',
    requiresSetup: false,
    setupTime: '',
    specialInstructions: '',
  });

  const addItem = () => setForm({ ...form, items: [...form.items, { name: '', quantity: 1, notes: '' }] });
  const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_: any, idx: number) => idx !== i) });
  const updateItem = (i: number, patch: any) => setForm({ ...form, items: form.items.map((it: any, idx: number) => idx === i ? { ...it, ...patch } : it) });

  const saveMutation = useMutation({
    mutationFn: () => bulkOrdersApi.create({
      ...form,
      totalGuests: form.totalGuests ? Number(form.totalGuests) : undefined,
      quotedPrice: Number(form.quotedPrice) || 0,
      advancePaid: Number(form.advancePaid) || 0,
      items: form.items.filter((it: any) => it.name && Number(it.quantity) > 0),
    }),
    onSuccess: () => { toast.success('Bulk order created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-violet-300 dark:border-violet-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">🎊 New Bulk Order</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} placeholder="Organization/Family name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Contact person" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="Contact phone *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          <input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="Email" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Order Type *</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {ORDER_TYPES.map((t) => (
              <button key={t.value} onClick={() => setForm({ ...form, orderType: t.value })} className={
                'p-3 rounded-xl border-2 text-center transition ' +
                (form.orderType === t.value ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-violet-300')
              }>
                <div className="text-2xl">{t.emoji}</div>
                <div className="text-[10px] font-extrabold mt-1">{t.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Event Date *</label>
            <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Event Time</label>
            <input type="time" value={form.eventTime} onChange={(e) => setForm({ ...form, eventTime: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Total Guests</label>
            <input type="number" value={form.totalGuests} onChange={(e) => setForm({ ...form, totalGuests: e.target.value })} placeholder="0" className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
          </div>
        </div>

        <textarea rows={2} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Venue address" className="w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />

        <div className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 dark:bg-neutral-800/50 flex items-center justify-between">
            <span className="text-sm font-extrabold">Items ({form.items.length})</span>
            <Button size="sm" onClick={addItem} className="bg-gradient-to-r from-violet-600 to-purple-700">
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          <div className="p-3 space-y-2">
            {form.items.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <input value={item.name} onChange={(e) => updateItem(i, { name: e.target.value })} placeholder="Product/cake name" className="flex-1 h-10 rounded-lg border-2 border-slate-200 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-violet-500" />
                <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} placeholder="Qty" className="w-20 h-10 rounded-lg border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
                {form.items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="h-10 w-10 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Quoted Price *</label>
            <input type="number" value={form.quotedPrice} onChange={(e) => setForm({ ...form, quotedPrice: e.target.value })} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Advance Paid</label>
            <input type="number" value={form.advancePaid} onChange={(e) => setForm({ ...form, advancePaid: e.target.value })} placeholder="0" className="h-14 w-full rounded-xl border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/30 px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className={
            'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' +
            (form.requiresDelivery ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'border-slate-200 dark:border-neutral-700')
          }>
            <input type="checkbox" checked={form.requiresDelivery} onChange={(e) => setForm({ ...form, requiresDelivery: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold">🚚 Requires Delivery</span>
          </label>
          <label className={
            'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' +
            (form.requiresSetup ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40' : 'border-slate-200 dark:border-neutral-700')
          }>
            <input type="checkbox" checked={form.requiresSetup} onChange={(e) => setForm({ ...form, requiresSetup: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold">🎨 Requires Setup</span>
          </label>
        </div>

        {form.requiresDelivery && (
          <textarea rows={2} value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} placeholder="Delivery address" className="w-full rounded-xl border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />
        )}

        {form.requiresSetup && (
          <input value={form.setupTime} onChange={(e) => setForm({ ...form, setupTime: e.target.value })} placeholder="Setup time" className="h-11 w-full rounded-xl border-2 border-fuchsia-200 bg-fuchsia-50 dark:bg-fuchsia-950/30 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
        )}

        <textarea rows={3} value={form.specialInstructions} onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })} placeholder="Special instructions..." className="w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.organizationName || !form.contactPhone || !form.eventDate || !form.quotedPrice}>
            <Save className="h-4 w-4" />
            Create Order
          </Button>
        </div>
      </div>
    </section>
  );
}
