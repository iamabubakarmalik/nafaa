import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Bike, MapPin, Clock, Phone, User, Sparkles, RefreshCw,
  CheckCircle2, X, ArrowRight, Package, DollarSign,
  Star, AlertCircle, PhoneCall, Navigation, Timer,
} from 'lucide-react';
import { deliveryApi, type DeliveryStatus } from '../api/delivery.api';
import { ridersApi } from '../api/riders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; bg: string; text: string; next?: DeliveryStatus }> = {
  PENDING: { label: 'Pending', bg: 'bg-slate-500', text: 'text-slate-700', next: 'ASSIGNED' },
  ASSIGNED: { label: 'Assigned', bg: 'bg-blue-500', text: 'text-blue-700', next: 'PICKED_UP' },
  PICKED_UP: { label: 'Picked Up', bg: 'bg-cyan-500', text: 'text-cyan-700', next: 'ON_THE_WAY' },
  ON_THE_WAY: { label: 'On the Way', bg: 'bg-violet-500', text: 'text-violet-700', next: 'ARRIVED' },
  ARRIVED: { label: 'Arrived', bg: 'bg-amber-500', text: 'text-amber-700', next: 'DELIVERED' },
  DELIVERED: { label: 'Delivered', bg: 'bg-emerald-500', text: 'text-emerald-700' },
  FAILED: { label: 'Failed', bg: 'bg-rose-500', text: 'text-rose-700' },
  RETURNED: { label: 'Returned', bg: 'bg-orange-500', text: 'text-orange-700' },
};

