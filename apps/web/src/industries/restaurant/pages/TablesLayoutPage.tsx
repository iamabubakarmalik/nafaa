import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Utensils, Plus, Users, Clock, Star, Crown, Wind, Baby,
  Sparkles, RefreshCw, Edit3, Trash2, Calendar, Phone,
  X, Save, CheckCircle2, AlertTriangle, Filter,
} from 'lucide-react';
import { tablesApi, type RestaurantTable, type TableStatus } from '../api/tables.api';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<TableStatus, { label: string; bg: string; border: string; text: string }> = {
  AVAILABLE: { label: 'Available', bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-700' },
  OCCUPIED: { label: 'Occupied', bg: 'bg-rose-500', border: 'border-rose-400', text: 'text-rose-700' },
  RESERVED: { label: 'Reserved', bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-amber-700' },
  CLEANING: { label: 'Cleaning', bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-700' },
  OUT_OF_SERVICE: { label: 'Out of Service', bg: 'bg-slate-500', border: 'border-slate-400', text: 'text-slate-700' },
};

export default function TablesLayoutPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  const { data: tables = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['restaurant-tables', statusFilter],
    queryFn: () => tablesApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
    refetchInterval: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => tablesApi.remove(id),
    onSuccess: () => {
      toast.success('Table removed');
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] });
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TableStatus }) => tablesApi.changeStatus(id, status),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] });
    },
  });

  // Group by section
  const sections = Array.from(new Set(tables.map((t) => t.section || 'Main')));
  const filteredTables = sectionFilter === 'all' ? tables : tables.filter((t) => (t.section || 'Main') === sectionFilter);

  const bySection = filteredTables.reduce((acc, t) => {
    const s = t.section || 'Main';
    if (!acc[s]) acc[s] = [];
    acc[s].push(t);
    return acc;
  }, {} as Record<string, RestaurantTable[]>);

  const statusCounts = tables.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-teal-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Table Management
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🪑 Tables Floor Plan
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Live status — available, occupied, reserved
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
              Add Table
            </Button>
          </div>
        </div>
      </section>

      {/* STATUS SUMMARY */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE'] as TableStatus[]).map((status) => {
          const cfg = STATUS_CONFIG[status];
          const count = statusCounts[status] || 0;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={
                'rounded-2xl p-4 text-left transition-all border-2 ' +
                (statusFilter === status
                  ? cfg.border + ' shadow-lg scale-[1.02] bg-white dark:bg-neutral-900'
                  : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-slate-300')
              }
            >
              <div className="flex items-center gap-2">
                <div className={'h-4 w-4 rounded-full ' + cfg.bg} />
                <span className={'text-[10px] uppercase font-extrabold ' + cfg.text}>{cfg.label}</span>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{count}</div>
            </button>
          );
        })}
      </section>

      {/* SECTION FILTER */}
      {sections.length > 1 && (
        <section className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSectionFilter('all')}
            className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
              (sectionFilter === 'all'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300')
            }
          >
            All Sections ({tables.length})
          </button>
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => setSectionFilter(s)}
              className={
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
                (sectionFilter === s
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300')
              }
            >
              {s} ({tables.filter((t) => (t.section || 'Main') === s).length})
            </button>
          ))}
        </section>
      )}

      {showForm && (
        <TableForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] });
          }}
        />
      )}

      {/* TABLES GRID by section */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-slate-100 dark:bg-neutral-800 mx-auto flex items-center justify-center">
            <Utensils className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No tables</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">Pehla table add karo</p>
          <Button
            className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-700"
            onClick={() => { setEditing(null); setShowForm(true); }}
          >
            <Plus className="h-4 w-4" />
            Add First Table
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(bySection).map(([section, sectionTables]) => (
            <section key={section}>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{section}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {sectionTables.map((table) => (
                  <TableCard
                    key={table.id}
                    table={table}
                    onEdit={() => { setEditing(table); setShowForm(true); }}
                    onDelete={() => {
                      if (confirm('Delete table ' + table.tableNumber + '?')) removeMutation.mutate(table.id);
                    }}
                    onStatusChange={(status) => changeStatusMutation.mutate({ id: table.id, status })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TableCard({ table, onEdit, onDelete, onStatusChange }: {
  table: RestaurantTable;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: TableStatus) => void;
}) {
  const cfg = STATUS_CONFIG[table.status];
  const isOccupied = table.status === 'OCCUPIED';
  const occupiedMinutes = table.occupiedAt
    ? Math.floor((Date.now() - new Date(table.occupiedAt).getTime()) / 60000)
    : 0;

  return (
    <div className={
      'group relative rounded-2xl border-4 p-4 shadow-md hover:shadow-xl transition-all bg-white dark:bg-neutral-900 ' +
      cfg.border
    }>
      {/* Status indicator */}
      <div className={'absolute -top-2 -right-2 h-4 w-4 rounded-full ring-2 ring-white dark:ring-neutral-900 ' + cfg.bg + (isOccupied ? ' animate-pulse' : '')} />

      {/* Actions overlay */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={onEdit}
          className="h-7 w-7 rounded-lg bg-slate-900/80 backdrop-blur text-white flex items-center justify-center hover:bg-slate-900"
        >
          <Edit3 className="h-3 w-3" />
        </button>
        <button
          onClick={onDelete}
          className="h-7 w-7 rounded-lg bg-rose-600/80 backdrop-blur text-white flex items-center justify-center hover:bg-rose-600"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Table number + name */}
      <div className="text-center">
        <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
          {table.tableNumber}
        </div>
        {table.tableName && (
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold truncate">{table.tableName}</div>
        )}
      </div>

      {/* Attributes */}
      <div className="mt-2 flex flex-wrap justify-center gap-1">
        {table.isVip && (
          <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
            <Crown className="h-2 w-2" /> VIP
          </span>
        )}
        {table.isFamilyArea && (
          <span className="px-1.5 py-0.5 rounded bg-pink-100 dark:bg-pink-950/40 text-pink-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
            <Baby className="h-2 w-2" /> Family
          </span>
        )}
        {table.isAcRoom && (
          <span className="px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
            <Wind className="h-2 w-2" /> AC
          </span>
        )}
      </div>

      {/* Capacity */}
      <div className="mt-2 flex items-center justify-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400">
        <Users className="h-3 w-3" />
        {table.capacity} seats
      </div>

      {/* Status specific info */}
      {isOccupied && occupiedMinutes > 0 && (
        <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-extrabold text-rose-700 dark:text-rose-400">
          <Clock className="h-2.5 w-2.5" />
          {occupiedMinutes}m
        </div>
      )}

      {table.status === 'RESERVED' && table.reservedByName && (
        <div className="mt-2 text-[10px] font-extrabold text-amber-700 dark:text-amber-400 text-center truncate">
          <Calendar className="h-2.5 w-2.5 inline mr-0.5" />
          {table.reservedByName}
        </div>
      )}

      {/* Status change quick actions */}
      <div className="mt-3 pt-2 border-t border-slate-200 dark:border-neutral-700">
        <select
          value={table.status}
          onChange={(e) => onStatusChange(e.target.value as TableStatus)}
          className={
            'w-full h-7 rounded-md text-[10px] font-extrabold text-white text-center appearance-none cursor-pointer ' + cfg.bg
          }
        >
          {(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE'] as TableStatus[]).map((s) => (
            <option key={s} value={s} className="text-black">{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TableForm({ editing, onClose, onSaved }: {
  editing: RestaurantTable | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    tableNumber: editing?.tableNumber ?? '',
    tableName: editing?.tableName ?? '',
    capacity: editing?.capacity ?? 4,
    minCapacity: editing?.minCapacity ?? 1,
    maxCapacity: editing?.maxCapacity ?? 8,
    section: editing?.section ?? '',
    floor: editing?.floor ?? '',
    shape: editing?.shape ?? 'square',
    isReservable: editing?.isReservable ?? true,
    isSmokingAllowed: editing?.isSmokingAllowed ?? false,
    isAcRoom: editing?.isAcRoom ?? true,
    isFamilyArea: editing?.isFamilyArea ?? false,
    isVip: editing?.isVip ?? false,
    minOrderAmount: editing?.minOrderAmount ?? '',
    notes: editing?.notes ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
      };
      return editing
        ? tablesApi.update(editing.id, payload)
        : tablesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Table updated' : 'Table created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-300 dark:border-emerald-700 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">
          {editing ? 'Edit Table' : 'New Table'}
        </h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Table Number *</label>
          <input
            autoFocus
            value={form.tableNumber}
            onChange={(e) => setForm({ ...form, tableNumber: e.target.value })}
            placeholder="T-01"
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Table Name</label>
          <input
            value={form.tableName}
            onChange={(e) => setForm({ ...form, tableName: e.target.value })}
            placeholder="Window Booth"
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:col-span-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Min</label>
            <input
              type="number"
              value={form.minCapacity}
              onChange={(e) => setForm({ ...form, minCapacity: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 mb-1 block">Capacity *</label>
            <input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Max</label>
            <input
              type="number"
              value={form.maxCapacity}
              onChange={(e) => setForm({ ...form, maxCapacity: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Section</label>
          <input
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
            placeholder="Ground Floor / Rooftop / Family Area"
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Floor</label>
          <input
            value={form.floor}
            onChange={(e) => setForm({ ...form, floor: e.target.value })}
            placeholder="GF / 1st"
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { key: 'isReservable', label: 'Reservable', icon: Calendar },
            { key: 'isVip', label: 'VIP', icon: Crown },
            { key: 'isFamilyArea', label: 'Family', icon: Baby },
            { key: 'isAcRoom', label: 'AC', icon: Wind },
            { key: 'isSmokingAllowed', label: 'Smoking', icon: AlertTriangle },
          ].map((opt) => (
            <label key={opt.key} className={
              'flex items-center gap-2 p-2 rounded-xl border-2 cursor-pointer transition ' +
              ((form as any)[opt.key]
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-emerald-300')
            }>
              <input
                type="checkbox"
                checked={(form as any)[opt.key]}
                onChange={(e) => setForm({ ...form, [opt.key]: e.target.checked })}
                className="h-4 w-4 rounded"
              />
              <opt.icon className="h-3.5 w-3.5" />
              <span className="text-xs font-extrabold">{opt.label}</span>
            </label>
          ))}
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Min Order Amount</label>
          <input
            type="number"
            value={form.minOrderAmount}
            onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value as any })}
            placeholder="Optional"
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Shape</label>
          <select
            value={form.shape}
            onChange={(e) => setForm({ ...form, shape: e.target.value })}
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
          >
            <option value="square">Square</option>
            <option value="round">Round</option>
            <option value="rectangle">Rectangle</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Notes</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Corner table with window view"
            className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        <div className="sm:col-span-2 flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!form.tableNumber || !form.capacity}
          >
            <Save className="h-4 w-4" />
            {editing ? 'Update Table' : 'Create Table'}
          </Button>
        </div>
      </div>
    </section>
  );
}
