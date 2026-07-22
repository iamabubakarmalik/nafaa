import { useQuery } from '@tanstack/react-query';
import { carpetRollsApi } from '@/features/industries/carpet/api/carpet-rolls.api';
import type { IndustrySectionProps } from '@/features/industries/_shared/types/section.types';

export function CarpetCustomerStockBlock({ productId, isEdit }: IndustrySectionProps) {
  const { data: rollsData } = useQuery({
    queryKey: ['carpet-rolls-for-product', productId],
    queryFn: () => carpetRollsApi.list({ productId, limit: 100 }),
    enabled: isEdit && !!productId,
  });

  const rolls = rollsData?.items ?? [];
  const activeRolls = rolls.filter((r) => r.status === 'ACTIVE' && r.remainingLengthFt > 0);
  const totalSqft = activeRolls.reduce((acc, r) => acc + Number(r.remainingSqft), 0);
  const totalLength = activeRolls.reduce((acc, r) => acc + Number(r.remainingLengthFt), 0);

  if (activeRolls.length === 0) return null;

  return (
    <div className="pt-3 border-t border-slate-100">
      <div className="text-[11px] uppercase tracking-wider text-slate-700 font-bold mb-2">
        Stock Available
      </div>
      <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 p-3">
        <div className="flex items-baseline gap-1">
          <div className="text-2xl font-extrabold text-emerald-700">{totalSqft.toFixed(0)}</div>
          <div className="text-xs font-bold text-emerald-700">sqft</div>
        </div>
        <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
          {activeRolls.length} active roll{activeRolls.length !== 1 ? 's' : ''} •{' '}
          {totalLength.toFixed(0)}ft total length
        </div>
      </div>
    </div>
  );
}
