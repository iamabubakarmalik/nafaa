import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap, Plus, X, Save, Edit3, Trash2, Sparkles, RefreshCw,
  Package, Search, Copy, Grid3x3, Eye, AlertTriangle,
  ArrowUp, ArrowDown, Power, Keyboard, Download,
  GraduationCap, ArrowRight, CheckCircle2, CheckSquare, Square, MousePointerClick,
} from 'lucide-react';
import { quickKeysApi, type QuickKey } from '../api/quick-keys.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { combosApi } from '../api/combos.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA QUICK KEYS — FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🎓 Teacher modal — "Quick Keys kaise kaam karte hain"
   🧭 3-step guide — Key Banao → Test Karo → POS Pe Use Karo
   ⚠️  Hotkey conflict detector (warning card + tile badges)
   🎹 Test Mode — keyboard se press karo, tile flash (POS rehearsal)
   ↕️  Reorder tiles (up/down, server sync via position swap)
   🔌 Quick ON/OFF toggle tile se hi (edit khole baghair)
   🧭 Auto position nayi key ke liye
   📥 CSV export
   ✨ Dark mode perfect, 📱→4K responsive
   ═════════════════════════════════════════════════════════════ */

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
  { name: 'Common',    emojis: ['⚡', '⭐', '🔥', '💎', '🎯', '🏆', '💰', '📦'] },
  { name: 'Grocery',   emojis: ['🥛', '🍞', '🥚', '🧂', '🍚', '🌾', '🫖', '☕'] },
  { name: 'Snacks',    emojis: ['🍫', '🍪', '🥤', '🍬', '🥨', '🍿', '🧃', '🍩'] },
  { name: 'Fruits',    emojis: ['🍎', '🍌', '🍊', '🥭', '🍇', '🍉', '🥕', '🧅'] },
  { name: 'Household', emojis: ['🧴', '🧻', '🧼', '🧹', '🕯️', '🔋', '💊', '🪥'] },
  { name: 'Drinks',    emojis: ['🧋', '🍵', '🥃', '🧊', '🍼', '🫗', '🍶', '🥛'] },
];

