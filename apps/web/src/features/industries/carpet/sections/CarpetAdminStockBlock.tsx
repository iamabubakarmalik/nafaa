import { useQuery } from '@tanstack/react-query';
import { Layers } from 'lucide-react';
import { carpetRollsApi } from '@/features/industries/carpet/api/carpet-rolls.api';
import type { IndustrySectionProps } from '@/features/industries/_shared/types/section.types';

export function CarpetAdminStockBlock({ productId, isEdit, variants }: IndustrySectionProps) {
  const { data: rollsData } = useQuery({
    queryKey: ['carpet-rolls-for-product', productId],
    queryFn: () => carpetRollsApi.list({ productId, limit: 100 }),
    enabled: isEdit && !!productId,
  });

  const rolls = rollsData?.items ?? [];
  const activeRolls = rolls.filter((r) => r.status === 'ACTIVE' && r.remainingLengthFt > 0);
  const totalSqft = activeRolls.reduce((acc, r) => acc + Number(r.remainingSqft), 0);

  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
        <div className="text-[9px] text-emerald-700 font-bold uppercase flex items-center gap-1">
          <Layers className="h-2.5 w-2.5" />
          Carpet Stock
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <div className="text-lg font-extrabold text-emerald-900">{totalSqft.toFixed(0)}</div>
          <div className="text-[10px] text-emerald-700 font-bold">sqft</div>
        </div>
        <div className="text-[9px] text-emerald-700 font-bold">
          {activeRolls.length} active rolls
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-white border border-slate-200 p-2">
          <div className="text-[9px] text-slate-500 font-bold uppercase">Variants</div>
          <div className="text-sm font-extrabold text-slate-900">{variants.length}</div>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-2">
          <div className="text-[9px] text-slate-500 font-bold uppercase">Rolls</div>
          <div className="text-sm font-extrabold text-slate-900">{rolls.length}</div>
        </div>
      </div>
    </div>
  );
}
