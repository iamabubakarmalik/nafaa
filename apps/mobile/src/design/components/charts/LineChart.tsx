/**
 * Line / area chart for one or more series over the same labels. Always
 * left to right. Tap or drag to read a point.
 *
 *   <LineChart labels={days} series={[{ key: 'sales', label: t('Sale'), data: sales }]} format={formatMoney} />
 */

import { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Path, Stop, Circle, Text as SvgText } from 'react-native-svg';
import { Text } from '../Text';
import { useTheme } from '../../theme/ThemeProvider';
import { axisNumber, niceMax, useChartColors } from './useChartColors';

export interface LineSeries { key: string; label?: string; data: number[]; color?: string; dashed?: boolean }

export interface LineChartProps {
  labels: string[];
  series: LineSeries[];
  height?: number;
  area?: boolean;
  /** Text of a value in the tooltip. */
  format?: (v: number) => string;
  /** Show at most this many x labels. */
  maxLabels?: number;
}

export function LineChart({ labels, series, height = 170, area = true, format = (v) => String(Math.round(v)), maxLabels = 6 }: LineChartProps) {
  const cc = useChartColors();
  const th = useTheme();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const left = 34;
  const right = 8;
  const top = 8;
  const bottom = 20;
  const n = Math.max(labels.length, ...series.map((s) => s.data.length), 1);

  const geo = useMemo(() => {
    const all = series.flatMap((s) => s.data);
    const max = niceMax(Math.max(0, ...all));
    const min = Math.min(0, ...all);
    const span = max - min || 1;
    const w = Math.max(width - left - right, 1);
    const h = height - top - bottom;
    const x = (i: number) => left + (n === 1 ? w / 2 : (i / (n - 1)) * w);
    const y = (v: number) => top + (1 - (v - min) / span) * h;
    return { max, min, x, y, w, h };
  }, [series, width, height, n]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const pick = (px: number) => {
    const idx = Math.round(((px - left) / geo.w) * (n - 1));
    setActive(Math.max(0, Math.min(n - 1, idx)));
  };
  const step = Math.max(1, Math.ceil(n / maxLabels));
  const ticks = [0, 0.5, 1].map((f) => geo.min + (geo.max - geo.min) * f);

  return (
    <View onLayout={onLayout} style={{ direction: 'ltr' }}>
      {width > 0 && (
        <View
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
          onResponderMove={(e) => pick(e.nativeEvent.locationX)}
          onResponderRelease={() => setTimeout(() => setActive(null), 1800)}
        >
          <Svg width={width} height={height}>
            <Defs>
              {series.map((s, si) => (
                <LinearGradient key={s.key} id={`lc-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={s.color ?? cc.pick(si)} stopOpacity={0.22} />
                  <Stop offset="1" stopColor={s.color ?? cc.pick(si)} stopOpacity={0} />
                </LinearGradient>
              ))}
            </Defs>
            {ticks.map((tv, i) => (
              <G key={i}>
                <Line x1={left} x2={width - right} y1={geo.y(tv)} y2={geo.y(tv)} stroke={cc.grid} strokeWidth={1} />
                <SvgText x={left - 6} y={geo.y(tv) + 3} fontSize={10} fill={cc.axis} textAnchor="end">{axisNumber(tv)}</SvgText>
              </G>
            ))}
            {labels.map((l, i) => (i % step === 0 || i === n - 1) && (
              <SvgText key={i} x={geo.x(i)} y={height - 5} fontSize={10} fill={cc.axis} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>{l}</SvgText>
            ))}
            {series.map((s, si) => {
              const color = s.color ?? cc.pick(si);
              const d = s.data.map((v, i) => `${i ? 'L' : 'M'}${geo.x(i).toFixed(1)},${geo.y(v).toFixed(1)}`).join(' ');
              if (!d) return null;
              const fill = `${d} L${geo.x(s.data.length - 1)},${geo.y(0)} L${geo.x(0)},${geo.y(0)} Z`;
              return (
                <G key={s.key}>
                  {area && si === 0 && <Path d={fill} fill={`url(#lc-${s.key})`} />}
                  <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dashed ? '4 4' : undefined} />
                  {active != null && s.data[active] != null && <Circle cx={geo.x(active)} cy={geo.y(s.data[active])} r={4} fill={color} stroke={th.colors.surface} strokeWidth={2} />}
                </G>
              );
            })}
            {active != null && <Line x1={geo.x(active)} x2={geo.x(active)} y1={top} y2={top + geo.h} stroke={cc.axis} strokeWidth={1} strokeDasharray="3 3" />}
          </Svg>
        </View>
      )}
      {active != null && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(3), marginTop: 2 }}>
          <Text size="xs" tone="muted" ltr>{labels[active]}</Text>
          {series.map((s, si) => (
            <Text key={s.key} size="xs" weight="semibold" ltr style={{ color: s.color ?? cc.pick(si) }}>{`${s.label ? `${s.label} ` : ''}${format(s.data[active] ?? 0)}`}</Text>
          ))}
        </View>
      )}
    </View>
  );
}
