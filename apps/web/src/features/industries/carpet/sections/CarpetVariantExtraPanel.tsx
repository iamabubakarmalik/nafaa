import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus, ArrowRight } from 'lucide-react';
import { carpetRollsApi } from '@/features/industries/carpet/api/carpet-rolls.api';
import { AddRollModal } from '@/features/industries/carpet/components/AddRollModal';
import type {
  IndustrySectionProps,
} from '@/features/industries/_shared/types/section.types';
import type { ProductVariant } from '@/api/product-variants.api';

interface Props extends IndustrySectionProps {
  variant: ProductVariant;
}

export function CarpetVariantExtraPanel({ productId, variant }: Props) {
  const queryClient = useQueryClient();
  const [showAddRoll, setShowAddRoll] = useState(false);

  const { data: rollsData, refetch } = useQuery({
    queryKey: ['carpet-rolls-for-variant', productId, variant.id],
    queryFn: () => carpetRollsApi.list({ productId, variantId: variant.id, limit: 100 }),
    enabled: !!productId,
  });

  const rolls = rollsData?.items ?? [];
  const activeRolls = rolls.filter((r) => r.status === 'ACTIVE');
  const variantSqft = activeRolls.reduce((acc, r) => acc + Number(r.remainingSqft), 0);

  return (
    <>
      {showAddRoll && productId && (
        <AddRollModal
          preselectedProductId={productId}
          preselectedVariantId={variant.id}
          onSuccess={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['carpet-rolls-for-product', productId] });
            queryClient.invalidateQueries({ queryKey: ['carpet-product-summary'] });
          }}
          onClose={() => setShowAddRoll(false)}
        />
      )}

      <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-sm">
          <Layers className="h-4 w-4 text-emerald-700" />
          <div>
            <span className="font-extrabold text-emerald-900">{variantSqft.toFixed(0)} sqft</span>
            <span className="text-emerald-700 ml-2">
              in {activeRolls.length} active roll{activeRolls.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddRoll(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          >
            <Plus className="h-3 w-3" /> Add Roll
          </button>
          <Link
            to={`/carpet-rolls?productId=${productId}&variantId=${variant.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100"
          >
            View Rolls <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </>
  );
}
