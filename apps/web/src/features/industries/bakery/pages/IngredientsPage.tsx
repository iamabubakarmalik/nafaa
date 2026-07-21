import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wheat, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  DollarSign, AlertCircle, TrendingDown, TrendingUp, Package, Snowflake,
  Award, Truck,
} from 'lucide-react';
import { ingredientsApi, type Ingredient } from '../api/ingredients.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CATEGORIES = [
  'Flour', 'Sugar', 'Dairy', 'Cream', 'Eggs', 'Chocolate', 'Nuts',
  'Fruits', 'Flavors', 'Colors', 'Decorations', 'Butter/Oil',
  'Leavening', 'Preservatives', 'Packaging', 'Other',
];

const UNITS = ['kg', 'g', 'liter', 'ml', 'pcs', 'dozen', 'pack', 'bottle', 'box'];

export default function IngredientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [transaction, setTransaction] = useState<{ ingredient: Ingredient; type: string } | null>(null);

  const { data: ingredients = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bakery-ingredients', categoryFilter, filterMode, search],
    queryFn: () => ingredientsApi.list({
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      lowStock: filterMode === 'lowStock' ? true : undefined,
      critical: filterMode === 'critical' ? true : undefined,
      search: search.trim() || undefined,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => ingredientsApi.remove(id),
    onSuccess: () => { toast.success('Ingredient removed'); queryClient.invalidateQueries({ queryKey: ['bakery-ingredients'] }); },
  });

  const stats = {
    total: ingredients.length,
    critical: ingredients.filter((i) => i.isCritical).length,
    lowStock: ingredients.filter((i) => i.currentStock <= i.minStock).length,
    totalValue: ingredients.reduce((s, i) => s + (i.currentStock * i.costPerUnit), 0),
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Wheat className="h-3.5 w-3.5 text-amber-300" />
              Raw Materials
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🌾 Ingredients Inventory</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Flour, sugar, cream, chocolate — sab stock manage</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Add Ingredient
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items" value={stats.total} icon={Wheat} color="amber" />
        <StatCard label="Critical" value={stats.critical} icon={AlertCircle} color="rose" highlight={stats.critical > 0} />
        <StatCard label="Low Stock" value={stats.lowStock} icon={TrendingDown} color="orange" highlight={stats.lowStock > 0} />
        <StatCard label="Inventory Value" value={formatPKR(stats.totalValue)} icon={DollarSign} color="emerald" />
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ingredients..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-amber-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCategoryFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (categoryFilter === 'all' ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All</button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategoryFilter(c)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (categoryFilter === c ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{c}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {[
            { v: 'all', label: 'All' },
            { v: 'critical', label: '🚨 Critical' },
            { v: 'lowStock', label: '📉 Low Stock' },
          ].map((f) => (
            <button key={f.v} onClick={() => setFilterMode(f.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (filterMode === f.v ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{f.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <IngredientForm editing={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['bakery-ingredients'] }); }} />
      )}

      {transaction && (
        <TransactionModal
          ingredient={transaction.ingredient}
          type={transaction.type}
          onClose={() => setTransaction(null)}
          onDone={() => { setTransaction(null); queryClient.invalidateQueries({ queryKey: ['bakery-ingredients'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : ingredients.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Wheat className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No ingredients yet</p>
          <Button className="mt-4 bg-gradient-to-r from-amber-600 to-yellow-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Add First Ingredient
          </Button>
        </div>
      ) : (
        <section className="grid gap-3">
          {ingredients.map((ing) => (
            <IngredientCard
              key={ing.id}
              ingredient={ing}
              onEdit={() => { setEditing(ing); setShowForm(true); }}
              onDelete={() => { if (confirm('Remove ' + ing.name + '?')) removeMutation.mutate(ing.id); }}
              onTransaction={(type: any) => setTransaction({ ingredient: ing, type })}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, highlight }: any) {
  const colors: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-red-600',
    orange: 'from-orange-500 to-red-600',
    emerald: 'from-emerald-500 to-green-600',
  };
  return (
    <div className={
      'rounded-2xl border-2 p-5 shadow-sm ' +
      (highlight ? 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/40 dark:to-red-950/40 border-rose-300' : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800')
    }>
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

function IngredientCard({ ingredient, onEdit, onDelete, onTransaction }: any) {
  const isLow = ingredient.currentStock <= ingredient.minStock;
  const stockPct = ingredient.maxStock ? (ingredient.currentStock / ingredient.maxStock) * 100 : 100;
  const stockValue = ingredient.currentStock * ingredient.costPerUnit;

  return (
    <div className={
      'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 space-y-3 ' +
      (isLow ? 'border-rose-400 ring-2 ring-rose-100 dark:ring-rose-950/40' :
       ingredient.isCritical ? 'border-amber-300' :
       'border-slate-200 dark:border-neutral-800')
    }>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={
            'h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow shrink-0 text-2xl ' +
            (ingredient.isCritical ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-amber-500 to-orange-600')
          }>
            🌾
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{ingredient.name}</span>
              {ingredient.isCritical && (
                <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                  <AlertCircle className="h-2 w-2" />
                  CRITICAL
                </span>
              )}
              {isLow && (
                <span className="px-2 py-0.5 rounded bg-orange-500 text-white text-[9px] font-extrabold uppercase animate-pulse">LOW STOCK</span>
              )}
              {ingredient.isOrganic && <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[9px] font-extrabold uppercase">🌱 ORGANIC</span>}
              {ingredient.isImported && <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase">✈️ IMPORTED</span>}
              {ingredient.requiresRefrigeration && (
                <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                  <Snowflake className="h-2 w-2" />
                  COLD
                </span>
              )}
            </div>
            <div className="mt-1 text-xs font-bold text-slate-600">
              {ingredient.category} {ingredient.brand && '• ' + ingredient.brand} {ingredient.code && '• ' + ingredient.code}
            </div>
            {ingredient.lastVendorName && (
              <div className="text-[10px] text-slate-500 font-bold">
                <Truck className="h-2.5 w-2.5 inline mr-0.5" />
                Last: {ingredient.lastVendorName}
                {ingredient.lastPurchaseDate && ' • ' + format(new Date(ingredient.lastPurchaseDate), 'dd MMM')}
              </div>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">Stock</div>
          <div className={
            'text-2xl font-extrabold tabular-nums ' +
            (isLow ? 'text-rose-700' : 'text-slate-900 dark:text-white')
          }>
            {ingredient.currentStock} {ingredient.unit}
          </div>
          <div className="text-[10px] font-bold text-slate-500">Min: {ingredient.minStock} {ingredient.unit}</div>
          <div className="text-xs font-extrabold text-emerald-700 tabular-nums mt-1">≈ {formatPKR(stockValue)}</div>
        </div>
      </div>

      {ingredient.maxStock && (
        <div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
            <div className={
              'h-full transition-all ' +
              (stockPct <= 20 ? 'bg-gradient-to-r from-rose-500 to-red-600' :
               stockPct <= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
               'bg-gradient-to-r from-emerald-500 to-green-600')
            } style={{ width: Math.min(stockPct, 100) + '%' }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5 text-xs">
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
          <div className="text-[9px] uppercase font-extrabold text-emerald-700">Cost/Unit</div>
          <div className="text-xs font-extrabold text-emerald-800 tabular-nums">{formatPKR(ingredient.costPerUnit)}</div>
        </div>
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2 text-center">
          <div className="text-[9px] uppercase font-extrabold text-blue-700">Purchased</div>
          <div className="text-xs font-extrabold text-blue-800 tabular-nums">{ingredient.totalPurchased.toFixed(1)}</div>
        </div>
        <div className="rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/30 p-2 text-center">
          <div className="text-[9px] uppercase font-extrabold text-fuchsia-700">Used</div>
          <div className="text-xs font-extrabold text-fuchsia-800 tabular-nums">{ingredient.totalConsumed.toFixed(1)}</div>
        </div>
        <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 p-2 text-center">
          <div className="text-[9px] uppercase font-extrabold text-rose-700">Wasted</div>
          <div className="text-xs font-extrabold text-rose-800 tabular-nums">{ingredient.totalWasted.toFixed(1)}</div>
        </div>
      </div>

      <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <button onClick={() => onTransaction('purchase')} className="flex-1 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 hover:bg-emerald-200 text-emerald-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Purchase
        </button>
        <button onClick={() => onTransaction('consume')} className="flex-1 h-9 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-950/40 hover:bg-fuchsia-200 text-fuchsia-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
          <TrendingDown className="h-3 w-3" />
          Consume
        </button>
        <button onClick={() => onTransaction('waste')} className="flex-1 h-9 rounded-lg bg-rose-100 dark:bg-rose-950/40 hover:bg-rose-200 text-rose-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
          <Trash2 className="h-3 w-3" />
          Waste
        </button>
        <button onClick={onEdit} className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function IngredientForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    name: editing?.name ?? '',
    category: editing?.category ?? 'Flour',
    code: editing?.code ?? '',
    brand: editing?.brand ?? '',
    unit: editing?.unit ?? 'kg',
    currentStock: editing?.currentStock ?? 0,
    minStock: editing?.minStock ?? 0,
    maxStock: editing?.maxStock ?? '',
    reorderLevel: editing?.reorderLevel ?? '',
    costPerUnit: editing?.costPerUnit ?? 0,
    shelfLifeDays: editing?.shelfLifeDays ?? '',
    storageMethod: editing?.storageMethod ?? '',
    requiresRefrigeration: editing?.requiresRefrigeration ?? false,
    isCritical: editing?.isCritical ?? false,
    isOrganic: editing?.isOrganic ?? false,
    isImported: editing?.isImported ?? false,
    countryOfOrigin: editing?.countryOfOrigin ?? '',
    supplierName: editing?.supplierName ?? '',
    supplierPhone: editing?.supplierPhone ?? '',
    notes: editing?.notes ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        currentStock: Number(form.currentStock) || 0,
        minStock: Number(form.minStock) || 0,
        maxStock: form.maxStock ? Number(form.maxStock) : undefined,
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
        costPerUnit: Number(form.costPerUnit) || 0,
        shelfLifeDays: form.shelfLifeDays ? Number(form.shelfLifeDays) : undefined,
      };
      return editing ? ingredientsApi.update(editing.id, payload) : ingredientsApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Ingredient added'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-amber-300 dark:border-amber-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Ingredient' : 'New Ingredient'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ingredient name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Brand" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Code (SKU)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-amber-500" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Unit *</label>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Current Stock *</label>
            <input type="number" step="0.1" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Min Stock *</label>
            <input type="number" step="0.1" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="h-11 w-full rounded-xl border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Max Stock</label>
            <input type="number" step="0.1" value={form.maxStock} onChange={(e) => setForm({ ...form, maxStock: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Cost per Unit (Rs) *</label>
            <input type="number" step="0.01" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Shelf Life (days)</label>
            <input type="number" value={form.shelfLifeDays} onChange={(e) => setForm({ ...form, shelfLifeDays: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <input value={form.storageMethod} onChange={(e) => setForm({ ...form, storageMethod: e.target.value })} placeholder="Storage method" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />

        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'isCritical', label: '🚨 Critical', color: 'rose' },
            { key: 'requiresRefrigeration', label: '❄️ Refrigeration', color: 'cyan' },
            { key: 'isOrganic', label: '🌱 Organic', color: 'green' },
            { key: 'isImported', label: '✈️ Imported', color: 'blue' },
          ].map((f) => (
            <label key={f.key} className={
              'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' +
              ((form as any)[f.key] ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'border-slate-200 dark:border-neutral-700')
            }>
              <input type="checkbox" checked={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} className="h-4 w-4 rounded" />
              <span className="text-sm font-extrabold">{f.label}</span>
            </label>
          ))}
        </div>

        {form.isImported && (
          <input value={form.countryOfOrigin} onChange={(e) => setForm({ ...form, countryOfOrigin: e.target.value })} placeholder="Country of origin" className="h-11 w-full rounded-xl border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} placeholder="Supplier name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          <input value={form.supplierPhone} onChange={(e) => setForm({ ...form, supplierPhone: e.target.value })} placeholder="Supplier phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-amber-600 to-yellow-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Add Ingredient'}
          </Button>
        </div>
      </div>
    </section>
  );
}

function TransactionModal({ ingredient, type, onClose, onDone }: any) {
  const [quantity, setQuantity] = useState(1);
  const [costPerUnit, setCostPerUnit] = useState(ingredient.costPerUnit);
  const [vendorName, setVendorName] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      if (type === 'purchase') return ingredientsApi.purchase(ingredient.id, { quantity, costPerUnit, vendorName: vendorName || undefined, notes });
      if (type === 'consume') return ingredientsApi.consume(ingredient.id, { quantity, notes });
      if (type === 'waste') return ingredientsApi.waste(ingredient.id, { quantity, reason });
      throw new Error('Unknown type');
    },
    onSuccess: () => { toast.success('Recorded'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const config = {
    purchase: { title: '📦 Purchase', color: 'emerald', label: 'Purchase Quantity' },
    consume: { title: '📉 Consume', color: 'fuchsia', label: 'Consume Quantity' },
    waste: { title: '🗑️ Waste', color: 'rose', label: 'Waste Quantity' },
  }[type as 'purchase' | 'consume' | 'waste'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className={'px-5 py-3 border-b flex items-center justify-between bg-' + config.color + '-50 dark:bg-' + config.color + '-950/30'}>
          <div>
            <h3 className="font-extrabold">{config.title}</h3>
            <p className="text-xs text-slate-500 font-semibold">{ingredient.name}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold mb-1 block">{config.label} ({ingredient.unit})</label>
            <input type="number" step="0.1" min="0.1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-slate-300 bg-slate-50 dark:bg-neutral-800 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-slate-500" />
          </div>
          {type === 'purchase' && (
            <>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Cost per Unit (Rs)</label>
                <input type="number" step="0.01" value={costPerUnit} onChange={(e) => setCostPerUnit(Number(e.target.value))} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
              </div>
              <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Vendor name (optional)" className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 p-3 text-center">
                <div className="text-[10px] uppercase font-extrabold text-emerald-700">Total Cost</div>
                <div className="text-xl font-extrabold text-emerald-800 tabular-nums">{formatPKR(quantity * costPerUnit)}</div>
              </div>
            </>
          )}
          {type === 'waste' && (
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (expired, spilled...) *" className="h-11 w-full rounded-xl border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/30 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
          )}
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-slate-500 resize-none" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={quantity <= 0 || (type === 'waste' && !reason)}>
              <Save className="h-4 w-4" />
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
