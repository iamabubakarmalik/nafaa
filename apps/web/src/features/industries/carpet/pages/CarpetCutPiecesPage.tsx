import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Scissors, Layers, Ruler, MapPin, X, ChevronLeft, ChevronRight,
  Filter, SortAsc, Sparkles, Grid3x3, List as ListIcon, TrendingUp,
  DollarSign, Package, AlertTriangle, CheckCircle2, Award, Trash2,
  Edit3, Save, ArrowLeft, BarChart3, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR, formatPKRFull } from '@/lib/format';
import {
  carpetCutPiecesApi,
  type CutPiecesListParams,
  type CarpetCutPieceStatus,
} from '../api/carpet-cut-pieces.api';

const statusConfig: Record<CarpetCutPieceStatus, { label: string; color: string; icon: any }> = {
  AVAILABLE: { label: 'Available', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  SOLD: { label: 'Sold', color: 'bg-violet-100 text-violet-700 border-violet-300', icon: Award },
  DAMAGED: { label: 'Damaged', color: 'bg-rose-100 text-rose-700 border-rose-300', icon: AlertTriangle },
  RESERVED: { label: 'Reserved', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: Package },
};

type ViewMode = 'grid' | 'list';
type SortBy = 'newest' | 'largest' | 'smallest' | 'cheapest' | 'expensive';

export default function CarpetCutPiecesPage() {
  const queryClient = useQueryClient();

  const [params, setParams] = useState<CutPiecesListParams>({
    page: 1,
    limit: 24,
  });
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [editPiece, setEditPiece] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ['carpet-cut-pieces', params],
    queryFn: () => carpetCutPiecesApi.list(params),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => carpetCutPiecesApi.remove(id),
    onSuccess: () => {
      toast.success('Cut piece deleted');
      queryClient.invalidateQueries({ queryKey: ['carpet-cut-pieces'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  // ─── Sorted items ────────────────────────────────────────
  const items = useMemo(() => {
    let list = data?.items ?? [];
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'largest':
          return Number(b.totalSqft) - Number(a.totalSqft);
        case 'smallest':
          return Number(a.totalSqft) - Number(b.totalSqft);
        case 'cheapest':
          return Number(a.salePrice) - Number(b.salePrice);
        case 'expensive':
          return Number(b.salePrice) - Number(a.salePrice);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return list;
  }, [data?.items, sortBy]);

  // ─── Analytics ───────────────────────────────────────────
  const stats = useMemo(() => {
    const all = data?.items ?? [];
    const available = all.filter((p) => p.status === 'AVAILABLE');
    const sold = all.filter((p) => p.status === 'SOLD');
    const damaged = all.filter((p) => p.status === 'DAMAGED');
    return {
      totalPieces: all.length,
      availableCount: available.length,
      soldCount: sold.length,
      damagedCount: damaged.length,
      availableSqft: available.reduce((s, p) => s + Number(p.totalSqft), 0),
      availableValue: available.reduce((s, p) => s + Number(p.salePrice), 0),
      soldValue: sold.reduce((s, p) => s + Number(p.salePrice), 0),
    };
  }, [data?.items]);

  return (
    <div className="space-y-5">
      {editPiece && (
        <EditCutPieceModal
          piece={editPiece}
          onClose={() => setEditPiece(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['carpet-cut-pieces'] });
            setEditPiece(null);
          }}
        />
      )}

      {/* ═══════════════ HERO HEADER ═══════════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-pink-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Scissors className="h-3.5 w-3.5 text-amber-300" />
              Carpet Cut Pieces
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Cut Pieces Inventory</h1>
            <p className="mt-2 text-sm text-white/80 max-w-xl">
              Bachay hue tukray, customer returns, leftover pieces — discount par bechain ya damaged stock manage karein
            </p>
          </div>

          <Link to="/carpet-rolls">
            <Button variant="secondary" className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border border-white/20">
              <ArrowLeft className="h-4 w-4" /> Back to Rolls
            </Button>
          </Link>
        </div>

        {/* KPI Grid */}
        <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          <KpiTile label="Total Pieces" value={stats.totalPieces} icon={Package} tone="violet" />
          <KpiTile label="Available" value={stats.availableCount} sub={`${stats.availableSqft.toFixed(0)} sqft`} icon={CheckCircle2} tone="emerald" />
          <KpiTile label="Sold" value={stats.soldCount} sub={formatPKRFull(stats.soldValue)} icon={Award} tone="blue" />
          <KpiTile label="Damaged" value={stats.damagedCount} icon={AlertTriangle} tone="rose" />
          <KpiTile label="Stock Value" value={formatPKRFull(stats.availableValue)} sub="available" icon={TrendingUp} tone="amber" />
        </div>
      </section>

      {/* ═══════════════ SEARCH + CONTROLS ═══════════════ */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition"
              placeholder="Search by piece code, product name..."
              value={params.search ?? ''}
              onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
            />
            {params.search && (
              <button onClick={() => setParams({ ...params, search: '', page: 1 })} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center">
                <X className="h-3.5 w-3.5 text-slate-500" />
              </button>
            )}
          </div>

          <select
            className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-extrabold focus:outline-none focus:border-violet-500"
            value={params.status ?? ''}
            onChange={(e) => setParams({ ...params, status: (e.target.value || undefined) as any, page: 1 })}
          >
            <option value="">All status</option>
            {(Object.entries(statusConfig) as [CarpetCutPieceStatus, any][]).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-extrabold focus:outline-none focus:border-violet-500"
          >
            <option value="newest">Newest first</option>
            <option value="largest">Largest size</option>
            <option value="smallest">Smallest size</option>
            <option value="cheapest">Cheapest</option>
            <option value="expensive">Most expensive</option>
          </select>

          <div className="inline-flex rounded-xl border-2 border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 h-11 text-xs font-extrabold transition ${
                viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
              title="Grid view"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 h-11 text-xs font-extrabold transition border-l-2 border-slate-200 ${
                viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
              title="List view"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Status quick filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setParams({ ...params, status: undefined, page: 1 })}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition ${
              !params.status ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="h-3 w-3" /> All
            <span className={`px-1.5 py-0.5 rounded text-[9px] ${!params.status ? 'bg-white/20' : 'bg-slate-200'}`}>
              {stats.totalPieces}
            </span>
          </button>
          {(Object.entries(statusConfig) as [CarpetCutPieceStatus, any][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const counts: Record<CarpetCutPieceStatus, number> = {
              AVAILABLE: stats.availableCount,
              SOLD: stats.soldCount,
              DAMAGED: stats.damagedCount,
              RESERVED: items.filter((p) => p.status === 'RESERVED').length,
            };
            const active = params.status === key;
            return (
              <button
                key={key}
                onClick={() => setParams({ ...params, status: key, page: 1 })}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition border ${
                  active ? cfg.color + ' shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent'
                }`}
              >
                <Icon className="h-3 w-3" /> {cfg.label}
                <span className={`px-1.5 py-0.5 rounded text-[9px] ${active ? 'bg-white/30' : 'bg-slate-200'}`}>
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══════════════ GRID / LIST ═══════════════ */}
      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-200 mx-auto flex items-center justify-center shadow-inner mb-4">
            <Scissors className="h-10 w-10 text-violet-600" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">No cut pieces found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {params.search || params.status
              ? 'Try different search or filter'
              : 'When you cut rolls with smaller customer width, leftover pieces auto-create here'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {items.map((piece) => (
            <CutPieceCard
              key={piece.id}
              piece={piece}
              onEdit={() => setEditPiece(piece)}
              onDelete={() => {
                if (confirm(`Delete piece ${piece.pieceCode}?`)) {
                  removeMutation.mutate(piece.id);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Piece #</th>
                  <th className="px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Product</th>
                  <th className="px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Size</th>
                  <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Sqft</th>
                  <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Price</th>
                  <th className="px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Source</th>
                  <th className="px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Location</th>
                  <th className="px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Status</th>
                  <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((piece) => {
                  const cfg = statusConfig[piece.status];
                  const Icon = cfg.icon;
                  const pricePerSqft = piece.totalSqft > 0 ? piece.salePrice / piece.totalSqft : 0;
                  return (
                    <tr key={piece.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-3 font-mono font-extrabold text-violet-700 text-xs">{piece.pieceCode}</td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-900 text-xs">{piece.product?.name}</div>
                        {piece.variant && (
                          <div className="text-[10px] text-violet-700 font-bold flex items-center gap-1">
                            {piece.variant.colorHex && (
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: piece.variant.colorHex }} />
                            )}
                            {piece.variant.name}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-[11px] font-bold text-slate-700">
                        {piece.widthFt}ft{Number(piece.widthInch || 0) > 0 ? ` ${piece.widthInch}in` : ''} × {piece.lengthFt}ft{Number(piece.lengthInch || 0) > 0 ? ` ${piece.lengthInch}in` : ''}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="font-extrabold text-violet-700 tabular-nums">{Number(piece.totalSqft).toFixed(2)}</div>
                        <div className="text-[9px] text-slate-500 font-bold">@ {formatPKR(pricePerSqft)}/sqft</div>
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-extrabold text-emerald-700">{formatPKRFull(piece.salePrice)}</td>
                      <td className="px-3 py-3">
                        {piece.sourceRoll ? (
                          <Link to={`/carpet-rolls/${piece.sourceRoll.id}`} className="font-mono text-[10px] font-bold text-emerald-700 hover:underline">
                            {piece.sourceRoll.rollNumber}
                          </Link>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[10px] text-slate-600">
                        {piece.rackNumber && <div className="font-bold inline-flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{piece.rackNumber}</div>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-extrabold ${cfg.color}`}>
                          <Icon className="h-2.5 w-2.5" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {piece.status !== 'SOLD' && (
                            <>
                              <button
                                onClick={() => setEditPiece(piece)}
                                className="h-7 w-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center"
                                title="Edit"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete piece ${piece.pieceCode}?`)) {
                                    removeMutation.mutate(piece.id);
                                  }
                                }}
                                className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAGINATION */}
      {data && data.meta.totalPages > 1 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
          <div className="text-sm text-slate-600 font-bold">
            Page <span className="text-slate-900">{data.meta.page}</span> of <span className="text-slate-900">{data.meta.totalPages}</span> • <span className="text-violet-700">{data.meta.total}</span> total pieces
          </div>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) - 1 })}
              className="h-9 px-3 rounded-lg border-2 border-slate-200 text-xs font-extrabold disabled:opacity-40 hover:bg-slate-50 inline-flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <button
              disabled={(params.page ?? 1) >= data.meta.totalPages}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) + 1 })}
              className="h-9 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold disabled:opacity-40 inline-flex items-center gap-1"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═════════════════════════════════════════════════════════════

function KpiTile({
  label, value, sub, icon: Icon, tone,
}: { label: string; value: string | number; sub?: string; icon: any; tone: string }) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    rose: 'from-rose-400/30 to-rose-600/20 border-rose-300/40',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-xl font-extrabold leading-none text-white tabular-nums">{value}</div>
      {sub && <div className="text-[10px] font-bold opacity-75 mt-0.5">{sub}</div>}
    </div>
  );
}

function CutPieceCard({
  piece, onEdit, onDelete,
}: {
  piece: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cfg = statusConfig[piece.status as CarpetCutPieceStatus];
  const Icon = cfg.icon;
  const pricePerSqft = piece.totalSqft > 0 ? piece.salePrice / piece.totalSqft : 0;

  return (
    <div className="group rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-violet-400 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-0.5 transition-all">
      <div className="px-3.5 py-2 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between">
        <div className="font-mono text-white font-extrabold text-xs">{piece.pieceCode}</div>
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[9px] font-extrabold ${cfg.color}`}>
          <Icon className="h-2.5 w-2.5" />
          {cfg.label}
        </span>
      </div>

      <div className="p-3 space-y-2.5">
        <div>
          <div className="font-extrabold text-slate-900 text-xs line-clamp-1 leading-tight">
            {piece.product?.name}
          </div>
          {piece.variant && (
            <div className="text-[10px] font-extrabold text-violet-700 flex items-center gap-1 mt-0.5">
              {piece.variant.colorHex && (
                <span className="h-2 w-2 rounded-full border border-white shadow-sm" style={{ backgroundColor: piece.variant.colorHex }} />
              )}
              {piece.variant.name}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 p-2.5">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <div className="font-extrabold text-violet-700 flex items-center gap-1">
              <Ruler className="h-2.5 w-2.5" /> Size
            </div>
            <div className="font-extrabold text-slate-900 text-[10px]">
              {piece.widthFt}ft{Number(piece.widthInch || 0) > 0 ? ` ${piece.widthInch}in` : ''} × {piece.lengthFt}ft{Number(piece.lengthInch || 0) > 0 ? ` ${piece.lengthInch}in` : ''}
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <div className="text-2xl font-extrabold text-violet-700 tabular-nums leading-none">
              {Number(piece.totalSqft).toFixed(2)}
            </div>
            <div className="text-[10px] font-extrabold text-violet-700">sqft</div>
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-[9px] uppercase font-extrabold text-emerald-700">Price</div>
            <div className="text-base font-extrabold text-emerald-700 tabular-nums leading-none">
              {formatPKRFull(piece.salePrice)}
            </div>
            <div className="text-[9px] font-bold text-slate-500 mt-0.5">{formatPKR(pricePerSqft)}/sqft</div>
          </div>
          {piece.sourceRoll && (
            <div className="text-right">
              <div className="text-[9px] uppercase font-extrabold text-slate-500">From</div>
              <Link to={`/carpet-rolls/${piece.sourceRoll.id}`} className="font-mono text-[10px] font-extrabold text-emerald-700 hover:underline">
                {piece.sourceRoll.rollNumber}
              </Link>
            </div>
          )}
        </div>

        {piece.condition && piece.condition !== 'Good' && (
          <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[9px] font-extrabold">
            <AlertTriangle className="h-2 w-2" />
            {piece.condition}
          </div>
        )}

        {piece.rackNumber && (
          <div className="flex items-center gap-1 text-[10px] text-slate-600 font-bold bg-slate-50 rounded-md px-2 py-1">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{piece.rackNumber}</span>
          </div>
        )}

        {piece.status !== 'SOLD' && (
          <div className="flex gap-1 pt-0.5">
            <button
              onClick={onEdit}
              className="flex-1 px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold inline-flex items-center justify-center gap-1 transition"
            >
              <Edit3 className="h-3 w-3" /> Edit
            </button>
            <button
              onClick={onDelete}
              className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 inline-flex items-center justify-center transition"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditCutPieceModal({
  piece, onClose, onSuccess,
}: {
  piece: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    widthFt: Number(piece.widthFt) || 0,
    widthInch: Number(piece.widthInch) || 0,
    lengthFt: Number(piece.lengthFt) || 0,
    lengthInch: Number(piece.lengthInch) || 0,
    salePrice: Number(piece.salePrice) || 0,
    costAmount: Number(piece.costAmount) || 0,
    condition: piece.condition ?? 'Good',
    rackNumber: piece.rackNumber ?? '',
    notes: piece.notes ?? '',
    status: piece.status,
  });

  const updateMutation = useMutation({
    mutationFn: () => carpetCutPiecesApi.update(piece.id, form),
    onSuccess: () => {
      toast.success(`${piece.pieceCode} updated`);
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  });

  const fullWidth = Number(form.widthFt) + Number(form.widthInch || 0) / 12;
  const fullLength = Number(form.lengthFt) + Number(form.lengthInch || 0) / 12;
  const calculatedSqft = fullWidth * fullLength;
  const pricePerSqft = calculatedSqft > 0 ? form.salePrice / calculatedSqft : 0;
  const profit = form.salePrice - form.costAmount;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="bg-gradient-to-br from-violet-700 to-purple-700 text-white p-5 flex items-center justify-between shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <Edit3 className="h-3 w-3" /> Edit Cut Piece
            </div>
            <h2 className="mt-2 text-xl font-extrabold font-mono">{piece.pieceCode}</h2>
            <p className="text-xs text-white/80 mt-0.5">{piece.product?.name}</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Dimensions */}
          <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3 space-y-3">
            <div className="text-[10px] uppercase font-extrabold text-emerald-700 flex items-center gap-1">
              <Ruler className="h-3 w-3" /> Dimensions
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Width (ft)" type="number" step="1" value={form.widthFt} onChange={(e) => setForm({ ...form, widthFt: Number(e.target.value) })} />
              <Input label="Width (inches)" type="number" step="1" min="0" max="11" value={form.widthInch} onChange={(e) => setForm({ ...form, widthInch: Number(e.target.value) })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Length (ft)" type="number" step="1" value={form.lengthFt} onChange={(e) => setForm({ ...form, lengthFt: Number(e.target.value) })} />
              <Input label="Length (inches)" type="number" step="1" min="0" max="11" value={form.lengthInch} onChange={(e) => setForm({ ...form, lengthInch: Number(e.target.value) })} />
            </div>
            <div className="rounded-lg bg-white border border-emerald-300 p-2 text-center">
              <div className="text-[9px] uppercase font-extrabold text-emerald-700">Calculated Sqft</div>
              <div className="text-xl font-extrabold text-emerald-700 tabular-nums">{calculatedSqft.toFixed(2)} sqft</div>
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 space-y-3">
            <div className="text-[10px] uppercase font-extrabold text-blue-700 flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Pricing
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Sale Price (PKR)" type="number" step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} hint={pricePerSqft > 0 ? `= ${formatPKR(pricePerSqft)}/sqft` : ''} />
              <Input label="Cost (PKR)" type="number" step="0.01" value={form.costAmount} onChange={(e) => setForm({ ...form, costAmount: Number(e.target.value) })} />
            </div>
            {profit > 0 && (
              <div className="rounded-lg bg-emerald-100 border border-emerald-300 p-2 text-xs">
                <span className="font-bold text-emerald-900">Profit: {formatPKRFull(profit)}</span>
                {form.salePrice > 0 && <span className="text-emerald-700 ml-2">({((profit / form.salePrice) * 100).toFixed(1)}% margin)</span>}
              </div>
            )}
          </div>

          {/* Status + Location */}
          <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 space-y-3">
            <div className="text-[10px] uppercase font-extrabold text-slate-700 flex items-center gap-1">
              <Package className="h-3 w-3" /> Status & Details
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
              >
                {(Object.entries(statusConfig) as [string, any][]).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Condition" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} hint="Good / Used / Worn" />
              <Input label="Rack / Location" value={form.rackNumber} onChange={(e) => setForm({ ...form, rackNumber: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
              <textarea rows={2} className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
          <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending} className="bg-gradient-to-r from-violet-700 to-purple-700">
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}