export default function QuickKeysPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<QuickKey | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [testDone, setTestDone] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const { data: keys = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['quick-keys'],
    queryFn: () => quickKeysApi.list(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['quick-keys'] });

  const removeMutation = useMutation({
    mutationFn: (id: string) => quickKeysApi.remove(id),
    onSuccess: () => { toast.success('Quick key hata di'); invalidate(); },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (key: QuickKey) => quickKeysApi.update(key.id, { isActive: !key.isActive } as any),
    onSuccess: (_d, key) => {
      toast.success(key.isActive ? `"${key.label}" band ho gaya` : `"${key.label}" active ho gaya`);
      invalidate();
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ a, b }: { a: QuickKey; b: QuickKey }) => {
      await quickKeysApi.update(a.id, { position: b.position } as any);
      await quickKeysApi.update(b.id, { position: a.position } as any);
    },
    onSuccess: invalidate,
    onError: () => toast.error('Reorder fail hua'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (key: QuickKey) => quickKeysApi.create({
      ...key,
      id: undefined as any,
      label: `${key.label} (Copy)`,
      position: Math.max(...keys.map((k) => k.position ?? 0), 0) + 1,
    }),
    onSuccess: () => { toast.success('Duplicate ban gaya'); invalidate(); },
  });

  /* ─── Filter + group + sort ────────────────────────── */
  const filtered = useMemo(() => {
    if (!debouncedSearch) return keys;
    const q = debouncedSearch.toLowerCase();
    return keys.filter((k) =>
      k.label.toLowerCase().includes(q) ||
      (k.group || '').toLowerCase().includes(q) ||
      (k.hotkey || '').toLowerCase().includes(q)
    );
  }, [keys, debouncedSearch]);

  const grouped = useMemo(() => {
    const map = filtered.reduce((acc, key) => {
      const g = key.group || 'Ungrouped';
      if (!acc[g]) acc[g] = [];
      acc[g].push(key);
      return acc;
    }, {} as Record<string, QuickKey[]>);
    // Har group ke andar position se sort
    Object.values(map).forEach((arr) => arr.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
    return map;
  }, [filtered]);

  /* ─── Hotkey conflicts ─────────────────────────────── */
  const hotkeyConflicts = useMemo(() => {
    const map = new Map<string, QuickKey[]>();
    keys.forEach((k) => {
      if (!k.hotkey) return;
      const h = k.hotkey.toUpperCase();
      map.set(h, [...(map.get(h) || []), k]);
    });
    return [...map.entries()].filter(([, arr]) => arr.length > 1);
  }, [keys]);

  const conflictIds = useMemo(
    () => new Set(hotkeyConflicts.flatMap(([, arr]) => arr.map((k) => k.id))),
    [hotkeyConflicts],
  );

  const stats = useMemo(() => ({
    total: keys.length,
    active: keys.filter((k) => k.isActive).length,
    groups: new Set(keys.map((k) => k.group || 'Ungrouped')).size,
    withHotkey: keys.filter((k) => k.hotkey).length,
  }), [keys]);

  const nextPosition = useMemo(() => Math.max(...keys.map((k) => k.position ?? 0), 0) + 1, [keys]);

  /* ─── Setup progress ────────────────────────────────── */
  const setupStep = keys.length === 0 ? 1
    : !testDone ? 2
    : 3;

  /* ─── Move within group ────────────────────────────── */
  const moveKey = (key: QuickKey, dir: -1 | 1) => {
    const g = key.group || 'Ungrouped';
    const groupKeys = grouped[g] || [];
    const idx = groupKeys.findIndex((k) => k.id === key.id);
    const swap = groupKeys[idx + dir];
    if (!swap) return;
    moveMutation.mutate({ a: key, b: swap });
  };

  /* ─── Test Mode: hotkey listener ───────────────────── */
  useEffect(() => {
    if (!testMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setTestMode(false); return; }
      const pressed = e.key.toUpperCase();
      const match = keys.find((k) => k.isActive && k.hotkey?.toUpperCase() === pressed);
      if (match) {
        setFlashId(match.id);
        setTestDone(true);
        toast.success(`⚡ "${match.label}" trigger hua!`, { duration: 1200 });
        setTimeout(() => setFlashId(null), 700);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [testMode, keys]);

  /* ─── Global shortcuts ─────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (testMode) return; // test mode apna listener hai
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (showTeacher) setShowTeacher(false);
        else if (showForm) { setShowForm(false); setEditing(null); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showForm, showTeacher, testMode]);

  /* ─── CSV Export ───────────────────────────────────── */
  const exportCSV = () => {
    if (keys.length === 0) return toast.error('Koi quick key nahi');
    const head = ['#', 'Label', 'Group', 'Hotkey', 'Color', 'Icon', 'Position', 'Active', 'Product ID', 'Combo ID'];
    const rows = keys.map((k, i) => [
      i + 1, k.label, k.group || '', k.hotkey || '', k.color || '', k.icon || '',
      k.position ?? 0, k.isActive ? 'Yes' : 'No', k.productId || '', k.comboId || '',
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quick-keys-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 dark:from-slate-950 dark:via-amber-950 dark:to-orange-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-yellow-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> POS Shortcuts
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              ⚡ Quick Keys
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              Best-selling products ka shortcut — 1 click POS pe add
              {stats.total > 0 && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-amber-200">{stats.total}</strong> keys
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-amber-200">{stats.groups}</strong> groups
                  {hotkeyConflicts.length > 0 && (
                    <>
                      <span className="opacity-50 mx-1.5">•</span>
                      <strong className="text-rose-300">⚠️ {hotkeyConflicts.length} hotkey conflicts</strong>
                    </>
                  )}
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Kaise kaam karta hai?"
            >
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Kaise Kaam Karta Hai?</span>
              <span className="sm:hidden">?</span>
            </button>
            <button
              onClick={() => setTestMode(!testMode)}
              className={[
                'h-11 px-3 rounded-xl border text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition',
                testMode
                  ? 'bg-emerald-500 border-emerald-300 text-white shadow-lg shadow-emerald-500/40'
                  : 'bg-white/15 hover:bg-white/25 border-white/25',
              ].join(' ')}
              title="Keyboard se hotkeys test karo"
            >
              <Keyboard className="h-4 w-4" />
              <span className="hidden sm:inline">{testMode ? 'Test ON (Esc band)' : 'Test Hotkeys'}</span>
            </button>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={exportCSV}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <Button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold shadow-2xl"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nayi Quick Key</span>
              <span className="sm:hidden">Nayi</span>
            </Button>
          </div>
        </div>

        {/* 3-step guide */}
        <div className="relative mt-4 flex items-center gap-2 sm:gap-3 flex-wrap">
          <StepPill n={1} label="Key Banao" state={setupStep > 1 ? 'done' : setupStep === 1 ? 'active' : 'todo'} />
          <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
          <StepPill n={2} label="Test Karo" state={setupStep > 2 ? 'done' : setupStep === 2 ? 'active' : 'todo'} />
          <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
          <StepPill n={3} label="POS Pe Use Karo" state={setupStep === 3 ? 'done' : 'todo'} />
        </div>

        {/* Test mode banner */}
        {testMode && (
          <div className="relative mt-4 rounded-xl bg-emerald-500/20 border border-emerald-300/40 backdrop-blur-md px-4 py-3 text-xs font-extrabold flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-ping shrink-0" />
            🎹 Test Mode ON — keyboard pe koi hotkey dabao, matching tile flash hoga. <span className="text-white/60">Esc = band</span>
          </div>
        )}
      </section>

      {/* ═══ TEACHER MODAL ═══ */}
      {showTeacher && (
        <QuickKeysTeacher
          hasKeys={keys.length > 0}
          onClose={() => setShowTeacher(false)}
          onStart={() => {
            setShowTeacher(false);
            if (keys.length === 0) {
              setEditing(null);
              setShowForm(true);
            } else {
              setTestMode(true);
            }
          }}
        />
      )}

      {/* ═══ HOTKEY CONFLICT WARNING ═══ */}
      {hotkeyConflicts.length > 0 && (
        <section className="rounded-2xl border-2 border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-sm text-rose-900 dark:text-rose-200">
                ⚠️ {hotkeyConflicts.length} hotkey conflict{hotkeyConflicts.length > 1 ? 's' : ''} — POS pe confusion hogi!
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {hotkeyConflicts.map(([hotkey, arr]) => (
                  <div
                    key={hotkey}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-500/40 px-2 py-1 text-[11px] font-extrabold text-rose-800 dark:text-rose-300"
                  >
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-mono text-[10px]">
                      {hotkey}
                    </kbd>
                    → {arr.map((k) => k.label).join(' vs ')}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi label="Total Keys" value={stats.total} sub={`${stats.active} active`} icon={Zap} tone="amber" />
        <Kpi label="Groups" value={stats.groups} sub="Categories" icon={Grid3x3} tone="blue" />
        <Kpi label="Hotkeys" value={stats.withHotkey} sub="Keyboard shortcuts" icon={Keyboard} tone="violet" />
        <Kpi label="POS Speed" value="⚡ Fast" sub="1-click add" icon={Package} tone="emerald" />
      </section>

      {/* ═══ SEARCH ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Label, group, ya hotkey se dhundo... (/ shortcut)"
            className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-500/30 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
      </section>

      {/* ═══ FORM ═══ */}
      {showForm && (
        <QuickKeyForm
          editing={editing}
          nextPosition={nextPosition}
          existingKeys={keys}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            invalidate();
          }}
        />
      )}

      {/* ═══ GRID ═══ */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 sm:p-16 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-700 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/40">
            <Zap className="h-10 w-10 text-white" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
            {search ? 'Koi match nahi' : 'Koi quick key nahi'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">
            {search
              ? 'Filter change karo'
              : 'POS pe fast checkout ke liye shortcuts banao — sab se zyada bikne wale products ko 1 click ya 1 key pe lagao'}
          </p>
          {search ? (
            <Button variant="secondary" className="mt-4 font-extrabold" onClick={() => setSearch('')}>
              <X className="h-4 w-4" /> Search Clear Karo
            </Button>
          ) : (
            <div className="mt-4 flex gap-2 justify-center flex-wrap">
              <Button
                variant="secondary"
                className="font-extrabold"
                onClick={() => setShowTeacher(true)}
              >
                <GraduationCap className="h-4 w-4" /> Pehle Seekh Lo
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 font-extrabold shadow-lg shadow-amber-500/40"
                onClick={() => { setEditing(null); setShowForm(true); }}
              >
                <Plus className="h-4 w-4" /> Pehli Quick Key
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {Object.entries(grouped).map(([group, groupKeys]) => (
            <section
              key={group}
              className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              <div className="px-4 sm:px-5 py-3 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/40">
                    <Grid3x3 className="h-4 w-4" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white">{group}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold">
                    {groupKeys.length}
                  </span>
                </div>
              </div>

              <div className="p-3 sm:p-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
                {groupKeys.map((key, idx) => (
                  <KeyTile
                    key={key.id}
                    qk={key}
                    flashing={flashId === key.id}
                    hasConflict={conflictIds.has(key.id)}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < groupKeys.length - 1}
                    onMoveUp={() => moveKey(key, -1)}
                    onMoveDown={() => moveKey(key, 1)}
                    onToggleActive={() => toggleActiveMutation.mutate(key)}
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

/* ═════════════════════════════════════════════════════════════
   QUICK KEYS TEACHER — "Kaise kaam karta hai"
   ═════════════════════════════════════════════════════════════ */
function QuickKeysTeacher({ hasKeys, onClose, onStart }: { hasKeys: boolean; onClose: () => void; onStart: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-amber-200 dark:border-amber-500/30 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/15 dark:to-orange-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Quick Keys Kaise Kaam Karte Hain?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Quick Keys aapke <strong>sab se zyada bikne wale products ke shortcuts</strong> hain.
            POS pe customer ke saamne search karne ki jagah — <strong>1 click ya 1 keyboard key</strong> se product cart mein.
          </p>

          {/* Live misal */}
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300">
              ⚡ Misal: Counter pe rush hai
            </div>
            <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-500 dark:text-slate-400">❌ Pehle:</span>
                <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  Search → type → scroll → click (10 sec)
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-500 dark:text-slate-400">✅ Ab:</span>
                <span className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-extrabold">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] mr-1">Q</kbd>
                  dabao → Milk cart mein! (1 sec)
                </span>
              </div>
            </div>
          </div>

          {/* 3 steps */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <TeacherStep emoji="➕" title="Banao" desc="Product link karo, color + hotkey do" />
            <TeacherStep emoji="🎹" title="Test Karo" desc="Test Mode ON karke key dabao" />
            <TeacherStep emoji="⚡" title="Use Karo" desc="POS pe 1-click fast checkout" />
          </div>

          {/* Tips */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Groups</strong> banao — Dairy, Snacks, Drinks... POS pe sab saaf dikhega</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Hotkey <strong>unique</strong> rakho — do keys pe same hotkey ho to <strong>⚠️ conflict warning</strong> aayegi</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Tile pe hover karo — <strong>edit, duplicate, ON/OFF, reorder</strong> sab wahin se</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Combo</strong> bhi quick key ban sakta hai — bundle deals 1 click pe</span>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 font-extrabold shadow-lg shadow-amber-500/40 h-12"
            onClick={onStart}
          >
            <Zap className="h-4 w-4" />
            {hasKeys ? 'Samajh Gaya — Abhi Test Karo!' : 'Samajh Gaya — Pehli Key Banao!'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TeacherStep({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5">
      <div className="text-xl">{emoji}</div>
      <div className="text-[11px] font-extrabold text-slate-900 dark:text-white mt-1">{title}</div>
      <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{desc}</div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   STEP PILL
   ═════════════════════════════════════════════════════════════ */
function StepPill({ n, label, state }: { n: number; label: string; state: 'done' | 'active' | 'todo' }) {
  return (
    <div className={[
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold border backdrop-blur-md transition',
      state === 'done'
        ? 'bg-emerald-400/25 border-emerald-300/50 text-emerald-200'
        : state === 'active'
        ? 'bg-amber-400/90 border-amber-300 text-slate-900 shadow-lg shadow-amber-400/30 animate-pulse'
        : 'bg-white/10 border-white/20 text-white/50',
    ].join(' ')}>
      {state === 'done' ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <span className={[
          'h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black',
          state === 'active' ? 'bg-slate-900 text-amber-300' : 'bg-white/20 text-white/60',
        ].join(' ')}>
          {n}
        </span>
      )}
      {label}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   KEY TILE
   ═════════════════════════════════════════════════════════════ */
function KeyTile({ qk, flashing, hasConflict, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onToggleActive, onEdit, onDuplicate, onDelete }: {
  qk: QuickKey;
  flashing: boolean;
  hasConflict: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleActive: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={[
        'group relative aspect-square rounded-2xl border-2 p-3 hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden cursor-pointer bg-white dark:bg-slate-900',
        qk.isActive ? '' : 'opacity-50',
        flashing ? 'ring-4 ring-emerald-400 scale-110 shadow-2xl shadow-emerald-500/50 z-10' : '',
        hasConflict ? 'ring-2 ring-rose-400 dark:ring-rose-500/60' : '',
      ].join(' ')}
      style={{ borderColor: qk.color || '#64748b' }}
    >
      <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none" style={{ background: qk.color || '#64748b' }} />

      <div className="relative h-full flex flex-col items-center justify-center text-center">
        <div className="text-3xl sm:text-4xl mb-1.5 drop-shadow-sm">{qk.icon || '⚡'}</div>
        <div className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight">
          {qk.label}
        </div>
      </div>

      {qk.hotkey && (
        <div className={[
          'absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold shadow',
          hasConflict
            ? 'bg-rose-600 text-white'
            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900',
        ].join(' ')}
        title={hasConflict ? '⚠️ Hotkey conflict!' : undefined}
        >
          {qk.hotkey}
        </div>
      )}

      {!qk.isActive && (
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-500 text-white text-[9px] font-extrabold">
          OFF
        </div>
      )}

      {/* Actions overlay */}
      <div className="absolute inset-0 bg-slate-900/85 dark:bg-slate-950/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 rounded-2xl">
        <div className="flex gap-1.5">
          <button
            onClick={onEdit}
            title="Edit"
            className="h-9 w-9 rounded-lg bg-white text-slate-900 flex items-center justify-center hover:bg-slate-100 shadow-lg transition"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleActive}
            title={qk.isActive ? 'Band karo' : 'Active karo'}
            className={[
              'h-9 w-9 rounded-lg text-white flex items-center justify-center shadow-lg transition',
              qk.isActive ? 'bg-slate-500 hover:bg-slate-600' : 'bg-emerald-500 hover:bg-emerald-600',
            ].join(' ')}
          >
            <Power className="h-4 w-4" />
          </button>
          <button
            onClick={onDuplicate}
            title="Duplicate"
            className="h-9 w-9 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 shadow-lg transition"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="h-9 w-9 rounded-lg bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 shadow-lg transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            title="Pehle lao"
            className="h-7 w-9 rounded-lg bg-white/20 text-white flex items-center justify-center hover:bg-white/30 disabled:opacity-30 transition"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            title="Baad mein bhejo"
            className="h-7 w-9 rounded-lg bg-white/20 text-white flex items-center justify-center hover:bg-white/30 disabled:opacity-30 transition"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   FORM
   ═════════════════════════════════════════════════════════════ */
function QuickKeyForm({ editing, nextPosition, existingKeys, onClose, onSaved }: {
  editing: QuickKey | null;
  nextPosition: number;
  existingKeys: QuickKey[];
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
    position: editing?.position ?? nextPosition,
    isActive: editing?.isActive ?? true,
  });
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  const [emojiCategory, setEmojiCategory] = useState('Common');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedProductSearch(productSearch.trim()), 200);
    return () => clearTimeout(t);
  }, [productSearch]);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-qk', debouncedProductSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 30, search: debouncedProductSearch || undefined } as any),
  });

  const { data: combos = [] } = useQuery({
    queryKey: ['combos-for-qk'],
    queryFn: () => combosApi.list({ status: 'ACTIVE' }),
  });

  const products: any[] = (productsData as any)?.items ?? [];

  const linkedProduct = products.find((p) => p.id === form.productId);
  const linkedCombo = combos.find((c) => c.id === form.comboId);

  /* Hotkey conflict check (form ke andar) */
  const hotkeyConflict = useMemo(() => {
    if (!form.hotkey) return null;
    return existingKeys.find((k) =>
      k.id !== editing?.id && k.hotkey?.toUpperCase() === form.hotkey.toUpperCase()
    ) || null;
  }, [form.hotkey, existingKeys, editing]);

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

  const canSave = form.label.trim() && (form.productId || form.comboId);
  const currentCategory = EMOJI_CATEGORIES.find((c) => c.name === emojiCategory) || EMOJI_CATEGORIES[0];

  return (
    <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/90 dark:backdrop-blur-sm border-2 border-amber-300 dark:border-amber-500/40 shadow-xl overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b-2 border-amber-200 dark:border-amber-500/30 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/15 dark:to-orange-500/15 flex items-center justify-between">
        <h3 className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
          {editing ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editing ? 'Edit Quick Key' : 'Nayi Quick Key'}
        </h3>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition"
        >
          <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </button>
      </div>

      <div className="p-4 sm:p-5 grid lg:grid-cols-[1fr_280px] gap-4 sm:gap-5">
        {/* LEFT — Form */}
        <div className="space-y-4">
          <Field label="Label" required error={touched && !form.label.trim() ? 'Label zaroori hai' : undefined}>
            <input
              autoFocus
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              onBlur={() => setTouched(true)}
              placeholder="Milk 1L"
              maxLength={20}
              className={inputCls('h-12 text-base font-extrabold', touched && !form.label.trim())}
            />
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 text-right">
              {form.label.length}/20
            </div>
          </Field>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Group">
              <input
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
                placeholder="Dairy, Snacks..."
                className={inputCls('h-11 font-bold')}
              />
            </Field>
            <Field label="Hotkey" error={hotkeyConflict ? `⚠️ "${hotkeyConflict.label}" pe pehle se hai` : undefined}>
              <input
                value={form.hotkey}
                onChange={(e) => setForm({ ...form, hotkey: e.target.value.toUpperCase().slice(0, 3) })}
                placeholder="F1, Q, W..."
                className={inputCls('h-11 font-mono font-extrabold', !!hotkeyConflict)}
              />
            </Field>
          </div>

          <Field label="Product Link Karo" required={!form.comboId}>
            <div className="space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Product dhundo..."
                  className={inputCls('h-10 pl-10 font-semibold')}
                />
              </div>
              {debouncedProductSearch && products.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border-2 border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-800">
                  {products.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { autoFillFromProduct(p); setProductSearch(''); }}
                      className={[
                        'w-full px-3 py-2 flex items-center gap-2 rounded-lg text-left transition',
                        form.productId === p.id
                          ? 'bg-amber-100 dark:bg-amber-500/20'
                          : 'hover:bg-amber-50 dark:hover:bg-amber-500/10',
                      ].join(' ')}
                    >
                      <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-extrabold truncate text-slate-900 dark:text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                          {formatPKR(p.price)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {linkedProduct && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border-2 border-emerald-200 dark:border-emerald-500/40 p-2 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                    {linkedProduct.images?.[0]?.url ? (
                      <img src={linkedProduct.images[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200 truncate">
                      ✓ {linkedProduct.name}
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                      {formatPKR(linkedProduct.price)}
                    </div>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, productId: '' })}
                    className="h-6 w-6 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-500/25 flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
                  </button>
                </div>
              )}
            </div>
          </Field>

          <Field label="Ya Combo Link Karo">
            <select
              value={form.comboId}
              onChange={(e) => setForm({ ...form, comboId: e.target.value, productId: e.target.value ? '' : form.productId })}
              className={inputCls('h-11 font-bold')}
            >
              <option value="">Koi combo nahi</option>
              {combos.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({formatPKR(c.comboPrice)})</option>
              ))}
            </select>
            {linkedCombo && (
              <div className="mt-2 rounded-xl bg-violet-50 dark:bg-violet-500/15 border-2 border-violet-200 dark:border-violet-500/40 p-2 text-xs font-extrabold text-violet-800 dark:text-violet-200">
                ✓ Combo: {linkedCombo.name} — {formatPKR(linkedCombo.comboPrice)}
              </div>
            )}
          </Field>

          <Field label="Color">
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setForm({ ...form, color: c.value })}
                  className={[
                    'h-10 rounded-xl border-2 transition',
                    form.color === c.value
                      ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500 dark:ring-offset-slate-900 scale-110 border-white dark:border-slate-800'
                      : 'border-white dark:border-slate-800',
                  ].join(' ')}
                  style={{ background: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </Field>

          <Field label="Icon (Emoji)">
            <div className="flex gap-1 mb-2 flex-wrap">
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setEmojiCategory(cat.name)}
                  className={[
                    'px-3 py-1 rounded-lg text-[11px] font-extrabold transition',
                    emojiCategory === cat.name
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300',
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
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/20 scale-110 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-300 dark:hover:border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-500/10',
                  ].join(' ')}
                >
                  {e}
                </button>
              ))}
            </div>
          </Field>

          <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 cursor-pointer hover:border-amber-300 dark:hover:border-amber-500/40 transition">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-5 w-5 rounded accent-amber-500"
            />
            <div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">Active</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">POS pe visible ho ya nahi</div>
            </div>
          </label>

          {touched && !canSave && (
            <div className="text-xs font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {!form.label.trim() ? 'Label zaroori hai' : 'Product ya combo link karo'}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 font-extrabold shadow-lg shadow-amber-500/40"
              onClick={() => { setTouched(true); if (canSave) saveMutation.mutate(); else toast.error('Label + product/combo zaroori hai'); }}
              loading={saveMutation.isPending}
              disabled={!canSave}
            >
              <Save className="h-4 w-4" /> {editing ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>

        {/* RIGHT — Preview */}
        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-2 text-center">
            <Eye className="h-3 w-3 inline" /> Live Preview
          </label>
          <div
            className="aspect-square rounded-2xl border-2 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xl bg-white dark:bg-slate-900"
            style={{ borderColor: form.color }}
          >
            <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none" style={{ background: form.color }} />
            <div className="relative">
              <div className="text-5xl sm:text-6xl mb-2 drop-shadow">{form.icon}</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                {form.label || 'Label'}
              </div>
              {linkedProduct && (
                <div className="mt-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatPKR(linkedProduct.price)}
                </div>
              )}
              {linkedCombo && (
                <div className="mt-1 text-xs font-extrabold text-violet-700 dark:text-violet-400 tabular-nums">
                  {formatPKR(linkedCombo.comboPrice)}
                </div>
              )}
            </div>
            {form.hotkey && (
              <div className={[
                'absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold',
                hotkeyConflict ? 'bg-rose-600 text-white' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900',
              ].join(' ')}>
                {form.hotkey}
              </div>
            )}
            {!form.isActive && (
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-500 text-white text-[10px] font-extrabold">
                OFF
              </div>
            )}
          </div>

          <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="font-bold text-slate-500 dark:text-slate-400">Group:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">{form.group || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-500 dark:text-slate-400">Hotkey:</span>
              <span className={`font-mono font-extrabold ${hotkeyConflict ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                {form.hotkey || '—'}{hotkeyConflict ? ' ⚠️' : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-500 dark:text-slate-400">Position:</span>
              <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">#{form.position}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-500 dark:text-slate-400">Status:</span>
              <span className={`font-extrabold ${form.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {form.isActive ? 'Active' : 'Band'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <div className="mt-1 text-xs font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> {error}
        </div>
      )}
    </div>
  );
}

function inputCls(extra = '', error = false) {
  return [
    'w-full rounded-xl border-2 px-3',
    'bg-white dark:bg-slate-800',
    'text-slate-900 dark:text-white',
    'placeholder:text-slate-400 dark:placeholder:text-slate-500',
    error
      ? 'border-rose-400 dark:border-rose-500/60 focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-500/30'
      : 'border-slate-200 dark:border-slate-700 focus:border-amber-500 dark:focus:border-amber-400 focus:ring-amber-200 dark:focus:ring-amber-500/30',
    'focus:outline-none focus:ring-2 transition',
    extra,
  ].join(' ');
}

function Kpi({ label, value, sub, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    amber:   'from-amber-500 to-orange-600 shadow-amber-500/40',
    blue:    'from-blue-500 to-blue-700 shadow-blue-500/40',
    violet:  'from-violet-500 to-purple-700 shadow-violet-500/40',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/40',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm dark:shadow-black/20 hover:shadow-md dark:hover:shadow-lg transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">
            {label}
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">
            {value}
          </div>
          {sub && (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">
              {sub}
            </div>
          )}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
