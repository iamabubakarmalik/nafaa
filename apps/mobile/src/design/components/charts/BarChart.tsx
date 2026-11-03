/**
 * Vertical bar chart. One series, or several grouped side by side (sale and
 * expense per month). Negative values hang below the zero line. Tap a bar
 * to read it.
 */

import { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { Text } from '../Text';
import { useTheme } from '../../theme/ThemeProvider';
import { axisNumber, niceMax, useChartColors } from './useChartColors';

export interface BarSeries { key: string; label?: string; values: number[]; color?: string }

export interface BarChartProps {
  labels: string[];
  series: BarSeries[];
  height?: number;
  format?: (v: number) => string;
  maxLabels?: number;
  /** Highlight one label (e.g. today). */
  highlight?: number;
  /** Color single-series bars by sign: green up, red down. */
  signed?: boolean;
}

export function BarChart({ labels, series, height = 160, format = (v) => String(Math.round(v)), maxLabels = 7, highlight, signed }: BarChartProps) {
  const cc = useChartColors();
  const th = useTheme();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const left = 34;
  const right = 4;
  const top = 8;
  const bottom = 20;
  const n = Math.max(labels.length, 1);

  const geo = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    const max = niceMax(Math.max(0, ...all));
    const min = Math.min(0, ...all);
    const span = max - min || 1;
    const w = Math.max(width - left - right, 1);
    const h = height - top - bottom;
    const y = (v: number) => top + (1 - (v - min) / span) * h;
    return { max, min, y, w, h, slot: w / n };
  }, [series, width, height, n]);

  const group = series.length;
  const bw = Math.max(2, Math.min(26, (geo.slot * 0.72) / group));
  const step = Math.max(1, Math.ceil(n / maxLabels));
  const ticks = [0, 0.5, 1].map((f) => geo.min + (geo.max - geo.min) * f);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ direction: 'ltr' }}>
      {width > 0 && (
        <View
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => setActive(Math.max(0, Math.min(n - 1, Math.floor((e.nativeEvent.locationX - left) / geo.slot))))}
          onResponderRelease={() => setTimeout(() => setActive(null), 1800)}
        >
          <Svg width={width} height={height}>
            {ticks.map((tv, i) => (
              <G key={i}>
                <Line x1={left} x2={width - right} y1={geo.y(tv)} y2={geo.y(tv)} stroke={cc.grid} strokeWidth={1} />
                <SvgText x={left - 6} y={geo.y(tv) + 3} fontSize={10} fill={cc.axis} textAnchor="end">{axisNumber(tv)}</SvgText>
              </G>
            ))}
            {labels.map((l, i) => i % step === 0 && (
              <SvgText key={i} x={left + geo.slot * i + geo.slot / 2} y={height - 5} fontSize={10} fill={i === highlight ? cc.brand : cc.axis} fontWeight={i === highlight ? '700' : '400'} textAnchor="middle">{l}</SvgText>
            ))}
            {series.map((s, si) => s.values.map((v, i) => {
              const base = geo.y(0);
              const yy = geo.y(v);
              const color = signed && group === 1 ? (v >= 0 ? cc.good : cc.bad) : s.color ?? cc.pick(si);
              const x = left + geo.slot * i + (geo.slot - bw * group) / 2 + si * bw;
              const dim = active != null && active !== i;
              return <Rect key={`${s.key}${i}`} x={x} y={Math.min(base, yy)} width={bw - (group > 1 ? 1.5 : 0)} height={Math.max(1.5, Math.abs(base - yy))} rx={Math.min(4, bw / 2)} fill={color} opacity={dim ? 0.35 : highlight != null && highlight !== i && group === 1 ? 0.55 : 1} />;
            }))}
          </Svg>
        </View>
      )}
      {active != null && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(3), marginTop: 2 }}>
          <Text size="xs" tone="muted" ltr>{labels[active]}</Text>
          {series.map((s, si) => <Text key={s.key} size="xs" weight="semibold" ltr style={{ color: s.color ?? cc.pick(si) }}>{`${s.label ? `${s.label} ` : ''}${format(s.values[active] ?? 0)}`}</Text>)}
        </View>
      )}
    </View>
  );
}
