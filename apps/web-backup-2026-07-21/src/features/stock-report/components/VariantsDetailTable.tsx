import { Package, AlertTriangle, CheckCircle2, XCircle, Hash } from 'lucide-react';
import { formatPKR } from '@/lib/format';
import type { VariantDetail } from '@/api/stock-report.api';

interface Props {
  variants: VariantDetail[];
  parentUnit: string;
}

export function VariantsDetailTable({ variants, parentUnit }: Props) {
  if (variants.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 p-6 text-center">
        <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-bold text-slate-700">No variants</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Is product mein variants nahi hain
        </p>
      </div>
    );
  }

  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const totalValue = variants.reduce((sum, v) => sum + v.stock * v.costPrice, 0);

  return (
    <div className="rounded-2xl bg-white border-2 border-violet-200 overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-violet-600 text-white flex items-center justify-center">
            <Hash className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-violet-900 text-sm">
              {variants.length} Variant{variants.length !== 1 ? 's' : ''}
            </h4>
            <p className="text-[10px] text-violet-700 font-bold">
              Total: {totalStock.toFixed(totalStock % 1 === 0 ? 0 : 2)} {parentUnit} •{' '}
              Value: {formatPKR(totalValue)}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-violet-50/50 border-b border-violet-200">
            <tr>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-violet-900 w-12">#</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-violet-900">
                Variant
              </th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-violet-900">
                Attributes
              </th>
              <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-violet-900">
                Stock
              </th>
              <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-violet-900">
                Cost
              </th>
              <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-violet-900">
                Price
              </th>
              <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-violet-900">
                Stock Value
              </th>
              <th className="px-3 py-2 text-center font-bold uppercase tracking-wider text-violet-900">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-violet-100">
            {variants.map((v, idx) => {
              const stockValue = v.stock * v.costPrice;
              const isOut = v.stock <= 0;
              const isLow = v.stock > 0 && v.stock <= v.lowStockAlert;
              const StatusIcon = isOut ? XCircle : isLow ? AlertTriangle : CheckCircle2;
              const statusColor = isOut
                ? 'bg-rose-100 text-rose-700'
                : isLow
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700';

              return (
                <tr
                  key={v.id}
                  className={`hover:bg-violet-50/30 transition ${
                    isOut ? 'bg-rose-50/30' : isLow ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <td className="px-3 py-2.5 text-violet-500 font-mono text-[10px]">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {v.imageUrl ? (
                          <img src={v.imageUrl} alt={v.name} className="h-full w-full object-cover" />
                        ) : v.colorHex ? (
                          <div className="h-full w-full" style={{ backgroundColor: v.colorHex }} />
                        ) : (
                          <Package className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 text-xs truncate">
                          {v.name}
                        </div>
                        {v.sku && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {v.sku}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {v.color && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 border border-violet-200 text-[10px] font-bold text-violet-700">
                          {v.colorHex && (
                            <span
                              className="h-2 w-2 rounded-full border border-slate-300"
                              style={{ backgroundColor: v.colorHex }}
                            />
                          )}
                          {v.color}
                        </span>
                      )}
                      {v.size && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-700">
                          {v.size}
                        </span>
                      )}
                      {v.barcode && (
                        <span className="text-[9px] font-mono text-slate-500">
                          {v.barcode}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="font-extrabold text-slate-900 tabular-nums">
                      {v.stock.toFixed(v.stock % 1 === 0 ? 0 : 2)}
                    </div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase">
                      {parentUnit}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-700 tabular-nums">
                    {formatPKR(v.costPrice)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[11px] font-bold text-emerald-700 tabular-nums">
                    {formatPKR(v.price)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[11px] font-extrabold text-slate-900 tabular-nums">
                    {formatPKR(stockValue)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${statusColor}`}
                    >
                      <StatusIcon className="h-2.5 w-2.5" />
                      {isOut ? 'OUT' : isLow ? 'LOW' : 'OK'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-violet-50 border-t-2 border-violet-200 font-extrabold">
            <tr>
              <td colSpan={3} className="px-3 py-2.5 text-right text-[10px] uppercase text-violet-900">
                Total ({variants.length} variants):
              </td>
              <td className="px-3 py-2.5 text-right text-violet-900 tabular-nums">
                {totalStock.toFixed(totalStock % 1 === 0 ? 0 : 2)}
              </td>
              <td></td>
              <td></td>
              <td className="px-3 py-2.5 text-right text-violet-900 tabular-nums">
                {formatPKR(totalValue)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
