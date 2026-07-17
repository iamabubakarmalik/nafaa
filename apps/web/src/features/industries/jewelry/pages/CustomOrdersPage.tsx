import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Palette, Plus, Search, X, Save, RefreshCw, Sparkles, User, Phone,
  Calendar, ArrowRight, CheckCircle2, Clock, Scale, Star,
} from 'lucide-react';
import { customOrdersApi } from '../api/custom-orders.api';
import { customersApi } from '@/api/customers.api';
import { karigarsApi } from '../api/karigars.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-500', QUOTED: 'bg-blue-500', CONFIRMED: 'bg-cyan-500',
  DESIGNING: 'bg-purple-500', METAL_ISSUED: 'bg-amber-500',
  IN_PRODUCTION: 'bg-orange-500', POLISHING: 'bg-pink-500',
  QUALITY_CHECK: 'bg-fuchsia-500', HALLMARKING: 'bg-emerald-500',
  READY: 'bg-teal-600', DELIVERED: 'bg-green-600',
  CANCELLED: 'bg-rose-500', ON_HOLD: 'bg-yellow-500',
};

const STATUS_FLOW = ['CONFIRMED', 'DESIGNING', 'METAL_ISSUED', 'IN_PRODUCTION', 'POLISHING', 'QUALITY_CHECK', 'HALLMARKING', 'READY', 'DELIVERED'];

