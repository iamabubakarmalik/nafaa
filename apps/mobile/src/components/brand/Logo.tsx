import Svg, { Defs, LinearGradient, Stop, Rect, G, Line, Polyline, Circle } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Logo({ size = 40 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Defs>
        <LinearGradient id="brandMobile" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#22c55e" />
          <Stop offset="50%" stopColor="#16a34a" />
          <Stop offset="100%" stopColor="#15803d" />
        </LinearGradient>
      </Defs>
      <Rect x="4" y="4" width="72" height="72" rx="18" ry="18" fill="url(#brandMobile)" />
      <G transform="translate(40, 42)" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Line x1="-16" y1="-16" x2="-16" y2="16" />
        <Line x1="-16" y1="16" x2="16" y2="-16" />
        <Line x1="16" y1="-16" x2="16" y2="16" />
        <Polyline points="7,-16 16,-16 16,-7" />
      </G>
      <Circle cx="62" cy="18" r="5" fill="#f59e0b" />
    </Svg>
  );
}
