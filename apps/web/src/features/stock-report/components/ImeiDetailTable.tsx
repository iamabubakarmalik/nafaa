import { Smartphone, Shield, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { formatPKR } from '@/lib/format';
import type { ImeiDetail } from '@/api/stock-report.api';

interface Props {
  imeis: ImeiDetail[];
}

const ptaConfig: Record<string, { label: string; color: string; icon: any }> = {
  APPROVED: { label: 'PTA Approved', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  NON_PTA: { label: 'Non-PTA', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  PATCH: { label: 'Patched', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  PENDING: { label: 'Pending', color: 'bg-blue-100 text-blue-700', icon: Shield },
  EXEMPT: { label: 'Exempt', color: 'bg-violet-100 text-violet-700', icon: CheckCircle2 },
};

export function ImeiDetailTable({ imeis }: Props) {
  if (imeis.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 p-6 text-center">
        <Smartphone className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-bold text-slate-700">No IMEIs</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Koi IMEI registered nahi (sirf in-stock dikhe rahe)
        </p>
      </div>
    );
  }

  const totalValue = imeis.reduce((sum, i) => sum + i.costPrice, 0);

  return (
    <div className="rounded-2xl bg-white border-2 border-blue-200 overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-blue-900 text-sm">
              {imeis.length} IMEI{imeis.length !== 1 ? 's' : ''} in stock
            </h4>
            <p className="text-[10px] text-blue-700 font-bold">
              Total Cost: {formatPKR(totalValue)}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[400px]">
        <table className="w-full text-xs">
          <thead className="bg-blue-50/50 border-b border-blue-200 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-blue-900 w-10">#</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-blue-900">IMEI</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-blue-900">Variant / Color</th>
              <th className="px-3 py-2 text-center font-bold uppercase tracking-wider text-blue-900">PTA Status</th>
              <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-blue-900">Cost</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-blue-900">Warranty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100">
            {imeis.map((i, idx) => {
              const pta = ptaConfig[i.ptaStatus] || ptaConfig.PENDING;
              const PtaIcon = pta.icon;
              const warrantyDate = i.warrantyExpiry ? new Date(i.warrantyExpiry) : null;
              const isWarrantyExpired = warrantyDate && warrantyDate < new Date();

              return (
                <tr key={i.id} className="hover:bg-blue-50/30 transition">
                  <td className="px-3 py-2 text-blue-500 font-mono text-[10px]">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-mono font-extrabold text-blue-900 text-[11px]">
                      {i.imei1}
                    </div>
                    {i.imei2 && (
                      <div className="font-mono text-[9px] text-slate-500 mt-0.5">
                        2: {i.imei2}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {i.variantName && (
                      <div className="text-[10px] font-bold text-violet-700">
                        {i.variantName}
                      </div>
                    )}
                    {i.color && (
                      <div className="text-[10px] text-slate-600 font-bold">
                        {i.color}
                      </div>
                    )}
                    {!i.variantName && !i.color && (
                      <span className="text-slate-400 text-[10px]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${pta.color}`}
                    >
                      <PtaIcon className="h-2.5 w-2.5" />
                      {pta.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-[11px] font-bold text-slate-700 tabular-nums">
                    {formatPKR(i.costPrice)}
                  </td>
                  <td className="px-3 py-2 text-[10px]">
                    {warrantyDate ? (
                      <div
                        className={`font-bold ${
                          isWarrantyExpired ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {warrantyDate.toLocaleDateString('en-PK', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {isWarrantyExpired && (
                          <div className="text-[9px] text-rose-600">EXPIRED</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
