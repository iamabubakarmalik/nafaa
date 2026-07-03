import { View, Text, Image } from 'react-native';
import { Package, AlertTriangle, CheckCircle2, XCircle, Hash } from 'lucide-react-native';
import type { VariantDetail } from '@/api/stock-report.api';
import { formatPKR } from '@/lib/format';

interface Props {
  variants: VariantDetail[];
  parentUnit: string;
}

export function VariantsDetailTable({ variants, parentUnit }: Props) {
  if (variants.length === 0) {
    return (
      <View className="rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 p-6 items-center">
        <Package size={28} color="#cbd5e1" />
        <Text className="mt-2 text-sm font-bold text-slate-700">No variants</Text>
        <Text className="text-xs text-slate-500 mt-0.5">Is product mein variants nahi</Text>
      </View>
    );
  }

  const totalStock = variants.reduce((s, v) => s + v.stock, 0);
  const totalValue = variants.reduce((s, v) => s + v.stock * v.costPrice, 0);

  return (
    <View className="rounded-2xl bg-white border-2 border-violet-200 overflow-hidden">
      <View className="px-3 py-2.5 bg-violet-50 border-b-2 border-violet-200 flex-row items-center gap-2">
        <View className="h-8 w-8 rounded-lg bg-violet-600 items-center justify-center">
          <Hash size={16} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text className="font-extrabold text-violet-900 text-sm">
            {variants.length} Variant{variants.length !== 1 ? 's' : ''}
          </Text>
          <Text className="text-[10px] text-violet-700 font-bold">
            {totalStock.toFixed(totalStock % 1 === 0 ? 0 : 2)} {parentUnit} • {formatPKR(totalValue)}
          </Text>
        </View>
      </View>

      <View className="gap-2 p-3">
        {variants.map((v, idx) => {
          const stockValue = v.stock * v.costPrice;
          const isOut = v.stock <= 0;
          const isLow = v.stock > 0 && v.stock <= v.lowStockAlert;
          const statusColor = isOut ? '#dc2626' : isLow ? '#f59e0b' : '#16a34a';
          const statusBg = isOut ? '#fee2e2' : isLow ? '#fef3c7' : '#dcfce7';
          const StatusIcon = isOut ? XCircle : isLow ? AlertTriangle : CheckCircle2;

          return (
            <View
              key={v.id}
              className="rounded-xl border p-2.5"
              style={{
                borderColor: isOut ? '#fca5a5' : isLow ? '#fcd34d' : '#e5e7eb',
                backgroundColor: isOut ? '#fef2f2' : isLow ? '#fffbeb' : '#ffffff',
              }}
            >
              <View className="flex-row items-start gap-2">
                <View className="h-10 w-10 rounded-lg bg-slate-100 items-center justify-center overflow-hidden shrink-0">
                  {v.imageUrl ? (
                    <Image source={{ uri: v.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : v.colorHex ? (
                    <View style={{ width: '100%', height: '100%', backgroundColor: v.colorHex }} />
                  ) : (
                    <Package size={14} color="#94a3b8" />
                  )}
                </View>

                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-1 flex-wrap">
                    <Text className="text-xs font-extrabold text-slate-900" numberOfLines={1}>
                      {v.name}
                    </Text>
                    <View className="px-1 py-0 rounded flex-row items-center gap-0.5" style={{ backgroundColor: statusBg }}>
                      <StatusIcon size={8} color={statusColor} />
                      <Text className="text-[9px] font-extrabold" style={{ color: statusColor }}>
                        {isOut ? 'OUT' : isLow ? 'LOW' : 'OK'}
                      </Text>
                    </View>
                  </View>
                  {v.sku && (
                    <Text className="text-[10px] font-mono text-slate-500 mt-0.5">{v.sku}</Text>
                  )}
                  <View className="flex-row flex-wrap gap-1 mt-1">
                    {v.color && (
                      <View className="flex-row items-center gap-1 px-1.5 py-0.5 rounded bg-violet-100">
                        {v.colorHex && (
                          <View style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: v.colorHex }} />
                        )}
                        <Text className="text-[9px] font-bold text-violet-700">{v.color}</Text>
                      </View>
                    )}
                    {v.size && (
                      <View className="px-1.5 py-0.5 rounded bg-blue-100">
                        <Text className="text-[9px] font-bold text-blue-700">{v.size}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View className="items-end">
                  <Text className="text-sm font-extrabold text-slate-900">
                    {v.stock.toFixed(v.stock % 1 === 0 ? 0 : 2)}
                  </Text>
                  <Text className="text-[9px] font-bold text-slate-500 uppercase">{parentUnit}</Text>
                </View>
              </View>

              <View className="mt-2 pt-2 border-t border-slate-100 flex-row items-center justify-between">
                <View>
                  <Text className="text-[9px] uppercase font-bold text-slate-500">Cost</Text>
                  <Text className="text-[11px] font-bold text-slate-700">{formatPKR(v.costPrice)}</Text>
                </View>
                <View className="items-center">
                  <Text className="text-[9px] uppercase font-bold text-slate-500">Price</Text>
                  <Text className="text-[11px] font-bold text-emerald-700">{formatPKR(v.price)}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-[9px] uppercase font-bold text-slate-500">Value</Text>
                  <Text className="text-[11px] font-extrabold text-slate-900">{formatPKR(stockValue)}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
