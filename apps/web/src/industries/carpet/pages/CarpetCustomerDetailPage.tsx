import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Layers, Scissors, Ruler, Award, Calendar, ArrowRight, ShoppingBag,
  TrendingUp, Package, Crown, BarChart3,
} from 'lucide-react';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import CustomerDetailPage from '@modules/customers/customers/pages/CustomerDetailPage';
import { formatPKR } from '@core/lib/format';

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);

export default function CarpetCustomerDetailPage() {
  const { id } = useParams();

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-for-carpet-customer', id],
    queryFn: () => salesApi.list(),
    enabled: !!id,
  });

  const customerSales = allSales.filter((s: any) => s.customer?.id === id);

  const carpetLines: any[] = [];
  for (const sale of customerSales) {
    for (const item of (sale.items || [])) {
      if (!CARPET_UNITS.has(item.product?.unit || '')) continue;
      carpetLines.push({ ...item, sale });
    }
  }

  const totalSqft = carpetLines.reduce((s, l) => s + Number(l.quantity || 0), 0);
  const totalRevenue = carpetLines.reduce((s, l) => s + Number(l.total || 0), 0);
  const avgPricePerSqft = totalSqft > 0 ? totalRevenue / totalSqft : 0;

  const rollCuts = carpetLines.filter((l: any) => (l.note || '').includes('Cut from')).length;
  const cutPieceBuys = carpetLines.filter((l: any) => (l.note || '').includes('Cut piece')).length;

  // Favorite designs
  const designCounts = new Map<string, { name: string; sqft: number; revenue: number; image?: string }>();
  for (const line of carpetLines) {
    const pid = line.productId || line.product?.id;
    if (!pid) continue;
    const existing = designCounts.get(pid) ?? {
      name: line.product?.name || 'Unknown',
      sqft: 0, revenue: 0,
      image: line.product?.images?.[0]?.url,
    };
    existing.sqft += Number(line.quantity || 0);
    existing.revenue += Number(line.total || 0);
    designCounts.set(pid, existing);
  }
  const favoriteDesigns = Array.from(designCounts.entries())
    .map(([pid, d]) => ({ pid, ...d }))
    .sort((a, b) => b.sqft - a.sqft)
    .slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-6">
      {carpetLines.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border-2 border-emerald-300 p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-900 text-base sm:text-lg">🧶 Carpet Purchase History</h3>
              <p className="text-xs text-emerald-700 font-semibold">Customer ki carpet buying summary</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <StatCard icon={Ruler} label="Total Sqft" value={totalSqft.toFixed(0)} color="emerald" />
            <StatCard icon={ShoppingBag} label="Purchases" value={carpetLines.length} color="teal" />
            <StatCard icon={TrendingUp} label="Revenue" value={formatPKR(totalRevenue)} color="blue" isHighlight />
            <StatCard icon={BarChart3} label="Avg Rate" value={formatPKR(avgPricePerSqft) + '/sqft'} color="amber" />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {rollCuts > 0 && (
              <div className="rounded-xl bg-white border-2 border-emerald-200 p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-emerald-700">Roll Cuts</div>
                  <div className="text-xl font-extrabold text-emerald-900 tabular-nums">{rollCuts}</div>
                </div>
              </div>
            )}
            {cutPieceBuys > 0 && (
              <div className="rounded-xl bg-white border-2 border-violet-200 p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                  <Scissors className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-violet-700">Cut Pieces</div>
                  <div className="text-xl font-extrabold text-violet-900 tabular-nums">{cutPieceBuys}</div>
                </div>
              </div>
            )}
          </div>

          {favoriteDesigns.length > 0 && (
            <div className="rounded-2xl bg-white border-2 border-emerald-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-4 w-4 text-amber-500" />
                <h4 className="font-extrabold text-slate-900 text-sm">⭐ Favorite Designs (Top 5)</h4>
              </div>
              <div className="space-y-2">
                {favoriteDesigns.map((d, idx) => {
                  const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-500', 'bg-violet-500', 'bg-blue-500'];
                  return (
                    <div key={d.pid} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 transition">
                      <div className={`h-8 w-8 rounded-lg ${rankColors[idx]} text-white text-xs font-extrabold flex items-center justify-center shrink-0`}>
                        {idx < 3 ? <Crown className="h-4 w-4" /> : idx + 1}
                      </div>
                      {d.image ? (
                        <img src={d.image} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0 border-2 border-white shadow" />
                      ) : (
                        <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                          <Layers className="h-4 w-4 text-emerald-500" />
                        </div>
                      )}
                      <span className="font-extrabold text-slate-900 text-sm flex-1 min-w-0 truncate">{d.name}</span>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{d.sqft.toFixed(0)} sqft</div>
                        <div className="text-[10px] text-slate-500 font-semibold">{formatPKR(d.revenue)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white border-2 border-emerald-200 overflow-hidden">
            <div className="px-4 py-3 border-b-2 border-emerald-100 bg-emerald-50/40 flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-sm inline-flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" /> Cut History (Last 20)
              </h4>
              <span className="text-[10px] font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-300">
                {carpetLines.length} total
              </span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {carpetLines.slice(0, 20).map((line: any) => {
                const isRoll = (line.note || '').includes('Cut from');
                const isCutPiece = (line.note || '').includes('Cut piece');
                return (
                  <Link key={line.id} to={`/sales/${line.sale.id}/receipt`}
                    className="block px-4 py-3 hover:bg-emerald-50/70 transition group active:scale-[0.99]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isRoll && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">
                              <Layers className="h-2.5 w-2.5" /> ROLL
                            </span>
                          )}
                          {isCutPiece && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold">
                              <Scissors className="h-2.5 w-2.5" /> PIECE
                            </span>
                          )}
                          <span className="font-extrabold text-slate-900 text-sm truncate">{line.product?.name}</span>
                        </div>
                        {line.note && (
                          <div className="text-[10px] font-mono text-slate-600 mt-0.5 truncate">{line.note}</div>
                        )}
                        <div className="text-[10px] text-slate-500 font-bold mt-0.5 inline-flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(line.sale.soldAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-emerald-700 text-sm tabular-nums">
                          {Number(line.quantity).toFixed(2)} {line.product?.unit}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold">{formatPKR(line.total)}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
                    </div>
                  </Link>
                );
              })}
            </div>
            {carpetLines.length > 20 && (
              <div className="border-t border-slate-100 px-4 py-2 text-center bg-slate-50">
                <span className="text-xs font-bold text-slate-500">+{carpetLines.length - 20} more purchases in full history</span>
              </div>
            )}
          </div>
        </section>
      )}

      <CustomerDetailPage />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, isHighlight }: any) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 border-emerald-200 text-emerald-700',
    teal: 'bg-teal-100 border-teal-200 text-teal-700',
    blue: 'bg-blue-100 border-blue-200 text-blue-700',
    amber: 'bg-amber-100 border-amber-200 text-amber-700',
  };
  return (
    <div className={`rounded-xl bg-white border-2 p-2.5 sm:p-3 ${isHighlight ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`h-6 w-6 rounded-lg ${colors[color]} border flex items-center justify-center shrink-0`}>
          <Icon className="h-3 w-3" />
        </div>
        <div className={`text-[9px] uppercase font-extrabold tracking-wider ${colors[color].split(' ')[2]}`}>{label}</div>
      </div>
      <div className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
    </div>
  );
}
