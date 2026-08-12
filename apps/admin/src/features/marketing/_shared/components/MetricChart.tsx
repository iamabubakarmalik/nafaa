import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart,
} from 'recharts';

interface Props {
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  type?: 'line' | 'area';
}

export function MetricChart({
  data, xKey, yKey, color = '#059669', height = 240, type = 'area',
}: Props) {
  const Chart = type === 'area' ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradMkt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.28} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#525252' }}
        />
        {type === 'area' ? (
          <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill="url(#gradMkt)" />
        ) : (
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={false} />
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
