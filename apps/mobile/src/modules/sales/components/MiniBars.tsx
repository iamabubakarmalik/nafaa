/** A small bar chart made of views: one bar per point, the tallest at full height. No chart library. */

import { View } from 'react-native';
import { Text, useTheme } from '@/design';

export function MiniBars({ points, height = 84, highlight }: { points: Array<{ key: string; value: number; label?: string }>; height?: number; highlight?: string }) {
  const th = useTheme();
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <View style={{ direction: 'ltr' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height }}>
        {points.map((p) => (
          <View key={p.key} style={{ flex: 1, height: Math.max(3, (p.value / max) * height), borderRadius: 3,
            backgroundColor: p.key === highlight ? th.colors.brand.solid : th.colors.brand.border }} />
        ))}
      </View>
      {points.some((p) => p.label) && (
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
          {points.map((p) => <Text key={p.key} size="2xs" tone="muted" align="center" style={{ flex: 1 }} numberOfLines={1}>{p.label ?? ''}</Text>)}
        </View>
      )}
    </View>
  );
}
