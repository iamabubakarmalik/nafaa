import { View, Text, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Package, AlertCircle } from 'lucide-react-native';
import { stockReportApi, type IndustryType } from '@/api/stock-report.api';
import { VariantsDetailTable } from './VariantsDetailTable';
import { CarpetDetailTable } from './CarpetDetailTable';
import { ImeiDetailTable } from './ImeiDetailTable';

interface Props {
  productId: string;
  industryType: IndustryType;
  productUnit: string;
  productName: string;
}

export function ExpandableProductRow({ productId, industryType, productUnit, productName }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stock-report-product-detail', productId],
    queryFn: () => stockReportApi.getProductDetail(productId),
  });

  if (isLoading) {
    return (
      <View className="rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 p-6 items-center">
        <ActivityIndicator size="small" color="#16a34a" />
        <Text className="mt-2 text-xs font-bold text-slate-700">Loading details...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-4 items-center">
        <AlertCircle size={28} color="#dc2626" />
        <Text className="mt-2 text-sm font-bold text-rose-900">Failed to load</Text>
      </View>
    );
  }

  const hasVariants = data.variants.length > 0;
  const hasCarpetStock = data.carpetRolls.length > 0 || data.carpetCutPieces.length > 0;
  const hasImeis = data.imeis.length > 0;

  return (
    <View className="gap-3">
      {/* Header separator */}
      <View className="flex-row items-center gap-2">
        <View className="flex-1 h-px bg-slate-200" />
        <View className="px-2.5 py-1 rounded-full bg-slate-900">
          <Text className="text-[9px] font-extrabold uppercase tracking-wider text-white">
            Detailed Breakdown
          </Text>
        </View>
        <View className="flex-1 h-px bg-slate-200" />
      </View>

      {industryType === 'CARPET' && (
        <CarpetDetailTable rolls={data.carpetRolls} cutPieces={data.carpetCutPieces} />
      )}

      {industryType === 'MOBILE' && <ImeiDetailTable imeis={data.imeis} />}

      {(industryType === 'STANDARD' || industryType === 'WEIGHT_BASED') && (
        <VariantsDetailTable variants={data.variants} parentUnit={productUnit} />
      )}

      {(industryType === 'CARPET' || industryType === 'MOBILE') && hasVariants && (
        <>
          <View className="flex-row items-center gap-2">
            <View className="flex-1 h-px bg-violet-200" />
            <Text className="text-[9px] font-extrabold uppercase tracking-wider text-violet-700">
              + Variants
            </Text>
            <View className="flex-1 h-px bg-violet-200" />
          </View>
          <VariantsDetailTable variants={data.variants} parentUnit={productUnit} />
        </>
      )}

      {!hasVariants && !hasCarpetStock && !hasImeis && (
        <View className="rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 p-6 items-center">
          <Package size={28} color="#cbd5e1" />
          <Text className="mt-2 font-bold text-slate-700 text-sm">No breakdown available</Text>
          <Text className="text-xs text-slate-500 mt-1">Koi variants/rolls/IMEIs nahi</Text>
        </View>
      )}
    </View>
  );
}
