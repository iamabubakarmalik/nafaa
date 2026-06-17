import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { carpetRollsApi } from '@/features/industries/carpet/api/carpet-rolls.api';
import { AddRollModal } from '@/features/industries/carpet/components/AddRollModal';
import type { IndustrySectionProps } from '@/features/industries/_shared/types/section.types';

export function CarpetHeaderActionBar({ productId, isEdit }: IndustrySectionProps) {
  const queryClient = useQueryClient();
  const [showAddRoll, setShowAddRoll] = useState(false);

  const { data: rollsData } = useQuery({
    queryKey: ['carpet-rolls-for-product', productId],
    queryFn: () => carpetRollsApi.list({ productId, limit: 100 }),
    enabled: isEdit && !!productId,
  });

  if (!isEdit || !productId) return null;

  const rolls = rollsData?.items ?? [];
  const activeRolls = rolls.filter((r) => r.status === 'ACTIVE' && r.remainingLengthFt > 0);
  const totalSqft = activeRolls.reduce((acc, r) => acc + Number(r.remainingSqft), 0);
  const totalLength = activeRolls.reduce((acc, r) => acc + Number(r.remainingLengthFt), 0);

  return (
    <>
      {showAddRoll && (
        <AddRollModal
          preselectedProductId={productId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['carpet-rolls-for-product', productId] });
            queryClient.invalidateQueries({ queryKey: ['carpet-product-summary'] });
          }}
          onClose={() => setShowAddRoll(false)}
        />
      )}

      <div className="mt-5 rounded-2xl bg-white/10 backdrop-blur p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">
              Available Stock
            </div>
            <div className="text-2xl font-extrabold mt-0.5">
              {totalSqft.toFixed(0)}
              <span className="text-sm font-bold ml-1">sqft</span>
            </div>
          </div>
          <div className="h-10 w-px bg-white/20" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">
              Active Rolls
            </div>
            <div className="text-2xl font-extrabold mt-0.5">{activeRolls.length}</div>
          </div>
          <div className="h-10 w-px bg-white/20" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">
              Total Length
            </div>
            <div className="text-2xl font-extrabold mt-0.5">
              {totalLength.toFixed(0)}
              <span className="text-sm font-bold ml-1">ft</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowAddRoll(true)}
            className="bg-white text-emerald-900 hover:bg-emerald-50 font-extrabold"
          >
            <Plus className="h-4 w-4" /> Add Roll
          </Button>
          <Link to={`/carpet-rolls?productId=${productId}`}>
            <Button
              variant="secondary"
              className="bg-white/15 text-white hover:bg-white/25 border-white/20"
            >
              <Layers className="h-4 w-4" /> Manage Rolls
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
