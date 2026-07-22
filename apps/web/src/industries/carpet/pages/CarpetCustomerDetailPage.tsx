import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layers, Scissors, Ruler, Award } from 'lucide-react';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import CustomerDetailPage from '@modules/customers/customers/pages/CustomerDetailPage';
import { formatPKR } from '@core/lib/format';
import { formatDateTime } from '@modules/customers/customers/components/shared/CustomerShared';

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
      const isCarpet = CARPET_UNITS.has(item.product?.unit || '');
      if (!isCarpet) continue;
      carpetLines.push({ ...item, sale });
    }
  }

  const totalSqft = carpetLines.reduce((s, l) => s + Number(l.quantity || 0), 0);
  const totalRevenue = carpetLines.reduce((s, l) => s + Number(l.total || 0), 0);

  // Favorite designs
  const designCounts = new Map<string, { name: string; sqft: number; revenue: number }>();
  for (const line of carpetLines) {
    const pid = line.productId || line.product?.id;
    if (!pid) continue;
    const existing = designCounts.get(pid) ?? { name: line.product?.name || 'Unknown', sqft: 0, revenue: 0 };
    existing.sqft += Number(line.quantity || 0);
    existing.revenue += Number(line.total || 0);
    designCounts.set(pid, existing);
  }
  const favoriteDesigns = Array.from(designCounts.entries())
    .map(([pid, d]) => ({ pid, ...d }))
    .sort((a, b) => b.sqft - a.sqft)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {carpetLines.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-600" />
            <h3 className="font-extrabold text-emerald-900">🧶 Carpet Purchase History</h3>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white border-2 border-emerald-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-emerald-700">Total Sqft</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalSqft.toFixed(0)}</div>
            </div>
            <div className="rounded-xl bg-white border-2 border-teal-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-teal-700">Total Purchases</div>
              <div className="text-2xl font-extrabold text-teal-900 mt-1">{carpetLines.length}</div>
            </div>
            <div className="rounded-xl bg-white border-2 border-amber-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-amber-700">Revenue</div>
              <div className="text-lg font-extrabold text-amber-900 mt-1">{formatPKR(totalRevenue)}</div>
            </div>
          </div>

          {favoriteDesigns.length > 0 && (
            <div className="rounded-2xl bg-white border-2 border-emerald-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-4 w-4 text-amber-500" />
                <h4 className="font-bold text-slate-900 text-sm">⭐ Favorite Designs</h4>
              </div>
              <div className="space-y-2">
                {favoriteDesigns.map((d, idx) => (
                  <div key={d.pid} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-6 w-6 rounded ${
                        idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-500' : 'bg-slate-500'
                      } text-white text-xs font-extrabold flex items-center justify-center`}>{idx + 1}</div>
                      <span className="font-bold text-slate-900 text-sm truncate">{d.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-emerald-700">{d.sqft.toFixed(0)} sqft</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{formatPKR(d.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white border-2 border-emerald-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-emerald-100">
              <h4 className="font-bold text-slate-900 text-sm">Cut Details History</h4>
            </div>
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {carpetLines.slice(0, 10).map((line: any) => {
                const isRoll = (line.note || '').includes('Cut from');
                const isCutPiece = (line.note || '').includes('Cut piece');
                return (
                  <Link key={line.id} to={`/sales/${line.sale.id}/receipt`}
                    className="block px-4 py-3 hover:bg-emerald-50 transition">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isRoll && <Layers className="h-3 w-3 text-emerald-600 shrink-0" />}
                          {isCutPiece && <Scissors className="h-3 w-3 text-violet-600 shrink-0" />}
                          <span className="font-bold text-slate-900 text-sm truncate">{line.product?.name}</span>
                        </div>
                        {line.note && (
                          <div className="text-[10px] font-mono text-slate-600 mt-0.5 truncate">{line.note}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-emerald-700 text-sm">{Number(line.quantity).toFixed(2)} {line.product?.unit}</div>
                        <div className="text-[10px] text-slate-500">{formatPKR(line.total)}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <CustomerDetailPage />
    </div>
  );
}
