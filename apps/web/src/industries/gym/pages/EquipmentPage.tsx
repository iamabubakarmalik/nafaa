import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  Wrench, CheckCircle2, AlertCircle, Package, Calendar, MapPin,
} from 'lucide-react';
import { equipmentApi, type EquipmentCategory, type EquipmentStatus, type Equipment } from '../api/equipment.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CATEGORIES: { value: EquipmentCategory; label: string; emoji: string }[] = [
  { value: 'CARDIO', label: 'Cardio', emoji: '🏃' },
  { value: 'STRENGTH', label: 'Strength', emoji: '💪' },
  { value: 'FREE_WEIGHTS', label: 'Free Weights', emoji: '🏋️' },
  { value: 'MACHINES', label: 'Machines', emoji: '⚙️' },
  { value: 'FUNCTIONAL', label: 'Functional', emoji: '🔄' },
  { value: 'YOGA_MAT', label: 'Yoga', emoji: '🧘' },
  { value: 'BOXING', label: 'Boxing', emoji: '🥊' },
  { value: 'CROSSFIT', label: 'CrossFit', emoji: '🏋️' },
  { value: 'ACCESSORIES', label: 'Accessories', emoji: '🎒' },
  { value: 'OTHER', label: 'Other', emoji: '⭐' },
];

const STATUS_COLORS: Record<EquipmentStatus, string> = {
  AVAILABLE: 'bg-emerald-500', IN_USE: 'bg-blue-500', MAINTENANCE: 'bg-amber-500',
  OUT_OF_ORDER: 'bg-rose-500', RESERVED: 'bg-violet-500', RETIRED: 'bg-slate-500',
};

