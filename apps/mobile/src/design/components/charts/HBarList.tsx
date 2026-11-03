/** Ranked horizontal bars: label, bar and value on one row (top products, categories, staff). */

import { View } from 'react-native';
import type { ReactNode } from 'react';
import { PressableScale } from '../Pressable';
import { Text } from '../Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useChartColors } from './useChartColors';

export interface HBarRow { key: string; label: string; value: number; display?: ReactNode; hint?: string; color?: string; onPress?: () => void }

export function HBarList({ rows, max, colorful }: { rows: HBarRow[]; max?: number; colorful?: boolean }) {
  const th = useTheme();
  const cc = useChartColors();
  const top = max ?? Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <View style={{ gap: th.space(2.5) }}>
      {rows.map((r, i) => {
        const color = r.color ?? (colorful ? cc.pick(i) : r.value < 0 ? cc.bad : cc.brand);
        const body = (
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
              <Text size="sm" weight="medium" numberOfLines={1} style={{ flex: 1 }}>{r.label}</Text>
              {typeof r.display === 'string' || r.display == null ? <Text size="sm" weight="semibold" ltr>{r.display ?? String(r.value)}</Text> : r.display}
            </View>
            <View style={{ height: 7, borderRadius: 4, backgroundColor: th.colors.surfaceSunken, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(2, Math.min(100, (Math.abs(r.value) / top) * 100))}%`, height: '100%', borderRadius: 4, backgroundColor: color }} />
            </View>
            {r.hint ? <Text size="2xs" tone="muted" numberOfLines={1}>{r.hint}</Text> : null}
          </View>
        );
        return r.onPress ? <PressableScale key={r.key} onPress={r.onPress} haptic="tap" accessibilityLabel={r.label}>{body}</PressableScale> : <View key={r.key}>{body}</View>;
      })}
    </View>
  );
}
