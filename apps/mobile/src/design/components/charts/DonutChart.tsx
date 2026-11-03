/** Donut with a centre label and a legend. Slices with no value are skipped. */

import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import type { ReactNode } from 'react';
import { Text } from '../Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useChartColors } from './useChartColors';

export interface DonutSlice { key: string; label: string; value: number; color?: string }

export interface DonutChartProps {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  /** Centre content (a total). */
  center?: ReactNode;
  /** Text for a slice value in the legend. */
  format?: (v: number) => string;
  legend?: boolean;
}

export function DonutChart({ slices, size = 132, thickness = 16, center, format, legend = true }: DonutChartProps) {
  const cc = useChartColors();
  const th = useTheme();
  const live = useMemo(() => slices.filter((s) => s.value > 0).map((s, i) => ({ ...s, color: s.color ?? cc.pick(i) })), [slices, cc]);
  const total = live.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(4), direction: 'ltr' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={cc.grid} strokeWidth={thickness} fill="none" />
            {total > 0 && live.map((s) => {
              const len = (s.value / total) * circ;
              const gap = live.length > 1 ? Math.min(2, len / 4) : 0;
              const el = <Circle key={s.key} cx={size / 2} cy={size / 2} r={r} stroke={s.color} strokeWidth={thickness} fill="none" strokeDasharray={`${Math.max(len - gap, 0.5)} ${circ}`} strokeDashoffset={-offset} strokeLinecap="butt" />;
              offset += len;
              return el;
            })}
          </G>
        </Svg>
        {center != null && <View style={{ position: 'absolute', alignItems: 'center', maxWidth: size - thickness * 2 - 4 }}>{center}</View>}
      </View>
      {legend && (
        <View style={{ flex: 1, gap: th.space(1.5) }}>
          {live.slice(0, 6).map((s) => (
            <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: s.color }} />
              <Text size="xs" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>{s.label}</Text>
              <Text size="xs" weight="semibold" ltr>{format ? format(s.value) : `${Math.round((s.value / total) * 100)}%`}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
