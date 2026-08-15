import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Hash, Plus, Edit3, Trash2, X, Save, Search, Package, Sparkles,
  Download, RefreshCw, Star, Palette, Zap, Import, ChevronRight,
  CheckCircle2, GraduationCap, Printer,
} from 'lucide-react';
import { tagsApi, type Tag, type UpsertTagPayload } from '@modules/inventory/tags/api/tags.api';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { toast } from 'sonner';
import { useIndustryPresets } from '@industries/_shared/presets';

/* ═════════════════════════════════════════════════════════════
   NAFAA TAGS — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 GLOBAL — 35+ industries sab me same (naam + color label)
   🌙 Dark mode complete
   🎓 Teacher modal — Tag vs Category vs Brand ka farq sikhata hai
   ⌨️  / = search • N = naya • Enter = save • Esc = sab band
   🖨️ Print + CSV • ⚠️ Smart delete warning
   ═════════════════════════════════════════════════════════════ */

const COLOR_PRESETS = [
  '#16a34a', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#84cc16', '#a855f7', '#f97316',
  '#06b6d4', '#10b981', '#6366f1', '#d946ef', '#eab308',
  '#dc2626', '#78350f', '#22c55e', '#64748b', '#0891b2',
];

const empty: UpsertTagPayload = { name: '', color: '#16a34a' };

type FilterMode = 'all' | 'used' | 'unused';

