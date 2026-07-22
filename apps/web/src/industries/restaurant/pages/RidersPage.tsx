import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bike, Plus, Phone, MapPin, Star, TrendingUp, Award, X, Save,
  Edit3, Trash2, RefreshCw, Sparkles, Car, User, Clock,
  CheckCircle2, AlertCircle, Coffee, Circle, Search,
} from 'lucide-react';
import { ridersApi, type Rider, type RiderStatus } from '../api/riders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<RiderStatus, { label: string; color: string; bg: string; icon: any }> = {
  ACTIVE: { label: 'Active', color: 'text-emerald-700', bg: 'bg-emerald-500', icon: CheckCircle2 },
  BUSY: { label: 'On Delivery', color: 'text-amber-700', bg: 'bg-amber-500', icon: Bike },
  OFFLINE: { label: 'Offline', color: 'text-slate-700', bg: 'bg-slate-500', icon: Circle },
  ON_BREAK: { label: 'On Break', color: 'text-blue-700', bg: 'bg-blue-500', icon: Coffee },
  INACTIVE: { label: 'Inactive', color: 'text-rose-700', bg: 'bg-rose-500', icon: AlertCircle },
};

const VEHICLE_OPTIONS = [
  { value: 'Bike', emoji: '🏍️' },
  { value: 'Car', emoji: '🚗' },
  { value: 'Bicycle', emoji: '🚴' },
  { value: 'Rickshaw', emoji: '🛺' },
  { value: 'On foot', emoji: '🚶' },
];

