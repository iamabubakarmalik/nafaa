import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowDown, ArrowUp } from 'lucide-react';
import { stockMovementsApi, type StockMovementType } from '@/api/stock-movements.api';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const typeConfig: Record<StockMovementType, { label: string; tone: string; icon: typeof ArrowUp }> = {
  PURCHASE_IN: { label: 'Purchase In', tone: 'bg-emerald-100 text-emerald-700', icon: ArrowUp },
  SALE_OUT: { label: 'Sale Out', tone: 'bg-rose-100 text-rose-700', icon: ArrowDown },
  ADJUSTMENT_IN: { label: 'Adjustment In', tone: 'bg-blue-100 text-blue-700', icon: ArrowUp },
  ADJUSTMENT_OUT: { label: 'Adjustment Out', tone: 'bg-orange-100 text-orange-700', icon: ArrowDown },
  RETURN_IN: { label: 'Return In', tone: 'bg-violet-100 text-violet-700', icon: ArrowUp },
  OPENING_BALANCE: { label: 'Opening', tone: 'bg-slate-100 text-slate-700', icon: ArrowUp },
};

export default function StockMovementsPage() {
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: stockMovementsApi.list,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 text-white p-6 shadow-soft">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            <Activity className="h-3.5 w-3.5" />
            Inventory Audit Trail
          </div>
          <h2 className="mt-3 text-3xl font-bold">Stock Movements</h2>
          <p className="mt-2 text-sm text-white/80">
            Har stock IN aur OUT ka complete record — jab kuch bhi ghatta ya barhta hai.
          </p>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">All Movements</h3>
          <p className="text-sm text-slate-500">Latest 100 inventory events</p>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading...</div>
        ) : movements.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
              <Activity className="h-7 w-7 text-slate-400" />
            </div>
            <h4 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi movement nahi</h4>
            <p className="mt-1 text-sm text-slate-500">POS ya purchase se stock change ho to yahan record aayega.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-6 py-4 font-medium">Type</th>
                  <th className="text-left px-6 py-4 font-medium">Product</th>
                  <th className="text-left px-6 py-4 font-medium">Quantity</th>
                  <th className="text-left px-6 py-4 font-medium">Balance After</th>
                  <th className="text-left px-6 py-4 font-medium">Reference</th>
                  <th className="text-left px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => {
                  const cfg = typeConfig[m.type];
                  const Icon = cfg.icon;
                  const isPositive = m.quantity > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.tone}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{m.product.name}</div>
                        <div className="text-xs text-slate-500">{m.product.sku || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isPositive ? '+' : ''}{m.quantity} {m.product.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {m.balanceAfter} {m.product.unit}
                      </td>
                      <td className="px-6 py-4 text-slate-700">{m.reference || '—'}</td>
                      <td className="px-6 py-4 text-slate-500">{formatDate(m.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
