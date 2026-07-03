import { View, Text } from 'react-native';
import { Smartphone, Shield, CheckCircle2, AlertTriangle } from 'lucide-react-native';
import type { ImeiDetail } from '@/api/stock-report.api';
import { formatPKR } from '@/lib/format';

interface Props {
  imeis: ImeiDetail[];
}

const ptaConfig: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  APPROVED: { label: 'PTA Approved', bg: '#dcfce7', text: '#15803d', icon: CheckCircle2 },
  NON_PTA: { label: 'Non-PTA', bg: '#fef3c7', text: '#b45309', icon: AlertTriangle },
  PATCH: { label: 'Patched', bg: '#ffedd5', text: '#c2410c', icon: AlertTriangle },
  PENDING: { label: 'Pending', bg: '#dbeafe', text: '#1d4ed8', icon: Shield },
  EXEMPT: { label: 'Exempt', bg: '#ede9fe', text: '#6d28d9', icon: CheckCircle2 },
};

export function ImeiDetailTable({ imeis }: Props) {
  if (imeis.length === 0) {
    return (
      <View className="rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 p-6 items-center">
        <Smartphone size={28} color="#cbd5e1" />
        <Text className="mt-2 text-sm font-bold text-slate-700">No IMEIs</Text>
      </View>
    );
  }

  const totalValue = imeis.reduce((s, i) => s + i.costPrice, 0);

  return (
    <View className="rounded-2xl bg-white border-2 border-blue-200 overflow-hidden">
      <View className="px-3 py-2.5 bg-blue-50 border-b-2 border-blue-200 flex-row items-center gap-2">
        <View className="h-8 w-8 rounded-lg bg-blue-600 items-center justify-center">
          <Smartphone size={16} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text className="font-extrabold text-blue-900 text-sm">
            {imeis.length} IMEI{imeis.length !== 1 ? 's' : ''} in stock
          </Text>
          <Text className="text-[10px] text-blue-700 font-bold">
            Total Cost: {formatPKR(totalValue)}
          </Text>
        </View>
      </View>

      <View className="gap-2 p-3">
        {imeis.map((i) => {
          const pta = ptaConfig[i.ptaStatus] || ptaConfig.PENDING;
          const PtaIcon = pta.icon;
          const warrantyDate = i.warrantyExpiry ? new Date(i.warrantyExpiry) : null;
          const isExpired = warrantyDate && warrantyDate < new Date();

          return (
            <View key={i.id} className="rounded-xl border border-blue-100 bg-blue-50/40 p-2.5">
              <View className="flex-row items-start gap-2">
                <View className="h-9 w-9 rounded-lg bg-blue-100 items-center justify-center shrink-0">
                  <Smartphone size={16} color="#2563eb" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="font-mono font-extrabold text-blue-900 text-xs">
                    {i.imei1}
                  </Text>
                  {i.imei2 && (
                    <Text className="font-mono text-[10px] text-slate-500 mt-0.5">
                      2: {i.imei2}
                    </Text>
                  )}
                  <View className="flex-row items-center gap-1 mt-1">
                    <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: pta.bg }}>
                      <PtaIcon size={9} color={pta.text} />
                      <Text className="text-[9px] font-extrabold" style={{ color: pta.text }}>
                        {pta.label}
                      </Text>
                    </View>
                    {(i.variantName || i.color) && (
                      <Text className="text-[10px] font-bold text-violet-700" numberOfLines={1}>
                        {i.variantName || i.color}
                      </Text>
                    )}
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-extrabold text-slate-900">
                    {formatPKR(i.costPrice)}
                  </Text>
                  {warrantyDate && (
                    <Text
                      className="text-[9px] font-bold mt-0.5"
                      style={{ color: isExpired ? '#dc2626' : '#16a34a' }}
                    >
                      {isExpired ? 'Expired' : warrantyDate.toLocaleDateString('en-PK', { month: 'short', year: '2-digit' })}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
