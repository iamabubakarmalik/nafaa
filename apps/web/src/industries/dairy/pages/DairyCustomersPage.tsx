import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, X, Save, Edit3, RefreshCw, Sparkles, Phone,
  MapPin, DollarSign, PauseCircle, PlayCircle, Sunrise, Sunset,
  Route as RouteIcon, AlertCircle, CheckCircle2, Milk,
} from 'lucide-react';
import { dairyCustomersApi, type DeliveryFrequency, type DairyCustomer } from '../api/customers.api';
import { routesApi } from '../api/routes.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const FREQUENCIES: { value: DeliveryFrequency; label: string; emoji: string }[] = [
  { value: 'DAILY', label: 'Daily', emoji: '📅' },
  { value: 'MORNING_ONLY', label: 'Morning Only', emoji: '🌅' },
  { value: 'EVENING_ONLY', label: 'Evening Only', emoji: '🌆' },
  { value: 'MORNING_EVENING', label: 'Both Times', emoji: '🌞🌙' },
  { value: 'ALTERNATE_DAY', label: 'Alternate Days', emoji: '📆' },
  { value: 'WEEKLY', label: 'Weekly', emoji: '📊' },
  { value: 'ON_DEMAND', label: 'On Demand', emoji: '📞' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-emerald-600' },
  SUSPENDED: { label: 'Paused', color: 'bg-amber-500' },
  CLOSED: { label: 'Closed', color: 'bg-slate-500' },
  DEFAULTED: { label: 'Defaulted', color: 'bg-red-600' },
};

