import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Plus, Search, X, RefreshCw, Clock, CheckCircle2, XCircle,
  AlertTriangle, User, Phone, MapPin, Calendar, DollarSign, Package,
  ArrowRight, Users, Save, Camera, Star, Building2, Navigation,
} from 'lucide-react';
import { toast } from 'sonner';
import { deliveriesApi, type FurnitureDeliveryStatus } from '../api/deliveries.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';

const STATUS_META: Record<FurnitureDeliveryStatus, { label: string; color: string; bg: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'text-slate-700', bg: 'bg-slate-100', icon: Clock },
  SCHEDULED: { label: 'Scheduled', color: 'text-amber-700', bg: 'bg-amber-100', icon: Calendar },
  DISPATCHED: { label: 'Dispatched', color: 'text-blue-700', bg: 'bg-blue-100', icon: Truck },
  IN_TRANSIT: { label: 'In Transit', color: 'text-cyan-700', bg: 'bg-cyan-100', icon: Navigation },
  ARRIVED: { label: 'Arrived', color: 'text-violet-700', bg: 'bg-violet-100', icon: MapPin },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
  ASSEMBLED: { label: 'Assembled', color: 'text-teal-700', bg: 'bg-teal-100', icon: CheckCircle2 },
  RESCHEDULED: { label: 'Rescheduled', color: 'text-orange-700', bg: 'bg-orange-100', icon: Clock },
  FAILED: { label: 'Failed', color: 'text-rose-700', bg: 'bg-rose-100', icon: XCircle },
  RETURNED: { label: 'Returned', color: 'text-slate-700', bg: 'bg-slate-100', icon: XCircle },
};