export default function DeliveryTrackingPage() {
  const queryClient = useQueryClient();
  const [assignFor, setAssignFor] = useState<string | null>(null);

  const { data: deliveries = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['deliveries-active'],
    queryFn: () => deliveryApi.listActive(),
    refetchInterval: 20_000,
  });

  const { data: riders = [] } = useQuery({
    queryKey: ['riders-active'],
    queryFn: () => ridersApi.list({ status: 'ACTIVE', active: true }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      deliveryApi.updateStatus(orderId, { status }),
    onSuccess: () => {
      toast.success('Delivery updated');
      queryClient.invalidateQueries({ queryKey: ['deliveries-active'] });
    },
  });

  const stats = {
    pending: deliveries.filter((d) => d.status === 'PENDING').length,
    assigned: deliveries.filter((d) => d.status === 'ASSIGNED').length,
    onTheWay: deliveries.filter((d) => ['PICKED_UP', 'ON_THE_WAY', 'ARRIVED'].includes(d.status)).length,
    total: deliveries.length,
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-purple-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Live Tracking
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🏍️ Delivery Tracking
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Riders live status — auto-refresh every 20 seconds
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
            >
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Active" value={stats.total} icon={Bike} color="violet" />
        <StatCard label="Pending Assignment" value={stats.pending} icon={AlertCircle} color="amber" />
        <StatCard label="Assigned" value={stats.assigned} icon={CheckCircle2} color="blue" />
        <StatCard label="On the Way" value={stats.onTheWay} icon={Navigation} color="emerald" />
      </section>

      {/* DELIVERIES */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : deliveries.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/40 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No active deliveries</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">All caught up! 🎉</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {deliveries.map((d: any) => (
            <DeliveryCard
              key={d.id}
              delivery={d}
              onAssign={() => setAssignFor(d.orderId)}
              onNext={() => {
                const next = STATUS_CONFIG[d.status as DeliveryStatus]?.next;
                if (next) statusMutation.mutate({ orderId: d.orderId, status: next });
              }}
              onFail={() => {
                const reason = prompt('Failure reason?');
                if (reason) deliveryApi.updateStatus(d.orderId, { status: 'FAILED', failureReason: reason })
                  .then(() => queryClient.invalidateQueries({ queryKey: ['deliveries-active'] }));
              }}
            />
          ))}
        </section>
      )}

      {assignFor && (
        <AssignRiderModal
          orderId={assignFor}
          riders={riders}
          onClose={() => setAssignFor(null)}
          onAssigned={() => {
            setAssignFor(null);
            queryClient.invalidateQueries({ queryKey: ['deliveries-active'] });
            queryClient.invalidateQueries({ queryKey: ['riders-active'] });
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    violet: 'from-violet-500 to-purple-600',
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-blue-700',
    emerald: 'from-emerald-500 to-green-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function DeliveryCard({ delivery, onAssign, onNext, onFail }: any) {
  const cfg = STATUS_CONFIG[delivery.status as DeliveryStatus] ?? STATUS_CONFIG.PENDING;
  const order = delivery.order;
  const rider = delivery.rider;
  const elapsed = delivery.assignedAt
    ? Math.floor((Date.now() - new Date(delivery.assignedAt).getTime()) / 60000)
    : 0;

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        {/* LEFT */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow ' + cfg.bg + ' text-white'}>
            <Bike className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={'/restaurant/orders/' + delivery.orderId} className="font-extrabold text-slate-900 dark:text-white text-lg hover:text-violet-600">
                {order?.orderNumber}
              </Link>
              <span className={'px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase text-white ' + cfg.bg}>
                {cfg.label}
              </span>
              {elapsed > 0 && (
                <span className={
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold ' +
                  (elapsed > 45 ? 'bg-rose-100 text-rose-700' : elapsed > 25 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600')
                }>
                  <Timer className="h-2.5 w-2.5" />
                  {elapsed}m
                </span>
              )}
            </div>

            <div className="mt-1 grid sm:grid-cols-2 gap-2 text-xs">
              {/* Customer */}
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-extrabold text-slate-500">Customer</div>
                {order?.customerName && (
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                    <User className="h-3 w-3 text-slate-400" />
                    {order.customerName}
                  </div>
                )}
                {order?.customerPhone && (
                  <a href={'tel:' + order.customerPhone} className="flex items-center gap-1.5 text-blue-700 font-bold hover:underline">
                    <Phone className="h-3 w-3" />
                    {order.customerPhone}
                  </a>
                )}
                {order?.deliveryAddress && (
                  <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-400 font-semibold">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{order.deliveryAddress}</span>
                  </div>
                )}
              </div>

              {/* Rider */}
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-extrabold text-slate-500">Rider</div>
                {rider ? (
                  <>
                    <Link to={'/restaurant/riders'} className="flex items-center gap-1.5 text-violet-700 font-bold hover:underline">
                      {rider.avatarUrl ? (
                        <img src={rider.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-violet-500 text-white flex items-center justify-center text-[10px] font-extrabold">
                          {rider.name.charAt(0)}
                        </div>
                      )}
                      {rider.name}
                    </Link>
                    <a href={'tel:' + rider.phone} className="flex items-center gap-1.5 text-blue-700 font-bold hover:underline">
                      <PhoneCall className="h-3 w-3" />
                      {rider.phone}
                    </a>
                    {rider.vehicleNumber && (
                      <div className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                        🏍️ {rider.vehicleNumber}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-amber-700 font-extrabold italic">⚠️ Not assigned</div>
                )}
              </div>
            </div>

            {delivery.distanceKm && (
              <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500 font-semibold">
                <span>{delivery.distanceKm.toFixed(1)} km</span>
                {delivery.estimatedMinutes && <span>ETA: {delivery.estimatedMinutes}m</span>}
                {delivery.deliveryFee > 0 && <span className="text-emerald-700 font-extrabold">Fee: {formatPKR(delivery.deliveryFee)}</span>}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="text-right shrink-0">
          <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {formatPKR(order?.total ?? 0)}
          </div>
          <div className="mt-2 flex gap-1 justify-end flex-wrap">
            {!rider && (
              <button
                onClick={onAssign}
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow"
              >
                <User className="h-3 w-3" />
                Assign
              </button>
            )}
            {cfg.next && (
              <button
                onClick={onNext}
                className={'px-3 py-1.5 rounded-lg text-white text-xs font-extrabold inline-flex items-center gap-1 shadow ' + STATUS_CONFIG[cfg.next].bg}
              >
                <ArrowRight className="h-3 w-3" />
                {STATUS_CONFIG[cfg.next].label}
              </button>
            )}
            {!['DELIVERED', 'FAILED', 'RETURNED'].includes(delivery.status) && (
              <button
                onClick={onFail}
                className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                title="Mark failed"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssignRiderModal({ orderId, riders, onClose, onAssigned }: any) {
  const [selectedRider, setSelectedRider] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [distanceKm, setDistanceKm] = useState<any>('');
  const [deliveryFee, setDeliveryFee] = useState<any>('');
  const [riderCommission, setRiderCommission] = useState<any>('');

  const assignMutation = useMutation({
    mutationFn: () => deliveryApi.assign(orderId, {
      riderId: selectedRider,
      estimatedMinutes,
      distanceKm: distanceKm ? Number(distanceKm) : undefined,
      deliveryFee: deliveryFee ? Number(deliveryFee) : undefined,
      riderCommission: riderCommission ? Number(riderCommission) : undefined,
    }),
    onSuccess: () => {
      toast.success('Rider assigned');
      onAssigned();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 dark:text-white">Assign Rider</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Select Available Rider</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {riders.length === 0 ? (
                <div className="text-sm text-slate-500 font-semibold italic p-4 text-center">No active riders. Add riders first.</div>
              ) : (
                riders.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRider(r.id)}
                    className={
                      'w-full p-3 rounded-xl border-2 flex items-center gap-3 transition text-left ' +
                      (selectedRider === r.id
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 shadow'
                        : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-violet-300')
                    }
                  >
                    {r.avatarUrl ? (
                      <img src={r.avatarUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center font-extrabold">
                        {r.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">{r.name}</div>
                      <div className="text-xs text-slate-500 font-semibold">
                        {r.phone} • {r.totalDeliveries} deliveries
                        {r.avgRating && ' • ⭐ ' + r.avgRating.toFixed(1)}
                      </div>
                    </div>
                    {selectedRider === r.id && <CheckCircle2 className="h-5 w-5 text-violet-600" />}
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedRider && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">ETA (minutes)</label>
                <input
                  type="number" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Distance (km)</label>
                <input
                  type="number" step="0.1" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="Optional"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Delivery Fee (Rs)</label>
                <input
                  type="number" step="0.01" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Rider Commission</label>
                <input
                  type="number" step="0.01" value={riderCommission} onChange={(e) => setRiderCommission(e.target.value)}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          )}
        </div>
        <div className="border-t-2 border-slate-200 dark:border-neutral-800 p-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700"
            onClick={() => assignMutation.mutate()}
            loading={assignMutation.isPending}
            disabled={!selectedRider}
          >
            <Bike className="h-4 w-4" />
            Assign Rider
          </Button>
        </div>
      </div>
    </div>
  );
}
