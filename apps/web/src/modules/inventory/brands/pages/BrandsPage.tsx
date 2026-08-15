import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Edit3, Trash2, Globe, Building2, X, Save,
  CheckCircle2, Sparkles, Package, Download, ExternalLink,
  RefreshCw, Star, Grid3x3, List, Import, Zap, ChevronRight,
  GraduationCap, Printer,
} from 'lucide-react';
import { brandsApi, type Brand, type UpsertBrandPayload } from '@modules/inventory/brands/api/brands.api';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { AvatarUpload } from '@core/components/uploads';
import { toast } from 'sonner';
import { useIndustryPresets } from '@industries/_shared/presets';

/* ═════════════════════════════════════════════════════════════
   NAFAA BRANDS — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 GLOBAL — 35+ industries sab me same (brand = naam+logo+site)
   🌙 Dark mode complete
   🎓 Teacher modal — universal teaching (kisi bhi dukandaar ke liye)
   ⌨️  / = search • N = naya brand • Esc = sab band
   💾 Grid/List view yaad rakhta hai • 🖨️ Print + CSV
   ═════════════════════════════════════════════════════════════ */

const empty: UpsertBrandPayload = {
  name: '', description: '', logoUrl: '', website: '', isActive: true,
};

type FilterMode = 'all' | 'active' | 'inactive';
type ViewMode = 'grid' | 'list';

