import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles, Plus, Search, X, Star, StarOff, Edit3, Trash2,
  Package, Percent, TrendingUp, RefreshCw, Grid3x3, List,
  ShoppingBag, Award, Copy, Filter, Download, Zap, Eye,
} from 'lucide-react';
import { combosApi, type ProductCombo } from '../api/combos.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';

type ViewMode = 'grid' | 'table';

export default function CombosPage() {
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [view, setView] = useState<ViewMode>('grid');

  const { data: combos = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['retail-combos', statusFilter, featuredOnly, search],
    queryFn: () => combosApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      featured: featuredOnly ? true : undefined,
      search: search.trim() || undefined,
    }),
  });

  const stats = useMemo(() => {
    const active = combos.filter((c) => c.status === 'ACTIVE');
    const totalRevenue = combos.reduce((a, c) => a + Number(c.totalRevenue || 0), 0);
    const totalSold = combos.reduce((a, c) => a + Number(c.soldCount || 0), 0);
    const avgSaving = combos.length > 0 ? combos.reduce((a, c) => a + c.savingsPercentage, 0) / combos.length : 0;
    return {
      total: combos.length,
      active: active.length,
      featured: combos.filter((c) => c.isFeatured).length,
      totalRevenue,
      totalSold,
      avgSaving,
    };
  }, [combos]);

  const removeMutation = useMutation({
    mutationFn: (id: string) => combosApi.remove(id),
    onSuccess: () => {
      toast.success('Combo delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['retail-combos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail hua'),
  });

  const toggleFeatured = useMutation({
    mutationFn: (id: string) => combosApi.toggleFeatured(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-combos'] });
    },
  });

  const duplicate = useMutation({
    mutationFn: async (combo: ProductCombo) => {
      const payload = {
        name: `${combo.name} (Copy)`,
        description: combo.description,
        imageUrl: combo.imageUrl,
        categoryId: combo.categoryId,
        comboPrice: combo.comboPrice,
        status: 'DRAFT' as const,
        tagLine: combo.tagLine,
        isFeatured: false,
        items: combo.items.map((it) => ({
          productId: it.productId,
          variantId: it.variantId,
          quantity: it.quantity,
          unitName: it.unitName,
          originalPrice: it.originalPrice,
        })),
      };
      return combosApi.create(payload as any);
    },
    onSuccess: () => {
      toast.success('Combo duplicate ho gaya (draft me)');
      queryClient.invalidateQueries({ queryKey: ['retail-combos'] });
    },
  });

  return (
    <div className="space-y-5">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-pink-400/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Retail Combos
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎁 Combo Deals</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.total} combos • {stats.active} active • {stats.totalSold} bike • Revenue{' '}
              <strong className="text-emerald-300">{formatPKR(stats.totalRevenue)}</strong>
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
            <PrivacyToggle />
            <Link
              to="/retail/combos/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 px-5 py-2.5 text-sm font-extrabold shadow-lg"
            >
              <Plus className="h-4 w-4" /> Naya Combo
            </Link>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={ShoppingBag} label="Total Combos" value={stats.total} sub={`${stats.active} active`} tone="violet" />
        <Kpi icon={Star} label="Featured" value={stats.featured} sub="Highlighted deals" tone="amber" onClick={() => setFeaturedOnly(!featuredOnly)} />
        <Kpi icon={TrendingUp} label="Combos Sold" value={stats.totalSold} sub={`${formatPKR(stats.totalRevenue)} revenue`} tone="emerald" />
        <Kpi icon={Percent} label="Avg Savings" value={`${stats.avgSaving.toFixed(0)}%`} sub="Customer bachat" tone="pink" />
      </section>

      {/* TOOLBAR */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Combo name, barcode, SKU..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="inline-flex rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`px-4 h-12 text-xs font-extrabold transition ${view === 'grid' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-4 h-12 text-xs font-extrabold transition border-l-2 border-slate-200 ${view === 'table' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap items-center">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {[
              { v: 'all', l: 'Sab' },
              { v: 'ACTIVE', l: 'Active' },
              { v: 'DRAFT', l: 'Draft' },
              { v: 'INACTIVE', l: 'Off' },
              { v: 'EXPIRED', l: 'Expired' },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setStatusFilter(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  statusFilter === o.v ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <button
            onClick={() => setFeaturedOnly(!featuredOnly)}
            className={[
              'h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition',
              featuredOnly ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300',
            ].join(' ')}
          >
            <Star className={`h-3.5 w-3.5 ${featuredOnly ? 'fill-current' : ''}`} />
            Sirf Featured
          </button>
          <div className="ml-auto text-xs font-extrabold text-slate-500">
            {combos.length} combos
          </div>
        </div>
      </section>

      {/* CONTENT */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 rounded-3xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : combos.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-200 mx-auto flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-violet-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900">Abhi koi combo nahi</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">
            2+ products ka bundle banao, customer ko bachat do, aap ka average bill barhega
          </p>
          <Link to="/retail/combos/new">
            <Button className="mt-4 bg-gradient-to-r from-violet-600 to-purple-700">
              <Plus className="h-4 w-4" /> Pehla Combo Banao
            </Button>
          </Link>
        </div>
      ) : view === 'grid' ? (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {combos.map((combo) => (
            <ComboCard
              key={combo.id}
              combo={combo}
              hideCost={hideCost}
              onToggleFeatured={() => toggleFeatured.mutate(combo.id)}
              onDuplicate={() => duplicate.mutate(combo)}
              onDelete={() => {
                if (confirm(`Combo "${combo.name}" delete karein?`)) {
                  removeMutation.mutate(combo.id);
                }
              }}
            />
          ))}
        </section>
      ) : (
        <ComboTable
          combos={combos}
          hideCost={hideCost}
          onToggleFeatured={(id) => toggleFeatured.mutate(id)}
          onDelete={(c) => {
            if (confirm(`Combo "${c.name}" delete karein?`)) removeMutation.mutate(c.id);
          }}
          onDuplicate={(c) => duplicate.mutate(c)}
        />
      )}
    </div>
  );
}

/* ══════════ CARD ══════════ */
function ComboCard({ combo, hideCost, onToggleFeatured, onDuplicate, onDelete }: {
  combo: ProductCombo;
  hideCost: boolean;
  onToggleFeatured: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    INACTIVE: { bg: 'bg-slate-200', text: 'text-slate-600' },
    DRAFT: { bg: 'bg-amber-100', text: 'text-amber-700' },
    EXPIRED: { bg: 'bg-rose-100', text: 'text-rose-700' },
  };
  const sc = statusColors[combo.status];

  return (
    <div className={[
      'group relative rounded-2xl bg-white border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden',
      combo.isFeatured ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200',
    ].join(' ')}>
      {/* Image */}
      <div className="relative aspect-video bg-gradient-to-br from-violet-500 via-purple-600 to-pink-600 overflow-hidden">
        {combo.imageUrl ? (
          <img src={combo.imageUrl} alt={combo.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="h-16 w-16 text-white/40" />
          </div>
        )}
        {combo.tagLine && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-white/95 backdrop-blur text-[10px] font-extrabold text-violet-700 uppercase tracking-wider shadow">
            {combo.tagLine}
          </div>
        )}
        <button
          onClick={onToggleFeatured}
          className={[
            'absolute top-2 right-2 h-8 w-8 rounded-lg backdrop-blur flex items-center justify-center transition',
            combo.isFeatured ? 'bg-amber-500 text-white shadow' : 'bg-white/90 text-slate-600 hover:bg-white',
          ].join(' ')}
          title={combo.isFeatured ? 'Featured hataao' : 'Featured banao'}
        >
          {combo.isFeatured ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
        </button>
        {combo.savingsPercentage > 0 && (
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-extrabold shadow-lg">
            {combo.savingsPercentage.toFixed(0)}% BACHAT
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold text-slate-900 text-sm truncate flex-1">{combo.name}</h3>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${sc.bg} ${sc.text} shrink-0`}>
            {combo.status}
          </span>
        </div>

        {/* Items preview */}
        <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">
            {combo.items.length} items
          </div>
          <div className="space-y-0.5">
            {combo.items.slice(0, 2).map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px]">
                <Package className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                <span className="font-bold text-slate-700 truncate flex-1">{item.product?.name || '—'}</span>
                <span className="text-slate-500 font-bold shrink-0">× {item.quantity}</span>
              </div>
            ))}
            {combo.items.length > 2 && (
              <div className="text-[10px] font-extrabold text-violet-700">+ {combo.items.length - 2} aur</div>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-end justify-between gap-2">
          <div>
            {combo.originalTotal > combo.comboPrice && (
              <div className="text-xs text-slate-400 line-through font-bold">
                {formatPKR(combo.originalTotal)}
              </div>
            )}
            <div className="text-lg font-extrabold text-emerald-700 tabular-nums leading-none">
              {formatPKR(combo.comboPrice)}
            </div>
            {combo.savingsAmount > 0 && (
              <div className="text-[10px] font-extrabold text-amber-700 mt-0.5">
                Save {formatPKR(combo.savingsAmount)}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Bike</div>
            <div className="text-lg font-extrabold text-slate-900 tabular-nums">{combo.soldCount}</div>
            {!hideCost && Number(combo.totalRevenue) > 0 && (
              <div className="text-[10px] font-bold text-slate-500">{formatPKR(combo.totalRevenue)}</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 pt-2 border-t border-slate-100">
          <Link
            to={`/retail/combos/${combo.id}/edit`}
            className="flex-1 h-9 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-extrabold inline-flex items-center justify-center gap-1 transition"
          >
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </Link>
          <button
            onClick={onDuplicate}
            title="Duplicate"
            className="h-9 w-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center transition"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════ TABLE ══════════ */
function ComboTable({ combos, hideCost, onToggleFeatured, onDelete, onDuplicate }: {
  combos: ProductCombo[];
  hideCost: boolean;
  onToggleFeatured: (id: string) => void;
  onDelete: (c: ProductCombo) => void;
  onDuplicate: (c: ProductCombo) => void;
}) {
  return (
    <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b-2 border-slate-200">
            <tr>
              <Th>Combo</Th>
              <Th>Items</Th>
              <Th className="text-right">Individual</Th>
              <Th className="text-right">Combo</Th>
              <Th className="text-right">Bachat</Th>
              <Th className="text-right">Bike</Th>
              {!hideCost && <Th className="text-right">Revenue</Th>}
              <Th className="text-center">Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {combos.map((c: ProductCombo) => (
              <tr key={c.id} className="hover:bg-violet-50/40 transition">
                <td className="px-3 py-2.5">
                  <Link to={`/retail/combos/${c.id}/edit`} className="flex items-center gap-2.5 group">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <Sparkles className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-slate-900 truncate group-hover:text-violet-700">{c.name}</span>
                        {c.isFeatured && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                      </div>
                      {c.tagLine && <div className="text-[10px] font-extrabold text-violet-700 uppercase">{c.tagLine}</div>}
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <div className="text-xs font-bold text-slate-700">{c.items.length} products</div>
                  <div className="text-[10px] text-slate-500 font-bold truncate max-w-[150px]">
                    {c.items.slice(0, 2).map((it) => it.product?.name).filter(Boolean).join(', ')}
                    {c.items.length > 2 && ` +${c.items.length - 2}`}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-500 tabular-nums line-through">
                  {formatPKR(c.originalTotal)}
                </td>
                <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 tabular-nums">
                  {formatPKR(c.comboPrice)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="font-extrabold text-amber-700 tabular-nums text-xs">{formatPKR(c.savingsAmount)}</div>
                  <div className="text-[10px] font-bold text-amber-600">{c.savingsPercentage.toFixed(1)}%</div>
                </td>
                <td className="px-3 py-2.5 text-right font-extrabold text-slate-900 tabular-nums">{c.soldCount}</td>
                {!hideCost && <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 tabular-nums">{formatPKR(c.totalRevenue)}</td>}
                <td className="px-3 py-2.5 text-center">
                  <StatusPill status={c.status} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onToggleFeatured(c.id)}
                      title="Featured toggle"
                      className={`h-8 w-8 rounded-lg flex items-center justify-center ${c.isFeatured ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:bg-amber-50'}`}
                    >
                      <Star className={`h-3.5 w-3.5 ${c.isFeatured ? 'fill-current' : ''}`} />
                    </button>
                    <Link to={`/retail/combos/${c.id}/edit`} title="Edit" className="h-8 w-8 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 flex items-center justify-center">
                      <Edit3 className="h-3.5 w-3.5" />
                    </Link>
                    <button onClick={() => onDuplicate(c)} title="Duplicate" className="h-8 w-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onDelete(c)} title="Delete" className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* Helpers */
function Th({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 ${className}`}>{children}</th>;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    DRAFT: 'bg-amber-100 text-amber-700',
    INACTIVE: 'bg-slate-200 text-slate-600',
    EXPIRED: 'bg-rose-100 text-rose-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${map[status]}`}>{status}</span>;
}

function Kpi({ icon: Icon, label, value, sub, tone, onClick }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-700 shadow-violet-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    pink: 'from-pink-500 to-rose-600 shadow-pink-500/30',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full',
        onClick ? 'hover:border-violet-300 hover:shadow-md transition' : '',
      ].join(' ')}
    >
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
    </Comp>
  );
}
