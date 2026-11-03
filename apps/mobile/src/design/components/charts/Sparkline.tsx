/** Tiny trend line without axes, for tiles and rows. */

import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Circle } from 'react-native-svg';
import { useChartColors } from './useChartColors';

export function Sparkline({ data, color, width = 96, height = 32, area = true }: { data: number[]; color?: string; width?: number; height?: number; area?: boolean }) {
  const cc = useChartColors();
  const stroke = color ?? cc.brand;
  const { line, fill, last } = useMemo(() => {
    const pts = data.length === 1 ? [data[0], data[0]] : data;
    if (!pts.length) return { line: '', fill: '', last: null as null | [number, number] };
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = max - min || 1;
    const pad = 3;
    const xy = pts.map((v, i): [number, number] => [pad + (i / (pts.length - 1)) * (width - pad * 2), pad + (1 - (v - min) / span) * (height - pad * 2)]);
    const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    return { line: d, fill: `${d} L${xy[xy.length - 1][0]},${height} L${xy[0][0]},${height} Z`, last: xy[xy.length - 1] };
  }, [data, width, height]);
  if (!line) return <View style={{ width, height }} />;
  return (
    <View style={{ width, height, direction: 'ltr' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
            <Stop offset="1" stopColor={stroke} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {area && <Path d={fill} fill="url(#spark)" />}
        <Path d={line} stroke={stroke} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {last && <Circle cx={last[0]} cy={last[1]} r={2.4} fill={stroke} />}
      </Svg>
    </View>
  );
}