const VIEW_KEY = 'brands-view';

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const industryPresets = useIndustryPresets();
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<UpsertBrandPayload>(empty);

  /* View preference yaad rakho */
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === 'grid' || saved === 'list') setViewMode(saved);
  }, []);
  useEffect(() => { localStorage.setItem(VIEW_KEY, viewMode); }, [viewMode]);

  const { data: brands = [], refetch, isRefetching, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
  });

  const saveMutation = useMutation({
    mutationFn: () => editing ? brandsApi.update(editing.id, form) : brandsApi.create(form),
    onSuccess: () => {
      toast.success(editing ? 'Brand update ho gaya' : 'Brand ban gaya');
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      closeForm();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save nahi hua'),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (presets: Array<{ name: string; description?: string; website?: string }>) => {
      const results = await Promise.allSettled(
        presets.map((p) => brandsApi.create({
          name: p.name,
          description: p.description,
          website: p.website,
          isActive: true,
        })),
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      return { succeeded, failed: results.length - succeeded };
    },
    onSuccess: ({ succeeded, failed }) => {
      if (succeeded > 0) toast.success(`${succeeded} brands add ho gaye`);
      if (failed > 0) toast.error(`${failed} fail (shayad pehle se mojood)`);
      setShowBulkImport(false);
      setSelectedPresets(new Set());
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: brandsApi.remove,
    onSuccess: () => {
      toast.success('Brand delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete nahi hua — is brand ke products hain'),
  });

  const filtered = useMemo(() => {
    let result = [...brands];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((b) =>
        b.name.toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q) ||
        (b.slug || '').toLowerCase().includes(q),
      );
    }
    if (filter === 'active') result = result.filter((b) => b.isActive);
    else if (filter === 'inactive') result = result.filter((b) => !b.isActive);
    return result.sort((a, b) => (b._count?.products ?? 0) - (a._count?.products ?? 0));
  }, [brands, search, filter]);

  const stats = useMemo(() => {
    const totalProducts = brands.reduce((s, b) => s + (b._count?.products ?? 0), 0);
    const withLogos = brands.filter((b) => b.logoUrl).length;
    const withWebsite = brands.filter((b) => b.website).length;
    return {
      total: brands.length,
      active: brands.filter((b) => b.isActive).length,
      inactive: brands.filter((b) => !b.isActive).length,
      totalProducts, withLogos, withWebsite,
    };
  }, [brands]);

  const topBrands = useMemo(() => {
    return [...brands]
      .filter((b) => (b._count?.products ?? 0) > 0)
      .sort((a, b) => (b._count?.products ?? 0) - (a._count?.products ?? 0))
      .slice(0, 5);
  }, [brands]);

  const existingNames = new Set(brands.map((b) => b.name.toLowerCase()));
  const availablePresets = industryPresets.brands.filter(
    (s) => !existingNames.has(s.name.toLowerCase()),
  );

  const openCreate = () => { setEditing(null); setForm(empty); setShowForm(true); };
  const openEdit = (b: Brand) => {
    setEditing(b);
    setForm({
      name: b.name, description: b.description ?? '', logoUrl: b.logoUrl ?? '',
      website: b.website ?? '', isActive: b.isActive,
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(empty); };

  const quickAdd = (preset: { name: string; description?: string; website?: string }) => {
    setEditing(null);
    setForm({
      name: preset.name,
      description: preset.description || '',
      website: preset.website || '',
      logoUrl: '',
      isActive: true,
    });
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
    if (toAdd.length === 0) return toast.error('Kam az kam 1 brand select karo');
    bulkCreateMutation.mutate(toAdd);
  };

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const summary = [
      ['Brands Report'],
      [`Generated: ${new Date().toLocaleString('en-PK')}  •  Total: ${filtered.length}`],
      [''],
    ];
    const headers = ['Name', 'Slug', 'Description', 'Website', 'Active', 'Products', 'Created'];
    const rows = filtered.map((b) => [
      b.name, b.slug || '', b.description || '', b.website || '',
      b.isActive ? 'Yes' : 'No',
      b._count?.products ?? 0,
      new Date(b.createdAt).toLocaleDateString('en-PK'),
    ]);
    const csv = [...summary, headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brands-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} brands export ho gaye`);
  };

  /* ─── Keyboard shortcuts + body scroll lock ─── */
  useEffect(() => {
    const tag = () => document.activeElement?.tagName;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (showForm) return closeForm();
        if (showBulkImport) { setShowBulkImport(false); setSelectedPresets(new Set()); return; }
      }
      if (tag() === 'INPUT' || tag() === 'TEXTAREA' || tag() === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); openCreate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showForm, showBulkImport]);

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
        <div className="h-12 w-12 rounded-full border-4 border-violet-200 dark:border-violet-800 border-t-violet-600 dark:border-t-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <BrandsTeacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 dark:from-slate-950 dark:via-violet-950 dark:to-purple-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Building2 className="h-3.5 w-3.5 text-amber-300" /> Brand Management
              {industryPresets.industryId && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-violet-200">{industryPresets.industryEmoji} {industryPresets.industryName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">🏷️ Brands</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-violet-200">{stats.total}</strong> brands
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-blue-200">{stats.totalProducts}</strong> products linked
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
              <Plus className="h-4 w-4" /> Naya Brand <Kbd>N</Kbd>
            </button>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>N</Kbd><span className="text-white/60">Naya brand</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Building2} label="Total Brands" value={stats.total} sub={`${stats.active} active`} tone="violet" />
        <Kpi icon={Package} label="Linked Products" value={stats.totalProducts} sub="Sab brands me mila kar" tone="blue" />
        <Kpi icon={Sparkles} label="With Logos" value={stats.withLogos} sub={`${stats.total > 0 ? Math.round((stats.withLogos / stats.total) * 100) : 0}% complete`} tone="emerald" />
        <Kpi icon={Globe} label="With Website" value={stats.withWebsite} sub="Online presence" tone="amber" />
      </section>

      {/* ═══ INDUSTRY QUICK ADD ═══ */}
      {availablePresets.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-500/10 dark:via-purple-500/10 dark:to-fuchsia-500/10 border-2 border-violet-200 dark:border-violet-500/40 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-violet-900 dark:text-violet-200 text-sm">
                  {industryPresets.industryEmoji} {industryPresets.industryName} — Ready-Made Brands
                </h3>
                <p className="text-[11px] text-violet-700 dark:text-violet-300/80 font-bold">
                  Click karo, form khul jayega — bas save karna hai
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBulkImport(true)}
              className="text-xs font-extrabold text-violet-700 dark:text-violet-300 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-violet-300 dark:border-violet-500/40 hover:border-violet-400 transition"
            >
              <Import className="h-3 w-3" /> Bulk Import <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {availablePresets.slice(0, 12).map((s) => (
              <button
                key={s.name}
                onClick={() => quickAdd(s)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800/80 border-2 border-violet-200 dark:border-violet-500/30 hover:border-violet-400 dark:hover:border-violet-500/60 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md shrink-0 group-hover:scale-110 transition-transform font-extrabold">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{s.name}</div>
                  {s.description && (
                    <div className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold truncate">{s.description}</div>
                  )}
                </div>
                <Plus className="h-3 w-3 text-violet-500 dark:text-violet-400 shrink-0" />
              </button>
            ))}
          </div>
          {availablePresets.length > 12 && (
            <button
              onClick={() => setShowBulkImport(true)}
              className="mt-3 w-full py-2 rounded-xl bg-white/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border-2 border-violet-200 dark:border-violet-500/30 text-xs font-extrabold text-violet-700 dark:text-violet-300 transition"
            >
              + {availablePresets.length - 12} aur brands — Bulk Import kholo
            </button>
          )}
        </section>
      )}

      {/* ═══ TOP BRANDS ═══ */}
      {topBrands.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-violet-200 dark:border-violet-500/30 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border-b-2 border-violet-200 dark:border-violet-500/30">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="font-extrabold text-violet-900 dark:text-violet-200">Top Brands</h3>
                <p className="text-[11px] text-violet-700 dark:text-violet-300/80 font-bold">Sab se zyada products kis ke hain</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-violet-100 dark:divide-slate-800">
            {topBrands.map((b, idx) => {
              const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
              return (
                <div key={b.id} className="px-5 py-3 flex items-center gap-3 hover:bg-violet-50/40 dark:hover:bg-violet-500/5 transition">
                  <div className={`h-9 w-9 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md`}>
                    {idx < 3 ? <Star className="h-4 w-4 fill-white" /> : idx + 1}
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                    {b.logoUrl ? (
                      <img src={b.logoUrl} alt={b.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-violet-700 text-white font-extrabold">
                        {b.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-slate-900 dark:text-white truncate">{b.name}</div>
                    {b.website && (
                      <a href={b.website} target="_blank" rel="noreferrer" className="text-[11px] text-violet-700 dark:text-violet-400 font-semibold hover:underline inline-flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" />
                        {b.website.replace(/^https?:\/\//, '').slice(0, 30)}
                      </a>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-violet-700 dark:text-violet-400 text-lg tabular-nums">{b._count?.products ?? 0}</div>
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
              placeholder="Brand dhundo... (/ shortcut)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-500/30 transition"
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
              className={`px-4 h-12 transition ${viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={`px-4 h-12 border-l-2 border-slate-200 dark:border-slate-700 transition ${viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={exportCSV}
            className="h-12 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-500/50 bg-white dark:bg-slate-800 text-sm font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition"
          >
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
          </button>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {([
              { v: 'all' as FilterMode, l: 'Sab', c: stats.total },
              { v: 'active' as FilterMode, l: 'Active', c: stats.active },
              { v: 'inactive' as FilterMode, l: 'Band', c: stats.inactive },
            ]).map((o) => (
              <button
                key={o.v}
                onClick={() => setFilter(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  filter === o.v ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
            {filtered.length} brands
          </div>
        </div>
      </section>

      {/* ═══ EMPTY ═══ */}
      {filtered.length === 0 ? (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 sm:p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-200 dark:from-violet-500/20 dark:to-purple-500/20 flex items-center justify-center">
            <Building2 className="h-9 w-9 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
            {hasFilters ? 'Kuch nahi mila' : 'Abhi koi brand nahi'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto">
            {hasFilters
              ? 'Filter change kar ke dekho'
              : 'Brands optional hain — lekin unse products organize hote hain aur report mein "Nestlé ka kitna bika" jaisi info milti hai.'}
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
                <Button onClick={openCreate} className="bg-gradient-to-r from-violet-600 to-purple-600 font-extrabold">
                  <Plus className="h-4 w-4" /> Naya Brand
                </Button>
              </>
            )}
          </div>
        </section>
      ) : viewMode === 'grid' ? (
        /* ═══ GRID ═══ */
        <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((b) => (
            <div
              key={b.id}
              className={`group rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 p-4 hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-xl dark:hover:shadow-violet-500/10 hover:-translate-y-1 transition-all ${
                !b.isActive ? 'opacity-60 border-slate-200 dark:border-slate-800' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm">
                  {b.logoUrl ? (
                    <img src={b.logoUrl} alt={b.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-700 text-white font-extrabold text-xl">
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-slate-900 dark:text-white truncate text-sm">{b.name}</h3>
                    {!b.isActive && (
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-extrabold shrink-0">OFF</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">/{b.slug}</div>
                  {b.website && (
                    <a
                      href={b.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-[11px] text-violet-700 dark:text-violet-400 hover:underline font-semibold"
                    >
                      <Globe className="h-3 w-3" /> Website <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>

              {b.description && (
                <p className="mt-2.5 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">{b.description}</p>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[11px] font-extrabold">
                  <Package className="h-2.5 w-2.5" />
                  {b._count?.products ?? 0} products
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => openEdit(b)} className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-violet-500/20 hover:text-violet-700 dark:hover:text-violet-300 flex items-center justify-center transition" title="Edit">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`"${b.name}" delete karein?\n\n(Is brand ke products delete NAHI honge — sirf unse brand ka tag hat jayega)`)) removeMutation.mutate(b.id);
                    }}
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
            {filtered.map((b) => (
              <div key={b.id} className={`px-4 sm:px-5 py-3 hover:bg-violet-50/40 dark:hover:bg-violet-500/5 transition flex items-center gap-3 ${!b.isActive ? 'opacity-60' : ''}`}>
                <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                  {b.logoUrl ? (
                    <img src={b.logoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-700 text-white font-extrabold">
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white truncate">{b.name}</span>
                    {!b.isActive && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-extrabold shrink-0">OFF</span>}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">/{b.slug}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-blue-700 dark:text-blue-400 tabular-nums">{b._count?.products ?? 0}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">products</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(b)} className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-violet-500/20 hover:text-violet-700 dark:hover:text-violet-300 flex items-center justify-center transition">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`"${b.name}" delete karein?`)) removeMutation.mutate(b.id); }}
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
            <div className="shrink-0 px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-lg shrink-0">
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
                <button onClick={() => setSelectedPresets(new Set(availablePresets.map((p) => p.name)))} className="text-xs font-extrabold text-violet-700 dark:text-violet-400 hover:underline">Sab select</button>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <button onClick={() => setSelectedPresets(new Set())} className="text-xs font-extrabold text-slate-600 dark:text-slate-400 hover:underline">Kuch nahi</button>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Jo pehle se hain, woh chhupe hain</div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid sm:grid-cols-2 gap-2">
                {availablePresets.map((p) => {
                  const selected = selectedPresets.has(p.name);
                  return (
                    <button
                      key={p.name}
                      onClick={() => togglePresetSelection(p.name)}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 transition text-left ${
                        selected
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 shadow-md ring-2 ring-violet-200 dark:ring-violet-500/30'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-violet-300 dark:hover:border-violet-500/50'
                      }`}
                    >
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center font-extrabold shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{p.name}</div>
                        {p.description && (
                          <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold line-clamp-2">{p.description}</div>
                        )}
                        {p.website && (
                          <div className="text-[9px] text-violet-700 dark:text-violet-400 font-mono truncate mt-0.5">
                            <Globe className="h-2 w-2 inline mr-0.5" />
                            {p.website.replace(/^https?:\/\//, '').slice(0, 30)}
                          </div>
                        )}
                      </div>
                      {selected && <CheckCircle2 className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 px-5 py-4 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm">
                <div className="font-extrabold text-slate-900 dark:text-white">{selectedPresets.size} brands selected</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Duplicate auto skip ho jayenge</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setShowBulkImport(false); setSelectedPresets(new Set()); }}>Cancel</Button>
                <Button
                  onClick={bulkAddSelected}
                  disabled={selectedPresets.size === 0}
                  loading={bulkCreateMutation.isPending}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50"
                >
                  <Import className="h-4 w-4" /> Import {selectedPresets.size} Brands
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
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-lg shrink-0">
                  {editing ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white truncate">{editing ? 'Brand Edit Karo' : 'Naya Brand'}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Manufacturer / company</p>
                </div>
              </div>
              <button onClick={closeForm} className="h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center shrink-0 transition">
                <X className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Brand Logo</label>
                <AvatarUpload
                  value={form.logoUrl}
                  onChange={(url) => setForm({ ...form, logoUrl: url || '' })}
                  purpose="brand-logo"
                  shape="square"
                  size="lg"
                  fallbackText={form.name || 'B'}
                />
              </div>
              <Input
                label="Brand ka Naam *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nestlé, Samsung, Servis..."
              />
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                <textarea
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 resize-none transition"
                  rows={3}
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Is brand ke baare me..."
                />
              </div>
              <Input
                label="Website"
                value={form.website ?? ''}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://example.com"
              />
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-violet-300 dark:hover:border-violet-500/50 transition">
                <div className="flex items-center gap-2.5">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${form.isActive ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    {form.isActive ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">{form.isActive ? 'Active' : 'Inactive'}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Product forms me dikhega</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-5 w-5 rounded accent-violet-600"
                />
              </label>
            </div>

            <div className="shrink-0 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-4 flex gap-2">
              <Button variant="secondary" onClick={closeForm} className="flex-1">Cancel</Button>
              <Button
                onClick={() => {
                  if (!form.name.trim()) return toast.error('Naam zaroori hai');
                  saveMutation.mutate();
                }}
                loading={saveMutation.isPending}
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
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
   BRANDS TEACHER — Universal guide (35+ industries ke liye)
   ═════════════════════════════════════════════════════════════ */
function BrandsTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-violet-300 dark:border-violet-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-violet-200 dark:border-violet-500/30 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/15 dark:to-purple-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-violet-900 dark:text-violet-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Brands — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Brand = company ka naam</strong> jo product banati hai — jaise Nestlé, Samsung, Servis, Khaadi.
            Ye <strong>optional</strong> hai, lekin bara kaam ka hai.
          </p>

          <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>Brand kyun banayein?</strong> — "Samsung ka kitna bika is mahine?" jaise reports milte hain</TipRow>
            <TipRow><strong>⚡ Ready-made list</strong> — tumhari industry ke popular brands pehle se hain, click karo bas</TipRow>
            <TipRow><strong>Bulk Import</strong> — ek saath 20-30 brands select kar ke 1 click me banao</TipRow>
            <TipRow><strong>Logo lagao</strong> — product form aur POS pe sohna dikhta hai</TipRow>
            <TipRow><strong>🗑️ Delete safe hai</strong> — brand delete ho to products kharab NAHI hote, sirf tag hat jata hai</TipRow>
            <TipRow><strong>⌨️ N dabao</strong> — naya brand &nbsp;•&nbsp; <strong>/</strong> — search</TipRow>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💡 <strong>Brand vs Category:</strong> Category = product <em>kya</em> hai (Dairy, Shoes, Mobiles).
            Brand = <em>kis company</em> ka hai (Nestlé, Bata, Samsung). Ek product ka dono ho sakte hain.
          </div>

          <Button
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 font-extrabold shadow-lg shadow-violet-500/40 h-12"
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

function Kpi({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/40',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm transition-all">
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
    </div>
  );
}
