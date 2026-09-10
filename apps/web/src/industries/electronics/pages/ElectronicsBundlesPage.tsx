// apps/web/src/industries/electronics/pages/ElectronicsBundlesPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Gift, Plus, Search, X, Edit3, Trash2, Star, RefreshCw, Sparkles,
  Package, Percent, TrendingUp, Copy, Award, Eye, EyeOff, Layers,
  GraduationCap, Keyboard, CheckCircle2, FileSpreadsheet, Printer,
  Wallet, ArrowRight, Loader2, CalendarClock, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { PrintStyles } from '@core/components/print/PrintStyles';
import { electronicsBundlesApi, type ElectronicsBundle } from '../api/bundles.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA ELECTRONICS — BUNDLE / COMBO DEALS
   ─────────────────────────────────────────────────────────────
   🎁 "Headphone + Case + Charger" jaisa combo banayein
   💰 Customer ko bachat, dukan ko zyada bikri
   ⭐ Khaas bundles POS aur catalog par upar aate hain
   ═════════════════════════════════════════════════════════════ */

type Tab = 'active' | 'all' | 'featured' | 'off';

export default function ElectronicsBundlesPage() {
  const qc = useQueryClient();
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  /* Sab bundles ek bar — filter yahin JS me, taake counts sahi rahen */
  const { data: bundles = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['electronics-bundles-list'],
    queryFn: () => electronicsBundlesApi.list({}),
  });

  const remove = useMutation({
    mutationFn: (id: string) => electronicsBundlesApi.remove(id),
    onSuccess: () => {
      toast.success('Bundle delete ho gaya');
      qc.invalidateQueries({ queryKey: ['electronics-bundles-list'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail hua'),
  });

  const toggleFlag = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ElectronicsBundle> }) =>
      electronicsBundlesApi.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['electronics-bundles-list'] });
      qc.invalidateQueries({ queryKey: ['electronics-pos-catalog'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update fail hua'),
  });

  const duplicate = useMutation({
    mutationFn: (b: ElectronicsBundle) => electronicsBundlesApi.create({
      name: `${b.name} (copy)`,
      description: b.description,
      imageUrl: b.imageUrl,
      items: (b.items ?? []).map((it) => ({
        productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice,
      })),
      originalPrice: b.originalPrice,
      bundlePrice: b.bundlePrice,
      savings: b.savings,
      savingsPct: b.savingsPct,
      // Copy hamesha band rehti hai — galti se live na ho jaye
      isActive: false,
      isFeatured: false,
    }),
    onSuccess: () => {
      toast.success('Copy ban gayi — band halat me, edit karke chalu karein');
      qc.invalidateQueries({ queryKey: ['electronics-bundles-list'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Copy fail hui'),
  });

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === 'r') refetch();
      if (e.key === 'p') window.print();
      if (e.key === '?') setShowShortcuts((v) => !v);
      if (['1', '2', '3', '4'].includes(e.key)) {
        const t: Tab[] = ['active', 'all', 'featured', 'off'];
        setTab(t[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showShortcuts]);

  const anyModal = showTeacher || showShortcuts;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  const counts = useMemo(() => ({
    active: bundles.filter((b) => b.isActive).length,
    all: bundles.length,
    featured: bundles.filter((b) => b.isFeatured).length,
    off: bundles.filter((b) => !b.isActive).length,
  }), [bundles]);

  const list = useMemo(() => {
    let l = bundles;
    if (tab === 'active') l = l.filter((b) => b.isActive);
    if (tab === 'featured') l = l.filter((b) => b.isFeatured);
    if (tab === 'off') l = l.filter((b) => !b.isActive);
    const q = search.toLowerCase().trim();
    if (q) {
      l = l.filter((b) =>
        b.name.toLowerCase().includes(q) ||
        (b.description ?? '').toLowerCase().includes(q) ||
        (b.items ?? []).some((it: any) => (it.product?.name ?? '').toLowerCase().includes(q)),
      );
    }
    return [...l].sort((a, b) =>
      Number(b.isFeatured) - Number(a.isFeatured) ||
      Number(b.soldCount ?? 0) - Number(a.soldCount ?? 0));
  }, [bundles, tab, search]);

  const stats = useMemo(() => ({
    totalSold: bundles.reduce((s, b) => s + Number(b.soldCount ?? 0), 0),
    totalRevenue: bundles.reduce((s, b) => s + Number(b.totalRevenue ?? 0), 0),
    avgSavings: bundles.length > 0
      ? bundles.reduce((s, b) => s + Number(b.savingsPct ?? 0), 0) / bundles.length
      : 0,
    customerSaved: bundles.reduce((s, b) => s + Number(b.savings ?? 0) * Number(b.soldCount ?? 0), 0),
  }), [bundles]);

  const exportCsv = () => {
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Bundle Deals`],
      [new Date().toLocaleString('en-PK')],
      [],
      ['KHULASA'],
      ['Kul bundles', String(counts.all)],
      ['Chalu', String(counts.active)],
      ['Khaas', String(counts.featured)],
      ['Kul bikay', String(stats.totalSold)],
      ['Bundles se bikri', String(Math.round(stats.totalRevenue))],
      ['Customers ki bachat', String(Math.round(stats.customerSaved))],
      [],
      ['Bundle', 'Halat', 'Khaas', 'Items', 'Asal qeemat', 'Bundle qeemat', 'Bachat', 'Bachat %', 'Bikay', 'Bikri'],
      ...list.map((b) => [
        b.name,
        b.isActive ? 'Chalu' : 'Band',
        b.isFeatured ? 'HAAN' : '',
        String((b.items ?? []).length),
        String(Math.round(b.originalPrice ?? 0)),
        String(Math.round(b.bundlePrice ?? 0)),
        String(Math.round(b.savings ?? 0)),
        Number(b.savingsPct ?? 0).toFixed(1),
        String(b.soldCount ?? 0),
        String(Math.round(b.totalRevenue ?? 0)),
      ]),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bundles-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  return (
    <div className="space-y-5 pb-10 print:space-y-3">
      <PrintStyles orientation="portrait" title="Bundle Deals" subtitle="Combo offers ki list" />
      {showTeacher && <BundlesTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/25 blur-3xl animate-pulse" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <Gift className="h-3.5 w-3.5 text-amber-300" /> Bundle Deals
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎁 Combo Bana Kar Bechein</h1>
              <p className="mt-2 text-sm text-white/85 font-semibold">
                "Headphone + Case + Charger" — sath bechne se ek hi customer se zyada bikri
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap print:hidden">
              <button onClick={() => setShowTeacher(true)}
                className="h-11 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition" title="Guide (G)">
                <GraduationCap className="h-4 w-4" /> Guide
              </button>
              <button onClick={() => setShowShortcuts(true)}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 inline-flex items-center justify-center backdrop-blur transition" title="Shortcuts (?)">
                <Keyboard className="h-4 w-4" />
              </button>
              <button onClick={() => refetch()} disabled={isRefetching}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition disabled:opacity-50" title="Refresh (R)">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={exportCsv}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition">
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </button>
              <button onClick={() => window.print()}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition">
                <Printer className="h-4 w-4" /> Print
              </button>
              <Link to="/electronics/bundles/new"
                className="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition">
                <Plus className="h-4 w-4" /> Naya Bundle
              </Link>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroStat label="Chalu Bundles" value={String(counts.active)} icon={Gift} highlight
              sub={`${counts.featured} khaas`} />
            <HeroStat label="Kul Bikay" value={String(stats.totalSold)} icon={TrendingUp} sub="bundles" />
            <HeroStat label="Bundles Se Bikri" value={formatPKR(stats.totalRevenue)} icon={Wallet} />
            <HeroStat label="Aam Bachat" value={`${stats.avgSavings.toFixed(1)}%`} icon={Percent}
              sub={stats.customerSaved > 0 ? `${formatPKR(stats.customerSaved)} customers ne bachaye` : 'customer ke liye'} />
          </div>
        </div>
      </section>

      {/* ═══ FILTERS ═══ */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex gap-1.5 flex-wrap">
          {([
            { v: 'active', label: 'Chalu', icon: CheckCircle2, n: counts.active },
            { v: 'all', label: 'Sab', icon: Layers, n: counts.all },
            { v: 'featured', label: 'Khaas', icon: Star, n: counts.featured },
            { v: 'off', label: 'Band', icon: EyeOff, n: counts.off },
          ] as { v: Tab; label: string; icon: any; n: number }[]).map((k, i) => (
            <button key={k.v} onClick={() => setTab(k.v)} title={`Shortcut: ${i + 1}`}
              className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                tab === k.v ? 'bg-gradient-to-r from-pink-600 to-rose-700 text-white border-transparent shadow'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-pink-300'
              }`}>
              <k.icon className="h-3.5 w-3.5" /> {k.label}
              <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === k.v ? 'bg-black/20' : 'bg-slate-100'}`}>{k.n}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Bundle ya product ka naam... (/)"
            className="h-10 w-full sm:w-72 rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-pink-500 transition" />
        </div>
      </div>

      {/* ═══ GRID ═══ */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-80 rounded-2xl bg-slate-200 animate-pulse" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-12 text-center shadow-sm">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center">
            <Gift className="h-10 w-10 text-pink-600" />
          </div>
          <h3 className="mt-4 font-extrabold text-slate-900 text-lg">
            {search || tab !== 'active' ? 'Kuch nahi mila' : 'Abhi koi bundle nahi bana'}
          </h3>
          <p className="text-sm font-semibold text-slate-500 mt-1.5 max-w-md mx-auto">
            Combo banane se ek customer se zyada saman bikta hai. Jaise headphone ke sath
            case aur charger — thora sasta kar dein, dono ka faida.
          </p>
          <Link to="/electronics/bundles/new"
            className="mt-4 inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-700 text-white text-sm font-extrabold shadow-lg transition">
            <Plus className="h-4 w-4" /> Pehla Bundle Banayein
          </Link>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {list.map((b) => (
            <BundleCard key={b.id} bundle={b}
              busy={toggleFlag.isPending || duplicate.isPending}
              onToggleActive={() => toggleFlag.mutate({ id: b.id, patch: { isActive: !b.isActive } })}
              onToggleFeatured={() => toggleFlag.mutate({ id: b.id, patch: { isFeatured: !b.isFeatured } })}
              onDuplicate={() => duplicate.mutate(b)}
              onDelete={() => { if (confirm(`"${b.name}" delete karein?`)) remove.mutate(b.id); }} />
          ))}
        </section>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   BUNDLE CARD
   ═════════════════════════════════════════════════════════════ */

function BundleCard({ bundle: b, busy, onToggleActive, onToggleFeatured, onDuplicate, onDelete }: {
  bundle: ElectronicsBundle; busy: boolean;
  onToggleActive: () => void; onToggleFeatured: () => void;
  onDuplicate: () => void; onDelete: () => void;
}) {
  const items = b.items ?? [];
  const expired = b.validUntil ? new Date(b.validUntil).getTime() < Date.now() : false;
  const noSaving = (b.savings ?? 0) <= 0;

  return (
    <div className={`group relative rounded-2xl bg-white border-2 shadow-sm hover:shadow-xl transition overflow-hidden ${
      !b.isActive ? 'border-slate-200 opacity-70'
        : b.isFeatured ? 'border-amber-400 ring-2 ring-amber-100'
        : 'border-slate-200 hover:border-pink-300'
    }`}>
      {/* Image */}
      <div className="relative aspect-video bg-gradient-to-br from-pink-500 via-rose-600 to-red-600 overflow-hidden">
        {b.imageUrl ? (
          <img src={b.imageUrl} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Gift className="h-14 w-14 text-white/40" /></div>
        )}

        {(b.savingsPct ?? 0) > 0 && (
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-extrabold shadow-lg">
            {Number(b.savingsPct).toFixed(0)}% SASTA
          </div>
        )}

        <button onClick={onToggleFeatured} disabled={busy} title={b.isFeatured ? 'Khaas se hatao' : 'Khaas banao'}
          className={`absolute top-2 right-2 h-8 w-8 rounded-lg flex items-center justify-center shadow transition disabled:opacity-50 ${
            b.isFeatured ? 'bg-amber-500 text-white' : 'bg-white/90 text-slate-500 hover:bg-white'
          }`}>
          <Star className={`h-4 w-4 ${b.isFeatured ? 'fill-white' : ''}`} />
        </button>

        {!b.isActive && (
          <div className="absolute inset-x-0 bottom-0 py-1.5 bg-slate-900/80 text-center text-[11px] font-extrabold text-white backdrop-blur">
            Band hai — POS par nazar nahi aata
          </div>
        )}
      </div>

      <div className="p-3 space-y-2.5">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm truncate" title={b.name}>{b.name}</h3>
          {b.description && <p className="text-[11px] font-semibold text-slate-500 line-clamp-2 mt-0.5">{b.description}</p>}
        </div>

        {(expired || noSaving) && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1.5 flex items-start gap-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
            <span className="text-[10px] font-bold text-amber-800">
              {expired ? 'Is deal ki tareekh guzar chuki hai' : 'Is bundle me koi bachat nahi — customer ko faida nahi'}
            </span>
          </div>
        )}

        {/* Items */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">
            {items.length} cheezein
          </div>
          <div className="space-y-0.5">
            {items.slice(0, 3).map((it: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px]">
                <Package className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                <span className="font-bold text-slate-700 truncate flex-1">{it.product?.name ?? it.name ?? 'Product'}</span>
                <span className="text-slate-500 font-bold shrink-0">× {it.quantity}</span>
              </div>
            ))}
            {items.length > 3 && (
              <div className="text-[10px] font-extrabold text-pink-700">+ {items.length - 3} aur</div>
            )}
            {items.length === 0 && (
              <div className="text-[10px] font-bold text-rose-600">⚠️ Koi cheez nahi — edit karke daalein</div>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            {(b.originalPrice ?? 0) > (b.bundlePrice ?? 0) && (
              <div className="text-[11px] text-slate-400 line-through font-bold tabular-nums">
                {formatPKR(b.originalPrice)}
              </div>
            )}
            <div className="text-lg font-extrabold text-emerald-700 tabular-nums leading-none">
              {formatPKR(b.bundlePrice)}
            </div>
            {(b.savings ?? 0) > 0 && (
              <div className="text-[10px] font-extrabold text-amber-700 mt-0.5">
                {formatPKR(b.savings)} ki bachat
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase font-extrabold text-slate-500">Bikay</div>
            <div className="text-lg font-extrabold text-slate-900 tabular-nums leading-none">{b.soldCount ?? 0}</div>
            {(b.totalRevenue ?? 0) > 0 && (
              <div className="text-[10px] font-bold text-slate-500 tabular-nums">{formatPKR(b.totalRevenue!)}</div>
            )}
          </div>
        </div>

        {b.validUntil && (
          <div className="text-[10px] font-bold text-slate-500 inline-flex items-center gap-1">
            <CalendarClock className="h-2.5 w-2.5" />
            {new Date(b.validUntil).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })} tak
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1.5 pt-2 border-t-2 border-slate-100 print:hidden">
          <Link to={`/electronics/bundles/${b.id}/edit`}
            className="flex-1 h-9 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-extrabold inline-flex items-center justify-center gap-1 transition">
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </Link>
          <button onClick={onToggleActive} disabled={busy} title={b.isActive ? 'Band karein' : 'Chalu karein'}
            className={`h-9 w-9 rounded-lg flex items-center justify-center transition disabled:opacity-50 ${
              b.isActive ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
            }`}>
            {b.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onDuplicate} disabled={busy} title="Copy banayein"
            className="h-9 w-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center transition disabled:opacity-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onDelete} title="Delete"
            className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function HeroStat({ label, value, sub, icon: Icon, highlight }: any) {
  return (
    <div className={`rounded-2xl backdrop-blur border p-4 ${
      highlight ? 'bg-white/25 border-white/40 shadow-lg' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
        <Icon className="h-3.5 w-3.5" /> <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums truncate">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-bold text-white/70 truncate">{sub}</div>}
    </div>
  );
}

function BundlesTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: Gift, title: 'Bundle hota kya hai',
      body: 'Do ya zyada cheezein sath bech dena — thori si kam qeemat par. Jaise headphone (3000) + case (500) + charger (800) = 4300 ka saman 3900 me. Customer ko bachat lagti hai, dukan ka 3 cheezon ka saman ek sale me nikal jata hai.',
      tips: ['Sasti cheezein mehngi ke sath lagayein — wohi asal me bikti hain'],
    },
    {
      icon: Star, title: 'Khaas (Featured) bundles',
      body: 'Star dabane se bundle "khaas" ho jata hai — POS aur catalog dono par sab se upar aata hai. Jo deal aap zyada bechna chahte hain usay khaas kar dein.',
      tips: ['Star card ki tasveer par upar dain jaanib hai'],
    },
    {
      icon: Eye, title: 'Chalu aur band',
      body: 'Aankh wala button bundle ko chalu ya band karta hai. Band bundle POS par nazar nahi aata — deal khatam ho jaye to delete karne ke bajaye band kar dein, baad me phir chalu ho sakti hai.',
      tips: ['Copy hamesha band halat me banti hai — galti se live na ho'],
    },
    {
      icon: TrendingUp, title: 'Kaunsa bundle chal raha hai',
      body: 'Har card par likha hota hai kitne bikay aur kitni bikri hui. Jo bundle nahi chal raha uski qeemat badal kar dekhein, ya band kar dein.',
      tips: ['CSV me poora hisab Excel ke liye', 'P dabao to print'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold">Guide</div>
              <h3 className="font-extrabold text-slate-900">Bundle Deals</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-600 to-rose-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <st.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900">{st.title}</div>
                <div className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">{st.body}</div>
                <ul className="mt-2 space-y-1">
                  {st.tips.map((tp, j) => (
                    <li key={j} className="text-[11px] font-semibold text-slate-500 flex items-start gap-1.5">
                      <Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-0.5" /> {tp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 text-right shrink-0">
          <Button onClick={onClose} className="bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold shadow-lg">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const sc = [
    ['1 – 4', 'Tab badlein'], ['/', 'Search par jao'], ['G', 'Guide kholo'],
    ['R', 'Refresh'], ['P', 'Print'], ['?', 'Ye list'], ['Esc', 'Band karo'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-900">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {sc.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">{desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 border-2 border-slate-200 font-mono text-xs font-extrabold text-slate-700">{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
