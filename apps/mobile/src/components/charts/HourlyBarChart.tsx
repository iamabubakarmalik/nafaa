import { View, Text, Dimensions } from 'react-native';

interface Props {
  data: Array<{ hour: number; sales: number; label?: string }>;
  height?: number;
  color?: string;
  formatValue?: (n: number) => string;
}

const { width: SCREEN_W } = Dimensions.get('window');

export function HourlyBarChart({ data, height = 160, color = '#2563eb', formatValue }: Props) {
  if (!data || data.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 12, color: '#9ca3af' }}>No data</Text>
      </View>
    );
  }

  const max = Math.max(...data.map((d) => d.sales), 1);
  const containerWidth = SCREEN_W - 80;
  const barWidth = Math.max(8, (containerWidth - data.length * 4) / data.length);

  return (
    <View style={{ height }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingHorizontal: 4 }}>
        {data.map((d, i) => {
          const h = (d.sales / max) * (height - 32);
          const isPeak = d.sales === max && d.sales > 0;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <View
                style={{
                  width: '100%',
                  height: Math.max(h, 2),
                  backgroundColor: isPeak ? '#f59e0b' : color,
                  borderRadius: 4,
                  minHeight: 2,
                }}
              />
            </View>
          );
        })}
      </View>
      {/* X-axis labels — show every 3rd */}
      <View style={{ flexDirection: 'row', marginTop: 4, paddingHorizontal: 4 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            {i % 3 === 0 && (
              <Text style={{ fontSize: 8, color: '#9ca3af', fontWeight: '700' }}>
                {d.label ?? (d.hour === 0 ? '12A' : d.hour < 12 ? `${d.hour}A` : d.hour === 12 ? '12P' : `${d.hour - 12}P`)}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
