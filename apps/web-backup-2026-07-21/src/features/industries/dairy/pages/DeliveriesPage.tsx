import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Plus, Zap, RefreshCw, Sparkles, Sunrise, Sunset, User, Phone,
  CheckCircle2, X, Route as RouteIcon, AlertCircle, Ban, Milk, Save,
} from 'lucide-react';
import { dairyDeliveriesApi, type DeliveryStatus } from '../api/deliveries.api';
import { routesApi } from '../api/routes.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string }> = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-500' },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-600' },
  SKIPPED: { label: 'Skipped', color: 'bg-amber-500' },
  MISSED: { label: 'Missed', color: 'bg-orange-600' },
  RETURNED: { label: 'Returned', color: 'bg-slate-600' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500' },
};

const SLOTS = [
  { value: 'MORNING', label: 'Morning', emoji: '🌅' },
  { value: 'AFTERNOON', label: 'Afternoon', emoji: '☀️' },
  { value: 'EVENING', label: 'Evening', emoji: '🌆' },
  { value: 'NIGHT', label: 'Night', emoji: '🌙' },
];

export default function DairyDeliveriesPage() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState(today);
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [routeFilter, setRouteFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showBulk, setShowBulk] = useState(false);
  const [showConfirm, setShowConfirm] = useState<any>(null);
  const [showSkip, setShowSkip] = useState<any>(null);

  const { data: deliveries = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dairy-deliveries', dateFilter, slotFilter, routeFilter, statusFilter],
    queryFn: () => dairyDeliveriesApi.list({
      from: dateFilter,
      to: dateFilter,
      slot: slotFilter === 'all' ? undefined : slotFilter,
      routeId: routeFilter === 'all' ? undefined : routeFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    refetchInterval: 30_000,
  });

  const { data: summary } = useQuery({
    queryKey: ['dairy-deliveries-summary', dateFilter],
    queryFn: () => dairyDeliveriesApi.dailySummary(dateFilter),
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['dairy-routes-for-deliveries'],
    queryFn: () => routesApi.list({ active: true }),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-teal-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Delivery Management
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🚚 Deliveries</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Daily milk delivery tracking</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowBulk(true)}>
              <Zap className="h-4 w-4" />Bulk Generate
            </Button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total" value={summary.totalDeliveries} icon={Truck} color="blue" />
          <StatCard label="Delivered" value={summary.deliveredCount} icon={CheckCircle2} color="emerald" />
          <StatCard label="Skipped" value={summary.skippedCount} icon={Ban} color="amber" />
          <StatCard label="Total Liters" value={summary.totalLiters.toFixed(1) + 'L'} icon={Milk} color="cyan" />
          <StatCard label="Revenue" value={formatPKR(summary.totalRevenue)} icon={CheckCircle2} color="fuchsia" />
        </section>
      )}

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="flex gap-3 flex-wrap items-center">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Date</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Slot</label>
            <select value={slotFilter} onChange={(e) => setSlotFilter(e.target.value)} className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
              <option value="all">All Slots</option>
              {SLOTS.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Route</label>
            <select value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)} className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
              <option value="all">All Routes</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
              <option value="all">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      {showBulk && (
        <BulkGenerateModal
          routes={routes}
          onClose={() => setShowBulk(false)}
          onDone={() => { setShowBulk(false); queryClient.invalidateQueries({ queryKey: ['dairy-deliveries'] }); }}
        />
      )}

      {showConfirm && (
        <ConfirmDeliveryModal
          delivery={showConfirm}
          onClose={() => setShowConfirm(null)}
          onDone={() => { setShowConfirm(null); queryClient.invalidateQueries({ queryKey: ['dairy-deliveries'] }); }}
        />
      )}

      {showSkip && (
        <SkipDeliveryModal
          delivery={showSkip}
          onClose={() => setShowSkip(null)}
          onDone={() => { setShowSkip(null); queryClient.invalidateQueries({ queryKey: ['dairy-deliveries'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : deliveries.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Truck className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No deliveries for selected filters</p>
          <Button className="mt-4 bg-gradient-to-r from-cyan-600 to-teal-700" onClick={() => setShowBulk(true)}>
            <Zap className="h-4 w-4" />Generate Deliveries
          </Button>
        </div>
      ) : (
        <section className="grid gap-2">
          {deliveries.map((d) => (
            <DeliveryRow
              key={d.id}
              delivery={d}
              onConfirm={() => setShowConfirm(d)}
              onSkip={() => setShowSkip(d)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-600', emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600', cyan: 'from-cyan-500 to-blue-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-10 w-10 rounded-xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow shrink-0'}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DeliveryRow({ delivery, onConfirm, onSkip }: any) {
  const cfg = STATUS_CONFIG[delivery.status as DeliveryStatus];
  const slot = SLOTS.find((s) => s.value === delivery.slot);
  const c = delivery.customer;

  return (
    <div className="rounded-xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition p-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={
            'h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0 ' +
            (delivery.slot === 'MORNING' ? 'bg-amber-100' : delivery.slot === 'EVENING' ? 'bg-indigo-100' : 'bg-slate-100')
          }>{slot?.emoji}</div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold">{c?.name}</span>
              <span className={'px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ' + cfg.color}>{cfg.label}</span>
              {c?.route && <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold inline-flex items-center gap-0.5"><RouteIcon className="h-2 w-2" />{c.route.name}</span>}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 font-semibold">
              {c?.phone} • {c?.address}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-center">
            <div className="text-[9px] uppercase font-extrabold text-slate-500">Sched</div>
            <div className="text-sm font-extrabold tabular-nums">{delivery.scheduledQty}L</div>
          </div>
          {delivery.status === 'DELIVERED' && (
            <div className="text-center">
              <div className="text-[9px] uppercase font-extrabold text-emerald-700">Deliv</div>
              <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{delivery.deliveredQty}L</div>
            </div>
          )}
          <div className="text-center">
            <div className="text-[9px] uppercase font-extrabold text-slate-500">Rate</div>
            <div className="text-sm font-extrabold tabular-nums">{formatPKR(delivery.ratePerLiter).replace('Rs', '')}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] uppercase font-extrabold text-emerald-700">Total</div>
            <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(delivery.totalAmount)}</div>
          </div>

          {delivery.status === 'SCHEDULED' && (
            <>
              <button onClick={onConfirm} className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />Deliver
              </button>
              <button onClick={onSkip} className="h-9 px-3 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-extrabold inline-flex items-center gap-1">
                <Ban className="h-3.5 w-3.5" />Skip
              </button>
            </>
          )}
        </div>
      </div>

      {delivery.skipReason && (
        <div className="mt-2 text-xs italic text-amber-700">📝 Skipped: {delivery.skipReason}</div>
      )}
    </div>
  );
}

function BulkGenerateModal({ routes, onClose, onDone }: any) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [slot, setSlot] = useState('MORNING');
  const [routeId, setRouteId] = useState('');

  const generateMutation = useMutation({
    mutationFn: () => dairyDeliveriesApi.bulkGenerate({ date, slot, routeId: routeId || undefined }),
    onSuccess: (r) => { toast.success('Generated ' + r.generatedCount + ' deliveries'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-cyan-50 flex items-center justify-between">
          <h3 className="font-extrabold">Bulk Generate Deliveries</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 w-full rounded-xl border-2 border-cyan-300 bg-cyan-50 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Slot *</label>
            <div className="grid grid-cols-4 gap-2">
              {SLOTS.map((s) => (
                <button key={s.value} onClick={() => setSlot(s.value)} className={
                  'p-2 rounded-lg border-2 text-center ' +
                  (slot === s.value ? 'border-cyan-500 bg-cyan-50 shadow' : 'border-slate-200 bg-white')
                }>
                  <div className="text-xl">{s.emoji}</div>
                  <div className="text-[9px] font-extrabold">{s.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Route (optional)</label>
            <select value={routeId} onChange={(e) => setRouteId(e.target.value)} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
              <option value="">All routes</option>
              {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="rounded-xl bg-cyan-50 border-2 border-cyan-200 p-3 text-xs text-cyan-800 font-bold">
            ℹ️ Auto-creates deliveries for all active customers matching route/slot with their subscribed quantity.
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-700" onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
              <Zap className="h-4 w-4" />Generate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeliveryModal({ delivery, onClose, onDone }: any) {
  const [qty, setQty] = useState(delivery.scheduledQty);
  const [returned, setReturned] = useState(0);
  const [notes, setNotes] = useState('');

  const confirmMutation = useMutation({
    mutationFn: () => dairyDeliveriesApi.confirm(delivery.id, { deliveredQty: qty, returnedQty: returned, notes }),
    onSuccess: () => { toast.success('Delivery confirmed'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-emerald-50 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold">Confirm Delivery</h3>
            <p className="text-xs text-slate-500 font-semibold">{delivery.customer?.name} • {delivery.slot}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Delivered *</label>
              <div className="relative">
                <input type="number" step="0.1" autoFocus value={qty} onChange={(e) => setQty(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 pr-10 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-extrabold text-emerald-700">L</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Returned</label>
              <div className="relative">
                <input type="number" step="0.1" value={returned} onChange={(e) => setReturned(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-3 pr-10 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-extrabold text-amber-700">L</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-neutral-800 p-3 text-center">
            <div className="text-xs font-bold text-slate-500">Total Amount</div>
            <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(delivery.ratePerLiter * qty)}</div>
          </div>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => confirmMutation.mutate()} loading={confirmMutation.isPending} disabled={qty <= 0}>
              <CheckCircle2 className="h-4 w-4" />Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkipDeliveryModal({ delivery, onClose, onDone }: any) {
  const [reason, setReason] = useState('');
  const skipMutation = useMutation({
    mutationFn: () => dairyDeliveriesApi.skip(delivery.id, reason),
    onSuccess: () => { toast.success('Delivery skipped'); onDone(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-amber-50 flex items-center justify-between">
          <h3 className="font-extrabold">Skip Delivery</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {['Customer out of city', 'Customer not home', 'Customer refused', 'Insufficient milk', 'Vehicle breakdown', 'Weather issue'].map((r) => (
              <button key={r} onClick={() => setReason(r)} className={
                'p-2 rounded-lg border-2 text-xs font-extrabold text-left ' +
                (reason === r ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-700')
              }>{r}</button>
            ))}
          </div>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Or enter custom reason..." className="w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600" onClick={() => skipMutation.mutate()} loading={skipMutation.isPending} disabled={!reason.trim()}>
              <Ban className="h-4 w-4" />Skip
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