export default function RidersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Rider | null>(null);

  const { data: riders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['riders', statusFilter],
    queryFn: () => ridersApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      active: true,
    }),
    refetchInterval: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => ridersApi.remove(id),
    onSuccess: () => {
      toast.success('Rider deactivated');
      queryClient.invalidateQueries({ queryKey: ['riders'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RiderStatus }) =>
      ridersApi.update(id, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['riders'] });
    },
  });

  const filtered = riders.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.phone.includes(q) || (r.vehicleNumber || '').toLowerCase().includes(q);
  });

  const stats = {
    total: riders.length,
    active: riders.filter((r) => r.status === 'ACTIVE').length,
    busy: riders.filter((r) => r.status === 'BUSY').length,
    offline: riders.filter((r) => r.status === 'OFFLINE' || r.status === 'ON_BREAK').length,
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Delivery Fleet
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🏍️ Riders
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Delivery boys — manage, track, assign
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
            <Button
              className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => { setEditing(null); setShowForm(true); }}
            >
              <Plus className="h-4 w-4" />
              Add Rider
            </Button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Riders" value={stats.total} icon={Bike} color="blue" />
        <StatCard label="Available" value={stats.active} icon={CheckCircle2} color="emerald" />
        <StatCard label="On Delivery" value={stats.busy} icon={MapPin} color="amber" />
        <StatCard label="Offline" value={stats.offline} icon={Circle} color="slate" />
      </section>

      {/* FILTERS */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, vehicle..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-blue-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['all', 'ACTIVE', 'BUSY', 'OFFLINE', 'ON_BREAK', 'INACTIVE'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
                (statusFilter === s
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200')
              }
            >
              {s === 'all' ? 'All' : STATUS_CONFIG[s as RiderStatus]?.label || s}
            </button>
          ))}
        </div>
      </section>

      {showForm && (
        <RiderForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['riders'] });
          }}
        />
      )}

      {/* RIDERS GRID */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-blue-100 dark:bg-blue-950/40 mx-auto flex items-center justify-center">
            <Bike className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No riders</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">
            {search || statusFilter !== 'all' ? 'No riders match' : 'Add your first rider'}
          </p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((rider) => (
            <RiderCard
              key={rider.id}
              rider={rider}
              onEdit={() => { setEditing(rider); setShowForm(true); }}
              onDelete={() => {
                if (confirm('Deactivate ' + rider.name + '?')) removeMutation.mutate(rider.id);
              }}
              onStatusChange={(status) => updateStatusMutation.mutate({ id: rider.id, status })}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-blue-700',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    slate: 'from-slate-500 to-slate-700',
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

function RiderCard({ rider, onEdit, onDelete, onStatusChange }: {
  rider: Rider;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: RiderStatus) => void;
}) {
  const cfg = STATUS_CONFIG[rider.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-xl transition p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {rider.avatarUrl ? (
            <img src={rider.avatarUrl} alt={rider.name} className="h-14 w-14 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-neutral-700" />
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center text-lg font-extrabold shadow-lg ring-2 ring-white">
              {rider.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={'absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-2 ring-white dark:ring-neutral-900 ' + cfg.bg} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-slate-900 dark:text-white truncate">{rider.name}</div>
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 font-semibold">
            <Phone className="h-3 w-3" />
            {rider.phone}
          </div>
          {rider.vehicleType && (
            <div className="text-xs text-slate-500 font-bold mt-0.5">
              {VEHICLE_OPTIONS.find((v) => v.value === rider.vehicleType)?.emoji} {rider.vehicleType}
              {rider.vehicleNumber && ' • ' + rider.vehicleNumber}
            </div>
          )}
        </div>
      </div>

      {/* Status Select */}
      <div>
        <select
          value={rider.status}
          onChange={(e) => onStatusChange(e.target.value as RiderStatus)}
          className={
            'w-full h-9 rounded-lg text-xs font-extrabold text-white text-center appearance-none cursor-pointer ' + cfg.bg
          }
        >
          {(['ACTIVE', 'BUSY', 'OFFLINE', 'ON_BREAK', 'INACTIVE'] as RiderStatus[]).map((s) => (
            <option key={s} value={s} className="text-black">{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Deliveries</div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{rider.totalDeliveries}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-emerald-700">Tips</div>
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(rider.totalTips).replace('Rs', '')}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-amber-700 flex items-center justify-center gap-0.5">
            <Star className="h-2 w-2 fill-current" /> Rating
          </div>
          <div className="text-lg font-extrabold text-amber-700 tabular-nums">
            {rider.avgRating ? rider.avgRating.toFixed(1) : '—'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <button
          onClick={onEdit}
          className="flex-1 h-9 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-extrabold inline-flex items-center justify-center gap-1"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function RiderForm({ editing, onClose, onSaved }: {
  editing: Rider | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    phone: editing?.phone ?? '',
    cnic: editing?.cnic ?? '',
    email: editing?.email ?? '',
    avatarUrl: editing?.avatarUrl ?? '',
    vehicleType: editing?.vehicleType ?? 'Bike',
    vehicleNumber: editing?.vehicleNumber ?? '',
    licenseNumber: editing?.licenseNumber ?? '',
    isEmployee: editing?.isEmployee ?? true,
    commissionType: editing?.commissionType ?? 'PER_DELIVERY',
    commissionValue: editing?.commissionValue ?? 0,
    baseSalary: editing?.baseSalary ?? 0,
    notes: editing?.notes ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = { ...form };
      return editing ? ridersApi.update(editing.id, payload) : ridersApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Rider updated' : 'Rider created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-300 dark:border-blue-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">
          {editing ? 'Edit Rider' : 'New Rider'}
        </h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Photo */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Photo</label>
          {form.avatarUrl ? (
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-neutral-700">
              <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setForm({ ...form, avatarUrl: '' })}
                className="absolute top-1 right-1 h-6 w-6 rounded-lg bg-rose-600 text-white flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <UploadDropzone
              onUploaded={(records) => {
                const first = Array.isArray(records) ? records[0] : records;
                const url = typeof first === 'string' ? first : (first as any)?.url;
                if (url) setForm({ ...form, avatarUrl: url });
              }}
            />
          )}
        </div>

        {/* Basic */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Full Name *</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ahmed Khan"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Phone *</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="03XXXXXXXXX"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">CNIC</label>
            <input
              value={form.cnic}
              onChange={(e) => setForm({ ...form, cnic: e.target.value })}
              placeholder="42101-XXXXXXX-X"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Optional"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Vehicle */}
        <div className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 p-4 space-y-3">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">Vehicle Info</div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2 block">Vehicle Type</label>
            <div className="grid grid-cols-5 gap-2">
              {VEHICLE_OPTIONS.map((v) => (
                <button
                  key={v.value}
                  onClick={() => setForm({ ...form, vehicleType: v.value })}
                  className={
                    'p-3 rounded-xl border-2 text-center transition ' +
                    (form.vehicleType === v.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-blue-300')
                  }
                >
                  <div className="text-2xl mb-1">{v.emoji}</div>
                  <div className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">{v.value}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Vehicle Number</label>
              <input
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                placeholder="LEA-1234"
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">License Number</label>
              <input
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                placeholder="Optional"
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Compensation */}
        <div className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 p-4 space-y-3">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">Compensation</div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isEmployee} onChange={(e) => setForm({ ...form, isEmployee: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold">Employee (not freelance)</span>
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Commission Type</label>
              <select
                value={form.commissionType}
                onChange={(e) => setForm({ ...form, commissionType: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500"
              >
                <option value="PER_DELIVERY">Per Delivery (fixed Rs)</option>
                <option value="PERCENTAGE">Percentage of order</option>
                <option value="FIXED">Fixed monthly</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">
                Commission Value {form.commissionType === 'PERCENTAGE' ? '(%)' : '(Rs)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={form.commissionValue}
                onChange={(e) => setForm({ ...form, commissionValue: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {form.isEmployee && (
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Base Monthly Salary (Rs)</label>
              <input
                type="number"
                step="0.01"
                value={form.baseSalary}
                onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Notes</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any additional info"
            className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!form.name.trim() || !form.phone.trim()}
          >
            <Save className="h-4 w-4" />
            {editing ? 'Update Rider' : 'Create Rider'}
          </Button>
        </div>
      </div>
    </section>
  );
}
