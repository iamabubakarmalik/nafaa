import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tag, Plus, Trash2, Package, Search, X, Edit3, Save, Sparkles,
  Download, RefreshCw, Star, Palette, Zap, CheckCircle2,
  ChevronRight, Grid3x3, List, Import, GraduationCap, Printer,
} from 'lucide-react';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { toast } from 'sonner';
import { useIndustryPresets } from '@industries/_shared/presets';

/* ═════════════════════════════════════════════════════════════
   NAFAA CATEGORIES — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 GLOBAL — 35+ industries sab me same (naam + color)
   🌙 Dark mode complete
   🎓 Teacher modal — universal teaching
   ⌨️  / = search • N = naya • Esc = sab band
   💾 Grid/List yaad • 🖨️ Print + CSV • ⚠️ Smart delete warning
   ═════════════════════════════════════════════════════════════ */

const COLOR_PRESETS = [
  '#2c9466', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#a855f7', '#f97316',
  '#10b981', '#6366f1', '#d946ef', '#eab308', '#14b8a6',
  '#dc2626', '#78350f', '#0ea5e9', '#16a34a', '#64748b',
];

type FilterMode = 'all' | 'used' | 'unused';
type ViewMode = 'grid' | 'list';

const VIEW_KEY = 'categories-view';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const industryPresets = useIndustryPresets();
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());

  /* View preference yaad rakho */
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === 'grid' || saved === 'list') setViewMode(saved);
  }, []);
  useEffect(() => { localStorage.setItem(VIEW_KEY, viewMode); }, [viewMode]);

  const { data: categories = [], refetch, isRefetching, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: { name: string; color: string }) =>
      editing ? categoriesApi.update(editing.id, payload) : categoriesApi.create(payload),
    onSuccess: () => {
      toast.success(editing ? 'Category update ho gayi' : 'Category ban gayi');
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Save nahi hui'),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (presets: Array<{ name: string; color: string }>) => {
      const results = await Promise.allSettled(
        presets.map((p) => categoriesApi.create({ name: p.name, color: p.color })),
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      return { succeeded, failed: results.length - succeeded };
    },
    onSuccess: ({ succeeded, failed }) => {
      if (succeeded > 0) toast.success(`${succeeded} categories add ho gayi`);
      if (failed > 0) toast.error(`${failed} fail (shayad pehle se mojood)`);
      setShowBulkImport(false);
      setSelectedPresets(new Set());
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: () => {
      toast.success('Category delete ho gayi');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete nahi hui'),
  });

  const filtered = useMemo(() => {
    let result = [...categories];
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((c: any) => c.name.toLowerCase().includes(q));
    if (filter === 'used') result = result.filter((c: any) => (c._count?.products ?? 0) > 0);
    else if (filter === 'unused') result = result.filter((c: any) => (c._count?.products ?? 0) === 0);
    return result.sort((a: any, b: any) => (b._count?.products ?? 0) - (a._count?.products ?? 0));
  }, [categories, search, filter]);

  const stats = useMemo(() => {
    const totalProducts = categories.reduce((s: number, c: any) => s + (c._count?.products ?? 0), 0);
    const used = categories.filter((c: any) => (c._count?.products ?? 0) > 0).length;
    return { total: categories.length, used, unused: categories.length - used, totalProducts };
  }, [categories]);

  const topCategories = useMemo(() => {
    return [...categories]
      .filter((c: any) => (c._count?.products ?? 0) > 0)
      .sort((a: any, b: any) => (b._count?.products ?? 0) - (a._count?.products ?? 0))
      .slice(0, 5);
  }, [categories]);

  const existingNames = new Set(categories.map((c: any) => c.name.toLowerCase()));
  const availablePresets = industryPresets.categories.filter(
    (s) => !existingNames.has(s.name.toLowerCase()),
  );

  const openCreate = () => {
    setEditing(null);
    setName('');
    setColor(COLOR_PRESETS[0]);
    setShowForm(true);
  };

  const openEdit = (cat: any) => {
    setEditing(cat);
    setName(cat.name);
    setColor(cat.color);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setName('');
    setColor(COLOR_PRESETS[0]);
  };

  const quickAdd = (preset: { name: string; color: string }) => {
    setEditing(null);
    setName(preset.name);
    setColor(preset.color);
    setShowForm(true);
  };

  const togglePresetSelection = (n: string) => {
    setSelectedPresets((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  };

  const bulkAddSelected = () => {
    const toAdd = availablePresets.filter((p) => selectedPresets.has(p.name));
    if (toAdd.length === 0) return toast.error('Kam az kam 1 category select karo');
    bulkCreateMutation.mutate(toAdd);
  };

  const confirmDelete = (cat: any) => {
    const count = cat._count?.products ?? 0;
    const msg = count > 0
      ? `⚠️ "${cat.name}" me ${count} products hain!\n\nDelete karo to products delete NAHI honge — bas unse category ka tag hat jayega.\n\nPakka delete karein?`
      : `"${cat.name}" delete karein?`;
    if (confirm(msg)) deleteMutation.mutate(cat.id);
  };

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const summary = [
      ['Categories Report'],
      [`Generated: ${new Date().toLocaleString('en-PK')}  •  Total: ${filtered.length}`],
      [''],
    ];
    const headers = ['Name', 'Color', 'Products Count'];
    const rows = filtered.map((c: any) => [c.name, c.color, c._count?.products ?? 0]);
    const csv = [...summary, headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categories-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} categories export ho gayi`);
  };

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (showForm) return closeForm();
        if (showBulkImport) { setShowBulkImport(false); setSelectedPresets(new Set()); return; }
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); openCreate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showForm, showBulkImport]);

  /* Body scroll lock jab koi modal khula ho */
  const anyModalOpen = showForm || showBulkImport || showTeacher;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModalOpen ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModalOpen]);

  /* Form me Enter = save */
  const formEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim() && !saveMutation.isPending) {
      e.preventDefault();
      saveMutation.mutate({ name: name.trim(), color });
    }
  };

  const hasFilters = !!search || filter !== 'all';
  const clearFilters = () => { setSearch(''); setFilter('all'); };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <CategoriesTeacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-green-700 dark:from-slate-950 dark:via-emerald-950 dark:to-green-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-green-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Tag className="h-3.5 w-3.5 text-amber-300" /> Product Organization
              {industryPresets.industryId && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-200">{industryPresets.industryEmoji} {industryPresets.industryName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">🗂️ Categories</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-emerald-200">{stats.total}</strong> categories
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-violet-200">{stats.totalProducts}</strong> products grouped
              {availablePresets.length > 0 && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-amber-300">{availablePresets.length}</strong> ready-made
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
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
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
              onClick={() => window.print()}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
            {availablePresets.length > 0 && (
              <button
                onClick={() => setShowBulkImport(true)}
                className="h-11 px-3 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 border-2 border-amber-300/40 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition"
              >
                <Import className="h-4 w-4" /> <span className="hidden sm:inline">Import</span> ({availablePresets.length})
              </button>
            )}
            <button
              onClick={openCreate}
              className="h-11 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xl transition"
            >
              <Plus className="h-4 w-4" /> Nayi Category <Kbd>N</Kbd>
            </button>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>N</Kbd><span className="text-white/60">Nayi category</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Tag} label="Total Categories" value={stats.total} sub="Sab groups" tone="emerald" />
        <Kpi icon={Sparkles} label="In Use" value={stats.used} sub={`${stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0}% use ho rahi`} tone="blue" />
        <Kpi icon={Package} label="Grouped Products" value={stats.totalProducts} sub="Categories me bandhay huay" tone="violet" />
        <Kpi
          icon={Tag} label="Khaali" value={stats.unused} sub="Abhi koi product nahi" tone="rose"
          onClick={stats.unused > 0 ? () => setFilter('unused') : undefined}
          active={filter === 'unused'}
        />
      </section>

      {/* ═══ INDUSTRY QUICK ADD ═══ */}
      {availablePresets.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-500/10 dark:via-green-500/10 dark:to-teal-500/10 border-2 border-emerald-200 dark:border-emerald-500/40 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-md">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 text-sm">
                  {industryPresets.industryEmoji} {industryPresets.industryName} — Ready-Made Categories
                </h3>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 font-bold">
                  Click karo, naam+color pehle se bhara — bas save karo
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBulkImport(true)}
              className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-emerald-300 dark:border-emerald-500/40 hover:border-emerald-400 transition"
            >
              <Import className="h-3 w-3" /> Bulk Import <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {availablePresets.slice(0, 12).map((s) => (
              <button
                key={s.name}
                onClick={() => quickAdd(s)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800/80 border-2 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                style={{ borderColor: `${s.color}50` }}
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: s.color }}
                >
                  <Tag className="h-4 w-4" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{s.name}</div>
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold inline-flex items-center gap-0.5">
                    <Plus className="h-2.5 w-2.5" /> Click to add
                  </div>
                </div>
              </button>
            ))}
          </div>
          {availablePresets.length > 12 && (
            <button
              onClick={() => setShowBulkImport(true)}
              className="mt-3 w-full py-2 rounded-xl bg-white/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-500/30 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 transition"
            >
              + {availablePresets.length - 12} aur categories — Bulk Import kholo
            </button>
          )}
        </section>
      )}

      {/* ═══ TOP CATEGORIES ═══ */}
      {topCategories.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-emerald-200 dark:border-emerald-500/30 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-b-2 border-emerald-200 dark:border-emerald-500/30">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200">Top Categories</h3>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 font-bold">Sab se zyada products kis group me</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-emerald-100 dark:divide-slate-800">
            {topCategories.map((c: any, idx: number) => {
              const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-emerald-500', 'bg-green-500'];
              return (
                <div key={c.id} className="px-5 py-3 flex items-center gap-3 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition">
                  <div className={`h-8 w-8 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md`}>
                    {idx < 3 ? <Star className="h-4 w-4 fill-white" /> : idx + 1}
                  </div>
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0"
                    style={{ backgroundColor: c.color }}
                  >
                    <Tag className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-slate-900 dark:text-white truncate">{c.name}</div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">{c.color}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 dark:text-emerald-400 text-lg tabular-nums">{c._count?.products ?? 0}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">products</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ TOOLBAR ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Category dhundo... (/ shortcut)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/30 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              title="Card view"
              className={`px-4 h-12 transition ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={`px-4 h-12 border-l-2 border-slate-200 dark:border-slate-700 transition ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={exportCSV}
            className="h-12 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/50 bg-white dark:bg-slate-800 text-sm font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition"
          >
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
          </button>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {([
              { v: 'all' as FilterMode, l: 'Sab', c: stats.total },
              { v: 'used' as FilterMode, l: 'In Use', c: stats.used },
              { v: 'unused' as FilterMode, l: 'Khaali', c: stats.unused },
            ]).map((o) => (
              <button
                key={o.v}
                onClick={() => setFilter(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  filter === o.v ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {o.l} <span className={`ml-0.5 tabular-nums ${filter === o.v ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>{o.c}</span>
              </button>
            ))}
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition">
              <X className="h-3 w-3" /> Filter hatao
            </button>
          )}

          <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
            {filtered.length} categories
          </div>
        </div>
      </section>

      {/* ═══ EMPTY ═══ */}
      {filtered.length === 0 ? (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 sm:p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-green-200 dark:from-emerald-500/20 dark:to-green-500/20 flex items-center justify-center">
            <Tag className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
            {hasFilters ? 'Kuch nahi mila' : 'Abhi koi category nahi'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto">
            {hasFilters
              ? 'Filter change kar ke dekho'
              : 'Categories products ko groups me bandhti hain — phir "Dairy me kitna maal?" ek click pe. Ready-made list se shuru karo!'}
          </p>
          <div className="mt-5 flex gap-2 justify-center flex-wrap">
            {hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}><X className="h-4 w-4" /> Filter hatao</Button>
            ) : (
              <>
                <button
                  onClick={() => setShowTeacher(true)}
                  className="h-11 px-4 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-extrabold inline-flex items-center gap-1.5 border-2 border-amber-300 dark:border-amber-500/40 transition"
                >
                  <GraduationCap className="h-4 w-4" /> Pehle Seekh Lo
                </button>
                {availablePresets.length > 0 && (
                  <Button onClick={() => setShowBulkImport(true)} variant="secondary" className="font-extrabold">
                    <Import className="h-4 w-4" /> {industryPresets.industryName} se import
                  </Button>
                )}
                <Button onClick={openCreate} className="bg-gradient-to-r from-emerald-600 to-green-600 font-extrabold">
                  <Plus className="h-4 w-4" /> Nayi Category
                </Button>
              </>
            )}
          </div>
        </section>
      ) : viewMode === 'grid' ? (
        /* ═══ GRID ═══ */
        <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((cat: any) => (
            <div
              key={cat.id}
              className="group rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-4 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-xl dark:hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                  style={{ backgroundColor: cat.color, boxShadow: `0 10px 25px -5px ${cat.color}40` }}
                >
                  <Tag className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-slate-900 dark:text-white truncate text-sm">{cat.name}</h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 inline-flex items-center gap-1 font-semibold">
                    <Package className="h-3 w-3" />
                    {cat._count?.products ?? 0} products
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1 uppercase">{cat.color}</div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className={[
                  'text-[10px] font-extrabold',
                  (cat._count?.products ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500',
                ].join(' ')}>
                  {(cat._count?.products ?? 0) > 0 ? '✓ In use' : 'Khaali'}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => openEdit(cat)}
                    className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center justify-center transition"
                    title="Edit"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => confirmDelete(cat)}
                    className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:text-rose-700 dark:hover:text-rose-300 flex items-center justify-center transition"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : (
        /* ═══ LIST ═══ */
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((cat: any) => (
              <div key={cat.id} className="px-4 sm:px-5 py-3 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition flex items-center gap-3">
                <div
                  className="h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
                  style={{ backgroundColor: cat.color }}
                >
                  <Tag className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 dark:text-white truncate">{cat.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">{cat.color}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{cat._count?.products ?? 0}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">products</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(cat)}
                    className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center justify-center transition"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => confirmDelete(cat)}
                    className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:text-rose-700 dark:hover:text-rose-300 flex items-center justify-center transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ BULK IMPORT MODAL ═══ */}
      {showBulkImport && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => { setShowBulkImport(false); setSelectedPresets(new Set()); }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-3xl max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-lg shrink-0">
                  <Import className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white truncate">
                    {industryPresets.industryEmoji} Bulk Import — {industryPresets.industryName}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                    {selectedPresets.size} of {availablePresets.length} selected
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowBulkImport(false); setSelectedPresets(new Set()); }}
                className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center shrink-0 transition"
              >
                <X className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            <div className="shrink-0 px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-2">
                <button onClick={() => setSelectedPresets(new Set(availablePresets.map((p) => p.name)))} className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline">Sab select</button>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <button onClick={() => setSelectedPresets(new Set())} className="text-xs font-extrabold text-slate-600 dark:text-slate-400 hover:underline">Kuch nahi</button>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Jo pehle se hain, woh chhupe hain</div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {availablePresets.map((p) => {
                  const selected = selectedPresets.has(p.name);
                  return (
                    <button
                      key={p.name}
                      onClick={() => togglePresetSelection(p.name)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition text-left ${
                        selected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 shadow-md ring-2 ring-emerald-200 dark:ring-emerald-500/30'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-emerald-300 dark:hover:border-emerald-500/50'
                      }`}
                      style={selected ? { borderColor: p.color, backgroundColor: `${p.color}15` } : {}}
                    >
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
                        style={{ backgroundColor: p.color }}
                      >
                        <Tag className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{p.name}</div>
                        <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase">{p.color}</div>
                      </div>
                      {selected && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 px-5 py-4 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm">
                <div className="font-extrabold text-slate-900 dark:text-white">{selectedPresets.size} categories selected</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Duplicate auto skip ho jayenge</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setShowBulkImport(false); setSelectedPresets(new Set()); }}>Cancel</Button>
                <Button
                  onClick={bulkAddSelected}
                  disabled={selectedPresets.size === 0}
                  loading={bulkCreateMutation.isPending}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-50"
                >
                  <Import className="h-4 w-4" /> Import {selectedPresets.size}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FORM MODAL ═══ */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={closeForm}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={formEnter}
          >
            <div className="shrink-0 px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                  {editing ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white truncate">{editing ? 'Category Edit Karo' : 'Nayi Category'}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Naam + color, bas!</p>
                </div>
              </div>
              <button onClick={closeForm} className="h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center shrink-0 transition">
                <X className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <Input
                label="Category ka Naam *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dairy, Shoes, Spare Parts..."
              />

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-11 rounded-xl border-2 transition shadow-sm ${
                        color === c
                          ? 'border-slate-900 dark:border-white scale-110 shadow-lg ring-2 ring-slate-300 dark:ring-slate-600'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-16 rounded-xl border-2 border-slate-200 dark:border-slate-700 cursor-pointer bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 flex-1 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
                    placeholder="#2c9466"
                  />
                </div>
              </div>

              {/* Live preview */}
              <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-800/30 border-2 border-slate-200 dark:border-slate-700 p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold mb-3 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Live Preview
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-colors"
                    style={{ backgroundColor: color, boxShadow: `0 10px 25px -5px ${color}40` }}
                  >
                    <Tag className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 dark:text-white truncate">{name || 'Category name'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">0 products</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-4 flex gap-2">
              <Button variant="secondary" onClick={closeForm} className="flex-1">Cancel</Button>
              <Button
                onClick={() => {
                  if (!name.trim()) return toast.error('Naam zaroori hai');
                  saveMutation.mutate({ name: name.trim(), color });
                }}
                loading={saveMutation.isPending}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
              >
                <Save className="h-4 w-4" /> {editing ? 'Update' : 'Banao'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CATEGORIES TEACHER — Universal guide (35+ industries)
   ═════════════════════════════════════════════════════════════ */
function CategoriesTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/15 dark:to-green-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Categories — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Category = products ka group.</strong> Dukaan ke shelf ki tarah — Dairy wali cheezein ek taraf,
            Shoes ek taraf. Phir har group ka hisaab alag alag milta hai.
          </p>

          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>Category kyun banayein?</strong> — "Footwear me kitna maal para?" "Dairy ka stock kitne ka?" — foran jawab</TipRow>
            <TipRow><strong>🎨 Color ka faida</strong> — har category ka apna color, POS aur reports me ek nazar pehchan</TipRow>
            <TipRow><strong>⚡ Ready-made list</strong> — tumhari industry ki categories pehle se hain, click karo bas</TipRow>
            <TipRow><strong>"Khaali" filter</strong> — jin categories me koi product nahi, woh dikh jati hain (saaf-safai easy)</TipRow>
            <TipRow><strong>🗑️ Delete safe hai</strong> — category delete ho to products kharab NAHI hote, bas tag hat jata hai</TipRow>
            <TipRow><strong>⌨️ N dabao</strong> — nayi category &nbsp;•&nbsp; <strong>Enter</strong> — form me save</TipRow>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💡 <strong>Category vs Brand:</strong> Category = cheez <em>kya</em> hai (Dairy, Shoes, Spare Parts).
            Brand = <em>kis company</em> ki hai (Nestlé, Bata, Honda). Ek product ka dono ho sakte hain —
            "Nestlé (brand) ka Doodh (category)".
          </div>

          <Button
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 font-extrabold shadow-lg shadow-emerald-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </Button>
        </div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm">
      {children}
    </kbd>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, onClick, active }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 p-3 sm:p-4 shadow-sm text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
        active
          ? 'border-emerald-500 dark:border-emerald-500/60 ring-2 ring-emerald-200 dark:ring-emerald-500/20'
          : 'border-slate-200 dark:border-slate-800',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}
