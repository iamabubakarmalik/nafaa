import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTranslation } from '@/i18n/useTranslation';
interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({
  data,
  size = 160,
  strokeWidth = 22,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const { t } = useTranslation();
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  if (total === 0) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: size - 8,
            height: size - 8,
            borderRadius: (size - 8) / 2,
            borderWidth: strokeWidth / 2,
            borderColor: '#f3f4f6',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 11, color: '#9ca3af' }}>{t('auto.DonutChart.no_data')}</Text>
        </View>
      </View>
    );
  }

  let cumulative = 0;
  const segments = data.map((d) => {
    const dashLength = (d.value / total) * circumference;
    const dashGap = circumference - dashLength;
    const rotation = (cumulative / total) * 360;
    cumulative += d.value;
    return { ...d, dashLength, dashGap, rotation };
  });

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Segments */}
        {segments.map((seg, i) => (
          <G key={i} rotation={seg.rotation - 90} origin={`${cx}, ${cy}`}>
            <Circle
              cx={cx}
              cy={cy}
              r={radius}
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.dashLength} ${seg.dashGap}`}
              strokeLinecap="butt"
              fill="none"
            />
          </G>
        ))}
      </Svg>
      {/* Center label */}
      {(centerLabel || centerValue) && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {centerValue && (
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>
              {centerValue}
            </Text>
          )}
          {centerLabel && (
            <Text style={{ fontSize: 10, color: '#737373', fontWeight: '700', marginTop: 2, textTransform: 'uppercase' }}>
              {centerLabel}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
