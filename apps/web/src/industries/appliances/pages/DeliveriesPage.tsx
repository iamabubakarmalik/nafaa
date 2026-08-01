import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Search, X, RefreshCw, CheckCircle2, Clock, Package,
  User, Phone, MapPin, Eye, Calendar, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { deliveriesApi } from '../api/deliveries.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'text-slate-700', bg: 'bg-slate-100', icon: Clock },
  SCHEDULED: { label: 'Scheduled', color: 'text-amber-700', bg: 'bg-amber-100', icon: Calendar },
  DISPATCHED: { label: 'Dispatched', color: 'text-blue-700', bg: 'bg-blue-100', icon: Truck },
  ARRIVED: { label: 'Arrived', color: 'text-cyan-700', bg: 'bg-cyan-100', icon: MapPin },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
  FAILED: { label: 'Failed', color: 'text-rose-700', bg: 'bg-rose-100', icon: X },
};

export default function DeliveriesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<any>(null);

  const { data: deliveries = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['deliveries-list', statusFilter],
    queryFn: () => deliveriesApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['deliveries-summary'],
    queryFn: () => deliveriesApi.summary(),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return deliveries;
    return deliveries.filter((d) =>
      d.deliveryNumber.toLowerCase().includes(q) ||
      d.customerName.toLowerCase().includes(q) ||
      d.customerPhone.includes(q) ||
      (d.vehicleNumber || '').toLowerCase().includes(q) ||
      (d.driverName || '').toLowerCase().includes(q)
    );
  }, [deliveries, search]);

  return (
    <div className="space-y-5">
      {selected && (
        <DeliveryDetailModal
          delivery={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => qc.invalidateQueries({ queryKey: ['deliveries-list'] })}
        />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Truck className="h-3.5 w-3.5 text-amber-300" /> Deliveries
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🚚 Deliveries</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.pendingCount ?? 0} pending • {summary?.dispatchedCount ?? 0} in transit • {summary?.deliveredCount ?? 0} delivered
            </p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Pending" value={summary.pendingCount ?? 0} icon={Clock} tone="slate" />
          <StatCard label="Scheduled Today" value={summary.todayScheduled ?? 0} icon={Calendar} tone="amber" />
          <StatCard label="In Transit" value={summary.dispatchedCount ?? 0} icon={Truck} tone="blue" />
          <StatCard label="Delivered" value={summary.deliveredCount ?? 0} icon={CheckCircle2} tone="emerald" />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Delivery #, customer, driver, vehicle..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-blue-500" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {[
            { v: 'all', l: 'All' },
            { v: 'PENDING', l: 'Pending' },
            { v: 'SCHEDULED', l: 'Scheduled' },
            { v: 'DISPATCHED', l: 'In Transit' },
            { v: 'DELIVERED', l: 'Delivered' },
          ].map((o) => (
            <button key={o.v} onClick={() => setStatusFilter(o.v)}
              className={['shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition',
                statusFilter === o.v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'].join(' ')}>
              {o.l}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Truck className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No deliveries yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Deliveries are auto-created from POS orders</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <DeliveryCard key={d.id} delivery={d} onView={() => setSelected(d)} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeliveryCard({ delivery: d, onView }: any) {
  const meta = STATUS_META[d.status] || STATUS_META.PENDING;
  const StatusIcon = meta.icon;

  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 hover:shadow-md transition">
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className={`h-14 w-14 rounded-2xl ${meta.bg} flex items-center justify-center shrink-0`}>
          <StatusIcon className={`h-6 w-6 ${meta.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-extrabold text-slate-900 text-sm">{d.deliveryNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${meta.bg} ${meta.color}`}>
              <StatusIcon className="h-2.5 w-2.5" /> {meta.label}
            </span>
            {d.requiresInstallation && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold">
                📋 INSTALL
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-700 font-bold flex-wrap">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" /> {d.customerName}
            </span>
            <a href={`tel:${d.customerPhone}`} className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
              <Phone className="h-3 w-3" /> {d.customerPhone}
            </a>
          </div>

          <div className="mt-1 text-xs text-slate-600 font-semibold truncate inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 text-blue-600" />
            {d.deliveryAddress?.slice(0, 80)}{d.deliveryAddress?.length > 80 ? '...' : ''}
          </div>

          {(d.vehicleNumber || d.driverName) && (
            <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500 font-bold flex-wrap">
              {d.vehicleNumber && (
                <span className="inline-flex items-center gap-1">
                  🚚 <span className="font-mono">{d.vehicleNumber}</span>
                </span>
              )}
              {d.driverName && (
                <span className="inline-flex items-center gap-1">
                  🧑‍✈️ {d.driverName}
                </span>
              )}
              {d.scheduledDate && (
                <span className="inline-flex items-center gap-1 text-blue-700">
                  📅 {new Date(d.scheduledDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                  {d.scheduledSlot && ` • ${d.scheduledSlot}`}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          {d.totalCharge > 0 && (
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-500">Charge</div>
              <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
                {formatPKR(d.totalCharge)}
              </div>
            </div>
          )}
          <button onClick={onView}
            className="mt-2 h-9 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> View
          </button>
        </div>
      </div>
    </div>
  );
}

function DeliveryDetailModal({ delivery: d, onClose, onUpdate }: any) {
  const [status, setStatus] = useState(d.status);
  const [notes, setNotes] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState(d.vehicleNumber || '');
  const [driverName, setDriverName] = useState(d.driverName || '');
  const [driverPhone, setDriverPhone] = useState(d.driverPhone || '');

  const updateStatus = useMutation({
    mutationFn: () => deliveriesApi.updateStatus(d.id, { status, notes }),
    onSuccess: () => { toast.success('Status updated'); onUpdate(); onClose(); },
  });

  const assignVehicle = useMutation({
    mutationFn: () => deliveriesApi.assignVehicle(d.id, { vehicleNumber, driverName, driverPhone }),
    onSuccess: () => { toast.success('Vehicle assigned'); onUpdate(); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Delivery</div>
            <h3 className="text-xl font-extrabold font-mono">{d.deliveryNumber}</h3>
          </div>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <InfoBox label="Customer" value={d.customerName} />
            <InfoBox label="Phone" value={d.customerPhone} />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Delivery Address</label>
            <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 text-sm font-semibold text-blue-900">
              📍 {d.deliveryAddress}
              {d.landmark && <div className="text-xs mt-1">Landmark: {d.landmark}</div>}
              {d.floorNumber && <div className="text-xs mt-1">Floor: {d.floorNumber} {!d.hasLift && '(No Lift)'}</div>}
            </div>
          </div>

          {d.status === 'PENDING' && (
            <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 space-y-3">
              <div className="font-extrabold text-amber-900">Assign Vehicle</div>
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="Vehicle number"
                  className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-mono font-bold focus:outline-none focus:border-amber-500" />
                <input value={driverName} onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Driver name"
                  className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
              </div>
              <input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="Driver phone"
                className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
              <button onClick={() => assignVehicle.mutate()}
                disabled={!vehicleNumber || !driverName || !driverPhone || assignVehicle.isPending}
                className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold disabled:opacity-50">
                Assign Vehicle
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500" />
          </div>

          {d.totalCharge > 0 && (
            <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-emerald-700">Total Charges</div>
              <div className="text-2xl font-extrabold text-emerald-900 tabular-nums">{formatPKR(d.totalCharge)}</div>
              <div className="text-[10px] text-emerald-700 font-bold mt-1">
                Delivery: {formatPKR(d.deliveryCharge)} • Floor: {formatPKR(d.floorCharge)}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700"
            onClick={() => updateStatus.mutate()} loading={updateStatus.isPending}>
            Update
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-cyan-700',
    emerald: 'from-emerald-500 to-emerald-700',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
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
