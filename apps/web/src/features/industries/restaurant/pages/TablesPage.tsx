import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Utensils, Plus, Users, Clock, CheckCircle2, AlertCircle,
  Trash2, Edit3, X, Sparkles, MapPin, RefreshCw,
} from 'lucide-react';
import { tablesApi, type RestaurantTable, type TableStatus, type CreateTablePayload } from '../api/tables.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<TableStatus, { label: string; bg: string; border: string; text: string; icon: any }> = {
  AVAILABLE: { label: 'Available', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', icon: CheckCircle2 },
  OCCUPIED: { label: 'Occupied', bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', icon: Users },
  RESERVED: { label: 'Reserved', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', icon: Clock },
  CLEANING: { label: 'Cleaning', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', icon: RefreshCw },
  OUT_OF_SERVICE: { label: 'Out', bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-600', icon: AlertCircle },
};

export default function TablesPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [form, setForm] = useState<CreateTablePayload>({
    tableNumber: '', name: '', capacity: 4, floor: '', zone: '', notes: '',
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['restaurant-tables'],
    queryFn: () => tablesApi.list(),
  });

  const { data: stats } = useQuery({
    queryKey: ['restaurant-tables-stats'],
    queryFn: tablesApi.stats,
  });

  const groupedByFloor = useMemo(() => {
    const groups: Record<string, RestaurantTable[]> = {};
    tables.forEach((t) => {
      const floor = t.floor || 'Main Floor';
      if (!groups[floor]) groups[floor] = [];
      groups[floor].push(t);
    });
    return groups;
  }, [tables]);

  const createMutation = useMutation({
    mutationFn: () => tablesApi.create(form),
    onSuccess: () => {
      toast.success('Table added');
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables-stats'] });
      resetForm();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: () => tablesApi.update(editingTable!.id, form),
    onSuccess: () => {
      toast.success('Table updated');
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] });
      resetForm();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TableStatus }) =>
      tablesApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables-stats'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => tablesApi.remove(id),
    onSuccess: () => {
      toast.success('Table removed');
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] });
    },
  });

  const resetForm = () => {
    setShowAdd(false);
    setEditingTable(null);
    setForm({ tableNumber: '', name: '', capacity: 4, floor: '', zone: '', notes: '' });
  };

  const openEdit = (t: RestaurantTable) => {
    setEditingTable(t);
    setForm({
      tableNumber: t.tableNumber,
      name: t.name || '',
      capacity: t.capacity,
      floor: t.floor || '',
      zone: t.zone || '',
      notes: t.notes || '',
    });
    setShowAdd(true);
  };

  return (
    <div className="space-y-6">
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-orange-600" />
                <h3 className="font-bold text-slate-900">
                  {editingTable ? 'Edit Table' : 'Add New Table'}
                </h3>
              </div>
              <button onClick={resetForm} className="h-8 w-8 rounded-lg hover:bg-white/50 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <Input
                label="Table Number *"
                value={form.tableNumber}
                onChange={(e) => setForm({ ...form, tableNumber: e.target.value })}
                placeholder="T-1, VIP-1, etc."
              />
              <Input
                label="Display Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Window seat, Family booth..."
              />
              <Input
                label="Capacity *"
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) || 1 })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Floor"
                  value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: e.target.value })}
                  placeholder="Ground, First..."
                />
                <Input
                  label="Zone"
                  value={form.zone}
                  onChange={(e) => setForm({ ...form, zone: e.target.value })}
                  placeholder="Indoor, AC, Outdoor..."
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <Button variant="secondary" onClick={resetForm}>Cancel</Button>
              <Button
                onClick={() => (editingTable ? updateMutation.mutate() : createMutation.mutate())}
                loading={createMutation.isPending || updateMutation.isPending}
                className="bg-gradient-to-r from-orange-600 to-red-600"
              >
                {editingTable ? 'Save Changes' : 'Add Table'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl bg-gradient-to-br from-orange-900 via-red-700 to-red-600 text-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Utensils className="h-7 w-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                <Sparkles className="h-3 w-3 text-amber-300" />
                Restaurant Module
              </div>
              <h1 className="mt-2 text-3xl font-extrabold">Floor Plan</h1>
              <p className="text-sm text-white/80 mt-1">Manage your tables & seating</p>
            </div>
          </div>

          <Button onClick={() => setShowAdd(true)} className="bg-white text-slate-900 hover:bg-slate-100">
            <Plus className="h-4 w-4" /> Add Table
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          <div className="rounded-xl bg-white/10 backdrop-blur p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Total</div>
            <div className="text-2xl font-extrabold">{stats?.total ?? 0}</div>
          </div>
          <div className="rounded-xl bg-emerald-500/20 backdrop-blur p-3">
            <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold">Available</div>
            <div className="text-2xl font-extrabold text-emerald-100">{stats?.available ?? 0}</div>
          </div>
          <div className="rounded-xl bg-rose-500/20 backdrop-blur p-3">
            <div className="text-[10px] uppercase tracking-wider text-rose-200 font-bold">Occupied</div>
            <div className="text-2xl font-extrabold text-rose-100">{stats?.occupied ?? 0}</div>
          </div>
          <div className="rounded-xl bg-amber-500/20 backdrop-blur p-3">
            <div className="text-[10px] uppercase tracking-wider text-amber-200 font-bold">Reserved</div>
            <div className="text-2xl font-extrabold text-amber-100">{stats?.reserved ?? 0}</div>
          </div>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Utensils className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-900">No tables yet</h3>
          <p className="text-sm text-slate-500 mt-1">Add tables to start managing your restaurant</p>
          <Button onClick={() => setShowAdd(true)} className="mt-4">
            <Plus className="h-4 w-4" /> Add First Table
          </Button>
        </div>
      ) : (
        Object.entries(groupedByFloor).map(([floor, floorTables]) => (
          <div key={floor} className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-600" />
              <h3 className="font-extrabold text-slate-900">{floor}</h3>
              <span className="text-xs text-slate-500 font-semibold">({floorTables.length} tables)</span>
            </div>

            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {floorTables.map((table) => {
                const cfg = STATUS_CONFIG[table.status];
                const Icon = cfg.icon;
                return (
                  <div
                    key={table.id}
                    className={`group relative aspect-square rounded-2xl border-2 ${cfg.bg} ${cfg.border} p-3 flex flex-col items-center justify-center transition hover:shadow-md`}
                  >
                    <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => openEdit(table)}
                        className="h-6 w-6 rounded-md bg-white shadow-sm hover:bg-slate-100 flex items-center justify-center"
                      >
                        <Edit3 className="h-3 w-3 text-slate-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${table.tableNumber}?`)) removeMutation.mutate(table.id);
                        }}
                        className="h-6 w-6 rounded-md bg-white shadow-sm hover:bg-rose-100 flex items-center justify-center"
                      >
                        <Trash2 className="h-3 w-3 text-rose-600" />
                      </button>
                    </div>

                    <Icon className={`h-5 w-5 ${cfg.text} mb-1`} />
                    <div className="font-extrabold text-slate-900 text-lg">{table.tableNumber}</div>
                    {table.name && (
                      <div className="text-[10px] text-slate-600 text-center line-clamp-1">{table.name}</div>
                    )}
                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/60 text-[9px] font-bold">
                      <Users className="h-2.5 w-2.5" />
                      {table.capacity}
                    </div>

                    <select
                      value={table.status}
                      onChange={(e) => statusMutation.mutate({ id: table.id, status: e.target.value as TableStatus })}
                      className="mt-2 w-full text-[9px] font-bold bg-white/60 border border-white rounded-md px-1.5 py-0.5 focus:outline-none"
                    >
                      {(Object.keys(STATUS_CONFIG) as TableStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