export default function TagsPage() {
  const queryClient = useQueryClient();
  const industryPresets = useIndustryPresets();
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Tag | null>(null);
  const [form, setForm] = useState<UpsertTagPayload>(empty);

  const { data: tags = [], refetch, isRefetching, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  });

  const saveMutation = useMutation({
    mutationFn: () => editing ? tagsApi.update(editing.id, form) : tagsApi.create(form),
    onSuccess: () => {
      toast.success(editing ? 'Tag update ho gaya' : 'Tag ban gaya');
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      close();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save nahi hua'),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (presets: Array<{ name: string; color: string }>) => {
      const results = await Promise.allSettled(
        presets.map((p) => tagsApi.create({ name: p.name, color: p.color })),
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      return { succeeded, failed: results.length - succeeded };
    },
    onSuccess: ({ succeeded, failed }) => {
      if (succeeded > 0) toast.success(`${succeeded} tags add ho gaye`);
      if (failed > 0) toast.error(`${failed} fail (shayad pehle se mojood)`);
      setShowBulkImport(false);
      setSelectedPresets(new Set());
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: tagsApi.remove,
    onSuccess: () => {
      toast.success('Tag delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete nahi hua'),
  });

  const filtered = useMemo(() => {
    let result = [...tags];
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((t) => t.name.toLowerCase().includes(q));
    if (filter === 'used') result = result.filter((t) => (t._count?.products ?? 0) > 0);
    else if (filter === 'unused') result = result.filter((t) => (t._count?.products ?? 0) === 0);
    return result.sort((a, b) => (b._count?.products ?? 0) - (a._count?.products ?? 0));
  }, [tags, search, filter]);

  const stats = useMemo(() => {
    const totalProducts = tags.reduce((s, t) => s + (t._count?.products ?? 0), 0);
    const used = tags.filter((t) => (t._count?.products ?? 0) > 0).length;
    return { total: tags.length, used, unused: tags.length - used, totalProducts };
  }, [tags]);

  const topTags = useMemo(() => {
    return [...tags]
      .filter((t) => (t._count?.products ?? 0) > 0)
      .sort((a, b) => (b._count?.products ?? 0) - (a._count?.products ?? 0))
      .slice(0, 5);
  }, [tags]);

  const existingNames = new Set(tags.map((t) => t.name.toLowerCase()));
  const availablePresets = industryPresets.tags.filter(
    (s) => !existingNames.has(s.name.toLowerCase()),
  );

  const close = () => { setShowForm(false); setEditing(null); setForm(empty); };
  const openCreate = () => { setEditing(null); setForm(empty); setShowForm(true); };

  const openEdit = (t: Tag) => {
    setEditing(t);
    setForm({ name: t.name, color: t.color });
    setShowForm(true);
  };

  const quickAdd = (preset: { name: string; color: string }) => {
    setForm(preset);
    setEditing(null);
    setShowForm(true);
  };

  const togglePresetSelection = (name: string) => {
    setSelectedPresets((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const bulkAddSelected = () => {
    const toAdd = availablePresets.filter((p) => selectedPresets.has(p.name));
    if (toAdd.length === 0) return toast.error('Kam az kam 1 tag select karo');
    bulkCreateMutation.mutate(toAdd);
  };

  const confirmDelete = (t: Tag) => {
    const count = t._count?.products ?? 0;
    const msg = count > 0
      ? `⚠️ "${t.name}" ${count} products pe laga hua hai!\n\nDelete karo to products delete NAHI honge — bas unse tag hat jayega.\n\nPakka delete karein?`
      : `"${t.name}" delete karein?`;
    if (confirm(msg)) removeMutation.mutate(t.id);
  };

  const submitForm = () => {
    if (!form.name.trim()) return toast.error('Naam zaroori hai');
    saveMutation.mutate();
  };

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const summary = [
      ['Tags Report'],
      [`Generated: ${new Date().toLocaleString('en-PK')}  •  Total: ${filtered.length}`],
      [''],
    ];
    const headers = ['Name', 'Color', 'Products Count'];
    const rows = filtered.map((t) => [t.name, t.color, t._count?.products ?? 0]);
    const csv = [...summary, headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tags-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} tags export ho gaye`);
  };

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (showForm) return close();
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

  const hasFilters = !!search || filter !== 'all';
  const clearFilters = () => { setSearch(''); setFilter('all'); };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-pink-200 dark:border-pink-800 border-t-pink-600 dark:border-t-pink-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <TagsTeacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 dark:from-slate-950 dark:via-pink-950 dark:to-rose-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-pink-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Hash className="h-3.5 w-3.5 text-amber-300" /> Smart Labels
              {industryPresets.industryId && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-pink-200">{industryPresets.industryEmoji} {industryPresets.industryName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">🏷️ Tags</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-pink-200">{stats.total}</strong> tags
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-blue-200">{stats.totalProducts}</strong> products labeled
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
              <Plus className="h-4 w-4" /> Naya Tag <Kbd>N</Kbd>
            </button>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>N</Kbd><span className="text-white/60">Naya tag</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Hash} label="Total Tags" value={stats.total} sub="Sab labels" tone="pink" />
        <Kpi icon={Sparkles} label="In Use" value={stats.used} sub={`${stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0}% use ho rahe`} tone="emerald" />
        <Kpi icon={Package} label="Tagged Products" value={stats.totalProducts} sub="Sab tags pe mila kar" tone="blue" />
        <Kpi
          icon={Hash} label="Khaali" value={stats.unused} sub="Kisi product pe nahi" tone="rose"
          onClick={stats.unused > 0 ? () => setFilter('unused') : undefined}
          active={filter === 'unused'}
        />
      </section>

      {/* ═══ INDUSTRY QUICK ADD ═══ */}
      {availablePresets.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 dark:from-pink-500/10 dark:via-rose-500/10 dark:to-fuchsia-500/10 border-2 border-pink-200 dark:border-pink-500/40 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-md">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-pink-900 dark:text-pink-200 text-sm">
                  {industryPresets.industryEmoji} {industryPresets.industryName} — Ready-Made Tags
                </h3>
                <p className="text-[11px] text-pink-700 dark:text-pink-300/80 font-bold">
                  Click karo, naam+color pehle se bhara — bas save karo
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBulkImport(true)}
              className="text-xs font-extrabold text-pink-700 dark:text-pink-300 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-pink-300 dark:border-pink-500/40 hover:border-pink-400 transition"
            >
              <Import className="h-3 w-3" /> Bulk Import <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {availablePresets.slice(0, 20).map((s) => (
              <button
                key={s.name}
                onClick={() => quickAdd(s)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border-2 hover:shadow-md hover:scale-105 transition-all"
                style={{ backgroundColor: `${s.color}15`, borderColor: `${s.color}50` }}
              >
                <Plus className="h-3 w-3" style={{ color: s.color }} />
                <span className="text-xs font-extrabold" style={{ color: s.color }}>{s.name}</span>
              </button>
            ))}
          </div>
          {availablePresets.length > 20 && (
            <button
              onClick={() => setShowBulkImport(true)}
              className="mt-3 w-full py-2 rounded-xl bg-white/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border-2 border-pink-200 dark:border-pink-500/30 text-xs font-extrabold text-pink-700 dark:text-pink-300 transition"
            >
              + {availablePresets.length - 20} aur tags — Bulk Import kholo
            </button>
          )}
        </section>
      )}

      {/* ═══ TOP TAGS ═══ */}
      {topTags.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-pink-200 dark:border-pink-500/30 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-500/10 dark:to-rose-500/10 border-b-2 border-pink-200 dark:border-pink-500/30">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="font-extrabold text-pink-900 dark:text-pink-200">Top Tags</h3>
                <p className="text-[11px] text-pink-700 dark:text-pink-300/80 font-bold">Sab se zyada use hone wale labels</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-pink-100 dark:divide-slate-800">
            {topTags.map((t, idx) => {
              const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-pink-500', 'bg-rose-500'];
              return (
                <div key={t.id} className="px-5 py-3 flex items-center gap-3 hover:bg-pink-50/40 dark:hover:bg-pink-500/5 transition">
                  <div className={`h-8 w-8 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md`}>
                    {idx < 3 ? <Star className="h-4 w-4 fill-white" /> : idx + 1}
                  </div>
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border-2"
                    style={{ backgroundColor: `${t.color}15`, borderColor: `${t.color}40` }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-sm font-extrabold" style={{ color: t.color }}>{t.name}</span>
                  </div>
                  <div className="flex-1" />
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-pink-700 dark:text-pink-400 text-lg tabular-nums">{t._count?.products ?? 0}</div>
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
              placeholder="Tag dhundo... (/ shortcut)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-500/30 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          <button
            onClick={exportCSV}
            className="h-12 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-500/50 bg-white dark:bg-slate-800 text-sm font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition"
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
                  filter === o.v ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
            {filtered.length} tags
          </div>
        </div>
      </section>

      {/* ═══ TAGS CLOUD ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-pink-100 to-rose-200 dark:from-pink-500/20 dark:to-rose-500/20 flex items-center justify-center">
              <Hash className="h-9 w-9 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
              {hasFilters ? 'Kuch nahi mila' : 'Abhi koi tag nahi'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto">
              {hasFilters
                ? 'Filter change kar ke dekho'
                : 'Tags flexible labels hain — "Bestseller", "New", "Sale" jo bhi chaho. Ek product pe kai tags lag sakte hain!'}
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
                  <Button onClick={openCreate} className="bg-gradient-to-r from-pink-600 to-rose-600 font-extrabold">
                    <Plus className="h-4 w-4" /> Naya Tag
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="group inline-flex items-center gap-2 rounded-full pl-3 pr-1 py-1.5 border-2 hover:shadow-md hover:scale-105 transition-all"
                style={{
                  backgroundColor: `${t.color}15`,
                  borderColor: `${t.color}40`,
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-sm font-extrabold" style={{ color: t.color }}>{t.name}</span>
                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-800/80 rounded-full px-1.5 py-0.5 tabular-nums">
                  {t._count?.products ?? 0}
                </span>
                <div className="flex opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => openEdit(t)}
                    className="h-7 w-7 rounded-full hover:bg-white/70 dark:hover:bg-slate-700 flex items-center justify-center transition"
                    title="Edit"
                  >
                    <Edit3 className="h-3 w-3" style={{ color: t.color }} />
                  </button>
                  <button
                    onClick={() => confirmDelete(t)}
                    className="h-7 w-7 rounded-full hover:bg-rose-100 dark:hover:bg-rose-500/20 flex items-center justify-center transition"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
            <div className="shrink-0 px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-500/10 dark:to-rose-500/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-lg shrink-0">
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
                <button onClick={() => setSelectedPresets(new Set(availablePresets.map((p) => p.name)))} className="text-xs font-extrabold text-pink-700 dark:text-pink-400 hover:underline">Sab select</button>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <button onClick={() => setSelectedPresets(new Set())} className="text-xs font-extrabold text-slate-600 dark:text-slate-400 hover:underline">Kuch nahi</button>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Jo pehle se hain, woh chhupe hain</div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex flex-wrap gap-2">
                {availablePresets.map((p) => {
                  const selected = selectedPresets.has(p.name);
                  return (
                    <button
                      key={p.name}
                      onClick={() => togglePresetSelection(p.name)}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 border-2 transition ${
                        selected ? 'shadow-md' : 'opacity-70 hover:opacity-100 hover:shadow-sm'
                      }`}
                      style={selected ? {
                        backgroundColor: `${p.color}20`,
                        borderColor: p.color,
                        boxShadow: `0 0 0 3px ${p.color}20`,
                      } : {
                        backgroundColor: `${p.color}10`,
                        borderColor: `${p.color}40`,
                      }}
                    >
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-sm font-extrabold" style={{ color: p.color }}>{p.name}</span>
                      {selected && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: p.color }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 px-5 py-4 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm">
                <div className="font-extrabold text-slate-900 dark:text-white">{selectedPresets.size} tags selected</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Duplicate auto skip ho jayenge</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setShowBulkImport(false); setSelectedPresets(new Set()); }}>Cancel</Button>
                <Button
                  onClick={bulkAddSelected}
                  disabled={selectedPresets.size === 0}
                  loading={bulkCreateMutation.isPending}
                  className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 disabled:opacity-50"
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
          onClick={close}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && form.name.trim() && !saveMutation.isPending) {
                e.preventDefault();
                submitForm();
              }
            }}
          >
            <div className="shrink-0 px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/30 shrink-0">
                  {editing ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white truncate">{editing ? 'Tag Edit Karo' : 'Naya Tag'}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Naam + color, bas!</p>
                </div>
              </div>
              <button onClick={close} className="h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center shrink-0 transition">
                <X className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <Input
                label="Tag ka Naam *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Bestseller, New, Sale, Imported..."
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
                      onClick={() => setForm({ ...form, color: c })}
                      className={`h-11 rounded-xl border-2 transition shadow-sm ${
                        form.color === c
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
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-10 w-16 rounded-xl border-2 border-slate-200 dark:border-slate-700 cursor-pointer bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-10 flex-1 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-pink-500 transition"
                    placeholder="#16a34a"
                  />
                </div>
              </div>

              {/* Live preview */}
              <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-800/30 border-2 border-slate-200 dark:border-slate-700 p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold mb-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Live Preview
                </div>
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border-2 shadow-sm transition-colors"
                  style={{
                    backgroundColor: `${form.color}15`,
                    borderColor: `${form.color}40`,
                  }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: form.color }} />
                  <span className="text-sm font-extrabold" style={{ color: form.color }}>
                    {form.name || 'Tag preview'}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-4 flex gap-2">
              <Button variant="secondary" onClick={close} className="flex-1">Cancel</Button>
              <Button
                onClick={submitForm}
                loading={saveMutation.isPending}
                className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
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
   TAGS TEACHER — Universal guide (35+ industries)
   ═════════════════════════════════════════════════════════════ */
function TagsTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-pink-300 dark:border-pink-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-pink-200 dark:border-pink-500/30 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-500/15 dark:to-rose-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-pink-900 dark:text-pink-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Tags — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Tag = chhota sa sticker label</strong> jo product pe chipka do — "Bestseller", "Sale",
            "New", "Imported". Ek product pe <strong>jitne chaho tags</strong> lag sakte hain.
          </p>

          {/* Sab se important: 3 ka farq */}
          <div className="rounded-2xl border-2 border-pink-200 dark:border-pink-500/30 bg-pink-50/60 dark:bg-pink-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-pink-700 dark:text-pink-300">
              🎯 Tag vs Category vs Brand — Sab Se Bara Confusion Clear!
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-pink-200 dark:border-pink-500/30 p-2">
                🗂️ <strong>Category</strong> = cheez <em>kya</em> hai — "Dairy", "Shoes" (ek product ki <strong>ek</strong> category)
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-pink-200 dark:border-pink-500/30 p-2">
                🏢 <strong>Brand</strong> = <em>kis company</em> ki hai — "Nestlé", "Bata" (ek product ka <strong>ek</strong> brand)
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-pink-200 dark:border-pink-500/30 p-2">
                🏷️ <strong>Tag</strong> = <em>koi bhi</em> nishani — "Sale", "Bestseller", "Winter" (<strong>kai tags</strong> ek product pe!)
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>Kab use karein?</strong> — "Sale wale sab products dikhao" ya "Nayi cheezein alag karo" ke liye</TipRow>
            <TipRow><strong>⚡ Ready-made list</strong> — industry ke popular tags pehle se hain, click karo bas</TipRow>
            <TipRow><strong>🗑️ Delete safe hai</strong> — tag delete ho to products kharab NAHI hote, bas sticker hat jata hai</TipRow>
            <TipRow><strong>⌨️ N dabao</strong> — naya tag &nbsp;•&nbsp; <strong>Enter</strong> — form me save</TipRow>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 font-extrabold shadow-lg shadow-pink-500/40 h-12"
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
    pink: 'from-pink-500 to-rose-600 shadow-pink-500/40',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/40',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
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
          ? 'border-pink-500 dark:border-pink-500/60 ring-2 ring-pink-200 dark:ring-pink-500/20'
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
