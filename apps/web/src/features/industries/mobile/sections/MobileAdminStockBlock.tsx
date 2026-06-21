import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Smartphone, ShieldCheck, CheckCircle2, AlertOctagon, AlertTriangle,
  Clock, Shield, TrendingUp,
} from 'lucide-react';
import type { IndustrySectionProps } from '@/features/industries/_shared/types/section.types';
import {
  imeiApi,
  type PtaStatus,
  PTA_STATUS_LABELS,
  PTA_STATUS_COLORS,
} from '@/features/industries/mobile/api/imei.api';
import { formatPKRFull } from '@/lib/format';

const PTA_ICONS: Record<PtaStatus, any> = {
  APPROVED: CheckCircle2,
  NON_PTA: AlertOctagon,
  PATCH: AlertTriangle,
  PENDING: Clock,
  EXEMPT: Shield,
};

export function MobileAdminStockBlock({
  productId,
  isEdit,
  form,
}: IndustrySectionProps) {
  const { data: imeis = [] } = useQuery({
    queryKey: ['product-imeis', productId],
    queryFn: () => imeiApi.listByProduct(productId!),
    enabled: !!productId && isEdit,
  });

  const stats = {
    total: imeis.length,
    inStock: imeis.filter((i) => i.status === 'IN_STOCK').length,
    sold: imeis.filter((i) => i.status === 'SOLD').length,
    returned: imeis.filter((i) => i.status === 'RETURNED').length,
  };

  // PTA breakdown
  const ptaCounts: Record<PtaStatus, number> = {
    APPROVED: 0, NON_PTA: 0, PATCH: 0, PENDING: 0, EXEMPT: 0,
  };
  let totalPtaTax = 0;
  let totalCostValue = 0;
  imeis.forEach((i: any) => {
    const status = (i.ptaStatus || 'PENDING') as PtaStatus;
    ptaCounts[status] = (ptaCounts[status] || 0) + 1;
    totalPtaTax += Number(i.ptaTaxPaid || 0);
    if (i.status === 'IN_STOCK') totalCostValue += Number(i.costPrice || 0);
  });

  if (!isEdit || !productId) {
    return (
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
        <Smartphone className="h-5 w-5 text-blue-400 mx-auto mb-1" />
        <div className="text-[10px] text-blue-700 font-bold">
          IMEI tracking activates after save
        </div>
      </div>
    );
  }

  if (stats.total === 0) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
        <Smartphone className="h-5 w-5 text-amber-500 mx-auto mb-1" />
        <div className="text-[10px] text-amber-800 font-bold">No IMEIs added yet</div>
        <Link
          to={`/products/${productId}/imei`}
          className="text-[10px] text-blue-700 font-bold hover:underline mt-1 inline-block"
        >
          Add IMEIs →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* IMEI Stats — 3 columns */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-center">
          <div className="text-[8px] uppercase text-blue-700 font-bold">Total</div>
          <div className="text-base font-extrabold text-blue-900">{stats.total}</div>
        </div>
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-center">
          <div className="text-[8px] uppercase text-emerald-700 font-bold">In Stock</div>
          <div className="text-base font-extrabold text-emerald-900">{stats.inStock}</div>
        </div>
        <div className="rounded-lg bg-violet-50 border border-violet-200 p-2 text-center">
          <div className="text-[8px] uppercase text-violet-700 font-bold">Sold</div>
          <div className="text-base font-extrabold text-violet-900">{stats.sold}</div>
        </div>
      </div>

      {/* PTA Breakdown Mini Chart */}
      <div className="rounded-lg bg-white border border-slate-200 p-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[9px] uppercase text-slate-600 font-bold flex items-center gap-1">
            <ShieldCheck className="h-2.5 w-2.5" />
            PTA Status
          </div>
          {totalPtaTax > 0 && (
            <div className="text-[9px] text-emerald-700 font-bold">
              Tax: {formatPKRFull(totalPtaTax)}
            </div>
          )}
        </div>
        <div className="flex gap-0.5">
          {(['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'] as PtaStatus[]).map((status) => {
            const count = ptaCounts[status];
            const colors = PTA_STATUS_COLORS[status];
            const Icon = PTA_ICONS[status];
            const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div
                key={status}
                className={`flex-1 rounded p-1 text-center border ${
                  count > 0 ? `${colors.bg} ${colors.border}` : 'bg-slate-50 border-slate-200 opacity-50'
                }`}
                title={`${PTA_STATUS_LABELS[status]}: ${count} (${percent.toFixed(0)}%)`}
              >
                <Icon className={`h-2.5 w-2.5 mx-auto ${count > 0 ? colors.text : 'text-slate-400'}`} />
                <div className={`text-[10px] font-extrabold mt-0.5 ${count > 0 ? colors.text : 'text-slate-400'}`}>
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stock Value */}
      {totalCostValue > 0 && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
          <div className="flex items-center justify-between">
            <div className="text-[9px] uppercase text-emerald-700 font-bold flex items-center gap-1">
              <TrendingUp className="h-2.5 w-2.5" />
              Stock Value
            </div>
            <div className="text-xs font-extrabold text-emerald-900">
              {formatPKRFull(totalCostValue)}
            </div>
          </div>
        </div>
      )}

      {/* Returns warning */}
      {stats.returned > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-center">
          <div className="text-[9px] text-amber-800 font-bold">
            {stats.returned} returned IMEI{stats.returned !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