export default function DairyCustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [routeFilter, setRouteFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [showPayment, setShowPayment] = useState<DairyCustomer | null>(null);
  const [showPause, setShowPause] = useState<DairyCustomer | null>(null);
  const [editing, setEditing] = useState<DairyCustomer | null>(null);

  const { data: customers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dairy-customers', statusFilter, routeFilter, search],
    queryFn: () => dairyCustomersApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      routeId: routeFilter === 'all' ? undefined : routeFilter,
      search: search.trim() || undefined,
    }),
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['dairy-routes-for-customers'],
    queryFn: () => routesApi.list({ active: true }),
  });

  const { data: summary } = useQuery({
    queryKey: ['dairy-customers-summary'],
    queryFn: () => dairyCustomersApi.summary(),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => dairyCustomersApi.resume(id),
    onSuccess: () => { toast.success('Delivery resumed'); queryClient.invalidateQueries({ queryKey: ['dairy-customers'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Milk Subscribers
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👥 Customers</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Regular subscribers with morning/evening delivery</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />New Customer
            </Button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total" value={summary.totalCustomers} icon={Users} color="blue" />
          <StatCard label="Active" value={summary.activeCustomers} icon={CheckCircle2} color="emerald" />
          <StatCard label="Paused" value={summary.suspendedCustomers} icon={PauseCircle} color="amber" />
          <StatCard label="Outstanding" value={formatPKR(summary.outstandingAmount)} sub={summary.customersWithBalance + ' customers'} icon={AlertCircle} color="rose" />
        </section>
      )}

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer # / name / phone / address..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['all', 'ACTIVE', 'SUSPENDED', 'CLOSED', 'DEFAULTED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}</button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setRouteFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (routeFilter === 'all' ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Routes</button>
          {routes.map((r) => (
            <button key={r.id} onClick={() => setRouteFilter(r.id)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (routeFilter === r.id ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              <RouteIcon className="h-3 w-3 inline mr-1" />
              {r.name}
            </button>
          ))}
        </div>
      </section>

      {showForm && (
        <CustomerForm
          editing={editing}
          routes={routes}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['dairy-customers'] }); }}
        />
      )}

      {showPayment && (
        <PaymentModal
          customer={showPayment}
          onClose={() => setShowPayment(null)}
          onDone={() => { setShowPayment(null); queryClient.invalidateQueries({ queryKey: ['dairy-customers'] }); }}
        />
      )}

      {showPause && (
        <PauseModal
          customer={showPause}
          onClose={() => setShowPause(null)}
          onDone={() => { setShowPause(null); queryClient.invalidateQueries({ queryKey: ['dairy-customers'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 p-12 text-center">
          <Users className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No customers</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {customers.map((c) => (
            <CustomerCard
              key={c.id}
              customer={c}
              onEdit={() => { setEditing(c); setShowForm(true); }}
              onPay={() => setShowPayment(c)}
              onPause={() => setShowPause(c)}
              onResume={() => resumeMutation.mutate(c.id)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-600', emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600', rose: 'from-rose-500 to-red-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
          {sub && <div className="text-xs font-semibold text-slate-600 mt-1">{sub}</div>}
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function CustomerCard({ customer, onEdit, onPay, onPause, onResume }: any) {
  const cfg = STATUS_CONFIG[customer.status];
  const totalDaily = customer.morningQuantity + customer.eveningQuantity;
  const freq = FREQUENCIES.find((f) => f.value === customer.deliveryFrequency);

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {customer.photoUrl ? (
            <img src={customer.photoUrl} alt={customer.name} className="h-12 w-12 rounded-2xl object-cover shrink-0 ring-2 ring-blue-200" />
          ) : (
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center text-lg font-extrabold shadow shrink-0">
              {customer.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white truncate">{customer.name}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + (cfg?.color ?? 'bg-slate-500')}>
                {cfg?.label ?? customer.status}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-extrabold">{freq?.emoji} {freq?.label}</span>
              {customer.currentBalance > 500 && (
                <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase animate-pulse">Owes</span>
              )}
            </div>
            <div className="text-[10px] font-mono font-bold text-slate-500 mt-0.5">{customer.customerNumber}</div>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 font-semibold flex-wrap">
              {customer.phone && (
                <a href={'tel:' + customer.phone} className="inline-flex items-center gap-1 text-blue-700 font-bold hover:underline">
                  <Phone className="h-3 w-3" />{customer.phone}
                </a>
              )}
              {customer.area && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {customer.area}{customer.city ? ', ' + customer.city : ''}
                </span>
              )}
              {customer.route && (
                <span className="inline-flex items-center gap-1 text-violet-700">
                  <RouteIcon className="h-3 w-3" />
                  {customer.route.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className={
            'text-lg font-extrabold tabular-nums ' +
            (customer.currentBalance > 0 ? 'text-rose-700' : 'text-emerald-700')
          }>{formatPKR(customer.currentBalance)}</div>
          <div className="text-[10px] font-bold text-slate-500">{customer.currentBalance > 0 ? 'Owes' : 'Clear'}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {customer.morningQuantity > 0 && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-center">
            <div className="text-[9px] uppercase font-extrabold text-amber-700 inline-flex items-center gap-0.5"><Sunrise className="h-2.5 w-2.5" />Morning</div>
            <div className="text-lg font-extrabold text-amber-900 tabular-nums">{customer.morningQuantity}L</div>
          </div>
        )}
        {customer.eveningQuantity > 0 && (
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 p-2 text-center">
            <div className="text-[9px] uppercase font-extrabold text-indigo-700 inline-flex items-center gap-0.5"><Sunset className="h-2.5 w-2.5" />Evening</div>
            <div className="text-lg font-extrabold text-indigo-900 tabular-nums">{customer.eveningQuantity}L</div>
          </div>
        )}
        <div className="rounded-lg bg-cyan-50 dark:bg-cyan-950/30 p-2 text-center">
          <div className="text-[9px] uppercase font-extrabold text-cyan-700">Total/Day</div>
          <div className="text-lg font-extrabold text-cyan-900 tabular-nums">{totalDaily}L</div>
        </div>
        {customer.customRate && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
            <div className="text-[9px] uppercase font-extrabold text-emerald-700">Rate</div>
            <div className="text-sm font-extrabold text-emerald-900 tabular-nums">{formatPKR(customer.customRate)}</div>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-slate-500 font-semibold flex gap-3 flex-wrap">
        <span>Deliveries: <b className="text-slate-700">{customer.totalDeliveries}</b></span>
        {customer.missedDeliveries > 0 && <span className="text-rose-700">Missed: <b>{customer.missedDeliveries}</b></span>}
        <span>Purchases: <b className="text-slate-700">{formatPKR(customer.totalPurchases)}</b></span>
        <span>Paid: <b className="text-emerald-700">{formatPKR(customer.totalPayments)}</b></span>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-neutral-800 flex gap-1 flex-wrap">
        {customer.status === 'ACTIVE' && (
          <>
            {customer.currentBalance > 0 && (
              <button onClick={onPay} className="flex-1 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 hover:bg-emerald-200 text-emerald-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
                <DollarSign className="h-3 w-3" />Pay
              </button>
            )}
            <button onClick={onPause} className="h-9 px-3 rounded-lg bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 text-amber-700 text-xs font-extrabold inline-flex items-center gap-1">
              <PauseCircle className="h-3.5 w-3.5" />Pause
            </button>
          </>
        )}
        {customer.status === 'SUSPENDED' && (
          <button onClick={onResume} className="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1">
            <PlayCircle className="h-3.5 w-3.5" />Resume Delivery
          </button>
        )}
        <button onClick={onEdit} className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function PaymentModal({ customer, onClose, onDone }: any) {
  const [amount, setAmount] = useState(customer.currentBalance);
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');

  const payMutation = useMutation({
    mutationFn: () => dairyCustomersApi.payment(customer.id, { amount, paymentMethod: method, reference }),
    onSuccess: () => { toast.success('Payment recorded'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-blue-50 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900">Receive Payment</h3>
            <p className="text-xs text-slate-500 font-semibold">{customer.name} • Owes: {formatPKR(customer.currentBalance)}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Amount *</label>
            <input type="number" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-blue-300 bg-blue-50 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
            <div className="mt-1 flex gap-1">
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <button key={f} onClick={() => setAmount(Number((customer.currentBalance * f).toFixed(2)))} className="flex-1 h-8 rounded-lg bg-slate-100 text-xs font-extrabold hover:bg-slate-200">
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
                  (method === m ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white')
                }>{m}</button>
              ))}
            </div>
          </div>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference (optional)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => payMutation.mutate()} loading={payMutation.isPending} disabled={amount <= 0}>
              <CheckCircle2 className="h-4 w-4" />Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PauseModal({ customer, onClose, onDone }: any) {
  const today = new Date().toISOString().split('T')[0];
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');

  const pauseMutation = useMutation({
    mutationFn: () => dairyCustomersApi.pause(customer.id, { pausedFrom: from, pausedTo: to, reason }),
    onSuccess: () => { toast.success('Delivery paused'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-amber-50 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900">Pause Delivery</h3>
            <p className="text-xs text-slate-500 font-semibold">{customer.name}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">From *</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">To *</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} min={from} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (traveling, out of city...)" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600" onClick={() => pauseMutation.mutate()} loading={pauseMutation.isPending} disabled={!from || !to}>
              <PauseCircle className="h-4 w-4" />Pause Delivery
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerForm({ editing, routes, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    name: editing?.name ?? '',
    phone: editing?.phone ?? '',
    cnic: editing?.cnic ?? '',
    address: editing?.address ?? '',
    city: editing?.city ?? '',
    area: editing?.area ?? '',
    landmark: editing?.landmark ?? '',
    routeId: editing?.routeId ?? '',
    deliveryFrequency: editing?.deliveryFrequency ?? 'DAILY',
    morningQuantity: editing?.morningQuantity ?? 1,
    eveningQuantity: editing?.eveningQuantity ?? 0,
    productPreference: editing?.productPreference ?? '',
    containerType: editing?.containerType ?? '',
    customRate: editing?.customRate ?? '',
    billingCycle: editing?.billingCycle ?? 'MONTHLY',
    advancePayment: editing?.advancePayment ?? 0,
    notes: editing?.notes ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        routeId: form.routeId || undefined,
        morningQuantity: Number(form.morningQuantity) || 0,
        eveningQuantity: Number(form.eveningQuantity) || 0,
        customRate: form.customRate ? Number(form.customRate) : undefined,
        advancePayment: Number(form.advancePayment) || 0,
      };
      return editing ? dairyCustomersApi.update(editing.id, payload) : dairyCustomersApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Customer updated' : 'Customer added'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-300 dark:border-blue-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Customer' : 'New Customer'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="CNIC" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-blue-500" />
          <select value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
            <option value="">-- No route --</option>
            {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-2"><MapPin className="h-4 w-4" />Address</div>
          <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" className="w-full rounded-xl border-2 border-emerald-300 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />
          <div className="grid sm:grid-cols-3 gap-3">
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="h-11 rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Area/Sector" className="h-11 rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            <input value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} placeholder="Landmark" className="h-11 rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Delivery Frequency *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FREQUENCIES.map((f) => {
              const active = form.deliveryFrequency === f.value;
              return (
                <button key={f.value} onClick={() => setForm({ ...form, deliveryFrequency: f.value })} className={
                  'p-3 rounded-xl border-2 text-center transition ' +
                  (active ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white hover:border-blue-300')
                }>
                  <div className="text-2xl mb-1">{f.emoji}</div>
                  <div className="text-[10px] font-extrabold text-slate-700">{f.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
            <div className="text-sm font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-2 mb-2">
              <Sunrise className="h-4 w-4" />Morning Quantity
            </div>
            <div className="relative">
              <input type="number" step="0.1" value={form.morningQuantity} onChange={(e) => setForm({ ...form, morningQuantity: e.target.value })} className="h-14 w-full rounded-xl border-2 border-amber-300 bg-white px-3 pr-12 text-xl font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-extrabold text-amber-700">L</span>
            </div>
          </div>
          <div className="rounded-xl border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 p-4">
            <div className="text-sm font-extrabold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 mb-2">
              <Sunset className="h-4 w-4" />Evening Quantity
            </div>
            <div className="relative">
              <input type="number" step="0.1" value={form.eveningQuantity} onChange={(e) => setForm({ ...form, eveningQuantity: e.target.value })} className="h-14 w-full rounded-xl border-2 border-indigo-300 bg-white px-3 pr-12 text-xl font-extrabold tabular-nums focus:outline-none focus:border-indigo-500" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-extrabold text-indigo-700">L</span>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <input value={form.productPreference} onChange={(e) => setForm({ ...form, productPreference: e.target.value })} placeholder="Preference (Buffalo/Cow)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <input value={form.containerType} onChange={(e) => setForm({ ...form, containerType: e.target.value })} placeholder="Container (Doli/Bottle)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <input type="number" step="0.01" value={form.customRate} onChange={(e) => setForm({ ...form, customRate: e.target.value })} placeholder="Custom rate/liter" className="h-11 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Billing Cycle</label>
            <select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              <option>DAILY</option>
              <option>WEEKLY</option>
              <option>BIWEEKLY</option>
              <option>MONTHLY</option>
              <option>QUARTERLY</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Advance Payment</label>
            <input type="number" value={form.advancePayment} onChange={(e) => setForm({ ...form, advancePayment: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim()}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Add Customer'}
          </Button>
        </div>
      </div>
    </section>
  );
}
