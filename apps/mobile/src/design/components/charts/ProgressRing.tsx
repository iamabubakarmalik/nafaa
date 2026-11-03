/**
 * Circular progress (web engine/charts ProgressRing). `value` is a fraction;
 * above 1 the ring stays full. Content in the middle comes from `children`.
 *
 *   <ProgressRing value={0.64} size={120} color="#fff" track="rgba(255,255,255,0.2)">
 *     <Text weight="bold">64%</Text>
 *   </ProgressRing>
 */

import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useChartColors } from './useChartColors';

export function ProgressRing({ value, size = 120, stroke = 10, color, track, children }: {
  value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode;
}) {
  const cc = useChartColors();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? cc.grid} strokeWidth={stroke} fill="none" />
        {v > 0 && (
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color ?? cc.brand} strokeWidth={stroke} fill="none"
            strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - v)} strokeLinecap="round" />
        )}
      </Svg>
      <View style={{ alignItems: 'center', paddingHorizontal: stroke + 4 }}>{children}</View>
    </View>
  );
}
