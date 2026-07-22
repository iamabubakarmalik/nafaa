import { useQuery } from '@tanstack/react-query';
import { Smartphone, ShieldCheck, Award } from 'lucide-react';
import type { IndustrySectionProps } from '@/features/industries/_shared/types/section.types';
import {
  imeiApi,
  type PtaStatus,
  PTA_STATUS_LABELS,
  PTA_STATUS_COLORS,
} from '@/features/industries/mobile/api/imei.api';

export function MobileCustomerStockBlock({
  productId,
  isEdit,
  form,
}: IndustrySectionProps) {
  const { data: imeis = [] } = useQuery({
    queryKey: ['product-imeis', productId],
    queryFn: () => imeiApi.listByProduct(productId!),
    enabled: !!productId && isEdit,
  });

  const inStockImeis = imeis.filter((i) => i.status === 'IN_STOCK');
  const inStockCount = inStockImeis.length;

  // Find dominant PTA status
  const ptaCounts: Record<PtaStatus, number> = {
    APPROVED: 0, NON_PTA: 0, PATCH: 0, PENDING: 0, EXEMPT: 0,
  };
  inStockImeis.forEach((i: any) => {
    const status = (i.ptaStatus || 'PENDING') as PtaStatus;
    ptaCounts[status] = (ptaCounts[status] || 0) + 1;
  });

  // Average warranty months
  const warranties = inStockImeis
    .map((i: any) => Number(i.warrantyMonths || 0))
    .filter((w) => w > 0);
  const avgWarranty = warranties.length > 0
    ? Math.round(warranties.reduce((s, w) => s + w, 0) / warranties.length)
    : 0;

  if (!isEdit) return null;

  return (
    <div className="pt-3 border-t border-slate-100 space-y-2">
      {/* Stock availability */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-slate-700 font-bold">
          Availability
        </div>
        <div className={`text-xs font-extrabold ${
          inStockCount > 0 ? 'text-emerald-700' : 'text-rose-700'
        }`}>
          {inStockCount > 0 ? `${inStockCount} in stock` : 'Out of stock'}
        </div>
      </div>

      {/* PTA + Warranty badges */}
      {inStockCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {/* PTA badge — show dominant status */}
          {(['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'] as PtaStatus[])
            .filter((status) => ptaCounts[status] > 0)
            .slice(0, 3)
            .map((status) => {
              const colors = PTA_STATUS_COLORS[status];
              const count = ptaCounts[status];
              return (
                <div
                  key={status}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
                >
                  <ShieldCheck className="h-2.5 w-2.5" />
                  <span className="text-[10px] font-extrabold">
                    {PTA_STATUS_LABELS[status]}
                  </span>
                  <span className="text-[9px] opacity-70">({count})</span>
                </div>
              );
            })}

          {/* Warranty badge */}
          {avgWarranty > 0 && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700">
              <Award className="h-2.5 w-2.5" />
              <span className="text-[10px] font-extrabold">{avgWarranty}m warranty</span>
            </div>
          )}
        </div>
      )}

      {/* Quick info note */}
      {inStockCount === 0 && (
        <div className="text-[10px] text-slate-500 italic">
          IMEI add karne ke baad customer ko PTA + warranty status visible hogi
        </div>
      )}
    </div>
  );
}