export default function DeliveriesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAssignVehicle, setShowAssignVehicle] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState<any>(null);

  const { data: deliveries = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['furniture-deliveries-list', statusFilter],
    queryFn: () => deliveriesApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const { data: summary } = useQuery({
    queryKey: ['furniture-delivery-summary'],
    queryFn: () => deliveriesApi.summary(),
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return deliveries;
    return deliveries.filter((d) =>
      d.deliveryNumber.toLowerCase().includes(q) ||
      d.customerName.toLowerCase().includes(q) ||
      (d.customerPhone || '').includes(q) ||
      (d.vehicleNumber || '').toLowerCase().includes(q) ||
      (d.city || '').toLowerCase().includes(q)
    );
  }, [deliveries, search]);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => deliveriesApi.updateStatus(id, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['furniture-deliveries-list'] });
      qc.invalidateQueries({ queryKey: ['furniture-delivery-summary'] });
    },
  });

  return (
    <div className="space-y-5">
      {showAssignVehicle && (
        <AssignVehicleModal delivery={showAssignVehicle}
          onClose={() => setShowAssignVehicle(null)}
          onSaved={() => { setShowAssignVehicle(null); qc.invalidateQueries({ queryKey: ['furniture-deliveries-list'] }); }} />
      )}
      {showConfirm && (
        <ConfirmDeliveryModal delivery={showConfirm}
          onClose={() => setShowConfirm(null)}
          onSaved={() => { setShowConfirm(null); qc.invalidateQueries({ queryKey: ['furniture-deliveries-list'] }); }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-800 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Truck className="h-3.5 w-3.5 text-amber-300" /> Furniture Deliveries
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🚚 Deliveries</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.pending ?? 0} pending • {summary?.todayScheduled ?? 0} today • {summary?.inTransit ?? 0} in transit
            </p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Pending" value={summary.pending} icon={Clock} tone="slate" onClick={() => setStatusFilter('PENDING')} />
          <StatCard label="Scheduled" value={summary.scheduled} icon={Calendar} tone="amber" onClick={() => setStatusFilter('SCHEDULED')} />
          <StatCard label="In Transit" value={summary.inTransit} icon={Navigation} tone="cyan" />
          <StatCard label="Delivered" value={summary.delivered} icon={CheckCircle2} tone="emerald" onClick={() => setStatusFilter('DELIVERED')} />
          <StatCard label="Today" value={summary.todayScheduled} icon={Calendar} tone="violet" />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Delivery #, customer, phone, vehicle..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {['all', 'PENDING', 'SCHEDULED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'ASSEMBLED', 'FAILED'].map((v) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                statusFilter === v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}>
              {v === 'all' ? 'All' : v.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Truck className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">{statusFilter === 'all' ? 'No deliveries yet' : 'No deliveries match filter'}</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Deliveries are created from sales or custom orders</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <DeliveryCard key={d.id} delivery={d}
              onAssignVehicle={() => setShowAssignVehicle(d)}
              onConfirm={() => setShowConfirm(d)}
              onStatusChange={(status: any) => updateStatus.mutate({ id: d.id, status })} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeliveryCard({ delivery: d, onAssignVehicle, onConfirm, onStatusChange }: any) {
  const meta = STATUS_META[d.status as FurnitureDeliveryStatus];
  const StatusIcon = meta.icon;
  const isToday = d.scheduledDate && new Date(d.scheduledDate).toDateString() === new Date().toDateString();

  return (
    <div className={`rounded-2xl bg-white border-2 shadow-sm hover:shadow-md transition ${isToday ? 'border-amber-300' : 'border-slate-200'}`}>
      <div className="p-4">
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
              {isToday && <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold">TODAY</span>}
              {d.requiresAssembly && (
                <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[9px] font-extrabold uppercase">
                  Assembly Required
                </span>
              )}
            </div>

            <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs text-slate-600 font-bold">
              <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {d.customerName}</span>
              {d.customerPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {d.customerPhone}</span>}
              <span className="inline-flex items-center gap-1"><Package className="h-3 w-3" /> {d.itemsCount} {d.itemsCount === 1 ? 'item' : 'items'}</span>
              {d.helpersCount && (
                <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {d.helpersCount} helpers</span>
              )}
            </div>

            {d.deliveryAddress && (
              <div className="mt-1 text-[11px] text-slate-500 font-bold inline-flex items-start gap-1">
                <MapPin className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                <span className="truncate">
                  {d.deliveryAddress}
                  {d.city && `, ${d.city}`}
                  {d.floorNumber !== null && d.floorNumber !== undefined && ` • Floor ${d.floorNumber}`}
                  {d.hasLift === false && ' (no lift)'}
                </span>
              </div>
            )}

            {d.scheduledDate && (
              <div className="mt-1 text-[11px] font-bold text-blue-700 inline-flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" />
                {new Date(d.scheduledDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                {d.scheduledSlot && ` • ${d.scheduledSlot}`}
              </div>
            )}

            {d.vehicleNumber && (
              <div className="mt-2 flex items-center gap-2 flex-wrap text-[10px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-extrabold">
                  <Truck className="h-2.5 w-2.5" /> {d.vehicleType || 'Vehicle'}: {d.vehicleNumber}
                </span>
                {d.driverName && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-extrabold">
                    <User className="h-2.5 w-2.5" /> {d.driverName}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="text-right shrink-0 min-w-[120px]">
            <div className="text-[10px] uppercase font-extrabold text-slate-500">Total Charge</div>
            <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(d.totalCharge || 0)}</div>
            {d.customerRating && (
              <div className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600">
                {'★'.repeat(d.customerRating)}{'☆'.repeat(5 - d.customerRating)}
              </div>
            )}
          </div>
        </div>

        {/* Charges breakdown */}
        {(d.deliveryCharge > 0 || d.loadingCharge > 0 || d.floorCharge > 0 || d.assemblyCharge > 0) && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-[10px] font-bold">
            {d.deliveryCharge > 0 && <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">🚚 Delivery: {formatPKR(d.deliveryCharge)}</span>}
            {d.loadingCharge > 0 && <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700">📦 Loading: {formatPKR(d.loadingCharge)}</span>}
            {d.floorCharge > 0 && <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700">🏢 Floor: {formatPKR(d.floorCharge)}</span>}
            {d.assemblyCharge > 0 && <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-700">🔧 Assembly: {formatPKR(d.assemblyCharge)}</span>}
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2 flex-wrap">
          {d.status === 'PENDING' && (
            <button onClick={onAssignVehicle}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
              <Truck className="h-3 w-3" /> Assign Vehicle
            </button>
          )}
          {d.status === 'SCHEDULED' && (
            <button onClick={() => onStatusChange('DISPATCHED')}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
              <Truck className="h-3 w-3" /> Dispatch
            </button>
          )}
          {d.status === 'DISPATCHED' && (
            <button onClick={() => onStatusChange('IN_TRANSIT')}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
              <Navigation className="h-3 w-3" /> Mark In Transit
            </button>
          )}
          {d.status === 'IN_TRANSIT' && (
            <button onClick={() => onStatusChange('ARRIVED')}
              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Mark Arrived
            </button>
          )}
          {(d.status === 'ARRIVED' || d.status === 'IN_TRANSIT') && (
            <button onClick={onConfirm}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Confirm Delivery
            </button>
          )}
          {!['DELIVERED', 'ASSEMBLED', 'FAILED', 'RETURNED'].includes(d.status) && (
            <button onClick={() => {
              if (confirm('Mark this delivery as failed?')) onStatusChange('FAILED');
            }} className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold inline-flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Failed
            </button>
          )}
          {d.status === 'FAILED' && (
            <button onClick={() => onStatusChange('RESCHEDULED')}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Reschedule
            </button>
          )}
        </div>

        {/* Customer feedback preview */}
        {d.customerFeedback && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 italic">
            💬 "{d.customerFeedback}"
          </div>
        )}
      </div>
    </div>
  );
}

function AssignVehicleModal({ delivery, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    vehicleType: delivery.vehicleType || 'Suzuki Pickup',
    vehicleNumber: delivery.vehicleNumber || '',
    driverName: delivery.driverName || '',
    driverPhone: delivery.driverPhone || '',
    helpersCount: delivery.helpersCount || 2,
  });

  const assign = useMutation({
    mutationFn: () => deliveriesApi.assignVehicle(delivery.id, form),
    onSuccess: () => { toast.success('Vehicle assigned'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">🚚 Assign Vehicle</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <Lbl>Vehicle Type</Lbl>
            <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              <option value="Suzuki Pickup">Suzuki Pickup</option>
              <option value="Mazda Shehzore">Mazda Shehzore</option>
              <option value="Hino Truck">Hino Truck</option>
              <option value="Container Truck">Container Truck</option>
              <option value="Mini Van">Mini Van</option>
              <option value="Loader">Loader</option>
            </select>
          </div>
          <div>
            <Lbl>Vehicle Number *</Lbl>
            <input value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })}
              placeholder="LES-1234"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-extrabold focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <Lbl>Driver Name *</Lbl>
            <input value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })}
              placeholder="Driver name"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <Lbl>Driver Phone *</Lbl>
            <input value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
              placeholder="03XX XXXXXXX"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <Lbl>Helpers Count</Lbl>
            <input type="number" min="1" value={form.helpersCount}
              onChange={(e) => setForm({ ...form, helpersCount: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700"
            onClick={() => assign.mutate()} loading={assign.isPending}
            disabled={!form.vehicleNumber.trim() || !form.driverName.trim() || !form.driverPhone.trim()}>
            <Save className="h-4 w-4" /> Assign
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeliveryModal({ delivery, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    receivedByName: '',
    receivedByCnic: '',
    signatureUrl: '',
    photoUrls: [] as string[],
    customerRating: 5,
    customerFeedback: '',
    assemblyTimeSpent: 0,
    assemblyNotes: '',
  });

  const confirm = useMutation({
    mutationFn: () => deliveriesApi.confirm(delivery.id, form),
    onSuccess: () => { toast.success('Delivery confirmed'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">✅ Confirm Delivery</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3 text-sm">
            <div className="font-extrabold text-emerald-900">{delivery.customerName}</div>
            <div className="text-xs text-emerald-700 font-bold mt-0.5">{delivery.deliveryNumber} • {formatPKR(delivery.totalCharge || 0)}</div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Received By Name</Lbl>
              <input value={form.receivedByName} onChange={(e) => setForm({ ...form, receivedByName: e.target.value })}
                placeholder="Who received"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <Lbl>CNIC</Lbl>
              <input value={form.receivedByCnic} onChange={(e) => setForm({ ...form, receivedByCnic: e.target.value })}
                placeholder="XXXXX-XXXXXXX-X"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div>
            <Lbl>Delivery Photos</Lbl>
            <UploadDropzone purpose="delivery-photo" maxFiles={5}
              onUploaded={(recs: any[]) => setForm({ ...form, photoUrls: [...form.photoUrls, ...recs.map((r) => r.url)] })}
              hint="Photos of delivered goods" />
            {form.photoUrls.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {form.photoUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setForm({ ...form, photoUrls: form.photoUrls.filter((_, x) => x !== i) })}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {delivery.requiresAssembly && (
            <div className="rounded-xl bg-violet-50 border-2 border-violet-200 p-3 space-y-3">
              <div className="text-xs font-extrabold text-violet-800 uppercase tracking-wider">🔧 Assembly Details</div>
              <div>
                <Lbl>Assembly Time Spent (minutes)</Lbl>
                <input type="number" value={form.assemblyTimeSpent}
                  onChange={(e) => setForm({ ...form, assemblyTimeSpent: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border-2 border-violet-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <Lbl>Assembly Notes</Lbl>
                <input value={form.assemblyNotes} onChange={(e) => setForm({ ...form, assemblyNotes: e.target.value })}
                  placeholder="Any issues during assembly..."
                  className="h-11 w-full rounded-xl border-2 border-violet-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              </div>
            </div>
          )}

          <div>
            <Lbl>Customer Rating</Lbl>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((r) => (
                <button key={r} type="button" onClick={() => setForm({ ...form, customerRating: r })}
                  className={`h-14 flex-1 rounded-xl border-2 transition ${
                    form.customerRating >= r ? 'border-amber-500 bg-amber-500 text-white shadow-md' : 'border-slate-200 bg-white text-slate-400'}`}>
                  <Star className={`h-6 w-6 mx-auto ${form.customerRating >= r ? 'fill-white' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Lbl>Customer Feedback</Lbl>
            <textarea rows={2} value={form.customerFeedback} onChange={(e) => setForm({ ...form, customerFeedback: e.target.value })}
              placeholder="Any comments from customer..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
          </div>
        </div>
        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700"
            onClick={() => confirm.mutate()} loading={confirm.isPending}>
            <CheckCircle2 className="h-4 w-4" /> Confirm Delivered
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    amber: 'from-amber-500 to-orange-700',
    cyan: 'from-cyan-500 to-blue-700',
    emerald: 'from-emerald-500 to-teal-700',
    violet: 'from-violet-500 to-purple-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick}
      className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-blue-300 hover:shadow-md transition' : ''}`}>
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

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