export default function EquipmentPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [maintaining, setMaintaining] = useState<Equipment | null>(null);

  const { data: equipment = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['gym-equipment', categoryFilter, statusFilter, search],
    queryFn: () => equipmentApi.list({
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['equipment-summary'],
    queryFn: () => equipmentApi.summary(),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => equipmentApi.remove(id),
    onSuccess: () => { toast.success('Retired'); queryClient.invalidateQueries({ queryKey: ['gym-equipment'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              Equipment Inventory
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">⚙️ Equipment</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Cardio, strength, machines, maintenance</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Add Equipment
            </Button>
          </div>
        </div>
      </section>

      {summary?.needsMaintenance > 0 && (
        <div className="rounded-2xl bg-amber-100 border-2 border-amber-300 p-4 flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-amber-700" />
          <div className="flex-1">
            <div className="font-extrabold text-amber-900">{summary.needsMaintenance} items need maintenance</div>
            <div className="text-xs text-amber-700 font-bold">Schedule maintenance to keep equipment in good condition</div>
          </div>
        </div>
      )}

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search equipment..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-orange-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCategoryFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (categoryFilter === 'all' ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (categoryFilter === c.value ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{c.emoji} {c.label}</button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_ORDER'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{s === 'all' ? 'All Status' : s.replace('_', ' ')}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <EquipmentForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['gym-equipment'] }); }}
        />
      )}

      {maintaining && (
        <MaintenanceModal
          equipment={maintaining}
          onClose={() => setMaintaining(null)}
          onDone={() => { setMaintaining(null); queryClient.invalidateQueries({ queryKey: ['gym-equipment'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : equipment.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Zap className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No equipment</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((e) => (
            <EquipmentCard
              key={e.id}
              equipment={e}
              onEdit={() => { setEditing(e); setShowForm(true); }}
              onMaintenance={() => setMaintaining(e)}
              onDelete={() => { if (confirm('Retire equipment?')) removeMutation.mutate(e.id); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function EquipmentCard({ equipment, onEdit, onMaintenance, onDelete }: any) {
  const cat = CATEGORIES.find((c) => c.value === equipment.category);
  const needsMaint = equipment.nextMaintenanceDate && new Date(equipment.nextMaintenanceDate) <= new Date();

  return (
    <div className={
      'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 space-y-3 ' +
      (needsMaint ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="flex items-start gap-3">
        {equipment.imageUrls?.[0] ? (
          <img src={equipment.imageUrls[0]} className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-200" />
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center text-3xl shrink-0">
            {cat?.emoji}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-extrabold truncate">{equipment.name}</div>
          <div className="text-[10px] font-mono font-bold text-slate-500">{equipment.equipmentNumber}</div>
          <div className="text-xs font-extrabold text-orange-600">{cat?.label}</div>
          <span className={'inline-block mt-1 px-2 py-0.5 rounded text-white text-[9px] font-extrabold uppercase ' + STATUS_COLORS[equipment.status as EquipmentStatus]}>
            {equipment.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {(equipment.brand || equipment.model) && (
        <div className="text-xs text-slate-600 font-bold">
          {equipment.brand} {equipment.model}
        </div>
      )}

      {equipment.location && (
        <div className="text-xs flex items-center gap-1 text-slate-500">
          <MapPin className="h-3 w-3" />
          <span className="font-bold">{equipment.location}</span>
        </div>
      )}

      {equipment.nextMaintenanceDate && (
        <div className={
          'rounded-lg p-2 text-xs ' +
          (needsMaint ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-slate-50 text-slate-600')
        }>
          <div className="flex items-center gap-1 font-extrabold">
            <Wrench className="h-3 w-3" />
            Next Maintenance
          </div>
          <div className="font-bold mt-0.5">{format(new Date(equipment.nextMaintenanceDate), 'dd MMM yyyy')}</div>
          {needsMaint && <div className="text-[10px] font-extrabold text-amber-700 mt-0.5">⚠️ Overdue</div>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1 text-xs pt-2 border-t border-slate-100">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Purchase</div>
          <div className="font-extrabold text-emerald-700 tabular-nums">
            {equipment.purchasePrice ? formatPKR(equipment.purchasePrice) : '—'}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Maint Cost</div>
          <div className="font-extrabold text-amber-700 tabular-nums">{formatPKR(equipment.totalMaintenanceCost)}</div>
        </div>
      </div>

      <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <button onClick={onMaintenance} className="flex-1 h-9 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
          <Wrench className="h-3 w-3" />
          Maintain
        </button>
        <button onClick={onEdit} className="h-9 w-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function EquipmentForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    equipmentNumber: editing?.equipmentNumber ?? '',
    name: editing?.name ?? '',
    category: editing?.category ?? 'CARDIO',
    brand: editing?.brand ?? '',
    model: editing?.model ?? '',
    serialNumber: editing?.serialNumber ?? '',
    purchaseDate: editing?.purchaseDate ? editing.purchaseDate.slice(0, 10) : '',
    purchasePrice: editing?.purchasePrice ?? '',
    vendorName: editing?.vendorName ?? '',
    warrantyExpiry: editing?.warrantyExpiry ? editing.warrantyExpiry.slice(0, 10) : '',
    location: editing?.location ?? '',
    roomName: editing?.roomName ?? '',
    status: editing?.status ?? 'AVAILABLE',
    maintenanceIntervalDays: editing?.maintenanceIntervalDays ?? '',
    nextMaintenanceDate: editing?.nextMaintenanceDate ? editing.nextMaintenanceDate.slice(0, 10) : '',
    notes: editing?.notes ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
        maintenanceIntervalDays: form.maintenanceIntervalDays ? Number(form.maintenanceIntervalDays) : undefined,
      };
      return editing ? equipmentApi.update(editing.id, payload) : equipmentApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Added'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-orange-300 dark:border-orange-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-orange-50 dark:bg-orange-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Equipment' : 'Add Equipment'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-3 gap-3">
          <input value={form.equipmentNumber} onChange={(e) => setForm({ ...form, equipmentNumber: e.target.value })} placeholder="EQ # (auto if blank)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-orange-500" />
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Equipment name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Brand" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Model" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          <input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="Serial #" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-orange-500" />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Purchase Date</label>
            <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Purchase Price</label>
            <input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Vendor</label>
            <input value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} placeholder="Vendor name" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location (Main hall, Floor 2...)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          <input value={form.roomName} onChange={(e) => setForm({ ...form, roomName: e.target.value })} placeholder="Room / Zone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500">
              <option value="AVAILABLE">Available</option>
              <option value="IN_USE">In Use</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OUT_OF_ORDER">Out of Order</option>
              <option value="RESERVED">Reserved</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Warranty Expiry</label>
            <input type="date" value={form.warrantyExpiry} onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          </div>
        </div>

        <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="text-sm font-extrabold text-amber-900 mb-3 flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance Schedule
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Interval (days)</label>
              <input type="number" value={form.maintenanceIntervalDays} onChange={(e) => setForm({ ...form, maintenanceIntervalDays: e.target.value })} placeholder="e.g. 90" className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Next Maintenance</label>
              <input type="date" value={form.nextMaintenanceDate} onChange={(e) => setForm({ ...form, nextMaintenanceDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            </div>
          </div>
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-orange-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-orange-600 to-red-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Add Equipment'}
          </Button>
        </div>
      </div>
    </section>
  );
}

function MaintenanceModal({ equipment, onClose, onDone }: any) {
  const [cost, setCost] = useState(0);
  const [notes, setNotes] = useState('');
  const [nextDate, setNextDate] = useState('');

  const maintainMutation = useMutation({
    mutationFn: () => equipmentApi.maintenance(equipment.id, {
      cost: Number(cost),
      notes: notes || undefined,
      nextDate: nextDate || undefined,
    }),
    onSuccess: () => { toast.success('Maintenance recorded'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold">🔧 Record Maintenance</h3>
            <p className="text-xs text-slate-500 font-semibold">{equipment.name} • {equipment.equipmentNumber}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Cost (Rs) *</label>
            <input type="number" step="0.01" autoFocus value={cost} onChange={(e) => setCost(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Next Maintenance Date</label>
            <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            <div className="text-[10px] font-bold text-slate-500 mt-1">Leave blank to use interval ({equipment.maintenanceIntervalDays || 'N/A'} days)</div>
          </div>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Maintenance notes (what was done, parts replaced...)" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />

          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 p-3 text-xs">
            <div className="flex items-center gap-2 font-extrabold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              After recording:
            </div>
            <ul className="mt-1 space-y-0.5 pl-5 text-emerald-700 font-semibold list-disc">
              <li>Status will be set to AVAILABLE</li>
              <li>Last maintenance date will be updated</li>
              <li>Total maintenance cost will be tracked</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700" onClick={() => maintainMutation.mutate()} loading={maintainMutation.isPending} disabled={cost < 0}>
              <Wrench className="h-4 w-4" />
              Record
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
