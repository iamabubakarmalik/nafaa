import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Route as RouteIcon, Plus, Search, X, Save, Edit3, Trash2, RefreshCw,
  Sparkles, Sunrise, Sunset, Users, Milk, Truck, User, Clock, MapPin,
} from 'lucide-react';
import { routesApi, type DairyRoute } from '../api/routes.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';

const SLOTS = [
  { value: 'MORNING', label: 'Morning', emoji: '🌅', color: 'from-amber-500 to-orange-600' },
  { value: 'AFTERNOON', label: 'Afternoon', emoji: '☀️', color: 'from-yellow-500 to-amber-600' },
  { value: 'EVENING', label: 'Evening', emoji: '🌆', color: 'from-indigo-500 to-purple-600' },
  { value: 'NIGHT', label: 'Night', emoji: '🌙', color: 'from-slate-700 to-slate-900' },
];

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function DairyRoutesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DairyRoute | null>(null);

  const { data: routes = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dairy-routes', slotFilter, search],
    queryFn: () => routesApi.list({
      slot: slotFilter === 'all' ? undefined : slotFilter,
      search: search.trim() || undefined,
      active: true,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => routesApi.remove(id),
    onSuccess: () => { toast.success('Route deactivated'); queryClient.invalidateQueries({ queryKey: ['dairy-routes'] }); },
  });

  const recalcMutation = useMutation({
    mutationFn: (id: string) => routesApi.recalculate(id),
    onSuccess: () => { toast.success('Stats updated'); queryClient.invalidateQueries({ queryKey: ['dairy-routes'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Delivery Routes
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🛣️ Routes</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Delivery routes with staff/vehicle assignment</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />New Route
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search route # / name / area..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-violet-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setSlotFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (slotFilter === 'all' ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Slots</button>
          {SLOTS.map((s) => (
            <button key={s.value} onClick={() => setSlotFilter(s.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (slotFilter === s.value ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s.emoji} {s.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <RouteForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['dairy-routes'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : routes.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <RouteIcon className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No routes yet</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.map((r) => (
            <RouteCard
              key={r.id}
              route={r}
              onEdit={() => { setEditing(r); setShowForm(true); }}
              onDelete={() => { if (confirm('Deactivate ' + r.name + '?')) removeMutation.mutate(r.id); }}
              onRecalc={() => recalcMutation.mutate(r.id)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function RouteCard({ route, onEdit, onDelete, onRecalc }: any) {
  const slot = SLOTS.find((s) => s.value === route.slot);

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition overflow-hidden">
      <div className={'p-4 text-white bg-gradient-to-br ' + (slot?.color ?? 'from-violet-500 to-purple-600')} style={route.color ? { background: 'linear-gradient(135deg, ' + route.color + ', ' + route.color + 'dd)' } : {}}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl">{slot?.emoji}</div>
            <div className="mt-1 text-xs font-bold text-white/80">{route.routeNumber}</div>
            <h3 className="mt-1 text-xl font-extrabold">{route.name}</h3>
            {route.areaName && <div className="text-xs font-bold text-white/80 mt-0.5">{route.areaName}</div>}
          </div>
          <div className="flex gap-1">
            <button onClick={onEdit} className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center">
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button onClick={onDelete} className="h-8 w-8 rounded-lg bg-white/20 hover:bg-rose-500 flex items-center justify-center">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {(route.startTime || route.estimatedDurationMin) && (
          <div className="flex items-center gap-3 text-xs text-slate-600 font-semibold">
            {route.startTime && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{route.startTime}</span>}
            {route.estimatedDurationMin && <span>{route.estimatedDurationMin} min</span>}
          </div>
        )}
        {(route.vehicleType || route.vehicleNumber) && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Truck className="h-3 w-3" />
            {route.vehicleType} {route.vehicleNumber ? '• ' + route.vehicleNumber : ''}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2 text-center">
            <div className="text-[9px] uppercase font-extrabold text-blue-700 inline-flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />Customers</div>
            <div className="text-lg font-extrabold text-blue-900 tabular-nums">{route.totalCustomers}</div>
          </div>
          <div className="rounded-lg bg-cyan-50 dark:bg-cyan-950/30 p-2 text-center">
            <div className="text-[9px] uppercase font-extrabold text-cyan-700 inline-flex items-center gap-0.5"><Milk className="h-2.5 w-2.5" />Daily/L</div>
            <div className="text-lg font-extrabold text-cyan-900 tabular-nums">{route.totalDailyLiters.toFixed(0)}</div>
          </div>
        </div>

        <div className="flex gap-1 pt-2">
          <Link to={'/dairy/routes/' + route.id} className="flex-1 h-9 rounded-lg bg-violet-100 dark:bg-violet-950/40 hover:bg-violet-200 text-violet-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
            View
          </Link>
          <button onClick={onRecalc} className="h-9 px-3 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 text-xs font-extrabold inline-flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />Recalc
          </button>
        </div>
      </div>
    </div>
  );
}

function RouteForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    slot: editing?.slot ?? 'MORNING',
    startTime: editing?.startTime ?? '06:00',
    estimatedDurationMin: editing?.estimatedDurationMin ?? 120,
    areaName: editing?.areaName ?? '',
    vehicleType: editing?.vehicleType ?? '',
    vehicleNumber: editing?.vehicleNumber ?? '',
    assignedStaffId: editing?.assignedStaffId ?? '',
    color: editing?.color ?? COLORS[0],
  });

  const { data: staffList } = useQuery({
    queryKey: ['staff-for-dairy-route'],
    queryFn: () => apiClient.get('/staff?isActive=true&limit=200').then((r) => r.data?.data?.items ?? r.data?.items ?? []),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        estimatedDurationMin: form.estimatedDurationMin ? Number(form.estimatedDurationMin) : undefined,
        assignedStaffId: form.assignedStaffId || undefined,
      };
      return editing ? routesApi.update(editing.id, payload) : routesApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Route updated' : 'Route created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-violet-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-violet-50 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Route' : 'New Route'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Route name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          <input value={form.areaName} onChange={(e) => setForm({ ...form, areaName: e.target.value })} placeholder="Area name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Delivery Slot *</label>
          <div className="grid grid-cols-4 gap-2">
            {SLOTS.map((s) => (
              <button key={s.value} onClick={() => setForm({ ...form, slot: s.value })} className={
                'p-3 rounded-xl border-2 text-center transition ' +
                (form.slot === s.value ? 'border-violet-500 bg-violet-50 shadow' : 'border-slate-200 bg-white hover:border-violet-300')
              }>
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="text-[10px] font-extrabold">{s.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Start Time</label>
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Duration (min)</label>
            <input type="number" value={form.estimatedDurationMin} onChange={(e) => setForm({ ...form, estimatedDurationMin: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} placeholder="Vehicle type (bike/rickshaw)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          <input value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="Vehicle number" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500" />
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Assigned Staff (Dodhi)</label>
          <select value={form.assignedStaffId} onChange={(e) => setForm({ ...form, assignedStaffId: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
            <option value="">-- Unassigned --</option>
            {(staffList ?? []).map((s: any) => {
              const nm = ((s.firstName || '') + ' ' + (s.lastName || '')).trim() || s.name || s.staffNumber;
              return <option key={s.id} value={s.id}>{nm}</option>;
            })}
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Color Marker</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setForm({ ...form, color: c })} className={
                'h-10 w-10 rounded-lg border-2 transition ' +
                (form.color === c ? 'border-slate-900 scale-110' : 'border-slate-200')
              } style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim()}>
            <Save className="h-4 w-4" />{editing ? 'Update' : 'Create Route'}
          </Button>
        </div>
      </div>
    </section>
  );
}
