import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap, Plus, X, Save, Edit3, Trash2, GripVertical,
  Sparkles, RefreshCw, Package, Search,
} from 'lucide-react';
import { quickKeysApi, type QuickKey } from '../api/quick-keys.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { combosApi } from '../api/combos.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const COLOR_OPTIONS = [
  { value: '#10b981', label: 'Emerald' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f97316', label: 'Orange' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#64748b', label: 'Slate' },
];

const EMOJI_OPTIONS = ['🥛', '🍞', '🥚', '🧂', '☕', '🍚', '🫖', '🧴', '🍫', '🥤', '🍬', '🍪', '🥫', '🧻', '🧼', '⚡'];

export default function QuickKeysPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<QuickKey | null>(null);

  const { data: keys = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['quick-keys'],
    queryFn: () => quickKeysApi.list(),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => quickKeysApi.remove(id),
    onSuccess: () => {
      toast.success('Quick key removed');
      queryClient.invalidateQueries({ queryKey: ['quick-keys'] });
    },
  });

  // Group by group name
  const grouped = keys.reduce((acc, key) => {
    const g = key.group || 'Ungrouped';
    if (!acc[g]) acc[g] = [];
    acc[g].push(key);
    return acc;
  }, {} as Record<string, QuickKey[]>);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-yellow-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              POS Quick Keys
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              ⚡ Quick Access Grid
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Top-selling products ka shortcut — 1 click mein add cart
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold transition backdrop-blur border border-white/20"
            >
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button
              className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => { setEditing(null); setShowForm(true); }}
            >
              <Plus className="h-4 w-4" />
              Add Quick Key
            </Button>
          </div>
        </div>
      </section>

      {showForm && (
        <QuickKeyForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['quick-keys'] });
          }}
        />
      )}

      {/* KEYS GRID */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-amber-100 dark:bg-amber-950/40 mx-auto flex items-center justify-center">
            <Zap className="h-10 w-10 text-amber-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No quick keys</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">
            POS pe fast checkout ke liye quick keys banao
          </p>
          <Button
            className="mt-4 bg-gradient-to-r from-amber-600 to-orange-700"
            onClick={() => { setEditing(null); setShowForm(true); }}
          >
            <Plus className="h-4 w-4" />
            Pehli Quick Key Banao
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([group, groupKeys]) => (
            <section key={group}>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {group}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-[10px] font-extrabold text-slate-600 dark:text-slate-400">
                  {groupKeys.length}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {groupKeys.map((key) => (
                  <div
                    key={key.id}
                    className="group relative aspect-square rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden"
                    style={{ borderColor: key.color || undefined }}
                  >
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{ background: key.color || '#64748b' }}
                    />

                    <div className="relative h-full flex flex-col items-center justify-center text-center">
                      <div className="text-3xl mb-2">{key.icon || '⚡'}</div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                        {key.label}
                      </div>
                      {key.hotkey && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-mono font-extrabold">
                          {key.hotkey}
                        </div>
                      )}
                    </div>

                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-2xl">
                      <button
                        onClick={() => { setEditing(key); setShowForm(true); }}
                        className="h-8 w-8 rounded-lg bg-white text-slate-900 flex items-center justify-center hover:bg-slate-100"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete quick key "' + key.label + '"?')) {
                            removeMutation.mutate(key.id);
                          }
                        }}
                        className="h-8 w-8 rounded-lg bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickKeyForm({ editing, onClose, onSaved }: {
  editing: QuickKey | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    label: editing?.label ?? '',
    productId: editing?.productId ?? '',
    comboId: editing?.comboId ?? '',
    color: editing?.color ?? '#10b981',
    icon: editing?.icon ?? '⚡',
    hotkey: editing?.hotkey ?? '',
    group: editing?.group ?? '',
    position: editing?.position ?? 0,
    isActive: editing?.isActive ?? true,
  });
  const [productSearch, setProductSearch] = useState('');

  const { data: productsData } = useQuery({
    queryKey: ['products-for-qk', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 30, search: productSearch || undefined }),
  });

  const { data: combos = [] } = useQuery({
    queryKey: ['combos-for-qk'],
    queryFn: () => combosApi.list({ status: 'ACTIVE' }),
  });

  const products = productsData?.items ?? [];

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = { ...form };
      if (!payload.productId) delete payload.productId;
      if (!payload.comboId) delete payload.comboId;
      return editing
        ? quickKeysApi.update(editing.id, payload)
        : quickKeysApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Updated' : 'Created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  return (
    <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-amber-300 dark:border-amber-700 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">
          {editing ? 'Edit Quick Key' : 'New Quick Key'}
        </h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 grid lg:grid-cols-[1fr_240px] gap-5">
        {/* LEFT — form */}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">Label *</label>
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Milk 1L"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">Group</label>
              <input
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
                placeholder="Dairy, Snacks..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">Hotkey</label>
              <input
                value={form.hotkey}
                onChange={(e) => setForm({ ...form, hotkey: e.target.value })}
                placeholder="F1, F2..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">Link to Product</label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products..."
                  className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value, comboId: '' })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="">— No product —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({formatPKR(p.price)})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">Or Link to Combo</label>
            <select
              value={form.comboId}
              onChange={(e) => setForm({ ...form, comboId: e.target.value, productId: '' })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
            >
              <option value="">— No combo —</option>
              {combos.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({formatPKR(c.comboPrice)})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">Color</label>
            <div className="grid grid-cols-8 gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setForm({ ...form, color: c.value })}
                  className={
                    'h-9 rounded-lg border-2 transition ' +
                    (form.color === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'border-white dark:border-neutral-800')
                  }
                  style={{ background: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1 block">Icon</label>
            <div className="grid grid-cols-8 gap-1.5">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setForm({ ...form, icon: e })}
                  className={
                    'h-11 rounded-lg border-2 text-xl transition ' +
                    (form.icon === e ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 scale-110' : 'border-slate-200 dark:border-neutral-700 hover:border-slate-300')
                  }
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700"
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!form.label || (!form.productId && !form.comboId)}
            >
              <Save className="h-4 w-4" />
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>

        {/* RIGHT — preview */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-2 block text-center">Preview</label>
          <div
            className="aspect-square rounded-2xl border-2 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden"
            style={{ borderColor: form.color }}
          >
            <div className="absolute inset-0 opacity-10" style={{ background: form.color }} />
            <div className="relative">
              <div className="text-5xl mb-2">{form.icon}</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                {form.label || 'Label'}
              </div>
            </div>
            {form.hotkey && (
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-mono font-extrabold">
                {form.hotkey}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
