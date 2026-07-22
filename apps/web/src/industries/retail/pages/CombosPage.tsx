import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles, Plus, Search, X, Star, StarOff, Edit3, Trash2,
  Package, Tag, Percent, Calendar, TrendingUp, Eye, RefreshCw,
  AlertCircle, Award, ArrowRight,
} from 'lucide-react';
import { combosApi, type ProductCombo } from '../api/combos.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

export default function CombosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const { data: combos = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['retail-combos', statusFilter, featuredOnly, search],
    queryFn: () => combosApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      featured: featuredOnly ? true : undefined,
      search: search.trim() || undefined,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => combosApi.remove(id),
    onSuccess: () => {
      toast.success('Combo deleted');
      queryClient.invalidateQueries({ queryKey: ['retail-combos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: (id: string) => combosApi.toggleFeatured(id),
    onSuccess: () => {
      toast.success('Featured toggled');
      queryClient.invalidateQueries({ queryKey: ['retail-combos'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-pink-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Retail Combos
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🎁 Combo Deals
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Bundles banao — customers ko value do, aap ko volume
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
            <Link to="/retail/combos/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                Naya Combo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500"
              placeholder="Search combo name, barcode, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="inline-flex rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm overflow-hidden">
            {['all', 'ACTIVE', 'INACTIVE', 'DRAFT', 'EXPIRED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={
                  'px-3 py-2.5 text-xs font-extrabold transition ' +
                  (statusFilter === s
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-700')
                }
              >
                {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => setFeaturedOnly(!featuredOnly)}
            className={
              'h-11 px-4 rounded-xl border-2 font-bold text-sm inline-flex items-center gap-2 transition ' +
              (featuredOnly
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 dark:text-slate-300 hover:border-amber-300')
            }
          >
            <Star className={'h-4 w-4 ' + (featuredOnly ? 'fill-current' : '')} />
            Featured
          </button>
        </div>
      </section>

      {/* COMBOS GRID */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : combos.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-slate-100 dark:bg-neutral-800 mx-auto flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No combos yet</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">
            Ek naya combo banao aur customers ko value do
          </p>
          <Link to="/retail/combos/new">
            <Button className="mt-4 bg-gradient-to-r from-violet-600 to-purple-700">
              <Plus className="h-4 w-4" />
              Naya Combo Banao
            </Button>
          </Link>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {combos.map((combo) => (
            <ComboCard
              key={combo.id}
              combo={combo}
              onToggleFeatured={() => toggleFeaturedMutation.mutate(combo.id)}
              onDelete={() => {
                if (confirm('Combo "' + combo.name + '" delete karein?')) {
                  removeMutation.mutate(combo.id);
                }
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function ComboCard({ combo, onToggleFeatured, onDelete }: {
  combo: ProductCombo;
  onToggleFeatured: () => void;
  onDelete: () => void;
}) {
  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400',
    INACTIVE: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-neutral-800 dark:text-slate-400',
    DRAFT: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400',
    EXPIRED: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400',
  };

  return (
    <div className={
      'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden ' +
      (combo.isFeatured ? 'border-amber-400 ring-2 ring-amber-100 dark:ring-amber-900/40' : 'border-slate-200 dark:border-neutral-800')
    }>
      {/* Image or gradient */}
      <div className="relative aspect-video bg-gradient-to-br from-violet-500 via-purple-600 to-pink-600 overflow-hidden">
        {combo.imageUrl ? (
          <img src={combo.imageUrl} alt={combo.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="h-16 w-16 text-white/40" />
          </div>
        )}

        {combo.tagLine && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-white/90 backdrop-blur text-[10px] font-extrabold text-violet-700 uppercase tracking-wider shadow">
            {combo.tagLine}
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={onToggleFeatured}
            className={
              'h-8 w-8 rounded-lg backdrop-blur flex items-center justify-center transition ' +
              (combo.isFeatured
                ? 'bg-amber-500 text-white shadow'
                : 'bg-white/90 text-slate-600 hover:bg-white')
            }
            title={combo.isFeatured ? 'Remove featured' : 'Mark featured'}
          >
            {combo.isFeatured ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
          </button>
        </div>

        {combo.savingsPercentage > 0 && (
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-extrabold shadow-lg">
            SAVE {combo.savingsPercentage.toFixed(0)}%
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base truncate">{combo.name}</h3>
            {combo.description && (
              <p className="text-xs text-slate-500 font-semibold mt-0.5 line-clamp-2">{combo.description}</p>
            )}
          </div>
          <span className={
            'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border shrink-0 ' +
            statusColors[combo.status]
          }>
            {combo.status}
          </span>
        </div>

        {/* Items preview */}
        <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/50 p-2.5 border border-slate-100 dark:border-neutral-800">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">
            Contains ({combo.items.length} items)
          </div>
          <div className="space-y-1">
            {combo.items.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <Package className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                <span className="font-bold text-slate-700 dark:text-slate-300 truncate">
                  {item.product?.name || 'Unknown'}
                </span>
                <span className="text-slate-400 font-bold ml-auto shrink-0">
                  × {item.quantity} {item.unitName || ''}
                </span>
              </div>
            ))}
            {combo.items.length > 3 && (
              <div className="text-[10px] font-extrabold text-violet-700">
                +{combo.items.length - 3} more items
              </div>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-end justify-between gap-2">
          <div>
            {combo.originalTotal > combo.comboPrice && (
              <div className="text-xs text-slate-500 line-through font-bold">
                {formatPKR(combo.originalTotal)}
              </div>
            )}
            <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
              {formatPKR(combo.comboPrice)}
            </div>
            {combo.savingsAmount > 0 && (
              <div className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">
                Save {formatPKR(combo.savingsAmount)}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Sold</div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
              {combo.soldCount}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Link
            to={'/retail/combos/' + combo.id + '/edit'}
            className="flex-1 h-9 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-300 text-xs font-extrabold inline-flex items-center justify-center gap-1 transition"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Link>
          <button
            onClick={onDelete}
            className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center transition"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
