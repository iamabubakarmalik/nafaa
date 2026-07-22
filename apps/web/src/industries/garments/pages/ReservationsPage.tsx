import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookmarkPlus, Plus, X, Save, RefreshCw, Sparkles, Clock, User,
  Phone, Package, Search, DollarSign, CheckCircle2, AlertCircle, Ban,
} from 'lucide-react';
import { reservationsApi, type Reservation } from '../api/reservations.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-500',
  CONVERTED_TO_SALE: 'bg-emerald-600',
  EXPIRED: 'bg-slate-500',
  CANCELLED: 'bg-rose-500',
};

export default function ReservationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [showForm, setShowForm] = useState(false);

  const { data: reservations = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['reservations', statusFilter],
    queryFn: () => reservationsApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
    refetchInterval: 60_000,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reservationsApi.cancel(id, reason),
    onSuccess: () => { toast.success('Reservation cancelled'); queryClient.invalidateQueries({ queryKey: ['reservations'] }); },
  });

  const expireMutation = useMutation({
    mutationFn: () => reservationsApi.expireOld(),
    onSuccess: () => { toast.success('Expired reservations updated'); queryClient.invalidateQueries({ queryKey: ['reservations'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Product Reservations
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔖 Reservations</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Hold products for customers with deposit</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => expireMutation.mutate()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <Clock className="h-4 w-4" />
              Expire Old
            </button>
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Reservation
            </Button>
          </div>
        </div>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['ACTIVE', 'all', 'CONVERTED_TO_SALE', 'EXPIRED', 'CANCELLED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (statusFilter === s ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {showForm && (
        <ReservationForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['reservations'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : reservations.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <BookmarkPlus className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No reservations</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 gap-3">
          {reservations.map((r) => {
            const daysLeft = differenceInDays(new Date(r.expiresAt), new Date());
            const isExpiring = r.status === 'ACTIVE' && daysLeft <= 1;
            return (
              <div key={r.id} className={
                'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 space-y-3 ' +
                (isExpiring ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 dark:border-neutral-800')
              }>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-900 dark:text-white">{r.reservationNumber}</span>
                    <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + STATUS_COLORS[r.status]}>
                      {r.status.replace('_', ' ')}
                    </span>
                    {isExpiring && (
                      <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase animate-pulse">
                        Expiring
                      </span>
                    )}
                  </div>
                  {r.status === 'ACTIVE' && (
                    <button
                      onClick={() => {
                        const reason = prompt('Cancellation reason?');
                        if (reason !== null) cancelMutation.mutate({ id: r.id, reason });
                      }}
                      className="h-7 w-7 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-sm space-y-1">
                  {r.customerName && <div className="inline-flex items-center gap-1 font-bold"><User className="h-3 w-3" />{r.customerName}</div>}
                  {r.customerPhone && <div className="inline-flex items-center gap-1 text-xs text-slate-600 font-bold ml-4"><Phone className="h-3 w-3" />{r.customerPhone}</div>}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
                  <div>
                    <div className="text-[9px] uppercase font-extrabold text-slate-500">Qty</div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{r.quantity}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-extrabold text-emerald-700">Total</div>
                    <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(r.quantity * r.unitPrice)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-extrabold text-amber-700">Deposit</div>
                    <div className="text-sm font-extrabold text-amber-700 tabular-nums">{formatPKR(r.depositAmount)}</div>
                  </div>
                </div>

                <div className={
                  'flex items-center gap-1 text-xs font-extrabold ' +
                  (isExpiring ? 'text-rose-700' : 'text-slate-600')
                }>
                  <Clock className="h-3 w-3" />
                  Expires: {format(new Date(r.expiresAt), 'dd MMM, HH:mm')}
                  {r.status === 'ACTIVE' && ' (' + (daysLeft <= 0 ? 'today' : daysLeft + 'd left') + ')'}
                </div>

                {r.notes && <p className="text-xs italic text-slate-500">{r.notes}</p>}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function ReservationForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    customerName: '', customerPhone: '', productId: '', quantity: 1,
    unitPrice: 0, depositAmount: 0, expiresAt: '', notes: '',
  });
  const [productSearch, setProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-reservation', productSearch],
    queryFn: () => productsApi.list({ limit: 30, search: productSearch || undefined }),
    enabled: showProductPicker,
  });

  const saveMutation = useMutation({
    mutationFn: () => reservationsApi.create({
      ...form,
      quantity: Number(form.quantity) || 1,
      unitPrice: Number(form.unitPrice) || 0,
      depositAmount: Number(form.depositAmount) || 0,
      expiresAt: form.expiresAt || undefined,
    }),
    onSuccess: () => { toast.success('Reservation created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-300 dark:border-blue-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">New Reservation</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
        </div>

        {selectedProduct ? (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 p-3 flex items-center gap-3">
            <Package className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 dark:text-white">{selectedProduct.name}</div>
              <div className="text-xs text-slate-600 font-bold">Stock: {selectedProduct.stock} • {formatPKR(selectedProduct.price)}</div>
            </div>
            <button onClick={() => { setSelectedProduct(null); setForm({ ...form, productId: '', unitPrice: 0 }); }} className="text-xs font-extrabold text-blue-600 hover:underline">
              Change
            </button>
          </div>
        ) : (
          <div>
            <button onClick={() => setShowProductPicker(!showProductPicker)} className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 dark:border-neutral-600 bg-slate-50 dark:bg-neutral-800 text-sm font-extrabold text-slate-600 hover:border-blue-400">
              <Search className="h-4 w-4 inline mr-1" />
              Select Product *
            </button>
            {showProductPicker && (
              <div className="mt-2 rounded-xl border-2 border-blue-300 bg-blue-50/50 p-3 space-y-2">
                <input autoFocus value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products..." className="h-10 w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {(productsData?.items ?? []).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        setForm({ ...form, productId: p.id, unitPrice: p.price });
                        setShowProductPicker(false);
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white dark:hover:bg-neutral-800 text-left"
                    >
                      <Package className="h-3.5 w-3.5 text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-extrabold truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold">Stock: {p.stock} • {formatPKR(p.price)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Qty</label>
            <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="h-11 w-full rounded-xl border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 px-3 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Unit Price</label>
            <input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Deposit</label>
            <input type="number" value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Expires At (default: 7 days)</label>
          <input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.productId}>
            <Save className="h-4 w-4" />
            Create Reservation
          </Button>
        </div>
      </div>
    </section>
  );
}
