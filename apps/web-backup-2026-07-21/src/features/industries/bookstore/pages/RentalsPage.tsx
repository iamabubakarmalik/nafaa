import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  BookMarked, Plus, X, Save, RefreshCw, Sparkles, Clock, User,
  Phone, AlertCircle, CheckCircle2, Ban, Search,
} from 'lucide-react';
import { rentalsApi, type BookRental } from '../api/rentals.api';
import { productsApi } from '@/api/products.api';
import { customersApi } from '@/api/customers.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-500',
  RETURNED: 'bg-emerald-600',
  OVERDUE: 'bg-rose-500',
  LOST: 'bg-slate-700',
  DAMAGED: 'bg-amber-500',
  CANCELLED: 'bg-slate-500',
};

export default function RentalsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const [statusFilter, setStatusFilter] = useState<string>(filterParam === 'overdue' ? 'overdue' : 'ACTIVE');
  const [showForm, setShowForm] = useState(false);
  const [returning, setReturning] = useState<BookRental | null>(null);

  const { data: rentals = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['rentals', statusFilter],
    queryFn: () => rentalsApi.list({
      status: statusFilter === 'all' || statusFilter === 'overdue' ? undefined : statusFilter,
      overdue: statusFilter === 'overdue',
    }),
    refetchInterval: 60_000,
  });

  const updateOverdueMutation = useMutation({
    mutationFn: () => rentalsApi.updateOverdue(),
    onSuccess: () => { toast.success('Overdue statuses updated'); queryClient.invalidateQueries({ queryKey: ['rentals'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Library Rentals
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📚 Book Rentals</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Library-style book rentals with fines</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => updateOverdueMutation.mutate()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <AlertCircle className="h-4 w-4" />
              Refresh Overdue
            </button>
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Issue Rental
            </Button>
          </div>
        </div>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { v: 'ACTIVE', label: '📚 Active' },
          { v: 'overdue', label: '⚠️ Overdue' },
          { v: 'RETURNED', label: 'Returned' },
          { v: 'LOST', label: 'Lost' },
          { v: 'all', label: 'All' },
        ].map((f) => (
          <button key={f.v} onClick={() => setStatusFilter(f.v)} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (statusFilter === f.v ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>{f.label}</button>
        ))}
      </div>

      {showForm && (
        <RentalForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['rentals'] }); }} />
      )}

      {returning && (
        <ReturnModal rental={returning} onClose={() => setReturning(null)} onDone={() => { setReturning(null); queryClient.invalidateQueries({ queryKey: ['rentals'] }); }} />
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : rentals.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <BookMarked className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No rentals</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {rentals.map((r) => {
            const daysLeft = differenceInDays(new Date(r.dueDate), new Date());
            const isOverdue = daysLeft < 0 && r.status === 'ACTIVE';
            const isSoon = daysLeft >= 0 && daysLeft <= 3 && r.status === 'ACTIVE';
            return (
              <div key={r.id} className={
                'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 ' +
                (isOverdue ? 'border-rose-400 ring-2 ring-rose-100' : isSoon ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
              }>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={'h-12 w-12 rounded-2xl flex items-center justify-center shadow shrink-0 text-white ' + (isOverdue ? 'bg-rose-500' : 'bg-blue-500')}>
                      <BookMarked className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white">{r.rentalNumber}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + STATUS_COLORS[r.status]}>{r.status}</span>
                        {isOverdue && <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase animate-pulse">{Math.abs(daysLeft)}d OVERDUE</span>}
                        {isSoon && <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase">{daysLeft}d LEFT</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 font-bold flex-wrap">
                        {r.customerName && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{r.customerName}</span>}
                        {r.customerPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{r.customerPhone}</span>}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {format(new Date(r.dueDate), 'dd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div>
                      <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(r.rentalPrice)}</div>
                      {r.depositAmount > 0 && <div className="text-[10px] font-bold text-amber-600">Deposit: {formatPKR(r.depositAmount)}</div>}
                      {r.fineAmount > 0 && <div className="text-[10px] font-extrabold text-rose-700">Fine: {formatPKR(r.fineAmount)}</div>}
                    </div>
                    {(r.status === 'ACTIVE' || r.status === 'OVERDUE') && (
                      <Button size="sm" onClick={() => setReturning(r)} className="bg-emerald-600 text-white">
                        <CheckCircle2 className="h-3 w-3" />
                        Return
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function RentalForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    productId: '',
    customerName: '',
    customerPhone: '',
    customerCnic: '',
    customerId: '',
    quantity: 1,
    rentalPrice: 0,
    depositAmount: 0,
    finePerDay: 50,
    rentalDays: 14,
    conditionOnIssue: 'Good',
    notes: '',
  });
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-rental', productSearch],
    queryFn: () => productsApi.list({ limit: 30, search: productSearch || undefined }),
  });

  const saveMutation = useMutation({
    mutationFn: () => rentalsApi.create({
      ...form,
      quantity: Number(form.quantity),
      rentalPrice: Number(form.rentalPrice),
      depositAmount: Number(form.depositAmount) || 0,
      finePerDay: Number(form.finePerDay) || 50,
      rentalDays: Number(form.rentalDays) || 14,
    }),
    onSuccess: () => { toast.success('Rental issued'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">Issue Book Rental</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5 space-y-3 max-h-[85vh] overflow-y-auto">
        {selectedProduct ? (
          <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-center gap-3">
            <BookMarked className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <div className="font-extrabold">{selectedProduct.name}</div>
              <div className="text-xs font-bold text-slate-600">Available: {selectedProduct.stock}</div>
            </div>
            <button onClick={() => { setSelectedProduct(null); setForm({ ...form, productId: '' }); }} className="text-xs font-extrabold text-blue-600 hover:underline">Change</button>
          </div>
        ) : (
          <div>
            <input autoFocus value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search book by name..." className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1 rounded-xl border border-slate-200 p-1">
              {(productsData?.items ?? []).map((p) => (
                <button key={p.id} onClick={() => { setSelectedProduct(p); setForm({ ...form, productId: p.id, rentalPrice: 100 }); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-blue-50 text-left">
                  <BookMarked className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-sm font-extrabold flex-1 truncate">{p.name}</span>
                  <span className="text-[10px] text-slate-500 font-bold">Stock: {p.stock}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-3">
          <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name *" className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone *" className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <input value={form.customerCnic} onChange={(e) => setForm({ ...form, customerCnic: e.target.value })} placeholder="CNIC" className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-mono font-bold focus:outline-none focus:border-blue-500" />
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Qty</label>
            <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Rental Rs</label>
            <input type="number" value={form.rentalPrice} onChange={(e) => setForm({ ...form, rentalPrice: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Deposit</label>
            <input type="number" value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Fine/day</label>
            <input type="number" value={form.finePerDay} onChange={(e) => setForm({ ...form, finePerDay: e.target.value })} className="h-11 w-full rounded-xl border-2 border-rose-300 bg-rose-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Rental Days</label>
            <input type="number" value={form.rentalDays} onChange={(e) => setForm({ ...form, rentalDays: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Condition on Issue</label>
            <select value={form.conditionOnIssue} onChange={(e) => setForm({ ...form, conditionOnIssue: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              <option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option>
            </select>
          </div>
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.productId || !form.customerName}>
            <Save className="h-4 w-4" />
            Issue Rental
          </Button>
        </div>
      </div>
    </section>
  );
}

function ReturnModal({ rental, onClose, onDone }: any) {
  const [conditionOnReturn, setConditionOnReturn] = useState('Good');
  const [damageNotes, setDamageNotes] = useState('');
  const [waiveFine, setWaiveFine] = useState(false);

  const returnMutation = useMutation({
    mutationFn: () => rentalsApi.return(rental.id, { conditionOnReturn, damageNotes: damageNotes || undefined, waiveFine }),
    onSuccess: () => { toast.success('Book returned'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const daysLate = Math.max(0, differenceInDays(new Date(), new Date(rental.dueDate)));
  const potentialFine = daysLate * rental.finePerDay;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
          <h3 className="font-extrabold">Return Book</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <div className="font-extrabold">{rental.rentalNumber}</div>
            <div className="text-xs text-slate-600">{rental.customerName} • Due: {format(new Date(rental.dueDate), 'dd MMM yyyy')}</div>
          </div>

          {daysLate > 0 && (
            <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-3">
              <div className="text-sm font-extrabold text-rose-800">⚠️ {daysLate} days late</div>
              <div className="text-xs font-bold text-rose-700">Potential fine: {formatPKR(potentialFine)}</div>
              <label className="mt-2 flex items-center gap-2 text-xs font-bold text-rose-700">
                <input type="checkbox" checked={waiveFine} onChange={(e) => setWaiveFine(e.target.checked)} className="h-4 w-4 rounded" />
                Waive fine
              </label>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Condition on Return *</label>
            <select value={conditionOnReturn} onChange={(e) => setConditionOnReturn(e.target.value)} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
              <option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option><option>Damaged</option>
            </select>
          </div>

          <textarea rows={2} value={damageNotes} onChange={(e) => setDamageNotes(e.target.value)} placeholder="Damage notes (if any)" className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => returnMutation.mutate()} loading={returnMutation.isPending}>
              <CheckCircle2 className="h-4 w-4" />
              Confirm Return
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
