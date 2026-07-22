import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Ruler, Plus, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  Award, Users, ArrowUp, ArrowDown, Copy,
} from 'lucide-react';
import { sizeChartsApi, type SizeChart } from '../api/size-charts.api';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const CATEGORY_TYPES = [
  'SHIRT', 'T_SHIRT', 'POLO', 'KURTA', 'KURTA_SHALWAR', 'SHALWAR_KAMEEZ',
  'SUIT', 'TROUSER', 'JEANS', 'FROCK', 'ABAYA', 'MAXI', 'JACKET', 'COAT',
];

const GENDERS = [
  { value: 'MEN', label: 'Men', emoji: '👨' },
  { value: 'WOMEN', label: 'Women', emoji: '👩' },
  { value: 'BOYS', label: 'Boys', emoji: '👦' },
  { value: 'GIRLS', label: 'Girls', emoji: '👧' },
  { value: 'UNISEX', label: 'Unisex', emoji: '👥' },
  { value: 'KIDS', label: 'Kids', emoji: '🧒' },
  { value: 'BABY', label: 'Baby', emoji: '👶' },
];

const DEFAULT_COLUMNS = ['size', 'chest', 'waist', 'hip', 'length', 'shoulder', 'sleeveLength'];

export default function SizeChartsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SizeChart | null>(null);
  const [genderFilter, setGenderFilter] = useState<string>('all');

  const { data: charts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['size-charts', genderFilter],
    queryFn: () => sizeChartsApi.list({
      gender: genderFilter === 'all' ? undefined : genderFilter,
      active: true,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => sizeChartsApi.remove(id),
    onSuccess: () => {
      toast.success('Size chart removed');
      queryClient.invalidateQueries({ queryKey: ['size-charts'] });
    },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Sizing Reference
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📏 Size Charts</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Ladies, gents, kids sizing standards</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              New Chart
            </Button>
          </div>
        </div>
      </section>

      {/* Gender filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setGenderFilter('all')}
          className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
            (genderFilter === 'all' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }
        >
          All
        </button>
        {GENDERS.map((g) => (
          <button
            key={g.value}
            onClick={() => setGenderFilter(g.value)}
            className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
              (genderFilter === g.value ? 'bg-cyan-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }
          >
            {g.emoji} {g.label}
          </button>
        ))}
      </div>

      {showForm && (
        <SizeChartForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['size-charts'] });
          }}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : charts.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Ruler className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No size charts yet</p>
          <Button className="mt-4 bg-gradient-to-r from-cyan-600 to-blue-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Create First Chart
          </Button>
        </div>
      ) : (
        <section className="grid gap-4">
          {charts.map((chart) => (
            <SizeChartCard
              key={chart.id}
              chart={chart}
              onEdit={() => { setEditing(chart); setShowForm(true); }}
              onDelete={() => {
                if (confirm('Remove "' + chart.name + '"?')) removeMutation.mutate(chart.id);
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function SizeChartCard({ chart, onEdit, onDelete }: { chart: SizeChart; onEdit: () => void; onDelete: () => void }) {
  const rows = Array.isArray(chart.rows) ? chart.rows : [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const genderCfg = GENDERS.find((g) => g.value === chart.gender);

  return (
    <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow shrink-0">
            <Ruler className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-slate-900 dark:text-white">{chart.name}</h3>
              {chart.isDefault && (
                <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                  <Award className="h-2 w-2" />
                  Default
                </span>
              )}
              {chart.gender && (
                <span className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 text-[9px] font-extrabold uppercase">
                  {genderCfg?.emoji} {chart.gender}
                </span>
              )}
              {chart.categoryType && (
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 text-[9px] font-extrabold uppercase">
                  {chart.categoryType.replace('_', ' ')}
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 text-[9px] font-extrabold uppercase">
                {chart.unit}
              </span>
            </div>
            {chart.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">{chart.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
            <Edit3 className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-neutral-800/50">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {rows.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-neutral-800/30">
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-2 text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                      {row[col] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SizeChartForm({ editing, onClose, onSaved }: {
  editing: SizeChart | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    categoryType: editing?.categoryType ?? '',
    gender: editing?.gender ?? '',
    unit: editing?.unit ?? 'INCH' as 'INCH' | 'CM',
    description: editing?.description ?? '',
    isDefault: editing?.isDefault ?? false,
  });

  // Columns and rows management
  const initialRows = Array.isArray(editing?.rows) && editing.rows.length > 0
    ? editing.rows
    : [{ size: 'S', chest: 38, waist: 32, length: 28 }, { size: 'M', chest: 40, waist: 34, length: 29 }, { size: 'L', chest: 42, waist: 36, length: 30 }];

  const [rows, setRows] = useState<any[]>(initialRows);
  const [columns, setColumns] = useState<string[]>(() => {
    if (initialRows.length > 0) return Object.keys(initialRows[0]);
    return DEFAULT_COLUMNS;
  });

  const [newColumn, setNewColumn] = useState('');

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        categoryType: form.categoryType || undefined,
        gender: form.gender || undefined,
        rows,
      };
      return editing ? sizeChartsApi.update(editing.id, payload) : sizeChartsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Chart updated' : 'Chart created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const addRow = () => {
    const newRow: any = {};
    columns.forEach((c) => { newRow[c] = c === 'size' ? '' : 0; });
    setRows([...rows, newRow]);
  };

  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  const duplicateRow = (i: number) => {
    const copy = [...rows];
    copy.splice(i + 1, 0, { ...rows[i] });
    setRows(copy);
  };

  const moveRow = (i: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? i - 1 : i + 1;
    if (target < 0 || target >= rows.length) return;
    const copy = [...rows];
    [copy[i], copy[target]] = [copy[target], copy[i]];
    setRows(copy);
  };

  const updateCell = (i: number, col: string, value: any) => {
    const copy = [...rows];
    copy[i] = { ...copy[i], [col]: col === 'size' ? value : Number(value) || 0 };
    setRows(copy);
  };

  const addColumn = () => {
    const col = newColumn.trim().toLowerCase().replace(/\s+/g, '');
    if (!col || columns.includes(col)) return;
    setColumns([...columns, col]);
    setRows(rows.map((r) => ({ ...r, [col]: 0 })));
    setNewColumn('');
  };

  const removeColumn = (col: string) => {
    if (col === 'size') return; // Cannot remove size column
    setColumns(columns.filter((c) => c !== col));
    setRows(rows.map((r) => {
      const copy = { ...r };
      delete copy[col];
      return copy;
    }));
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-cyan-300 dark:border-cyan-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">
          {editing ? 'Edit Size Chart' : 'New Size Chart'}
        </h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Basic info */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Chart Name *</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Men's Kurta Standard, Ladies Shirt EU"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500"
            >
              <option value="">Any</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>{g.emoji} {g.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Category</label>
            <select
              value={form.categoryType}
              onChange={(e) => setForm({ ...form, categoryType: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500"
            >
              <option value="">Any</option>
              {CATEGORY_TYPES.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Unit</label>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setForm({ ...form, unit: 'INCH' })}
                className={
                  'h-11 rounded-xl text-sm font-extrabold transition border-2 ' +
                  (form.unit === 'INCH' ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600')
                }
              >
                Inches
              </button>
              <button
                onClick={() => setForm({ ...form, unit: 'CM' })}
                className={
                  'h-11 rounded-xl text-sm font-extrabold transition border-2 ' +
                  (form.unit === 'CM' ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600')
                }
              >
                Cm
              </button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional notes about this chart"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Columns */}
        <div className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">Measurement Columns</div>
              <p className="text-xs text-slate-500 font-semibold">'size' is always required</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {columns.map((col) => (
              <div key={col} className={
                'inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-extrabold ' +
                (col === 'size' ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700')
              }>
                {col}
                {col !== 'size' && (
                  <button onClick={() => removeColumn(col)} className="hover:text-rose-600">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={newColumn}
              onChange={(e) => setNewColumn(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColumn(); } }}
              placeholder="Add column name (e.g. inseam)"
              className="flex-1 h-9 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-xs font-bold focus:outline-none focus:border-cyan-500"
            />
            <Button size="sm" onClick={addColumn} disabled={!newColumn.trim()}>
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>

        {/* Rows table */}
        <div className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 dark:bg-neutral-800/50 flex items-center justify-between">
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">Size Rows ({rows.length})</div>
            <Button size="sm" onClick={addRow} className="bg-gradient-to-r from-cyan-600 to-blue-700">
              <Plus className="h-3.5 w-3.5" />
              Add Row
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-neutral-800">
                <tr>
                  <th className="px-2 py-2 text-[10px] uppercase font-extrabold text-slate-600 w-12">#</th>
                  {columns.map((col) => (
                    <th key={col} className="px-2 py-2 text-left text-[10px] uppercase font-extrabold text-slate-600">
                      {col}
                    </th>
                  ))}
                  <th className="px-2 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1 text-xs font-bold text-slate-500 text-center">{i + 1}</td>
                    {columns.map((col) => (
                      <td key={col} className="px-1 py-1">
                        <input
                          type={col === 'size' ? 'text' : 'number'}
                          step={col === 'size' ? undefined : '0.1'}
                          value={row[col] ?? ''}
                          onChange={(e) => updateCell(i, col, e.target.value)}
                          className="w-full h-8 rounded border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold tabular-nums focus:outline-none focus:border-cyan-500"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      <div className="flex gap-0.5 justify-end">
                        <button onClick={() => moveRow(i, 'up')} disabled={i === 0} className="h-6 w-6 rounded hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center">
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button onClick={() => moveRow(i, 'down')} disabled={i === rows.length - 1} className="h-6 w-6 rounded hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center">
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button onClick={() => duplicateRow(i)} className="h-6 w-6 rounded hover:bg-slate-100 text-blue-600 flex items-center justify-center">
                          <Copy className="h-3 w-3" />
                        </button>
                        <button onClick={() => removeRow(i)} disabled={rows.length === 1} className="h-6 w-6 rounded hover:bg-rose-100 disabled:opacity-30 text-rose-600 flex items-center justify-center">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            className="h-5 w-5 rounded"
          />
          <Award className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <div className="text-sm font-extrabold text-amber-900 dark:text-amber-300">Default chart</div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Used automatically for matching products</div>
          </div>
        </label>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-700"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!form.name.trim() || rows.length === 0}
          >
            <Save className="h-4 w-4" />
            {editing ? 'Update Chart' : 'Create Chart'}
          </Button>
        </div>
      </div>
    </section>
  );
}
