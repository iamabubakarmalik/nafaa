import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap, Plus, X, Save, Edit3, Trash2, Sparkles, RefreshCw,
  Package, Search, ArrowUp, ArrowDown, Copy, Grid3x3,
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
  { value: '#14b8a6', label: 'Teal' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#a855f7', label: 'Purple' },
  { value: '#64748b', label: 'Slate' },
];

const EMOJI_CATEGORIES = [
  { name: 'Common', emojis: ['⚡', '⭐', '🔥', '💎', '🎯', '🏆', '💰', '📦'] },
  { name: 'Grocery', emojis: ['🥛', '🍞', '🥚', '🧂', '🍚', '🌾', '🫖', '☕'] },
  { name: 'Snacks', emojis: ['🍫', '🍪', '🥤', '🍬', '🥨', '🍿', '🧃', '🍩'] },
  { name: 'Household', emojis: ['🧴', '🧻', '🧼', '🧹', '🕯️', '🔋', '💊', '🧴'] },
];

export default function QuickKeysPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<QuickKey | null>(null);
  const [search, setSearch] = useState('');

  const { data: keys = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['quick-keys'],
    queryFn: () => quickKeysApi.list(),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => quickKeysApi.remove(id),
    onSuccess: () => {
      toast.success('Quick key hata di');
      queryClient.invalidateQueries({ queryKey: ['quick-keys'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (key: QuickKey) => quickKeysApi.create({
      ...key,
      id: undefined as any,
      label: `${key.label} (Copy)`,
      position: (key.position ?? 0) + 1,
    }),
    onSuccess: () => {
      toast.success('Duplicate ban gaya');
      queryClient.invalidateQueries({ queryKey: ['quick-keys'] });
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return keys;
    const q = search.toLowerCase();
    return keys.filter((k) =>
      k.label.toLowerCase().includes(q) ||
      (k.group || '').toLowerCase().includes(q) ||
      (k.hotkey || '').toLowerCase().includes(q)
    );
  }, [keys, search]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc, key) => {
      const g = key.group || 'Ungrouped';
      if (!acc[g]) acc[g] = [];
      acc[g].push(key);
      return acc;
    }, {} as Record<string, QuickKey[]>);
  }, [filtered]);

  const stats = useMemo(() => ({
    total: keys.length,
    active: keys.filter((k) => k.isActive).length,
    groups: new Set(keys.map((k) => k.group || 'Ungrouped')).size,
    withHotkey: keys.filter((k) => k.hotkey).length,
  }), [keys]);

  return (
    <div className="space-y-5">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-yellow-400/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> POS Shortcuts
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">⚡ Quick Keys</h1>
            <p className="mt-2 text-sm text-white/80">
              Best-selling products ka shortcut — 1 click POS pe add
              {stats.total > 0 && (
                <> • {stats.total} keys • {stats.groups} groups</>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold backdrop-blur disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-white text-slate-900 hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" /> Nayi Quick Key
            </Button>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Total Keys" value={stats.total} sub={`${stats.active} active`} icon={Zap} tone="amber" />
        <Kpi label="Groups" value={stats.groups} sub="Categories" icon={Grid3x3} tone="blue" />
        <Kpi label="Hotkeys" value={stats.withHotkey} sub="Keyboard shortcuts" icon={Sparkles} tone="violet" />
        <Kpi label="POS Speed" value="⚡ Fast" sub="1-click add" icon={Package} tone="emerald" />
      </section>

      {/* SEARCH */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Label, group, ya hotkey se dhundo..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
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

      {/* GRID */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-200 mx-auto flex items-center justify-center">
            <Zap className="h-10 w-10 text-amber-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900">
            {search ? 'Koi match nahi' : 'Koi quick key nahi'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">
            {search ? 'Filter change karo' : 'POS pe fast checkout ke liye shortcuts banao'}
          </p>
          {!search && (
            <Button
              className="mt-4 bg-gradient-to-r from-amber-600 to-orange-700"
              onClick={() => { setEditing(null); setShowForm(true); }}
            >
              <Plus className="h-4 w-4" /> Pehli Quick Key
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([group, groupKeys]) => (
            <section key={group} className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b-2 border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow">
                    <Grid3x3 className="h-4 w-4" />
                  </div>
                  <h3 className="font-extrabold text-slate-900">{group}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                    {groupKeys.length}
                  </span>
                </div>
              </div>

              <div className="p-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {groupKeys.map((key) => (
                  <KeyTile
                    key={key.id}
                    qk={key}
                    onEdit={() => { setEditing(key); setShowForm(true); }}
                    onDuplicate={() => duplicateMutation.mutate(key)}
                    onDelete={() => {
                      if (confirm(`Quick key "${key.label}" delete karein?`)) {
                        removeMutation.mutate(key.id);
                      }
                    }}
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

/* ══════════ KEY TILE ══════════ */
function KeyTile({ qk, onEdit, onDuplicate, onDelete }: {
  qk: QuickKey;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={[
        'group relative aspect-square rounded-2xl border-2 p-3 hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden cursor-pointer',
        qk.isActive ? '' : 'opacity-50',
      ].join(' ')}
      style={{ borderColor: qk.color || '#64748b', backgroundColor: '#ffffff' }}
    >
      <div className="absolute inset-0 opacity-10" style={{ background: qk.color || '#64748b' }} />

      <div className="relative h-full flex flex-col items-center justify-center text-center">
        <div className="text-4xl mb-1.5">{qk.icon || '⚡'}</div>
        <div className="text-xs font-extrabold text-slate-900 line-clamp-2 leading-tight">
          {qk.label}
        </div>
      </div>

      {qk.hotkey && (
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-mono font-extrabold">
          {qk.hotkey}
        </div>
      )}

      {!qk.isActive && (
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-500 text-white text-[9px] font-extrabold">
          OFF
        </div>
      )}

      {/* Actions overlay */}
      <div className="absolute inset-0 bg-slate-900/85 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 rounded-2xl">
        <button
          onClick={onEdit}
          title="Edit"
          className="h-9 w-9 rounded-lg bg-white text-slate-900 flex items-center justify-center hover:bg-slate-100 shadow-lg"
        >
          <Edit3 className="h-4 w-4" />
        </button>
        <button
          onClick={onDuplicate}
          title="Duplicate"
          className="h-9 w-9 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 shadow-lg"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="h-9 w-9 rounded-lg bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 shadow-lg"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ══════════ FORM ══════════ */
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
  const [emojiCategory, setEmojiCategory] = useState('Common');

  const { data: productsData } = useQuery({
    queryKey: ['products-for-qk', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 30, search: productSearch || undefined } as any),
  });

  const { data: combos = [] } = useQuery({
    queryKey: ['combos-for-qk'],
    queryFn: () => combosApi.list({ status: 'ACTIVE' }),
  });

  const products: any[] = (productsData as any)?.items ?? [];

  const linkedProduct = products.find((p) => p.id === form.productId);
  const linkedCombo = combos.find((c) => c.id === form.comboId);

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
      toast.success(editing ? 'Update ho gaya' : 'Ban gaya');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save fail hua'),
  });

  const autoFillFromProduct = (p: any) => {
    setForm((f) => ({
      ...f,
      label: p.name.length > 20 ? p.name.slice(0, 20) : p.name,
      productId: p.id,
      comboId: '',
      icon: f.icon === '⚡' ? '📦' : f.icon,
    }));
  };

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.name === emojiCategory) || EMOJI_CATEGORIES[0];

  return (
    <section className="rounded-3xl bg-white border-2 border-amber-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900">
          {editing ? '✏️ Edit Quick Key' : '➕ Nayi Quick Key'}
        </h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 grid lg:grid-cols-[1fr_260px] gap-5">
        {/* LEFT — Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Label *</label>
            <input
              autoFocus
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Milk 1L"
              className="h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-base font-extrabold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Group</label>
              <input
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
                placeholder="Dairy, Snacks..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Hotkey</label>
              <input
                value={form.hotkey}
                onChange={(e) => setForm({ ...form, hotkey: e.target.value.toUpperCase().slice(0, 3) })}
                placeholder="F1, Q, W..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-extrabold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Product Link Karo</label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Product dhundo..."
                  className="h-10 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
              {productSearch && products.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border-2 border-slate-200 p-1 bg-white">
                  {products.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { autoFillFromProduct(p); setProductSearch(''); }}
                      className={[
                        'w-full px-3 py-2 flex items-center gap-2 rounded-lg text-left transition',
                        form.productId === p.id ? 'bg-amber-100' : 'hover:bg-amber-50',
                      ].join(' ')}
                    >
                      <div className="h-8 w-8 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-extrabold truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold">{formatPKR(p.price)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {linkedProduct && (
                <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-2 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-white overflow-hidden flex items-center justify-center shrink-0">
                    {linkedProduct.images?.[0]?.url ? (
                      <img src={linkedProduct.images[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold text-emerald-900 truncate">✓ {linkedProduct.name}</div>
                    <div className="text-[10px] text-emerald-700 font-bold">{formatPKR(linkedProduct.price)}</div>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, productId: '' })}
                    className="h-6 w-6 rounded-md hover:bg-emerald-100 flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-emerald-700" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Ya Combo Link Karo</label>
            <select
              value={form.comboId}
              onChange={(e) => setForm({ ...form, comboId: e.target.value, productId: e.target.value ? '' : form.productId })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
            >
              <option value="">Koi combo nahi</option>
              {combos.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({formatPKR(c.comboPrice)})</option>
              ))}
            </select>
            {linkedCombo && (
              <div className="mt-2 rounded-xl bg-violet-50 border-2 border-violet-200 p-2 text-xs font-extrabold text-violet-800">
                ✓ Combo: {linkedCombo.name} — {formatPKR(linkedCombo.comboPrice)}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Color</label>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setForm({ ...form, color: c.value })}
                  className={[
                    'h-10 rounded-xl border-2 transition',
                    form.color === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110 border-white' : 'border-white',
                  ].join(' ')}
                  style={{ background: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Icon (Emoji)</label>
            <div className="flex gap-1 mb-2 flex-wrap">
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setEmojiCategory(cat.name)}
                  className={[
                    'px-3 py-1 rounded-lg text-[11px] font-extrabold transition',
                    emojiCategory === cat.name
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600',
                  ].join(' ')}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {currentCategory.emojis.map((e) => (
                <button
                  key={e}
                  onClick={() => setForm({ ...form, icon: e })}
                  className={[
                    'h-12 rounded-xl border-2 text-2xl transition',
                    form.icon === e
                      ? 'border-amber-500 bg-amber-50 scale-110 shadow-md'
                      : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50',
                  ].join(' ')}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-amber-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-5 w-5 rounded"
            />
            <div>
              <div className="text-sm font-extrabold text-slate-900">Active</div>
              <div className="text-xs text-slate-500 font-semibold">POS pe visible ho ya nahi</div>
            </div>
          </label>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700"
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!form.label || (!form.productId && !form.comboId)}
            >
              <Save className="h-4 w-4" /> {editing ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>

        {/* RIGHT — Preview */}
        <div>
          <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2 text-center">Live Preview</label>
          <div
            className="aspect-square rounded-2xl border-2 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xl"
            style={{ borderColor: form.color, backgroundColor: '#ffffff' }}
          >
            <div className="absolute inset-0 opacity-10" style={{ background: form.color }} />
            <div className="relative">
              <div className="text-6xl mb-2">{form.icon}</div>
              <div className="text-sm font-extrabold text-slate-900 line-clamp-2 leading-tight">
                {form.label || 'Label'}
              </div>
              {linkedProduct && (
                <div className="mt-1 text-xs font-extrabold text-emerald-700 tabular-nums">
                  {formatPKR(linkedProduct.price)}
                </div>
              )}
              {linkedCombo && (
                <div className="mt-1 text-xs font-extrabold text-violet-700 tabular-nums">
                  {formatPKR(linkedCombo.comboPrice)}
                </div>
              )}
            </div>
            {form.hotkey && (
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px] font-mono font-extrabold">
                {form.hotkey}
              </div>
            )}
          </div>

          {/* Preview info */}
          <div className="mt-3 rounded-xl bg-slate-50 border-2 border-slate-200 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="font-bold text-slate-500">Group:</span>
              <span className="font-extrabold text-slate-900">{form.group || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-500">Hotkey:</span>
              <span className="font-mono font-extrabold text-slate-900">{form.hotkey || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-500">Status:</span>
              <span className={`font-extrabold ${form.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                {form.isActive ? 'Active' : 'Band'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value, sub, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-purple-700 shadow-violet-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