export default function CustomOrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [showForm, setShowForm] = useState(false);

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['jewelry-custom-orders', statusFilter, search],
    queryFn: () => customOrdersApi.list({
      status: statusFilter === 'active' || statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
  });

  const filtered = statusFilter === 'active'
    ? orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status))
    : orders;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => customOrdersApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); queryClient.invalidateQueries({ queryKey: ['jewelry-custom-orders'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-pink-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Palette className="h-3.5 w-3.5 text-amber-300" />
              Bespoke Orders
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎨 Custom Jewelry Orders</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Design → Karigar → Hallmark workflow</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order #, customer..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-rose-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['active', 'all', ...STATUS_FLOW, 'CANCELLED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s === 'active' ? '🔥 Active' : s === 'all' ? 'All' : s.replace('_', ' ')}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <CustomOrderForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['jewelry-custom-orders'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Palette className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No custom orders yet</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 gap-4">
          {filtered.map((order) => {
            const currentIdx = STATUS_FLOW.indexOf(order.status);
            const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
            return (
              <div key={order.id} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow shrink-0">
                      <Palette className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold">{order.orderNumber}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + (STATUS_COLORS[order.status] ?? 'bg-slate-500')}>{order.status.replace('_', ' ')}</span>
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-900">{order.customerName}</div>
                      <div className="text-xs text-slate-600 font-bold inline-flex items-center gap-1"><Phone className="h-3 w-3" />{order.customerPhone}</div>
                      <div className="mt-1 text-xs font-extrabold text-rose-600">{order.category} • {order.metalType} {order.purity.replace('KARAT_', '').replace('SILVER_', 'S')}K</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(order.estimatedPrice)}</div>
                    {order.finalPrice && order.finalPrice !== order.estimatedPrice && (
                      <div className="text-xs font-bold text-slate-500">Final: {formatPKR(order.finalPrice)}</div>
                    )}
                    {order.paidAmount > 0 && (
                      <div className="text-[10px] font-extrabold text-emerald-600">Paid: {formatPKR(order.paidAmount)}</div>
                    )}
                  </div>
                </div>

                <div className="text-xs italic text-slate-600 line-clamp-2 border-t border-slate-100 dark:border-neutral-800 pt-2">
                  📝 {order.designDescription}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2 text-center">
                    <div className="text-[9px] uppercase font-extrabold text-blue-700 flex items-center justify-center gap-0.5"><Scale className="h-2.5 w-2.5" />Expected</div>
                    <div className="font-extrabold text-blue-800 tabular-nums">{order.expectedGrossWeight}g</div>
                  </div>
                  {order.assignedKarigarName && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-center">
                      <div className="text-[9px] uppercase font-extrabold text-amber-700">Karigar</div>
                      <div className="font-extrabold text-amber-800 truncate text-[10px]">{order.assignedKarigarName}</div>
                    </div>
                  )}
                  {order.promisedDate && (
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
                      <div className="text-[9px] uppercase font-extrabold text-emerald-700">Due</div>
                      <div className="font-extrabold text-emerald-800 text-[10px]">{format(new Date(order.promisedDate), 'dd MMM')}</div>
                    </div>
                  )}
                </div>

                {order.customerRating && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={'h-3 w-3 ' + (n <= (order.customerRating || 0) ? 'text-amber-500 fill-amber-500' : 'text-slate-300')} />
                      ))}
                    </div>
                    <span className="font-extrabold text-amber-900">{order.customerRating}/5</span>
                  </div>
                )}

                {nextStatus && !['DELIVERED', 'CANCELLED'].includes(order.status) && (
                  <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
                    <button onClick={() => statusMutation.mutate({ id: order.id, status: nextStatus })} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-600 to-pink-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      Mark: {nextStatus.replace('_', ' ')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function CustomOrderForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    customerName: '', customerPhone: '', customerEmail: '',
    promisedDate: '',
    category: 'RING', metalType: 'GOLD', purity: 'KARAT_22', style: 'CUSTOM',
    expectedGrossWeight: 0, expectedNetWeight: 0, expectedMakingCharges: 0,
    advancePayment: 0, estimatedPrice: 0,
    designDescription: '',
    referenceImageUrls: [] as string[],
    hasGemstones: false,
    hasEngraving: false,
    engravingText: '',
    designedBy: '',
    assignedKarigarId: '',
    assignedKarigarName: '',
    internalNotes: '',
  });

  const { data: karigars = [] } = useQuery({
    queryKey: ['karigars-for-order'],
    queryFn: () => karigarsApi.list({ isActive: true }),
  });

  const saveMutation = useMutation({
    mutationFn: () => customOrdersApi.create({
      ...form,
      expectedGrossWeight: Number(form.expectedGrossWeight),
      expectedNetWeight: form.expectedNetWeight ? Number(form.expectedNetWeight) : undefined,
      expectedMakingCharges: form.expectedMakingCharges ? Number(form.expectedMakingCharges) : undefined,
      advancePayment: Number(form.advancePayment) || 0,
      estimatedPrice: Number(form.estimatedPrice) || 0,
    }),
    onSuccess: () => { toast.success('Custom order created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-rose-300 dark:border-rose-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-rose-50 dark:bg-rose-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">🎨 New Custom Order</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
          <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
          <input value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} placeholder="Email (optional)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
          <input type="date" value={form.promisedDate} onChange={(e) => setForm({ ...form, promisedDate: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
            {['RING', 'NECKLACE', 'EARRINGS', 'BANGLE', 'PENDANT', 'CHAIN', 'BRIDAL_SET', 'CHOKER'].map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
          <select value={form.metalType} onChange={(e) => setForm({ ...form, metalType: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
            <option value="GOLD">🥇 Gold</option><option value="SILVER">🥈 Silver</option><option value="PLATINUM">💠 Platinum</option>
          </select>
          <select value={form.purity} onChange={(e) => setForm({ ...form, purity: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
            {['KARAT_24', 'KARAT_22', 'KARAT_21', 'KARAT_18', 'SILVER_925', 'PLATINUM_950'].map((p) => <option key={p} value={p}>{p.replace('KARAT_', '').replace('SILVER_', 'S')}K</option>)}
          </select>
        </div>

        <textarea rows={3} value={form.designDescription} onChange={(e) => setForm({ ...form, designDescription: e.target.value })} placeholder="Design description (mandatory) — describe the design in detail..." className="w-full rounded-xl border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500 resize-none" />

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Reference Images</label>
          {form.referenceImageUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-1 mb-2">
              {form.referenceImageUrls.map((url: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, referenceImageUrls: form.referenceImageUrls.filter((_: any, idx: number) => idx !== i) })} className="absolute top-0 right-0 h-5 w-5 rounded-bl bg-rose-600 text-white flex items-center justify-center">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <UploadDropzone onUploaded={(records) => {
            const urls = Array.isArray(records) ? records.map((r: any) => r.url || r).filter(Boolean) : [(records as any)?.url || records];
            setForm({ ...form, referenceImageUrls: [...form.referenceImageUrls, ...urls] });
          }} />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Expected Gross (g) *</label>
            <input type="number" step="0.01" value={form.expectedGrossWeight} onChange={(e) => setForm({ ...form, expectedGrossWeight: e.target.value })} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Advance (Rs)</label>
            <input type="number" value={form.advancePayment} onChange={(e) => setForm({ ...form, advancePayment: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Estimated Price</label>
            <input type="number" value={form.estimatedPrice} onChange={(e) => setForm({ ...form, estimatedPrice: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Assign Karigar</label>
          <select value={form.assignedKarigarId} onChange={(e) => {
            const k = karigars.find((x) => x.id === e.target.value);
            setForm({ ...form, assignedKarigarId: e.target.value, assignedKarigarName: k?.fullName || '' });
          }} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
            <option value="">-- Select karigar --</option>
            {karigars.map((k) => <option key={k.id} value={k.id}>{k.fullName} ({k.skillLevel || 'N/A'})</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <label className="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer">
            <input type="checkbox" checked={form.hasGemstones} onChange={(e) => setForm({ ...form, hasGemstones: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold">💎 Has Gemstones</span>
          </label>
          <label className="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer">
            <input type="checkbox" checked={form.hasEngraving} onChange={(e) => setForm({ ...form, hasEngraving: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold">✍️ Engraving</span>
          </label>
        </div>
        {form.hasEngraving && (
          <input value={form.engravingText} onChange={(e) => setForm({ ...form, engravingText: e.target.value })} placeholder="Engraving text (e.g. 'M ❤️ S 2024')" className="h-11 w-full rounded-xl border-2 border-purple-300 bg-purple-50 dark:bg-purple-950/30 px-3 text-sm font-bold focus:outline-none focus:border-purple-500" />
        )}

        <textarea rows={2} value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} placeholder="Internal notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-rose-600 to-pink-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.customerName || !form.customerPhone || !form.designDescription}>
            <Save className="h-4 w-4" />
            Create Order
          </Button>
        </div>
      </div>
    </section>
  );
}
