import { View, Text } from 'react-native';
import { Layers, Scissors, MapPin, Ruler } from 'lucide-react-native';
import type { CarpetRollDetail, CarpetCutPieceDetail } from '@/api/stock-report.api';
import { formatPKR } from '@/lib/format';

interface Props {
  rolls: CarpetRollDetail[];
  cutPieces: CarpetCutPieceDetail[];
}

export function CarpetDetailTable({ rolls, cutPieces }: Props) {
  if (rolls.length === 0 && cutPieces.length === 0) {
    return (
      <View className="rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 p-6 items-center">
        <Layers size={28} color="#cbd5e1" />
        <Text className="mt-2 text-sm font-bold text-slate-700">No carpet stock</Text>
      </View>
    );
  }

  const totalRollSqft = rolls.reduce((s, r) => s + r.remainingSqft, 0);
  const totalCutSqft = cutPieces.reduce((s, c) => s + c.totalSqft, 0);
  const totalRollValue = rolls.reduce((s, r) => s + r.remainingSqft * r.costPerSqft, 0);
  const totalCutValue = cutPieces.reduce((s, c) => s + c.salePrice, 0);

  return (
    <View className="gap-3">
      {/* Rolls */}
      {rolls.length > 0 && (
        <View className="rounded-2xl bg-white border-2 border-emerald-200 overflow-hidden">
          <View className="px-3 py-2.5 bg-emerald-50 border-b-2 border-emerald-200 flex-row items-center gap-2">
            <View className="h-8 w-8 rounded-lg bg-emerald-600 items-center justify-center">
              <Layers size={16} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="font-extrabold text-emerald-900 text-sm">
                {rolls.length} Roll{rolls.length !== 1 ? 's' : ''}
              </Text>
              <Text className="text-[10px] text-emerald-700 font-bold">
                {totalRollSqft.toFixed(2)} sqft • {formatPKR(totalRollValue)}
              </Text>
            </View>
          </View>

          <View className="gap-2 p-3">
            {rolls.map((r, idx) => {
              const percentRemaining = r.originalLengthFt > 0
                ? (r.remainingLengthFt / r.originalLengthFt) * 100
                : 0;
              return (
                <View key={r.id} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-2.5">
                  <View className="flex-row items-start gap-2">
                    <View className="h-9 w-9 rounded-lg items-center justify-center shrink-0" style={{ backgroundColor: r.variantColorHex || '#dcfce7' }}>
                      {!r.variantColorHex && <Layers size={16} color="#16a34a" />}
                    </View>
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-1 flex-wrap">
                        <Text className="font-mono font-extrabold text-emerald-900 text-xs">
                          {r.rollNumber}
                        </Text>
                        {r.designCode && (
                          <View className="px-1 py-0 rounded bg-slate-100">
                            <Text className="text-[9px] font-mono font-bold text-slate-700">{r.designCode}</Text>
                          </View>
                        )}
                      </View>
                      {r.variantName && (
                        <View className="flex-row items-center gap-1 mt-0.5">
                          {r.variantColorHex && (
                            <View style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: r.variantColorHex }} />
                          )}
                          <Text className="text-[10px] font-bold text-violet-700">{r.variantName}</Text>
                        </View>
                      )}
                      <View className="flex-row items-center gap-2 mt-1">
                        <View className="flex-row items-center gap-1">
                          <Ruler size={10} color="#64748b" />
                          <Text className="text-[10px] text-slate-600 font-bold">
                            {r.widthFt}ft × {r.remainingLengthFt}ft
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-extrabold text-emerald-700">
                        {r.remainingSqft.toFixed(2)}
                      </Text>
                      <Text className="text-[9px] font-bold text-emerald-600">sqft</Text>
                    </View>
                  </View>

                  <View className="mt-2 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(percentRemaining, 3)}%`,
                        backgroundColor: percentRemaining > 50 ? '#16a34a' : percentRemaining > 20 ? '#f59e0b' : '#dc2626',
                      }}
                    />
                  </View>
                  <View className="mt-2 flex-row items-center justify-between">
                    <Text className="text-[10px] text-slate-500">
                      {percentRemaining.toFixed(0)}% remaining • {r.originalLengthFt.toFixed(1)}ft original
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-[10px] font-bold text-emerald-700">
                        {formatPKR(r.salePricePerSqft)}/sqft
                      </Text>
                    </View>
                  </View>
                  {(r.rackNumber || r.shopName) && (
                    <View className="mt-1.5 flex-row items-center gap-2">
                      {r.shopName && (
                        <View className="flex-row items-center gap-0.5">
                          <MapPin size={9} color="#64748b" />
                          <Text className="text-[9px] text-slate-600 font-bold">{r.shopName}</Text>
                        </View>
                      )}
                      {r.rackNumber && (
                        <Text className="text-[9px] text-slate-500 font-bold">Rack: {r.rackNumber}</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Cut Pieces */}
      {cutPieces.length > 0 && (
        <View className="rounded-2xl bg-white border-2 border-violet-200 overflow-hidden">
          <View className="px-3 py-2.5 bg-violet-50 border-b-2 border-violet-200 flex-row items-center gap-2">
            <View className="h-8 w-8 rounded-lg bg-violet-600 items-center justify-center">
              <Scissors size={16} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="font-extrabold text-violet-900 text-sm">
                {cutPieces.length} Cut Piece{cutPieces.length !== 1 ? 's' : ''}
              </Text>
              <Text className="text-[10px] text-violet-700 font-bold">
                {totalCutSqft.toFixed(2)} sqft • {formatPKR(totalCutValue)}
              </Text>
            </View>
          </View>

          <View className="gap-2 p-3">
            {cutPieces.map((cp) => (
              <View key={cp.id} className="rounded-xl border border-violet-100 bg-violet-50/40 p-2.5">
                <View className="flex-row items-start gap-2">
                  <View className="h-9 w-9 rounded-lg items-center justify-center shrink-0" style={{ backgroundColor: cp.variantColorHex || '#ede9fe' }}>
                    {!cp.variantColorHex && <Scissors size={16} color="#8b5cf6" />}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="font-mono font-extrabold text-violet-900 text-xs">
                      {cp.pieceCode}
                    </Text>
                    {cp.variantName && (
                      <Text className="text-[10px] font-bold text-violet-700 mt-0.5">{cp.variantName}</Text>
                    )}
                    <View className="flex-row items-center gap-2 mt-1">
                      <Text className="text-[10px] font-bold text-slate-700">
                        {cp.widthFt}ft × {cp.lengthFt}ft
                      </Text>
                      {cp.sourceRollNumber && (
                        <Text className="text-[9px] font-mono text-emerald-700 font-bold">
                          ← {cp.sourceRollNumber}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-base font-extrabold text-violet-700">
                      {cp.totalSqft.toFixed(2)}
                    </Text>
                    <Text className="text-[9px] font-bold text-violet-600">sqft</Text>
                    <Text className="text-[11px] font-extrabold text-emerald-700 mt-0.5">
                      {formatPKR(cp.salePrice)}
                    </Text>
                  </View>
                </View>
                {(cp.condition || cp.rackNumber) && (
                  <View className="mt-1.5 flex-row items-center gap-2">
                    {cp.condition && (
                      <View className="px-1.5 py-0.5 rounded bg-amber-100">
                        <Text className="text-[9px] font-bold text-amber-700">{cp.condition}</Text>
                      </View>
                    )}
                    {cp.rackNumber && (
                      <View className="flex-row items-center gap-0.5">
                        <MapPin size={9} color="#64748b" />
                        <Text className="text-[9px] font-bold text-slate-600">Rack: {cp.rackNumber}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
