import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Scissors, Ruler, MapPin, X, ChevronLeft, ChevronRight,
  Sparkles, Grid3x3, List as ListIcon, TrendingUp, Eye, EyeOff,
  DollarSign, Package, AlertTriangle, CheckCircle2, Award, Trash2,
  Edit3, Save, ArrowLeft, Palette, ChevronDown, ChevronUp,
  Filter, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { formatPKR, formatPKRFull } from '@core/lib/format';
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

const PRICE_VIS_KEY = 'nafaa.carpet-pieces.price-visibility';
const VIEW_MODE_KEY = 'nafaa.carpet-pieces.view-mode';

type ViewMode = 'variants' | 'grid' | 'list';
type SortBy = 'newest' | 'largest' | 'smallest' | 'cheapest' | 'expensive' | 'value-high';
type PriceVis = 'all' | 'sale-only' | 'hidden';

export default function CarpetCutPiecesPage() {
  const queryClient = useQueryClient();

  const [params, setParams] = useState<CutPiecesListParams>({ page: 1, limit: 200 });
  const [viewMode, setViewMode] = useState<ViewMode>(
    (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'variants',
  );
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [editPiece, setEditPiece] = useState<any>(null);
  const [priceVis, setPriceVis] = useState<PriceVis>(
    (localStorage.getItem(PRICE_VIS_KEY) as PriceVis) || 'all',
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const persistViewMode = (v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem(VIEW_MODE_KEY, v);
  };
  const cyclePriceVis = () => {
    const next: PriceVis = priceVis === 'all' ? 'sale-only' : priceVis === 'sale-only' ? 'hidden' : 'all';
    setPriceVis(next);
    localStorage.setItem(PRICE_VIS_KEY, next);
  };
  const showPrice = priceVis !== 'hidden';

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

  // Universal search
  const searchText = (params.search ?? '').toLowerCase().trim();
  const searchMatches = (p: any): boolean => {
    if (!searchText) return true;
    const hay = [
      p.pieceCode, p.product?.name, p.variant?.name, p.variant?.color,
      p.rackNumber, p.condition, p.notes, p.sourceRoll?.rollNumber,
      String(p.totalSqft), `${p.widthFt}x${p.lengthFt}`,
    ].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(searchText);
  };

  const items = useMemo(() => {
    let list = (data?.items ?? []).filter(searchMatches);
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'largest':    return Number(b.totalSqft) - Number(a.totalSqft);
        case 'smallest':   return Number(a.totalSqft) - Number(b.totalSqft);
        case 'cheapest':   return Number(a.salePrice) - Number(b.salePrice);
        case 'expensive':  return Number(b.salePrice) - Number(a.salePrice);
        case 'value-high': return Number(b.salePrice) - Number(a.salePrice);
        case 'newest':
        default:           return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return list;
  }, [data?.items, sortBy, searchText]);

  // Grouped by product+variant
  interface Group {
    key: string;
    productName: string;
    variantName: string | null;
    variantColorHex: string | null;
    pieces: any[];
    availableCount: number;
    totalSqft: number;
    totalValue: number;
  }

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const p of items) {
      const key = `${p.productId}::${p.variantId ?? 'none'}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          productName: p.product?.name ?? 'Unknown',
          variantName: p.variant?.name ?? null,
          variantColorHex: p.variant?.colorHex ?? null,
          pieces: [],
          availableCount: 0,
          totalSqft: 0,
          totalValue: 0,
        });
      }
      const g = map.get(key)!;
      g.pieces.push(p);
      if (p.status === 'AVAILABLE') {
        g.availableCount++;
        g.totalSqft += Number(p.totalSqft ?? 0);
        g.totalValue += Number(p.salePrice ?? 0);
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount;
      return b.totalSqft - a.totalSqft;
    });
  }, [items]);

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

  const isGroupExpanded = (key: string) => expandedGroups.has(key);
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const expandAll = () => setExpandedGroups(new Set(groups.map((g) => g.key)));
  const collapseAll = () => setExpandedGroups(new Set());

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

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-pink-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Scissors className="h-3.5 w-3.5 text-amber-300" />
              Cut Pieces Inventory
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Cut Pieces</h1>
            <p className="mt-2 text-sm text-white/85 max-w-xl font-semibold">
              Leftover tukray, mats, rugs, customer returns — variant-wise grouped view
            </p>
          </div>

          <Link to="/carpet-rolls">
            <Button variant="secondary" className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border border-white/20">
              <ArrowLeft className="h-4 w-4" /> Back to Rolls
            </Button>
          </Link>
        </div>

        <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          <KpiTile label="Total Pieces" value={stats.totalPieces} icon={Package} tone="violet" />
          <KpiTile label="Available" value={stats.availableCount} sub={`${stats.availableSqft.toFixed(0)} sqft`} icon={CheckCircle2} tone="emerald" big />
          <KpiTile label="Sold" value={stats.soldCount} sub={showPrice ? formatPKR(stats.soldValue) : undefined} icon={Award} tone="blue" />
          <KpiTile label="Damaged" value={stats.damagedCount} icon={AlertTriangle} tone="rose" />
          {showPrice && (
            <KpiTile label="Stock Value" value={formatPKR(stats.availableValue)} sub="available" icon={TrendingUp} tone="amber" />
          )}
        </div>
      </section>

      {/* TOOLBAR */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[280px] relative">
            <Search className="h-5 w-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-12 text-base font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition"
              placeholder="Search: piece code, product, variant, roll #, rack, size..."
              value={params.search ?? ''}
              onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
              autoFocus
            />
            {params.search && (
              <button onClick={() => setParams({ ...params, search: '', page: 1 })} className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            )}
            {searchText && (
              <div className="absolute -bottom-6 left-2 text-[11px] font-extrabold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200">
                {items.length} match{items.length !== 1 ? 'es' : ''}
              </div>
            )}
          </div>

          <div className="inline-flex rounded-2xl border-2 border-slate-200 bg-white overflow-hidden shadow-sm">
            <button
              onClick={() => persistViewMode('variants')}
              className={`px-4 h-14 text-sm font-extrabold transition inline-flex items-center gap-1.5 ${
                viewMode === 'variants' ? 'bg-violet-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Palette className="h-4 w-4" /> Variants
            </button>
            <button
              onClick={() => persistViewMode('grid')}
              className={`px-4 h-14 text-sm font-extrabold transition border-l-2 border-slate-200 inline-flex items-center gap-1.5 ${
                viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Grid3x3 className="h-4 w-4" /> Grid
            </button>
            <button
              onClick={() => persistViewMode('list')}
              className={`px-4 h-14 text-sm font-extrabold transition border-l-2 border-slate-200 inline-flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ListIcon className="h-4 w-4" /> Table
            </button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select
            className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-extrabold focus:outline-none focus:border-violet-500"
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
            className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-extrabold focus:outline-none focus:border-violet-500"
          >
            <option value="newest">🆕 Newest first</option>
            <option value="largest">📦 Largest size</option>
            <option value="smallest">📉 Smallest size</option>
            <option value="cheapest">💸 Cheapest</option>
            <option value="expensive">💰 Most expensive</option>
          </select>

          <button
            onClick={cyclePriceVis}
            className={`h-11 px-3 rounded-xl border-2 text-sm font-extrabold inline-flex items-center gap-1.5 transition ${
              priceVis === 'all' ? 'bg-violet-50 border-violet-300 text-violet-700'
              : priceVis === 'sale-only' ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}
          >
            {priceVis === 'hidden' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {priceVis === 'all' ? 'Prices: All' : priceVis === 'sale-only' ? 'Sale only' : 'Hidden'}
          </button>

          {viewMode === 'variants' && groups.length > 0 && (
            <>
              <button onClick={expandAll} className="h-11 px-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-extrabold inline-flex items-center gap-1">
                <ChevronDown className="h-4 w-4" /> Expand All
              </button>
              <button onClick={collapseAll} className="h-11 px-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-extrabold inline-flex items-center gap-1">
                <ChevronUp className="h-4 w-4" /> Collapse All
              </button>
            </>
          )}
        </div>

        {/* Status chips */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setParams({ ...params, status: undefined, page: 1 })}
            className={`px-3 py-1.5 rounded-lg text-sm font-extrabold inline-flex items-center gap-1 transition ${
              !params.status ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="h-3 w-3" /> All
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${!params.status ? 'bg-white/20' : 'bg-slate-200'}`}>{stats.totalPieces}</span>
          </button>
          {(Object.entries(statusConfig) as [CarpetCutPieceStatus, any][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const counts: Record<CarpetCutPieceStatus, number> = {
              AVAILABLE: stats.availableCount, SOLD: stats.soldCount,
              DAMAGED: stats.damagedCount, RESERVED: items.filter((p) => p.status === 'RESERVED').length,
            };
            const active = params.status === key;
            return (
              <button
                key={key}
                onClick={() => setParams({ ...params, status: key, page: 1 })}
                className={`px-3 py-1.5 rounded-lg text-sm font-extrabold inline-flex items-center gap-1 transition border ${
                  active ? cfg.color + ' shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent'
                }`}
              >
                <Icon className="h-3 w-3" /> {cfg.label}
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${active ? 'bg-white/30' : 'bg-slate-200'}`}>{counts[key]}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* CONTENT */}
      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-200 mx-auto flex items-center justify-center shadow-inner mb-4">
            <Scissors className="h-12 w-12 text-violet-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">
            {searchText ? `No pieces match "${searchText}"` : 'No cut pieces found'}
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto font-semibold">
            {searchText || params.status
              ? 'Try different search or filter'
              : 'Leftover pieces will auto-create when you cut rolls with smaller customer width'}
          </p>
        </div>
      ) : viewMode === 'variants' ? (
        <div className="space-y-3">
          {groups.map((g) => {
            const expanded = isGroupExpanded(g.key);
            return (
              <section key={g.key} className="rounded-2xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition">
                <button onClick={() => toggleGroup(g.key)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50/70 transition text-left">
                  {g.variantColorHex ? (
                    <div className="h-14 w-14 rounded-xl border-2 border-white shadow-md shrink-0 ring-2 ring-slate-200" style={{ backgroundColor: g.variantColorHex }} />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center shrink-0 ring-2 ring-slate-200">
                      <Scissors className="h-6 w-6 text-violet-600" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-extrabold text-slate-900 text-lg leading-tight">{g.productName}</div>
                      {g.variantName && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-100 text-violet-800 text-sm font-extrabold">
                          {g.variantColorHex && (
                            <span className="h-2.5 w-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: g.variantColorHex }} />
                          )}
                          {g.variantName}
                        </div>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 flex-wrap text-sm text-slate-600 font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <Package className="h-3.5 w-3.5 text-violet-600" />
                        <strong className="text-slate-900">{g.availableCount}</strong> available
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="inline-flex items-center gap-1">
                        <Ruler className="h-3.5 w-3.5 text-blue-600" />
                        <strong className="text-violet-700 tabular-nums text-base">{g.totalSqft.toFixed(0)}</strong> sqft
                      </span>
                      {showPrice && g.totalValue > 0 && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="inline-flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                            <strong className="text-slate-900 tabular-nums">{formatPKR(g.totalValue)}</strong>
                          </span>
                        </>
                      )}
                      {g.pieces.length > g.availableCount && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 text-xs font-bold">+{g.pieces.length - g.availableCount} sold/damaged</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="text-3xl font-extrabold text-violet-700 tabular-nums leading-none">{g.totalSqft.toFixed(0)}</div>
                    <div className="text-xs font-extrabold text-violet-700">sqft</div>
                  </div>

                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition shrink-0 ${
                    expanded ? 'bg-violet-600 text-white rotate-180' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <ChevronDown className="h-5 w-5" />
                  </div>
                </button>

                {expanded && (
                  <div className="border-t-2 border-slate-100 bg-slate-50/40 p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {g.pieces.map((p: any) => (
                      <PieceRowCompact
                        key={p.id}
                        piece={p}
                        showPrice={showPrice}
                        onEdit={() => setEditPiece(p)}
                        onDelete={() => { if (confirm(`Delete piece ${p.pieceCode}?`)) removeMutation.mutate(p.id); }}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {items.map((piece) => (
            <CutPieceCard
              key={piece.id}
              piece={piece}
              showPrice={showPrice}
              onEdit={() => setEditPiece(piece)}
              onDelete={() => { if (confirm(`Delete piece ${piece.pieceCode}?`)) removeMutation.mutate(piece.id); }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <Th>Piece #</Th>
                  <Th>Product & Variant</Th>
                  <Th className="text-center">Size</Th>
                  <Th className="text-right">Sqft</Th>
                  {showPrice && <Th className="text-right">Price</Th>}
                  <Th>Source</Th>
                  <Th>Rack</Th>
                  <Th className="text-center">Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((piece) => {
                  const cfg = statusConfig[piece.status];
                  const Icon = cfg.icon;
                  const pricePerSqft = piece.totalSqft > 0 ? piece.salePrice / piece.totalSqft : 0;
                  return (
                    <tr key={piece.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono font-extrabold text-violet-700 text-sm">{piece.pieceCode}</td>
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-slate-900 text-sm">{piece.product?.name}</div>
                        {piece.variant && (
                          <div className="text-xs text-violet-700 font-bold flex items-center gap-1 mt-0.5">
                            {piece.variant.colorHex && (
                              <span className="h-2.5 w-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: piece.variant.colorHex }} />
                            )}
                            {piece.variant.name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-slate-700 tabular-nums">
                        {piece.widthFt}ft × {piece.lengthFt}ft
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-extrabold text-violet-700 tabular-nums text-base">{Number(piece.totalSqft).toFixed(2)}</div>
                        {showPrice && <div className="text-[10px] text-slate-500 font-bold">@ {formatPKR(pricePerSqft)}/sqft</div>}
                      </td>
                      {showPrice && (
                        <td className="px-4 py-3 text-right text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(piece.salePrice)}</td>
                      )}
                      <td className="px-4 py-3">
                        {piece.sourceRoll ? (
                          <Link to={`/carpet-rolls/${piece.sourceRoll.id}`} className="font-mono text-xs font-bold text-emerald-700 hover:underline">
                            {piece.sourceRoll.rollNumber}
                          </Link>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-bold">{piece.rackNumber || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${cfg.color}`}>
                          <Icon className="h-2.5 w-2.5" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {piece.status !== 'SOLD' && (
                            <>
                              <button onClick={() => setEditPiece(piece)} className="h-8 w-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => { if (confirm(`Delete piece ${piece.pieceCode}?`)) removeMutation.mutate(piece.id); }} className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                                <Trash2 className="h-3.5 w-3.5" />
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
    </div>
  );
}

// Helpers
function Th({ children, className = '' }: { children: any; className?: string }) {
  return <th className={`px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-700 ${className}`}>{children}</th>;
}

function KpiTile({ label, value, sub, icon: Icon, tone, big }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    rose: 'from-rose-400/30 to-rose-600/20 border-rose-300/40',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3.5`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-white/90" />
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/90">{label}</div>
      </div>
      <div className={`font-extrabold leading-none text-white tabular-nums ${big ? 'text-3xl' : 'text-2xl'}`}>{value}</div>
      {sub && <div className="text-[11px] font-bold text-white/75 mt-1">{sub}</div>}
    </div>
  );
}

function PieceRowCompact({ piece, showPrice, onEdit, onDelete }: any) {
  const cfg = statusConfig[piece.status as CarpetCutPieceStatus];
  const Icon = cfg.icon;
  return (
    <div className="rounded-xl bg-white border-2 border-slate-200 hover:border-violet-300 hover:shadow-sm transition p-3 flex items-center gap-2">
      <div className="shrink-0">
        <div className="font-mono font-extrabold text-violet-700 text-sm leading-tight">{piece.pieceCode}</div>
        <span className={`inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full border text-[9px] font-extrabold ${cfg.color}`}>
          <Icon className="h-2.5 w-2.5" />
          {cfg.label}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-extrabold text-slate-900 tabular-nums">
          {piece.widthFt}ft × {piece.lengthFt}ft
        </div>
        <div className="text-lg font-extrabold text-violet-700 tabular-nums leading-none">
          {Number(piece.totalSqft).toFixed(2)} <span className="text-xs">sqft</span>
        </div>
        {showPrice && (
          <div className="text-sm font-extrabold text-emerald-700 tabular-nums mt-0.5">{formatPKRFull(piece.salePrice)}</div>
        )}
      </div>
      {piece.status !== 'SOLD' && (
        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={onEdit} className="h-7 w-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center"><Edit3 className="h-3 w-3" /></button>
          <button onClick={onDelete} className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"><Trash2 className="h-3 w-3" /></button>
        </div>
      )}
    </div>
  );
}

function CutPieceCard({ piece, showPrice, onEdit, onDelete }: any) {
  const cfg = statusConfig[piece.status as CarpetCutPieceStatus];
  const Icon = cfg.icon;
  const pricePerSqft = piece.totalSqft > 0 ? piece.salePrice / piece.totalSqft : 0;

  return (
    <div className="group rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-violet-400 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-0.5 transition-all">
      <div className="px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between">
        <div className="font-mono text-white font-extrabold text-sm">{piece.pieceCode}</div>
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-extrabold ${cfg.color}`}>
          <Icon className="h-2.5 w-2.5" />
          {cfg.label}
        </span>
      </div>

      <div className="p-3 space-y-2.5">
        <div>
          <div className="font-extrabold text-slate-900 text-sm line-clamp-1 leading-tight">{piece.product?.name}</div>
          {piece.variant && (
            <div className="text-xs font-extrabold text-violet-700 flex items-center gap-1 mt-1">
              {piece.variant.colorHex && (
                <span className="h-2.5 w-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: piece.variant.colorHex }} />
              )}
              {piece.variant.name}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="font-extrabold text-violet-700 flex items-center gap-1">
              <Ruler className="h-3 w-3" /> Size
            </div>
            <div className="font-extrabold text-slate-900">
              {piece.widthFt}ft × {piece.lengthFt}ft
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-extrabold text-violet-700 tabular-nums leading-none">
              {Number(piece.totalSqft).toFixed(2)}
            </div>
            <div className="text-sm font-extrabold text-violet-700">sqft</div>
          </div>
        </div>

        {showPrice && (
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-emerald-700">Price</div>
              <div className="text-lg font-extrabold text-emerald-700 tabular-nums leading-none">{formatPKRFull(piece.salePrice)}</div>
              <div className="text-[10px] font-bold text-slate-500 mt-0.5">{formatPKR(pricePerSqft)}/sqft</div>
            </div>
            {piece.sourceRoll && (
              <div className="text-right">
                <div className="text-[10px] uppercase font-extrabold text-slate-500">From</div>
                <Link to={`/carpet-rolls/${piece.sourceRoll.id}`} className="font-mono text-xs font-extrabold text-emerald-700 hover:underline">
                  {piece.sourceRoll.rollNumber}
                </Link>
              </div>
            )}
          </div>
        )}

        {piece.condition && piece.condition !== 'Good' && (
          <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-extrabold">
            <AlertTriangle className="h-2.5 w-2.5" />
            {piece.condition}
          </div>
        )}

        {piece.rackNumber && (
          <div className="flex items-center gap-1 text-xs text-slate-600 font-bold bg-slate-50 rounded-md px-2 py-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{piece.rackNumber}</span>
          </div>
        )}

        {piece.status !== 'SOLD' && (
          <div className="flex gap-1.5 pt-1">
            <button onClick={onEdit} className="flex-1 px-2 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-extrabold inline-flex items-center justify-center gap-1 transition">
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
            <button onClick={onDelete} className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 inline-flex items-center justify-center transition">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditCutPieceModal({ piece, onClose, onSuccess }: any) {
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
    onSuccess: () => { toast.success(`✓ ${piece.pieceCode} updated`); onSuccess(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  });

  const fullWidth = Number(form.widthFt) + Number(form.widthInch || 0) / 12;
  const fullLength = Number(form.lengthFt) + Number(form.lengthInch || 0) / 12;
  const calculatedSqft = fullWidth * fullLength;
  const pricePerSqft = calculatedSqft > 0 ? form.salePrice / calculatedSqft : 0;
  const profit = form.salePrice - form.costAmount;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="bg-gradient-to-br from-violet-700 to-purple-700 text-white p-5 flex items-center justify-between shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <Edit3 className="h-3 w-3" /> Edit Cut Piece
            </div>
            <h2 className="mt-2 text-2xl font-extrabold font-mono">{piece.pieceCode}</h2>
            <p className="text-sm text-white/85 mt-0.5 font-semibold">{piece.product?.name}</p>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4 space-y-3">
            <div className="text-xs uppercase font-extrabold text-emerald-700 flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5" /> Dimensions
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Width (ft)" type="number" step="1" value={form.widthFt} onChange={(e) => setForm({ ...form, widthFt: Number(e.target.value) })} />
              <Input label="Width (inches)" type="number" step="1" min="0" max="11" value={form.widthInch} onChange={(e) => setForm({ ...form, widthInch: Number(e.target.value) })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Length (ft)" type="number" step="1" value={form.lengthFt} onChange={(e) => setForm({ ...form, lengthFt: Number(e.target.value) })} />
              <Input label="Length (inches)" type="number" step="1" min="0" max="11" value={form.lengthInch} onChange={(e) => setForm({ ...form, lengthInch: Number(e.target.value) })} />
            </div>
            <div className="rounded-lg bg-white border-2 border-emerald-300 p-3 text-center">
              <div className="text-xs uppercase font-extrabold text-emerald-700">Calculated Sqft</div>
              <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">{calculatedSqft.toFixed(2)} sqft</div>
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-4 space-y-3">
            <div className="text-xs uppercase font-extrabold text-blue-700 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Pricing
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Sale Price (PKR)" type="number" step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} hint={pricePerSqft > 0 ? `= ${formatPKR(pricePerSqft)}/sqft` : ''} />
              <Input label="Cost (PKR)" type="number" step="0.01" value={form.costAmount} onChange={(e) => setForm({ ...form, costAmount: Number(e.target.value) })} />
            </div>
            {profit > 0 && (
              <div className="rounded-lg bg-emerald-100 border border-emerald-300 p-2.5 text-sm">
                <span className="font-bold text-emerald-900">Profit: {formatPKRFull(profit)}</span>
                {form.salePrice > 0 && <span className="text-emerald-700 ml-2">({((profit / form.salePrice) * 100).toFixed(1)}% margin)</span>}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-4 space-y-3">
            <div className="text-xs uppercase font-extrabold text-slate-700 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> Status & Details
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
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
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes</label>
              <textarea rows={2} className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border-t-2 border-slate-200 p-4 flex items-center justify-between gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-extrabold text-slate-600 hover:bg-slate-200">Cancel</button>
          <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending} className="bg-gradient-to-r from-violet-700 to-purple-700 shadow-lg">
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
