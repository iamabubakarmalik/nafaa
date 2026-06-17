import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Scissors, Layers, Ruler, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKRFull } from '@/lib/format';
import {
  carpetCutPiecesApi,
  type CutPiecesListParams,
  type CarpetCutPieceStatus,
} from '../api/carpet-cut-pieces.api';

const statusColors: Record<CarpetCutPieceStatus, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  SOLD: 'bg-violet-100 text-violet-700',
  DAMAGED: 'bg-rose-100 text-rose-700',
  RESERVED: 'bg-amber-100 text-amber-700',
};

export default function CarpetCutPiecesPage() {
  const [params, setParams] = useState<CutPiecesListParams>({
    page: 1,
    limit: 24,
  });

  const { data } = useQuery({
    queryKey: ['carpet-cut-pieces', params],
    queryFn: () => carpetCutPiecesApi.list(params),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-violet-900 to-violet-700 text-white p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Scissors className="h-3.5 w-3.5" /> Carpet Inventory
            </div>
            <h2 className="mt-3 text-3xl font-bold">Cut Pieces</h2>
            <p className="mt-2 text-sm text-white/80">
              Bachay hue tukray + customer returns — discount par bechain
            </p>
          </div>
          <Link to="/carpet-rolls">
            <Button variant="secondary">
              <Layers className="h-4 w-4" /> Back to Rolls
            </Button>
          </Link>
        </div>
      </section>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm"
            placeholder="Search by piece code, product…"
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
        <select
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
          value={params.status ?? ''}
          onChange={(e) =>
            setParams({ ...params, status: (e.target.value || undefined) as any, page: 1 })
          }
        >
          <option value="">All status</option>
          <option value="AVAILABLE">Available</option>
          <option value="SOLD">Sold</option>
          <option value="DAMAGED">Damaged</option>
          <option value="RESERVED">Reserved</option>
        </select>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-16 text-center">
          <Scissors className="h-16 w-16 text-slate-300 mx-auto" />
          <h3 className="mt-4 text-lg font-bold text-slate-900">Koi cut piece nahi</h3>
          <p className="text-sm text-slate-500 mt-1">
            Jab POS se cutting hogi, bachay tukray yahan auto add ho jayenge
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((piece) => (
            <div
              key={piece.id}
              className="rounded-2xl bg-white border-2 border-slate-200 p-4 hover:border-violet-400 hover:shadow-xl transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="font-mono font-extrabold text-sm text-slate-900">
                  {piece.pieceCode}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${statusColors[piece.status]}`}
                >
                  {piece.status}
                </span>
              </div>

              <div>
                <div className="font-bold text-slate-900 line-clamp-1">
                  {piece.product?.name}
                </div>
                {piece.variant && (
                  <div className="text-xs font-bold text-violet-700 flex items-center gap-1">
                    {piece.variant.colorHex && (
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: piece.variant.colorHex }}
                      />
                    )}
                    {piece.variant.name}
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500">
                  <Ruler className="h-3 w-3" /> Size
                </div>
                <div className="font-extrabold text-slate-900">
                  {piece.widthFt}ft × {piece.lengthFt}ft
                </div>
                <div className="text-xs text-violet-700 font-bold">
                  {piece.totalSqft.toFixed(2)} sqft
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] uppercase text-slate-500 font-bold">Price</div>
                  <div className="font-extrabold text-emerald-700">
                    {formatPKRFull(piece.salePrice)}
                  </div>
                </div>
                {piece.sourceRoll && (
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-slate-500 font-bold">From</div>
                    <div className="font-mono font-bold text-slate-700 text-[10px]">
                      {piece.sourceRoll.rollNumber}
                    </div>
                  </div>
                )}
              </div>

              {piece.condition && (
                <div className="text-[10px] font-bold text-slate-500">
                  Condition: {piece.condition}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
