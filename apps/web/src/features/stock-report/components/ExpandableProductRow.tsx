import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, Package, Layers, Smartphone } from 'lucide-react';
import { stockReportApi } from '@/api/stock-report.api';
import { VariantsDetailTable } from './VariantsDetailTable';
import { CarpetDetailTable } from './CarpetDetailTable';
import { ImeiDetailTable } from './ImeiDetailTable';

interface Props {
  productId: string;
  industryType: 'STANDARD' | 'CARPET' | 'MOBILE' | 'WEIGHT_BASED';
  productUnit: string;
  productName: string;
}

export function ExpandableProductRow({
  productId,
  industryType,
  productUnit,
  productName,
}: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['product-detail', productId],
    queryFn: () => stockReportApi.getProductDetail(productId),
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-dashed border-slate-300 p-8 text-center">
        <Loader2 className="h-8 w-8 text-brand-600 mx-auto animate-spin mb-2" />
        <p className="text-sm font-bold text-slate-700">Loading details...</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Fetching variants, rolls, IMEIs for <strong>{productName}</strong>
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-rose-600 mx-auto mb-2" />
        <p className="text-sm font-bold text-rose-900">Failed to load details</p>
        <p className="text-xs text-rose-700 mt-0.5">
          Please try again or check console
        </p>
      </div>
    );
  }

  const hasVariants = data.variants.length > 0;
  const hasCarpetStock = data.carpetRolls.length > 0 || data.carpetCutPieces.length > 0;
  const hasImeis = data.imeis.length > 0;

  return (
    <div className="space-y-4 py-2">
      {/* Sub-section header */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200" />
        <div className="px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-extrabold uppercase tracking-wider">
          Detailed Breakdown
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200" />
      </div>

      {/* CARPET INDUSTRY */}
      {industryType === 'CARPET' && (
        <CarpetDetailTable rolls={data.carpetRolls} cutPieces={data.carpetCutPieces} />
      )}

      {/* MOBILE INDUSTRY */}
      {industryType === 'MOBILE' && <ImeiDetailTable imeis={data.imeis} />}

      {/* STANDARD/WEIGHT — Variants always show if exist */}
      {(industryType === 'STANDARD' || industryType === 'WEIGHT_BASED') && (
        <VariantsDetailTable variants={data.variants} parentUnit={productUnit} />
      )}

      {/* Always show variants section ALSO for carpet/mobile if they have variants */}
      {(industryType === 'CARPET' || industryType === 'MOBILE') && hasVariants && (
        <>
          <div className="flex items-center gap-2 pt-2">
            <div className="h-px flex-1 bg-violet-200" />
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-violet-700">
              + Variants Master List
            </div>
            <div className="h-px flex-1 bg-violet-200" />
          </div>
          <VariantsDetailTable variants={data.variants} parentUnit={productUnit} />
        </>
      )}

      {/* Empty state */}
      {!hasVariants && !hasCarpetStock && !hasImeis && (
        <div className="rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 p-8 text-center">
          <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700">No detailed breakdown available</p>
          <p className="text-xs text-slate-500 mt-1">
            Iss product mein koi variants, rolls, ya IMEIs nahi hain
          </p>
        </div>
      )}
    </div>
  );
}
