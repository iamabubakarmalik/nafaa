import { View, Text } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useTranslation } from '@/i18n/useTranslation';
interface DataPoint {
  value: number;
  label?: string;
}

interface MiniLineChartProps {
  data: DataPoint[];
  height?: number;
  width?: number;
  color?: string;
  gradientId?: string;
  showDots?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
}

export function MiniLineChart({
  data,
  height = 120,
  width,
  color = '#16a34a',
  gradientId = 'lineGrad',
  showDots = true,
  showLabels = false,
  showGrid = true,
}: MiniLineChartProps) {
  const { t } = useTranslation();
  if (!data || data.length < 2) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: '#9ca3af' }}>{t('auto.MiniLineChart.not_enough_data')}</Text>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  const chartWidth = width ?? 320;
  const padding = { top: 10, right: 8, bottom: showLabels ? 22 : 6, left: 8 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;

  const points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + innerH - ((d.value - minVal) / range) * innerH,
    value: d.value,
    label: d.label,
  }));

  // Smooth path via bezier
  const linePath = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cpX = (prev.x + p.x) / 2;
      return `Q ${cpX} ${prev.y} ${cpX} ${(prev.y + p.y) / 2} T ${p.x} ${p.y}`;
    })
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerH} L ${points[0].x} ${padding.top + innerH} Z`;

  return (
    <View style={{ width: chartWidth, height }}>
      <Svg width={chartWidth} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {showGrid &&
          [0.25, 0.5, 0.75].map((t, i) => (
            <Line
              key={i}
              x1={padding.left}
              x2={chartWidth - padding.right}
              y1={padding.top + innerH * t}
              y2={padding.top + innerH * t}
              stroke="#e5e7eb"
              strokeWidth={0.5}
              strokeDasharray="3 3"
            />
          ))}

        {/* Area fill */}
        <Path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <Path
          d={linePath}
          stroke={color}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {showDots &&
          points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? 4 : 2.5}
              fill={color}
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          ))}
      </Svg>

      {/* X-axis labels */}
      {showLabels && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: padding.left,
            position: 'absolute',
            bottom: 2,
            left: 0,
            right: 0,
          }}
        >
          {data.map((d, i) => {
            const showThis =
              data.length <= 7 ||
              i === 0 ||
              i === data.length - 1 ||
              i === Math.floor(data.length / 2);
            return (
              <Text
                key={i}
                style={{
                  fontSize: 9,
                  color: '#9ca3af',
                  fontWeight: '600',
                  opacity: showThis ? 1 : 0,
                }}
              >
                {d.label ?? ''}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}
