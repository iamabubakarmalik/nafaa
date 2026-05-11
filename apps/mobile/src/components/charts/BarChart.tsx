import { View, Text } from 'react-native';

import { useTranslation } from '@/i18n/useTranslation';
interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarItem[];
  defaultColor?: string;
  formatValue?: (n: number) => string;
}

export function BarChart({
  data,
  defaultColor = '#16a34a',
  formatValue = (n) => String(Math.round(n)),
}: BarChartProps) {
  const { t } = useTranslation();
  if (!data || data.length === 0) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: '#9ca3af' }}>{t('auto.DonutChart.no_data')}</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={{ gap: 10 }}>
      {data.map((item, idx) => {
        const percent = (item.value / maxValue) * 100;
        const color = item.color || defaultColor;
        return (
          <View key={idx}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <Text
                style={{ fontSize: 12, fontWeight: '700', color: '#374151', flex: 1 }}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>
                {formatValue(item.value)}
              </Text>
            </View>
            <View
              style={{
                height: 10,
                borderRadius: 5,
                backgroundColor: '#f3f4f6',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${Math.max(percent, 3)}%`,
                  borderRadius: 5,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
