import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Layers, TrendingUp, Clock, Scissors, Sparkles,
  ArrowLeft, DollarSign, Package, AlertTriangle, Award, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKRFull } from '@/lib/format';
import { carpetReportsApi } from '../api/carpet-reports.api';

type Tab = 'overview' | 'profit' | 'slow' | 'today' | 'designs' | 'pieces';

const tabs: { id: Tab; label: string; icon: any; color: string }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3, color: 'emerald' },
  { id: 'profit', label: 'Roll Profit', icon: TrendingUp, color: 'blue' },
  { id: 'today', label: "Today's Cuts", icon: Clock, color: 'violet' },
  { id: 'designs', label: 'Top Designs', icon: Award, color: 'amber' },
  { id: 'slow', label: 'Slow Movers', icon: AlertTriangle, color: 'rose' },
  { id: 'pieces', label: 'Cut Pieces', icon: Scissors, color: 'purple' },
];

export default function CarpetReportsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [slowDays, setSlowDays] = useState(30);
  const [topDays, setTopDays] = useState(30);

  const { data: overview, refetch: refetchOverview } = useQuery({
    queryKey: ['carpet-reports', 'overview'],
    queryFn: () => carpetReportsApi.overview(),
    enabled: tab === 'overview',
  });

  const { data: profit = [], refetch: refetchProfit } = useQuery({
    queryKey: ['carpet-reports', 'profit'],
    queryFn: () => carpetReportsApi.rollProfit(),
    enabled: tab === 'profit',
  });

  const { data: slow = [], refetch: refetchSlow } = useQuery({
    queryKey: ['carpet-reports', 'slow', slowDays],
    queryFn: () => carpetReportsApi.slowMoving(slowDays),
    enabled: tab === 'slow',
  });

  const { data: today, refetch: refetchToday } = useQuery({
    queryKey: ['carpet-reports', 'today'],
    queryFn: () => carpetReportsApi.todaysCuts(),
    enabled: tab === 'today',
  });

  const { data: top = [], refetch: refetchTop } = useQuery({
    queryKey: ['carpet-reports', 'top', topDays],
    queryFn: () => carpetReportsApi.topDesigns(topDays),
    enabled: tab === 'designs',
  });

  const { data: pieces, refetch: refetchPieces } = useQuery({
    queryKey: ['carpet-reports', 'pieces'],
    queryFn: () => carpetReportsApi.cutPiecesReport(),
    enabled: tab === 'pieces',
  });

  const handleRefresh = () => {
    if (tab === 'overview') refetchOverview();
    if (tab === 'profit') refetchProfit();
    if (tab === 'slow') refetchSlow();
    if (tab === 'today') refetchToday();
    if (tab === 'designs') refetchTop();
    if (tab === 'pieces') refetchPieces();
  };

  return (
    <div className="space-y-6">
      <Link to="/carpet-rolls" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> Back to Carpet Rolls
      </Link>

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-brand-900 via-emerald-800 to-emerald-700 text-white p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <BarChart3 className="h-3.5 w-3.5" /> Carpet Industry
            </div>
            <h1 className="mt-3 text-3xl font-bold">Reports & Analytics</h1>
            <p className="mt-2 text-sm text-white/80">
              Roll-wise profit, slow movers, top selling designs aur cut pieces ka complete picture
            </p>
          </div>
          <Button variant="secondary" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                active
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-brand-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ────── OVERVIEW ────── */}
      {tab === 'overview' && overview && (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Total Stock (sqft)"
              value={overview.grandTotalSqft.toFixed(0)}
              subValue={`${overview.activeRollCount} rolls + ${overview.cutPieceAvailableCount} pieces`}
              color="emerald"
              icon={Layers}
            />
            <KpiCard
              label="Stock Cost"
              value={formatPKRFull(overview.totalStockCost)}
              subValue="Investment value"
              color="blue"
              icon={DollarSign}
            />
            <KpiCard
              label="Stock Sale Value"
              value={formatPKRFull(overview.totalStockSaleValue)}
              subValue="At sale prices"
              color="violet"
              icon={Package}
            />
            <KpiCard
              label="Potential Profit"
              value={formatPKRFull(overview.potentialProfit)}
              subValue="If all sold"
              color="amber"
              icon={TrendingUp}
            />
          </div>

          {/* Roll status breakdown */}
          <div className="rounded-3xl bg-white border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-3">Roll Status Breakdown</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <div className="text-[10px] uppercase font-bold text-emerald-700">Active</div>
                <div className="text-2xl font-extrabold text-emerald-900 mt-0.5">{overview.activeRollCount}</div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-[10px] uppercase font-bold text-slate-700">Finished</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{overview.finishedRollCount}</div>
              </div>
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3">
                <div className="text-[10px] uppercase font-bold text-rose-700">Damaged</div>
                <div className="text-2xl font-extrabold text-rose-900 mt-0.5">{overview.damagedRollCount}</div>
              </div>
            </div>
          </div>

          {/* Cut pieces summary */}
          <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-violet-600 text-white flex items-center justify-center">
                <Scissors className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Cut Pieces Stock</h3>
                <p className="text-xs text-slate-600">Leftover tukre + returned pieces</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-violet-700">Available</div>
                <div className="text-xl font-extrabold text-violet-900">{overview.cutPieceAvailableCount}</div>
                <div className="text-[10px] text-violet-700">{overview.cutPiecesSqft.toFixed(2)} sqft</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-violet-700">Cost Value</div>
                <div className="text-xl font-extrabold text-violet-900">{formatPKRFull(overview.cutPiecesCost)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-violet-700">Sale Value</div>
                <div className="text-xl font-extrabold text-violet-900">{formatPKRFull(overview.cutPiecesSaleValue)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────── ROLL PROFIT ────── */}
      {tab === 'profit' && (
        <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-900">Roll-wise Profit Analysis</h3>
            <p className="text-xs text-slate-500 mt-0.5">Har roll se kitna bika aur kitna profit hua</p>
          </div>
          {profit.length === 0 ? (
            <div className="p-12 text-center">
              <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <div className="font-bold text-slate-700">No roll data yet</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">Roll</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">Product</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Sold</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Revenue</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Cost</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Profit</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Margin</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profit.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <Link to={`/carpet-rolls/${r.id}`} className="font-mono font-bold text-emerald-700 hover:underline text-xs">
                          {r.rollNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-900 text-xs">{r.productName}</div>
                        {r.variantName && (
                          <div className="text-[10px] text-violet-700 flex items-center gap-1">
                            {r.variantColor && (
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.variantColor }} />
                            )}
                            {r.variantName}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="font-bold text-slate-900 text-xs">{r.soldSqft.toFixed(2)} sqft</div>
                        <div className="text-[10px] text-slate-500">{r.salesCount} sales</div>
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-bold text-emerald-700">{formatPKRFull(r.revenue)}</td>
                      <td className="px-3 py-2 text-right text-xs text-slate-700">{formatPKRFull(r.cost)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className={`text-xs font-extrabold ${r.profit > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {formatPKRFull(r.profit)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.profitMargin > 25 ? 'bg-emerald-100 text-emerald-700' :
                          r.profitMargin > 10 ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {r.profitMargin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        <div className="font-bold text-slate-700">{r.usagePercent.toFixed(0)}%</div>
                        <div className="text-[10px] text-slate-500">{r.soldLengthFt.toFixed(1)} ft</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ────── TODAY'S CUTS ────── */}
      {tab === 'today' && today && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <KpiCard label="Total Cuts" value={String(today.cutCount)} color="violet" icon={Scissors} />
            <KpiCard label="Total sqft" value={today.totalSqftSold.toFixed(2)} color="emerald" icon={Layers} />
            <KpiCard label="Total Length" value={`${today.totalLengthSoldFt.toFixed(1)} ft`} color="blue" icon={Sparkles} />
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900">All cuts from today</h3>
            </div>
            {today.cuts.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <div className="font-bold text-slate-700">Aaj koi cut nahi</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {today.cuts.map((c) => (
                  <div key={c.id} className="p-3 flex items-center gap-3 hover:bg-slate-50">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Scissors className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-700 text-sm">{c.rollNumber}</span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="font-bold text-slate-900 text-sm truncate">{c.productName}</span>
                        {c.variantName && (
                          <span className="text-[11px] font-bold text-violet-700">— {c.variantName}</span>
                        )}
                      </div>
                      {c.note && <div className="text-[11px] text-slate-500 mt-0.5">{c.note}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-emerald-700 text-sm">{c.sqft.toFixed(2)} sqft</div>
                      <div className="text-[10px] text-slate-500">{new Date(c.createdAt).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────── TOP DESIGNS ────── */}
      {tab === 'designs' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setTopDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  topDays === d ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                Last {d} days
              </button>
            ))}
          </div>

          {top.length === 0 ? (
            <div className="rounded-3xl bg-white border border-slate-200 p-12 text-center">
              <Award className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <div className="font-bold text-slate-700">No sales data yet</div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {top.map((d, i) => (
                <div
                  key={`${d.productId}:${d.variantId}`}
                  className="rounded-2xl bg-white border-2 border-slate-200 p-4 hover:border-amber-400 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-extrabold">
                      #{i + 1}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">{d.salesCount} sales</div>
                  </div>
                  <div className="font-bold text-slate-900">{d.productName}</div>
                  {d.variantName && (
                    <div className="text-xs font-bold text-violet-700 flex items-center gap-1 mt-0.5">
                      {d.variantColor && (
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.variantColor }} />
                      )}
                      {d.variantName}
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-emerald-50 p-2">
                      <div className="text-[9px] uppercase font-bold text-emerald-700">Sold</div>
                      <div className="font-extrabold text-emerald-900">{d.totalSqft.toFixed(0)}</div>
                      <div className="text-[9px] text-emerald-700 font-bold">sqft</div>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2">
                      <div className="text-[9px] uppercase font-bold text-amber-700">Revenue</div>
                      <div className="font-extrabold text-amber-900 text-sm">{formatPKRFull(d.revenue)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────── SLOW MOVERS ────── */}
      {tab === 'slow' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[30, 60, 90, 180].map((d) => (
              <button
                key={d}
                onClick={() => setSlowDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  slowDays === d ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                {d}+ days idle
              </button>
            ))}
          </div>

          {slow.length === 0 ? (
            <div className="rounded-3xl bg-white border border-slate-200 p-12 text-center">
              <Sparkles className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
              <div className="font-bold text-slate-700">Sab rolls active hain!</div>
              <p className="text-sm text-slate-500 mt-1">Koi roll {slowDays}+ din se idle nahi hai</p>
            </div>
          ) : (
            <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-rose-50">
                <h3 className="font-bold text-rose-900">{slow.length} rolls {slowDays}+ days se idle</h3>
                <p className="text-xs text-rose-700 mt-0.5">Total locked value: {formatPKRFull(slow.reduce((s, r) => s + r.stockValueCost, 0))}</p>
              </div>
              <div className="divide-y divide-slate-100">
                {slow.map((r) => (
                  <Link key={r.id} to={`/carpet-rolls/${r.id}`} className="p-3 flex items-center gap-3 hover:bg-slate-50 transition">
                    <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                      {r.daysSinceLastActivity}d
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-bold text-slate-900 text-sm">{r.rollNumber}</div>
                      <div className="text-xs text-slate-600">
                        {r.productName}
                        {r.variantName && <span className="text-violet-700 font-bold"> — {r.variantName}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-slate-900 text-sm">{r.remainingSqft.toFixed(0)} sqft</div>
                      <div className="text-[10px] text-amber-700 font-bold">Locked: {formatPKRFull(r.stockValueCost)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────── CUT PIECES ────── */}
      {tab === 'pieces' && pieces && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-4 gap-3">
            <KpiCard label="Available" value={String(pieces.availableCount)} subValue={`${pieces.availableSqft.toFixed(2)} sqft`} color="emerald" icon={Scissors} />
            <KpiCard label="Sold" value={String(pieces.soldCount)} subValue={formatPKRFull(pieces.soldRevenue)} color="violet" icon={Award} />
            <KpiCard label="Available Value" value={formatPKRFull(pieces.availableValue)} subValue={`Cost: ${formatPKRFull(pieces.availableCost)}`} color="blue" icon={DollarSign} />
            <KpiCard label="Potential Profit" value={formatPKRFull(pieces.potentialProfit)} color="amber" icon={TrendingUp} />
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900">All Cut Pieces</h3>
            </div>
            {pieces.pieces.length === 0 ? (
              <div className="p-12 text-center">
                <Scissors className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <div className="font-bold text-slate-700">No cut pieces yet</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">Code</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">Product</th>
                      <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Size</th>
                      <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Sale</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pieces.pieces.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-bold text-xs text-violet-700">{p.pieceCode}</td>
                        <td className="px-3 py-2">
                          <div className="font-bold text-slate-900 text-xs">{p.productName}</div>
                          {p.variantName && (
                            <div className="text-[10px] text-violet-700 flex items-center gap-1">
                              {p.variantColor && (
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.variantColor }} />
                              )}
                              {p.variantName}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          <div className="font-bold text-slate-900">{p.widthFt}×{p.lengthFt}ft</div>
                          <div className="text-[10px] text-slate-500">{p.totalSqft.toFixed(2)} sqft</div>
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-extrabold text-emerald-700">
                          {formatPKRFull(p.salePrice)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            p.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' :
                            p.status === 'SOLD' ? 'bg-violet-100 text-violet-700' :
                            p.status === 'DAMAGED' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs font-mono font-bold text-slate-600">
                          {p.sourceRoll || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper: KPI Card ────────────────────────────────────────
function KpiCard({
  label, value, subValue, color, icon: Icon,
}: { label: string; value: string; subValue?: string; color: string; icon: any }) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-50 to-green-50 border-emerald-200 text-emerald-900',
    blue: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-900',
    violet: 'from-violet-50 to-purple-50 border-violet-200 text-violet-900',
    amber: 'from-amber-50 to-orange-50 border-amber-200 text-amber-900',
    rose: 'from-rose-50 to-pink-50 border-rose-200 text-rose-900',
    purple: 'from-purple-50 to-fuchsia-50 border-purple-200 text-purple-900',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br border-2 p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5" />
        <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">{label}</div>
      </div>
      <div className="text-2xl font-extrabold">{value}</div>
      {subValue && <div className="text-[11px] font-bold opacity-70 mt-0.5">{subValue}</div>}
    </div>
  );
}
